import {
  session,
  setPosting,
  setResume,
  getBrief,
  startInterview,
  submitAnswer,
  getVerdict,
} from './session.svelte.js';

// document.modelContext is the form the challenge specifies.
// navigator.modelContext is the compatibility fallback for older Chromium,
// never the other way round.
function modelContext() {
  return globalThis.document?.modelContext ?? globalThis.navigator?.modelContext ?? null;
}

/** Reports whether this browser exposes WebMCP at all. Drives the status strip. */
export function hasModelContext() {
  return modelContext() !== null;
}

// Design 3.3: flash on every call, including read-only ones. Record first so
// the flash starts while analysis is still in flight.
async function runTool(work) {
  session.agentSeen = true;
  session.lastCallAt = Date.now();
  const text = await work();
  return { content: [{ type: 'text', text }] };
}

function failureText(result) {
  const text = [result.error, result.code].filter(Boolean).join(' ');
  return text || 'The request could not be completed.';
}

/**
 * Registers every tool. Returns a teardown so Vite HMR can abort the previous
 * registration instead of stacking duplicate tools on every hot reload.
 */
export function registerTools() {
  const mc = modelContext();
  if (!mc) return () => {}; // page stays fully usable without an agent

  const controller = new AbortController();
  const { signal } = controller;

  document.modelContext.registerTool(
    {
      name: 'set_posting',
      description:
        'Store the job posting the user is interviewing for, and generate the brief and eight grounded interview questions.',
      inputSchema: {
        type: 'object',
        properties: {
          posting: { type: 'string', description: 'Full text of the job posting.' },
        },
        required: ['posting'],
      },
      annotations: { untrustedContentHint: true },
      execute: async ({ posting }) => runTool(async () => {
        const result = await setPosting(posting);
        return result.ok
          ? `Stored the posting, ${result.chars} characters. The page is now ready.`
          : failureText(result);
      }),
    },
    { signal },
  );

  document.modelContext.registerTool(
    {
      name: 'set_resume',
      description:
        'Optional CV text. Store it and generate the fit match and re-aimed interview questions.',
      inputSchema: {
        type: 'object',
        properties: {
          resume: { type: 'string', description: 'Full text of the user\'s CV or resume.' },
        },
        required: ['resume'],
      },
      annotations: { untrustedContentHint: true },
      execute: async ({ resume }) => runTool(async () => {
        const result = await setResume(resume);
        return result.ok
          ? `Stored the resume, ${result.chars} characters. The page is now ready.`
          : failureText(result);
      }),
    },
    { signal },
  );

  document.modelContext.registerTool(
    {
      name: 'get_brief',
      description:
        'Return what the role owns, what to study, and the angles they will push.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      annotations: { readOnlyHint: true },
      execute: async () => runTool(() => {
        const brief = getBrief();
        if (!brief) return 'No brief yet. Store a job posting first with set_posting.';
        return JSON.stringify(brief);
      }),
    },
    { signal },
  );

  document.modelContext.registerTool(
    {
      name: 'start_interview',
      description: 'Begin the interview session and return question 1.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      execute: async () => runTool(() => {
        const result = startInterview();
        return result.ok ? JSON.stringify(result.question) : result.error;
      }),
    },
    { signal },
  );

  document.modelContext.registerTool(
    {
      name: 'submit_answer',
      description:
        'Score one answer and return the next question or the verdict. The transcript is the user\'s spoken answer, transcribed from what they said out loud. Do not invent or submit an answer of your own.',
      inputSchema: {
        type: 'object',
        properties: {
          transcript: {
            type: 'string',
            description: 'The user\'s spoken answer, as transcribed.',
          },
        },
        required: ['transcript'],
      },
      execute: async ({ transcript }) => runTool(async () => {
        const result = await submitAnswer(transcript);
        if (!result.ok) return failureText(result);
        if (result.question) return JSON.stringify(result.question);
        return JSON.stringify(result.verdict);
      }),
    },
    { signal },
  );

  document.modelContext.registerTool(
    {
      name: 'get_verdict',
      description:
        'Return the band, per-question scores, missed points, and model answers.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      annotations: { readOnlyHint: true },
      execute: async () => runTool(() => JSON.stringify({
        verdict: getVerdict(),
        questions: session.questions,
      })),
    },
    { signal },
  );

  return () => controller.abort();
}
