// Function-down path stand-in (task.md T16). The See the example button
// renders src/lib/example.json instead of calling the analyse function, so
// the demo still works with no server. Start.svelte's real Start practice
// button calls setPosting directly (session.svelte.js) and never reaches
// this file.
//
// The session question shape (session.svelte.js) has no modelAnswer field,
// so it is attached on the question object here for the tips screen to
// read.

import example from './example.json';
import { session } from './session.svelte.js';

export function loadExample() {
  const scored = new Map(example.scores.map((s) => [s.questionId, s]));

  session.brief = example.brief;
  session.fitMatch = example.fitMatch;
  session.questions = example.questions.map((q) => {
    const s = scored.get(q.id);
    return {
      id: q.id,
      prompt: q.prompt,
      sourceQuote: q.sourceQuote,
      targetsGap: q.targetsGap,
      answer: s?.answer ?? null,
      scores: s?.scores ?? null,
      missed: s?.missed ?? [],
      modelAnswer: s?.modelAnswer,
    };
  });
  session.current = 0;
  session.error = null;
  session.phase = 'ready';
}
