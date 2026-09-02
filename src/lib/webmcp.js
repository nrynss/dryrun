import { session, setPosting } from './session.svelte.js';

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
      execute: async ({ posting }) => {
        session.agentSeen = true;
        session.lastCallAt = Date.now();
        const result = await setPosting(posting);
        return {
          content: [
            {
              type: 'text',
              text: result.ok
                ? `Stored the posting, ${result.chars} characters. The page is now ready.`
                : result.error,
            },
          ],
        };
      },
    },
    { signal },
  );

  // TODO T30: set_resume, get_brief, start_interview, submit_answer, get_verdict.
  // submit_answer's description must state that the transcript is the USER'S
  // SPOKEN ANSWER. An agent that answers its own questions is a broken demo.

  return () => controller.abort();
}
