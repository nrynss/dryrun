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
  /** @type {Array<{ prompt: string, sourceQuote: string, answer: string|null, scores: object|null, missed: string[] }>} */
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

/**
 * T02 gate version. Stores the posting and flips phase, with no inference.
 * T24 replaces the body with a real call to /api/analyze.
 */
export function setPosting(text) {
  const posting = (text ?? '').trim();

  if (!posting) {
    session.error = 'Paste the job posting first.';
    return { ok: false, error: session.error };
  }
  if (posting.length > MAX_POSTING_CHARS) {
    session.error =
      `Posting is ${posting.length.toLocaleString()} characters. ` +
      `The limit is ${MAX_POSTING_CHARS.toLocaleString()}. Paste the role and ` +
      `requirements sections rather than the whole page.`;
    return { ok: false, error: session.error };
  }

  session.error = null;
  session.posting = posting;
  session.phase = 'ready';
  return { ok: true, chars: posting.length };
}

export async function setResume(text) {
  throw new Error('not implemented');
}

export function getBrief() {
  return session.brief;
}

export function startInterview() {
  throw new Error('not implemented');
}

export async function submitAnswer(transcript) {
  throw new Error('not implemented');
}

export function getVerdict() {
  throw new Error('not implemented');
}
