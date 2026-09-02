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
// Score requests carry a short answer plus the saved question/brief context;
// this is a separate, documented aggregate rather than a hidden brief cap.
export const MAX_SCORE_INPUT_CHARS = 12_000;

/** The four scoring axes, in the order the interface renders them. */
export const AXES = ['specificity', 'evidence', 'structure', 'relevance'];

/** A session where fewer than this many questions were answered cannot read as ready. */
export const COVERAGE_FLOOR = 6;

/**
 * Bound on how many of the eight questions may target a resume gap, checked
 * only when the fit match found real gaps.
 *
 * This is deliberately wider than the prompt's own 2-to-4 guidance.
 * MAX_MODEL_ATTEMPTS is 2. A bound that fires on ordinary model variance
 * costs the user a usable question set, not just a nicer one.
 *
 * Measured against a live draft deploy running gpt-5.6-luna. 10 runs used a
 * sparse, jargon-free CV with several real gaps. 10 more used a strong CV
 * with one or two gaps. Every run landed inside 2 to 4 on its own. The model
 * never needed this bound to hold the line.
 *
 * 1 and 6 sit one full question outside that observed range on each side.
 * That leaves room to absorb further variance. It still rejects the two
 * shapes this bound exists to catch. The first is 0 of 8: a resume with a
 * real gap that no question tests. The second is 7 or 8 of 8, the original
 * defect. There every question targeted a gap, and none were answerable.
 */
export const MIN_GAP_TARGETED = 1;
export const MAX_GAP_TARGETED = 6;

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
 * Whether a quote appears in the posting, ignoring how the text was wrapped.
 *
 * People paste from LinkedIn, from a PDF, or from a browser window, and all of
 * those wrap lines mid-sentence. The model reads the wrapped text and quotes it
 * back with ordinary spacing, so a raw substring match rejects a quote that is
 * genuinely verbatim. That burned a retry and could return an error to someone
 * who did nothing wrong.
 *
 * This still catches the case we actually care about, which is a paraphrased or
 * invented quote. Only whitespace is forgiven.
 */
export function quoteAppearsIn(posting, quote) {
  const flatten = (text) => String(text).replace(/\s+/g, ' ').trim();
  return flatten(posting).includes(flatten(quote));
}

/**
 * Checks a model response before the session trusts it. A malformed response
 * mid-interview breaks the demo in front of a judge, so the function rejects
 * and retries rather than storing a half-object.
 *
 * `posting` is optional so the hand-written fixture can be checked without
 * carrying its entire source document. The server supplies it: sourceQuote is
 * a trust boundary there, because the model must not invent a job requirement.
 * `requireFitMatch` is true exactly when the request included a resume.
 *
 * @param {{posting?: string, requireFitMatch?: boolean}} [context]
 * @returns {string[]} Human-readable problems. Empty means the object is usable.
 */
export function validateBriefResponse(data, context = {}) {
  const problems = [];
  const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
  const hasExactKeys = (value, keys) => isRecord(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
  const isBoundedString = (value, maxLength) => typeof value === 'string'
    && value.length >= 1
    && value.length <= maxLength
    && value.trim().length > 0;
  const isBoundedArray = (value, maxItems, minItems = 0) => Array.isArray(value)
    && value.length >= minItems
    && value.length <= maxItems;
  const isBoundedList = (value, maxItems, maxLength, minItems = 0) => Array.isArray(value)
    && value.length >= minItems
    && value.length <= maxItems
    && value.every((item) => isBoundedString(item, maxLength));

  if (!isRecord(data)) return ['Response was not an object.'];
  if (!hasExactKeys(data, ['brief', 'questions', 'fitMatch'])) problems.push('Response has an invalid object shape.');

  const b = data.brief;
  if (!hasExactKeys(b, ['owns', 'study', 'angles', 'confidence'])) problems.push('Brief has an invalid object shape.');
  else {
    for (const key of ['owns', 'study', 'angles']) {
      if (!isBoundedList(b[key], 6, 240, 1)) {
        problems.push(`Brief is missing ${key}.`);
      }
    }
    if (!['high', 'low'].includes(b.confidence)) problems.push('Brief has invalid confidence.');
  }

  const qs = data.questions;
  if (!Array.isArray(qs)) problems.push('Missing questions array.');
  else {
    if (qs.length !== TOTAL_QUESTIONS) problems.push(`Expected ${TOTAL_QUESTIONS} questions, got ${qs.length}.`);
    const ids = new Set();
    qs.forEach((q, i) => {
      if (!hasExactKeys(q, ['id', 'prompt', 'sourceQuote', 'targetsGap'])) {
        problems.push(`Question ${i + 1} has an invalid object shape.`);
        return;
      }
      if (q?.id !== `q${i + 1}` || ids.has(q?.id)) problems.push(`Question ${i + 1} has an invalid id.`);
      ids.add(q?.id);
      if (!isBoundedString(q.prompt, 360)) problems.push(`Question ${i + 1} has an invalid prompt.`);
      if (!isBoundedString(q.sourceQuote, 600)) problems.push(`Question ${i + 1} has an invalid sourceQuote.`);
      else if (context.posting && !quoteAppearsIn(context.posting, q.sourceQuote)) {
        problems.push(`Question ${i + 1} sourceQuote is not verbatim in the posting.`);
      }
      if (typeof q?.targetsGap !== 'boolean') problems.push(`Question ${i + 1} is missing targetsGap.`);
      else if (!context.requireFitMatch && q.targetsGap) problems.push(`Question ${i + 1} cannot target a gap without a resume.`);
    });
  }

  // Fit analysis is meaningful only for an uploaded resume. Keeping it null
  // otherwise makes the browser contract stable while avoiding fake "gaps".
  const fit = data.fitMatch;
  if (context.requireFitMatch && !fit) problems.push('Missing fit match for the supplied resume.');
  if (!context.requireFitMatch && fit !== null) problems.push('Fit match must be null when no resume was supplied.');
  if (fit != null) {
    if (!hasExactKeys(fit, ['evidenced', 'gaps', 'confidence'])) problems.push('Fit match has an invalid object shape.');
    else {
      if (!['high', 'low'].includes(fit.confidence)) problems.push('Fit match has invalid confidence.');
      if (!isBoundedArray(fit.evidenced, 8) || !isBoundedArray(fit.gaps, 8)) problems.push('Fit match is incomplete.');
      const evidenced = Array.isArray(fit.evidenced) ? fit.evidenced : [];
      const gaps = Array.isArray(fit.gaps) ? fit.gaps : [];
      for (const [i, item] of evidenced.entries()) {
        if (!hasExactKeys(item, ['requirement', 'evidence']) || !isBoundedString(item.requirement, 240) || !isBoundedString(item.evidence, 300)) {
          problems.push(`Evidenced fit item ${i + 1} is incomplete.`);
        }
      }
      let lastSize = Infinity;
      for (const [i, item] of gaps.entries()) {
        const size = item?.size;
        if (!hasExactKeys(item, ['requirement', 'why', 'size']) || !isBoundedString(item.requirement, 240) || !isBoundedString(item.why, 300) || !Number.isInteger(size) || size < 1 || size > 5) {
          problems.push(`Fit gap ${i + 1} is invalid.`);
        }
        else {
          if (size > lastSize) problems.push('Fit gaps are not ordered largest first.');
          lastSize = size;
        }
      }

      // See MIN_GAP_TARGETED and MAX_GAP_TARGETED above for why this bound
      // sits where it does.
      if (Array.isArray(qs) && Array.isArray(gaps)) {
        const gapTargeted = qs.filter((q) => q?.targetsGap === true).length;
        if (gaps.length > 0 && (gapTargeted < MIN_GAP_TARGETED || gapTargeted > MAX_GAP_TARGETED)) {
          problems.push(`Expected between ${MIN_GAP_TARGETED} and ${MAX_GAP_TARGETED} gap-targeted questions for a resume with real gaps, got ${gapTargeted}.`);
        }
        if (gaps.length === 0 && gapTargeted > 0) {
          problems.push('No gaps were found, so no question can target one.');
        }
      }
    }
  }
  return problems;
}

/** @returns {string[]} Problems with one scoring response. Empty means usable. */
export function validateScoreResponse(data) {
  const problems = [];
  const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
  const hasExactKeys = (value, keys) => isRecord(value)
    && Object.keys(value).length === keys.length
    && keys.every((key) => Object.hasOwn(value, key));
  const isBoundedString = (value, maxLength) => typeof value === 'string'
    && value.length >= 1
    && value.length <= maxLength
    && value.trim().length > 0;

  if (!isRecord(data)) return ['Response was not an object.'];
  if (!hasExactKeys(data, ['scores', 'missed', 'modelAnswer'])) problems.push('Response has an invalid object shape.');
  if (!hasExactKeys(data.scores, AXES)) problems.push('Scores has an invalid object shape.');
  else for (const axis of AXES) {
    const v = data.scores[axis];
    if (!Number.isInteger(v) || v < 1 || v > 5) problems.push(`Axis ${axis} is not an integer from 1 to 5.`);
  }
  if (!Array.isArray(data.missed) || data.missed.length > 6 || data.missed.some((point) => !isBoundedString(point, 320))) problems.push('Missing missed points array.');
  if (!isBoundedString(data.modelAnswer, 1400)) problems.push('Missing model answer.');
  return problems;
}
