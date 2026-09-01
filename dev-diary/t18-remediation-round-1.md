# T18 remediation — round 1

Date: 2 September 2026 (design.md Revision 2)
Author: RemedT18 (subagent)
Source: `dev-diary/t18-review-round-1.md` (round-1 verdict: REMEDIATE, 0 P1, 2 P2, 0 P3)
Scope: `src/lib/Tips.svelte` (new, untracked), `src/App.svelte` (modified) — the
only files changed; the user's four parallel files and the rest of the T18
work were read but not touched. No commits made; the only file written beyond
the two fixes is this diary.

**Closure: both P2 findings remediated, verified in a real browser against
`npm run build` + `npx vite preview`; round-1 verdict clears to APPROVE.**

## P2-1 — Answered-but-unscored questions must show their answer

- **Review said**: the full question block was conditional on
  `q.answer && q.scores` (`Tips.svelte:87`), so an answered-but-unscored
  question (typing in practice — R1 binds the box to session state — or the
  sanctioned `err.score_failed` "Your answer is saved" flow, 11.9) fell into
  the prompt-only `{:else}` and the answer silently vanished, contradicting
  9.5's `What you said` / `{answer}` for every answered question.
- **Changed** (`src/lib/Tips.svelte`):
  - line 87: branch condition `{:else if q.answer && q.scores}` →
    `{:else if q.answer}`;
  - lines 90 + 113: added `{#if q.scores}` / `{/if}` gating the score-dependent
    sections — the `What to add` ListBlock, `A good answer could say` +
    modelAnswer, and the `See the scores` disclosure (ScoreRow + source quote),
    mirroring Practice's `question?.scores` partial-state gating;
  - line 115: updated the `{:else}` comment — it now reads "no answer, not
    skipped", matching the actual condition (the answered-unscored case no
    longer shares that branch).
- **Resulting render**: answered → Question {n}, prompt, `What you said`,
  answer, and no score sections when scores are absent; skipped → strip and
  nothing else (unchanged, still takes precedence); unanswered → prompt-only
  card (unchanged, T19 gap comment intact); answered + scored → full block
  unchanged.
- **Verified** (headless Chromium, `npm run build` + `npx vite preview` at
  4173, console session manipulation): with phase `done` and four questions —
  (1) answered + scored shows What you said/answer, What to add + missed, A
  good answer could say + modelAnswer, See the scores with four rows (Detail
  4 → 80% `fill-good`, Proof 3 → 60% `fill-mid`, Clear order 3 → 60%
  `fill-mid`, Fits the job 4 → 80% `fill-good`) and the quote; (2) answered,
  scores null shows Question 2, prompt, What you said, the answer and no What
  to add / good answer / See the scores; (3) skipped shows only the strip; (4)
  unanswered shows prompt only. Zero page errors during all renders.

## P2-2 — Restore the example import for the unexpected-phase fallback

- **Review said**: the T18 diff replaced `import example from
  './lib/example.json'` with the Tips import but kept the fallback `{:else}`
  branch iterating `example.questions`, so any unknown `session.phase` threw
  `ReferenceError: example is not defined` during render and the safety net
  failed, leaving stale UI.
- **Changed** (`src/App.svelte`, lines 3-6): restored the one-line
  `import example from './lib/example.json';` (the Tips import is kept), with
  a comment noting the import exists only for the fallback harness and that
  T19 removes the branch and the import together.
- **Verified** (same environment): `window.session.phase = 'bogus'` renders
  the fallback harness — eight QuestionCards from example.json — with zero
  page errors (captured via `window` `error` + `unhandledrejection`
  listeners installed before the phase change; previously this fired the
  ReferenceError).

## Build

`npm run build` passes (the >500 kB chunk-size warning is the pre-existing
environmental one noted in round 1, unchanged). `git status --short` shows
only `src/lib/Tips.svelte` and `src/App.svelte` changed beyond the existing
T18 uncommitted work (`src/app.css`, `src/lib/ResultPanel.svelte`,
`src/lib/ScoreRow.svelte`, this diary, the round-1 review diary) and the
user's four parallel files (`dev-diary/project.md`,
`netlify/functions/analyze.mts`, `src/lib/shapes.js`,
`test/analyze-contract.test.mjs`), which are untouched. No commits.

## Carry-forwards (unchanged T19 items)

- The unanswered-questions deck-string gap: design 9.5 specifies a strip only
  for skipped, and there is no deck string for "you did not answer this"; the
  prompt-only render for a genuinely unanswered question remains, flagged for
  T19, which owns the Section 10 state table. (Ruling (a).)
- The round-1 doc notes also remain for design.md: 14.1's fourth verdict
  literal should read 3.67, not 3.75 (ruling (b)); 3.2's blanket word ban
  contradicts the deck's own `btn.see_scores` = "See the scores" mandated by
  9.5 (doc note (i)); fixture content is not product copy (doc note (ii)).
