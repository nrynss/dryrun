// The capability layer. Both callers go through this file: the UI reads
// `session` directly and calls these functions, and every WebMCP tool calls
// the same functions. A human and an agent can never be told different things.
//
// `session` is a deep $state proxy, so a nested write from inside an
// agent-invoked tool -- session.questions[3].scores.evidence = 4 -- re-renders
// the page with no event dispatch and no manual redraw.

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
});

export const MAX_POSTING_CHARS = 20_000;
export const MAX_RESUME_CHARS = 20_000;

export async function setPosting(text) {
  throw new Error('not implemented');
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
