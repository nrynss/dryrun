// The data shapes every part of Dry Run agrees on.
//
// Four tracks read this file: the Netlify function that produces these
// objects, the session state that stores them, the interface that renders
// them, and the fixture that fakes them. Changing a shape here means editing
// all four, so change it deliberately.
//
// Plain JavaScript with no Svelte runes and no imports. The Netlify function
// bundles this file too, so it must stay free of browser and framework
// dependencies.

export const TOTAL_QUESTIONS = 8;
export const MAX_POSTING_CHARS = 20_000;
export const MAX_RESUME_CHARS = 20_000;

/** The four scoring axes, in the order the interface renders them. */
export const AXES = ['specificity', 'evidence', 'structure', 'relevance'];

/** A session where fewer than this many questions were answered cannot read as ready. */
export const COVERAGE_FLOOR = 6;

/**
 * @typedef {object} Brief
 * @property {string[]} owns    What the role actually owns day to day.
 * @property {string[]} study   What to read before the interview.
 * @property {string[]} angles  Where they are likely to push.
 * @property {'high'|'low'} confidence  Low when the posting was too thin to read.
 */

/**
 * @typedef {object} Question
 * @property {string} id           `q1` through `q8`.
 * @property {string} prompt       The question, as ChatGPT should ask it.
 * @property {string} sourceQuote  Verbatim line from the posting. Never paraphrased.
 * @property {boolean} targetsGap  True when the question aims at a resume gap.
 */

/**
 * @typedef {object} FitMatch
 * @property {{requirement: string, evidence: string}[]} evidenced
 * @property {{requirement: string, why: string, size: number}[]} gaps  Ordered by size, largest first. Size is 1 to 5.
 * @property {'high'|'low'} confidence  Low means the upload did not read like a resume.
 */

/**
 * @typedef {object} AnswerScore
 * @property {string} questionId
 * @property {string} answer       The user's spoken answer, as the agent transcribed it.
 * @property {Record<string, number>} scores  One 1 to 5 value per axis in AXES.
 * @property {string[]} missed     Key points the answer left out.
 * @property {string} modelAnswer  What a strong answer would have covered.
 */

/**
 * @typedef {object} Verdict
 * @property {'ready'|'nearly'|'not yet'} band
 * @property {number} average   Mean across every axis of every answered question.
 * @property {number} answered  How many of the eight were answered.
 * @property {number} total     Always TOTAL_QUESTIONS.
 * @property {boolean} capped   True when coverage held the band down.
 */

/** Mean of one answer's four axis scores. Returns null when unscored. */
export function answerAverage(score) {
  if (!score?.scores) return null;
  const values = AXES.map((a) => score.scores[a]).filter((n) => typeof n === 'number');
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Which colour band a 1 to 5 value falls in. The interface maps these to tokens. */
export function scoreBand(value) {
  if (value >= 4) return 'good';
  if (value >= 2.5) return 'mid';
  return 'bad';
}

/**
 * Builds the verdict from whatever has been scored so far.
 *
 * Honest in one direction only. A session where most questions were skipped
 * can never read as ready, however well the few answers scored. Coverage is
 * reported as its own number rather than folded into the band, so a capped
 * result can say plainly why it was capped.
 *
 * @param {AnswerScore[]} scores
 * @returns {Verdict}
 */
export function buildVerdict(scores) {
  const scored = (scores ?? []).map(answerAverage).filter((n) => n !== null);
  const answered = scored.length;
  const average = answered ? scored.reduce((a, b) => a + b, 0) / answered : 0;

  let band = 'not yet';
  if (average >= 4) band = 'ready';
  else if (average >= 3) band = 'nearly';

  const capped = answered < COVERAGE_FLOOR && band !== 'not yet';
  if (capped) band = 'not yet';

  return { band, average, answered, total: TOTAL_QUESTIONS, capped };
}

/**
 * Checks a model response before the session trusts it. A malformed response
 * mid-interview breaks the demo in front of a judge, so the function rejects
 * and retries rather than storing a half-object.
 *
 * @returns {string[]} Human-readable problems. Empty means the object is usable.
 */
export function validateBriefResponse(data) {
  const problems = [];
  if (!data || typeof data !== 'object') return ['Response was not an object.'];

  const b = data.brief;
  if (!b) problems.push('Missing brief.');
  else for (const key of ['owns', 'study', 'angles']) {
    if (!Array.isArray(b[key]) || !b[key].length) problems.push(`Brief is missing ${key}.`);
  }

  const qs = data.questions;
  if (!Array.isArray(qs)) problems.push('Missing questions array.');
  else {
    if (qs.length !== TOTAL_QUESTIONS) problems.push(`Expected ${TOTAL_QUESTIONS} questions, got ${qs.length}.`);
    qs.forEach((q, i) => {
      if (!q?.prompt) problems.push(`Question ${i + 1} has no prompt.`);
      if (!q?.sourceQuote) problems.push(`Question ${i + 1} has no sourceQuote.`);
    });
  }
  return problems;
}

/** @returns {string[]} Problems with one scoring response. Empty means usable. */
export function validateScoreResponse(data) {
  const problems = [];
  if (!data || typeof data !== 'object') return ['Response was not an object.'];
  if (!data.scores) problems.push('Missing scores.');
  else for (const axis of AXES) {
    const v = data.scores[axis];
    if (typeof v !== 'number' || v < 1 || v > 5) problems.push(`Axis ${axis} is not a number from 1 to 5.`);
  }
  if (!Array.isArray(data.missed)) problems.push('Missing missed points array.');
  if (typeof data.modelAnswer !== 'string' || !data.modelAnswer) problems.push('Missing model answer.');
  return problems;
}
