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
});

export const MAX_POSTING_CHARS = 20_000;
export const MAX_RESUME_CHARS = 20_000;

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
