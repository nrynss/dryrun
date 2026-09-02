import { buildVerdict, validateBriefResponse, validateScoreResponse } from './shapes.js';
import { copy } from './copy.js';

// The capability layer. Both callers go through this file. The UI reads
// `session` directly and calls these functions. Every WebMCP tool calls the
// same functions. So the page never tells a human and an agent different
// things.
//
// `session` is a deep $state proxy. A nested write from inside an
// agent-invoked tool, such as session.questions[3].scores.evidence = 4,
// re-renders the page with no event dispatch and no manual redraw.

export const session = $state({
  /** @type {'idle'|'analysing'|'ready'|'interviewing'|'done'} */
  phase: 'idle',
  posting: null,
  resume: null,
  brief: null,
  fitMatch: null,
  /** @type {Array<{ id: string, prompt: string, sourceQuote: string, targetsGap: boolean, answer: string|null, scores: object|null, missed: string[], modelAnswer?: string }>} */
  questions: [],
  current: 0,
  error: null,
  /** True once an agent has called any tool. Drives the status strip. */
  agentSeen: false,
  /** @type {number|null} Millis of the most recent tool call. Drives the ChatGPT-line flash (design 3.3). */
  lastCallAt: null,
  /** Interface-block flag (Section 10 state 10): set when the brief call
   *  fails after retries. The Start screen shows err.service_down and the
   *  example button. */
  serviceDown: false,
  /** True while the worked example is on screen (Section 10 state 11):
   *  the plan screen shows notice.example. No tool ever sets this. */
  isExample: false,
  /** Section 10 state 12: set when the score call fails after retries. The
   *  practice screen shows err.score_failed under the answer box. The
   *  answer stays (R1). */
  scoreFailed: false,
  /** Section 10 state 20: true while a score call is in flight. The practice
   *  primary button shows its busy state. submitAnswer drives this directly,
   *  for a human press and for an agent's submit_answer call alike. */
  scoring: false,
});

export const MAX_POSTING_CHARS = 20_000;
export const MAX_RESUME_CHARS = 20_000;
// Design 15.6: the interface caps the answer at 6,000 characters, safely
// inside the 12,000-character MAX_SCORE_INPUT_CHARS budget. Its eventual home
// is shapes.js once the function track lands it (T07); it lives here for T19
// so the practice screen can enforce it (Section 10 state 14).
export const MAX_ANSWER_CHARS = 6_000;

// A brief request is allowed to change the session only while it is the most
// recent one. Aborting saves network work in browsers, while the generation
// check remains the authority because injected request functions (and a
// response already on its way back) need not honour AbortSignal.
let briefRequestGeneration = 0;
let activeBriefController = null;

// Scoring is a distinct request stream from brief generation. One submitted
// answer may only update the question it was made for; a later session change,
// navigation, or answer edit makes its eventual response stale.
let scoreRequestGeneration = 0;
let activeScoreController = null;

export const SESSION_STORAGE_KEY = 'dry-run.session.v1';
// Version 1 saved the raw CV, which conflicts with the browser-visible
// privacy promise. Keep the key so existing records can be actively removed,
// but reject their old envelope and write only the CV-free version 2 shape.
export const SESSION_STORAGE_VERSION = 2;

// Keep the accepted resume/brief/questions set outside the reactive draft.
// The Start screen binds its CV field directly to session.resume, so by the
// time setResume runs, that draft may already contain a replacement CV.
// This is therefore the only reliable rollback target for a failed CV update.
let lastAcceptedBriefProjection = null;

// The first analysis in a session has no accepted brief yet. Keep its stable
// entry projection separate from reactive state: while that request runs the
// latter is necessarily `analysing`, and must never become a rollback target.
// It preserves the accepted posting/CV input from the request boundary while
// deliberately remaining an idle, empty session.
let initialBriefProjection = null;

function inputError(message) {
  session.error = message;
  return { ok: false, error: message };
}

function normalizeText(text) {
  return (text ?? '').trim();
}

function validatePosting(posting) {
  if (!posting) return copy.err.empty_posting;
  if (posting.length > MAX_POSTING_CHARS) return copy.err.over_limit;
  return null;
}

function validateResume(resume) {
  if (!resume) return 'Paste your CV text first.';
  if (resume.length > MAX_RESUME_CHARS) {
    return (
      `CV is ${resume.length.toLocaleString()} characters. ` +
      `The limit is ${MAX_RESUME_CHARS.toLocaleString()}. Paste the most relevant sections.`
    );
  }
  return null;
}

function savedQuestions(questions) {
  return questions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
    sourceQuote: question.sourceQuote,
    targetsGap: question.targetsGap,
    answer: null,
    scores: null,
    missed: [],
  }));
}

function cloneBrief(brief) {
  return {
    owns: [...brief.owns],
    study: [...brief.study],
    angles: [...brief.angles],
    confidence: brief.confidence,
  };
}

function cloneFitMatch(fitMatch) {
  if (fitMatch === null) return null;
  return {
    evidenced: fitMatch.evidenced.map((item) => ({ ...item })),
    gaps: fitMatch.gaps.map((item) => ({ ...item })),
    confidence: fitMatch.confidence,
  };
}

function cloneQuestions(questions) {
  return questions.map((question) => ({
    ...question,
    missed: [...(question.missed ?? [])],
    scores: question.scores ? { ...question.scores } : null,
  }));
}

function buildBriefProjection(posting, resume, data) {
  return {
    posting,
    resume: resume || null,
    brief: cloneBrief(data.brief),
    fitMatch: cloneFitMatch(data.fitMatch),
    questions: savedQuestions(data.questions),
    current: 0,
    phase: 'ready',
    isExample: false,
    scoreFailed: false,
  };
}

function buildInitialBriefProjection(posting, resume) {
  return {
    posting,
    resume: resume || null,
    brief: null,
    fitMatch: null,
    questions: [],
    current: 0,
    phase: 'idle',
    isExample: false,
    scoreFailed: false,
  };
}

function captureBriefProjection() {
  return {
    posting: session.posting,
    resume: session.resume,
    brief: session.brief ? cloneBrief(session.brief) : null,
    fitMatch: cloneFitMatch(session.fitMatch),
    questions: cloneQuestions(session.questions),
    current: session.current,
    phase: session.phase,
    isExample: session.isExample,
    scoreFailed: session.scoreFailed,
  };
}

function captureResumeRollbackProjection() {
  if (!lastAcceptedBriefProjection) {
    // A CV can supersede the initial posting request before it accepts a
    // brief. Its rollback must use the request's stable entry state, not the
    // request-owned live `analysing` snapshot.
    if (initialBriefProjection) return initialBriefProjection;
    return captureBriefProjection();
  }

  // The live session belongs to the request currently in flight, so it may
  // only be a transient projection (notably phase: 'analysing'). Roll back
  // structural brief data from the last accepted owner instead. Answers and
  // position are user progress made after that acceptance and remain live.
  return {
    posting: lastAcceptedBriefProjection.posting,
    resume: lastAcceptedBriefProjection.resume,
    brief: cloneBrief(lastAcceptedBriefProjection.brief),
    fitMatch: cloneFitMatch(lastAcceptedBriefProjection.fitMatch),
    questions: cloneQuestions(session.questions),
    current: session.current,
    phase: lastAcceptedBriefProjection.phase,
    isExample: lastAcceptedBriefProjection.isExample,
    scoreFailed: lastAcceptedBriefProjection.scoreFailed,
  };
}

function applyBriefProjection(projection) {
  session.posting = projection.posting;
  session.resume = projection.resume;
  session.brief = projection.brief ? cloneBrief(projection.brief) : null;
  session.fitMatch = cloneFitMatch(projection.fitMatch);
  session.questions = cloneQuestions(projection.questions);
  session.current = projection.current;
  session.phase = projection.phase;
  session.isExample = projection.isExample;
  session.scoreFailed = projection.scoreFailed;
}

function beginBriefRequest() {
  supersedeActiveScoreRequest();
  activeBriefController?.abort();
  const controller = new AbortController();
  activeBriefController = controller;
  return { generation: ++briefRequestGeneration, controller };
}

// A local validation failure is still the latest user operation. It must
// invalidate an earlier request even though it has no request of its own:
// injected requests may ignore abort signals or already be resolving.
function supersedeActiveBriefRequest() {
  activeBriefController?.abort();
  activeBriefController = null;
  ++briefRequestGeneration;
}

function beginScoreRequest() {
  const controller = new AbortController();
  activeScoreController = controller;
  return { generation: ++scoreRequestGeneration, controller };
}

function supersedeActiveScoreRequest() {
  activeScoreController?.abort();
  activeScoreController = null;
  ++scoreRequestGeneration;
  session.scoring = false;
}

/**
 * Retires any score request in flight for the current question. A human
 * control that leaves the question before scoring settles (Skip, Finish
 * early) must call this so session.scoring cannot outlive the question it
 * describes. An agent never leaves a question mid-score, so this has no
 * tool equivalent.
 */
export function abandonScoring() {
  supersedeActiveScoreRequest();
}

function isCurrentScoreRequest(generation) {
  return generation === scoreRequestGeneration;
}

function finishScoreRequest(generation, controller) {
  if (isCurrentScoreRequest(generation) && activeScoreController === controller) {
    activeScoreController = null;
    session.scoring = false;
  }
}

function isCurrentBriefRequest(generation) {
  return generation === briefRequestGeneration;
}

function finishBriefRequest(generation, controller) {
  if (isCurrentBriefRequest(generation) && activeBriefController === controller) {
    activeBriefController = null;
  }
}

function supersededBriefResult() {
  return { ok: false, code: 'superseded' };
}

async function requestBrief(posting, resume, request, signal) {
  let response;
  try {
    response = await request('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task: 'brief', posting, ...(resume ? { resume } : {}) }),
      signal,
    });
  } catch {
    if (signal?.aborted) return supersededBriefResult();
    return { ok: false, code: 'network_error', error: 'We could not reach the analysis service. Please try again.' };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: response.status, code: 'invalid_response', error: 'The analysis service returned an unreadable response. Please try again.' };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: typeof data?.code === 'string' ? data.code : 'analysis_failed',
      error: typeof data?.error === 'string' ? data.error : 'Analysis could not be completed. Please try again.',
    };
  }

  // The endpoint adds transport-only `meta.usage`; validate only the three
  // persisted contract fields, whose shapes must remain exact. No other
  // top-level data is accepted from a successful response.
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || Object.keys(data).some((key) => !['brief', 'questions', 'fitMatch', 'meta'].includes(key))) {
    return { ok: false, status: response.status, code: 'invalid_response', error: 'The analysis service returned an unusable result. Please try again.' };
  }
  const briefData = {
    brief: data?.brief,
    questions: data?.questions,
    fitMatch: data?.fitMatch,
  };
  const problems = validateBriefResponse(briefData, { posting, requireFitMatch: Boolean(resume) });
  if (problems.length) {
    return { ok: false, status: response.status, code: 'invalid_response', error: 'The analysis service returned an unusable result. Please try again.' };
  }
  return { ok: true, data: briefData };
}

function restoreAfterPostingFailure() {
  session.phase = session.questions.length ? 'ready' : 'idle';
  session.serviceDown = true;
}

function restoreAfterResumeFailure(projection) {
  applyBriefProjection(projection);
  session.serviceDown = true;
}

function settlePostingValidation(problem) {
  // A bound field changes session.posting before this capability runs. The
  // invalid input is nevertheless the newest operation, so it owns a quiet
  // start-state projection and must retire every older request/result.
  supersedeActiveBriefRequest();
  supersedeActiveScoreRequest();
  lastAcceptedBriefProjection = null;
  initialBriefProjection = null;
  session.brief = null;
  session.fitMatch = null;
  session.questions = [];
  session.current = 0;
  session.phase = 'idle';
  session.serviceDown = false;
  session.isExample = false;
  session.scoreFailed = false;
  return inputError(problem);
}

function storeBrief(projection) {
  applyBriefProjection(projection);
  session.error = null;
  session.serviceDown = false;
  lastAcceptedBriefProjection = projection;
  initialBriefProjection = null;
}

/**
 * Stores a posting and asks the fixed brief function for the session's
 * grounded plan. `request` is injectable for focused tests; browser callers
 * use fetch and cannot bypass this capability.
 */
export async function setPosting(text, { request = globalThis.fetch } = {}) {
  const posting = normalizeText(text);
  const problem = validatePosting(posting);
  if (problem) return settlePostingValidation(problem);

  const resume = normalizeText(session.resume);
  const { generation, controller } = beginBriefRequest();
  // A new posting deliberately starts a different session. Do not let a
  // later CV failure restore the accepted projection for the old posting.
  lastAcceptedBriefProjection = null;
  initialBriefProjection = buildInitialBriefProjection(posting, resume);

  session.error = null;
  session.serviceDown = false;
  session.isExample = false;
  session.posting = posting;
  session.brief = null;
  session.fitMatch = null;
  session.questions = [];
  session.current = 0;
  session.phase = 'analysing';

  const result = await requestBrief(posting, resume, request, controller.signal);
  if (!isCurrentBriefRequest(generation)) return supersededBriefResult();
  if (!result.ok) {
    session.error = result.error;
    restoreAfterPostingFailure();
    finishBriefRequest(generation, controller);
    return result;
  }

  storeBrief(buildBriefProjection(posting, resume, result.data));
  finishBriefRequest(generation, controller);
  return { ok: true, chars: posting.length, brief: session.brief, questions: session.questions, fitMatch: session.fitMatch };
}

/**
 * Rebuilds the complete brief with the optional CV. The server's brief
 * contract requires two to four gap-targeted questions when it finds gaps,
 * so the returned set naturally re-aims roughly one third of the interview.
 */
export async function setResume(text, { request = globalThis.fetch } = {}) {
  // A brief/CV change replaces the question set, so no score for its former
  // question may remain active.
  supersedeActiveScoreRequest();
  const resume = normalizeText(text);
  // The CV textarea can update session.resume before this capability runs.
  // Capture the accepted projection first so local validation failures undo
  // that direct-bound draft just as request failures do.
  const previousProjection = captureResumeRollbackProjection();
  const problem = validateResume(resume);
  if (problem) {
    supersedeActiveBriefRequest();
    // An accepted brief is a ready projection. A held replacement request may
    // have changed only the transient phase to `analysing` before this direct
    // binding submitted an invalid draft, so do not restore that transient
    // state with the accepted data.
    if (previousProjection.questions.length) previousProjection.phase = 'ready';
    applyBriefProjection(previousProjection);
    // This is an input error, not an analysis outage. Clear a prior server
    // failure while preserving the validation feedback below.
    session.serviceDown = false;
    return inputError(problem);
  }
  if (!session.posting) return inputError('Paste the job posting before adding your CV.');

  const posting = session.posting;
  const { generation, controller } = beginBriefRequest();

  session.error = null;
  session.serviceDown = false;
  session.isExample = false;
  session.phase = 'analysing';

  const result = await requestBrief(posting, resume, request, controller.signal);
  if (!isCurrentBriefRequest(generation)) return supersededBriefResult();
  if (!result.ok) {
    restoreAfterResumeFailure(previousProjection);
    session.error = result.error;
    finishBriefRequest(generation, controller);
    return result;
  }

  storeBrief(buildBriefProjection(posting, resume, result.data));
  finishBriefRequest(generation, controller);
  return { ok: true, chars: resume.length, brief: session.brief, questions: session.questions, fitMatch: session.fitMatch };
}

export function getBrief() {
  return session.brief;
}

export function startInterview() {
  if (!session.brief || !session.questions.length) {
    return inputError('Build your practice questions before starting the interview.');
  }
  // Starting is a one-way transition from the untouched plan. A public
  // capability must not silently restart an interview whose answers have
  // already been scored: scores are inseparable from their transcript.
  const pristine = session.phase === 'ready' && session.questions.every((question) => (
    question.answer === null
    && question.scores === null
    && question.missed?.length === 0
    && question.modelAnswer === undefined
    && question.skipped !== true
  ));
  // The worked example ships pre-scored, so it can never be pristine. Exempt
  // it on its own plan screen only. Once the example interview starts it
  // carries real answers and real scores. It must not be restartable
  // (Section 10 note on state 10).
  const examplePlan = session.isExample && session.phase === 'ready';
  // A failed CV request can roll a plan with answers back to this screen
  // while its brief stays intact (restoreAfterResumeFailure). Resuming is
  // not restarting: it keeps session.current, so both callers re-enter at
  // the same question.
  const resumable = session.phase === 'ready' && !pristine && !session.isExample;
  if (!pristine && !examplePlan && !resumable) {
    return inputError('Start a new practice plan before starting another interview.');
  }
  supersedeActiveScoreRequest();
  session.error = null;
  // A pristine or example plan starts at question 1. A resumed plan keeps
  // its place.
  if (!resumable) session.current = 0;
  session.phase = 'interviewing';
  return { ok: true, question: session.questions[session.current] };
}

async function requestScore(answer, question, brief, request, signal) {
  let response;
  try {
    response = await request('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ task: 'score', answer, question, brief }),
      signal,
    });
  } catch {
    if (signal?.aborted) return { ok: false, code: 'superseded' };
    return { ok: false, code: 'network_error', error: 'We could not reach the analysis service. Please try again.' };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: response.status, code: 'invalid_response', error: 'The analysis service returned an unreadable response. Please try again.' };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: typeof data?.code === 'string' ? data.code : 'analysis_failed',
      error: typeof data?.error === 'string' ? data.error : 'Analysis could not be completed. Please try again.',
    };
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)
    || Object.keys(data).some((key) => !['scores', 'missed', 'modelAnswer', 'meta'].includes(key))) {
    return { ok: false, status: response.status, code: 'invalid_response', error: 'The analysis service returned an unusable result. Please try again.' };
  }
  const score = { scores: data.scores, missed: data.missed, modelAnswer: data.modelAnswer };
  if (validateScoreResponse(score).length) {
    return { ok: false, status: response.status, code: 'invalid_response', error: 'The analysis service returned an unusable result. Please try again.' };
  }
  return { ok: true, score };
}

/**
 * Saves and scores the spoken transcript against the immutable question and
 * brief returned by the accepted brief request. `request` is injectable so
 * lifecycle races can be tested without a provider call.
 */
export async function submitAnswer(transcript, { request = globalThis.fetch } = {}) {
  if (session.phase !== 'interviewing') {
    return inputError('Start the interview before submitting an answer.');
  }
  const current = session.current;
  const question = session.questions[current];
  if (!question || !session.brief) {
    return inputError('The current interview question is unavailable. Start the interview again.');
  }
  const answer = normalizeText(transcript);
  if (!answer) return inputError(copy.err.empty_answer);
  if (answer.length > MAX_ANSWER_CHARS) return inputError(copy.err.answer_long);
  if (session.scoring) {
    return { ok: false, code: 'scoring_in_progress', error: copy.busy.scoring };
  }

  // The answer belongs in the page even if scoring fails. Use narrow saved
  // context rather than the mutable session object, which may change while
  // the request is in flight.
  question.answer = answer;
  question.skipped = false;
  // Re-scoring (including a direct-bound edit) replaces the transcript before
  // its request can settle. Clear every artifact now, rather than leaving a
  // former score/model answer visible if the replacement request fails.
  question.scores = null;
  question.missed = [];
  delete question.modelAnswer;
  session.error = null;
  session.scoreFailed = false;
  session.scoring = true;
  const scoreQuestion = {
    id: question.id,
    prompt: question.prompt,
    sourceQuote: question.sourceQuote,
    targetsGap: question.targetsGap,
  };
  const scoreBrief = cloneBrief(session.brief);
  const { generation, controller } = beginScoreRequest();
  const result = await requestScore(answer, scoreQuestion, scoreBrief, request, controller.signal);

  // Abort alone is insufficient: test doubles and already-returning browser
  // requests can ignore it. Also reject a direct-bound answer edit or
  // navigation while the original request was pending.
  if (!isCurrentScoreRequest(generation)
    || session.phase !== 'interviewing'
    || session.current !== current
    || session.questions[current] !== question
    || question.answer !== answer) {
    finishScoreRequest(generation, controller);
    return { ok: false, code: 'superseded' };
  }
  if (!result.ok) {
    session.error = result.error ?? null;
    session.scoreFailed = result.code !== 'superseded';
    finishScoreRequest(generation, controller);
    return result;
  }

  question.scores = { ...result.score.scores };
  question.missed = [...result.score.missed];
  question.modelAnswer = result.score.modelAnswer;
  session.scoreFailed = false;
  session.error = null;
  if (current < session.questions.length - 1) {
    session.current = current + 1;
    finishScoreRequest(generation, controller);
    return { ok: true, question: session.questions[session.current] };
  }

  session.phase = 'done';
  const verdict = getVerdict();
  finishScoreRequest(generation, controller);
  return { ok: true, verdict };
}

export function getVerdict() {
  // Ignore hand-mutated or corrupt residue. Only a complete stored answer
  // with a validator-approved score contributes to the average or coverage.
  const scores = session.questions
    .filter((question) => typeof question?.answer === 'string'
      && question.answer.trim().length > 0
      && question.skipped !== true
      && validateScoreResponse({
        scores: question.scores,
        missed: question.missed,
        modelAnswer: question.modelAnswer,
      }).length === 0)
    .map((question) => ({ scores: question.scores }));
  return buildVerdict(scores);
}

function storageForBrowser() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function persistentSnapshot() {
  // The required privacy copy promises that a CV is never saved. A
  // resume-backed plan also carries CV-derived fit/gap material, so preserve
  // progress only for no-CV sessions instead of retaining either the source
  // text or a derived CV profile locally.
  if (session.resume !== null
    || session.fitMatch !== null
    || session.questions.some((question) => question.targetsGap === true)) return null;
  return {
    posting: session.posting,
    brief: session.brief ? cloneBrief(session.brief) : null,
    fitMatch: cloneFitMatch(session.fitMatch),
    questions: cloneQuestions(session.questions).map((question) => ({
      id: question.id,
      prompt: question.prompt,
      sourceQuote: question.sourceQuote,
      targetsGap: question.targetsGap,
      answer: question.answer ?? null,
      scores: question.scores ? { ...question.scores } : null,
      missed: [...(question.missed ?? [])],
      ...(typeof question.modelAnswer === 'string' ? { modelAnswer: question.modelAnswer } : {}),
      ...(question.skipped === true ? { skipped: true } : {}),
    })),
    current: session.current,
    phase: session.phase,
  };
}

function validPersistedSession(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).length !== 6
    || !['posting', 'brief', 'fitMatch', 'questions', 'current', 'phase'].every((key) => Object.hasOwn(value, key))) return false;
  if (typeof value.posting !== 'string' || validatePosting(value.posting)) return false;
  if (!['ready', 'interviewing', 'done'].includes(value.phase)
    || !Number.isInteger(value.current) || value.current < 0 || value.current >= value.questions?.length) return false;
  const briefData = {
    brief: value.brief,
    fitMatch: value.fitMatch,
    questions: Array.isArray(value.questions) ? value.questions.map((question) => ({
      id: question?.id,
      prompt: question?.prompt,
      sourceQuote: question?.sourceQuote,
      targetsGap: question?.targetsGap,
    })) : value.questions,
  };
  if (validateBriefResponse(briefData, { posting: value.posting, requireFitMatch: false }).length) return false;
  return value.questions.every((question) => {
    if (!question || typeof question !== 'object' || Array.isArray(question)
      || !Object.keys(question).every((key) => ['id', 'prompt', 'sourceQuote', 'targetsGap', 'answer', 'scores', 'missed', 'modelAnswer', 'skipped'].includes(key))
      || (question.answer !== null && (typeof question.answer !== 'string' || question.answer.length > MAX_ANSWER_CHARS))
      || !Array.isArray(question.missed)
      || (question.skipped !== undefined && typeof question.skipped !== 'boolean')) return false;
    if (question.scores === null) return question.modelAnswer === undefined && question.missed.length === 0;
    if (typeof question.answer !== 'string' || question.answer.trim().length === 0 || question.skipped === true) return false;
    return validateScoreResponse({ scores: question.scores, missed: question.missed, modelAnswer: question.modelAnswer }).length === 0;
  });
}

function removePersistedSession(storage) {
  try { storage.removeItem(SESSION_STORAGE_KEY); } catch { /* storage is unavailable */ }
}

/** Writes only a completed, schema-valid session. Storage failures stay local. */
export function persistSession(storage = storageForBrowser()) {
  if (!storage) return false;
  const value = persistentSnapshot();
  // A prior no-CV snapshot must not survive after the user adds a CV.
  if (!value || !validPersistedSession(value)) {
    removePersistedSession(storage);
    return false;
  }
  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ version: SESSION_STORAGE_VERSION, session: value }));
    return true;
  } catch {
    return false;
  }
}

/** Restores a versioned, schema-valid session; corrupt or old values are discarded. */
export function restoreSession(storage = storageForBrowser()) {
  if (!storage) return false;
  let saved;
  try {
    const raw = storage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return false;
    saved = JSON.parse(raw);
  } catch {
    removePersistedSession(storage);
    return false;
  }
  if (!saved || typeof saved !== 'object' || Array.isArray(saved)
    || Object.keys(saved).length !== 2
    || saved.version !== SESSION_STORAGE_VERSION
    || !Object.hasOwn(saved, 'session')
    || !validPersistedSession(saved.session)) {
    removePersistedSession(storage);
    return false;
  }

  supersedeActiveBriefRequest();
  supersedeActiveScoreRequest();
  applyBriefProjection({ ...saved.session, resume: null, isExample: false, scoreFailed: false });
  session.error = null;
  session.agentSeen = false;
  session.lastCallAt = null;
  session.serviceDown = false;
  session.scoring = false;
  lastAcceptedBriefProjection = {
    ...captureBriefProjection(),
    // Accepted brief projections are always ready; progress belongs to the
    // live restored session and remains available to resume.
    phase: 'ready',
  };
  initialBriefProjection = null;
  return true;
}

// Module evaluation happens during SSR too. Browser-only storage and effects
// stay behind this guard so Netlify can import the state module safely.
if (typeof window !== 'undefined') {
  restoreSession();
  $effect.root(() => {
    $effect(() => {
      JSON.stringify(session);
      persistSession();
    });
  });
}
