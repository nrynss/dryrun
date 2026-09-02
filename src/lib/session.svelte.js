import { validateBriefResponse } from './shapes.js';
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
  /** @type {number|null} Millis of the most recent tool call. Drives the ChatGPT-line flash (design 3.3). T25-T30 formalize. */
  lastCallAt: null,
  /** Interface-block flag (Section 10 state 10): set when the brief call
   *  fails after retries. The Start screen shows err.service_down and the
   *  example button. T25-T32 set it from the real call path. */
  serviceDown: false,
  /** True while the worked example is on screen (Section 10 state 11):
   *  the plan screen shows notice.example. T25-T32 wire the real analyze
   *  call; isExample is how the interface knows to show the notice. */
  isExample: false,
  /** Section 10 state 12: set when the score call fails after retries. The
   *  practice screen shows err.score_failed under the answer box; the
   *  answer stays (R1). */
  scoreFailed: false,
  /** Section 10 state 20: true while a score call is in flight. The practice
   *  primary button shows its busy state. The real score call (T28) drives
   *  this; the block flag is console-reachable. */
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

// Keep the accepted resume/brief/questions set outside the reactive draft.
// The Start screen will bind its CV field directly to session.resume in T32;
// by the time setResume runs, that draft may already contain a replacement CV.
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
  session.error = null;
  session.current = 0;
  session.phase = 'interviewing';
  return { ok: true, question: session.questions[0] };
}

export async function submitAnswer(transcript) {
  throw new Error('not implemented');
}

export function getVerdict() {
  throw new Error('not implemented');
}
