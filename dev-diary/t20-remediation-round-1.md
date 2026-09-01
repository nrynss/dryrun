# T20 remediation — round 1

Date: 2 September 2026 (design.md Revision 2)
Author: RemedT20 (subagent)
Source: `dev-diary/t20-review-round-1.md` (round-1 verdict: NOT APPROVED — 1 P1, 1 P2, 1 P3)
Scope: `src/lib/QuestionCard.svelte`, `src/lib/ScoreRow.svelte`, `src/lib/Tips.svelte`
(print-path coordination only). The user's four parallel files
(`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`,
`test/analyze-contract.test.mjs`) were read but not touched; the pre-existing T20
uncommitted edits to `src/App.svelte`, `Button.svelte`, `ChatGPTLine.svelte`,
`FeedbackNote.svelte` were not touched either. No commits made; the only new file
written is this diary.

**Closure: all three findings (P1 × 1, P2 × 1, P3 × 1) remediated and verified in a
real browser against `npm run build` + `npx vite preview` (360×800, production build,
real fixture walked through the actual UI); round-1 verdict clears.**

## P1-1 — Question-change cross-fade stacks the two blocks; card height swings ~380px

- **Review said**: the keyed block's `transition:crossFade` keeps the outro-ing
  element in normal flow until its outro completes, so on every question change the
  old wrapper stays in flow and the new mounts below it — measured card height
  **414 → 763 → 384**, the two wrappers' rects `[193,573]`/`[573,922]` with zero
  vertical overlap, and the answer box displaced ~190px then snapping back. The
  opacity cross itself (160ms cubicOut) and reduced-motion instant swap were correct;
  only the stacking was wrong.
- **Changed** (`src/lib/QuestionCard.svelte`): wrapped the `{#key question}` block in a
  `<div class="stage">` (`position: relative`, new CSS rule) and split the single
  transition into `in:fadeIn` / `out:fadeOut`, exactly the review's P1-1 patch. `fadeIn`
  keeps the plain opacity fade; `fadeOut` first sets the node to
  `position: absolute; left: 0; right: 0; top: 0` (anchored to the stage) so the
  outgoing block is out of flow and fades out **over** the incoming content. Both keep
  the `mounted ? 160 : 0` first-mount gating and the `prefers-reduced-motion` check
  (now shared in a small `reduceMotion()` helper), so screen entry stays instant and
  reduced motion swaps in one frame.
- **Verified** (per-frame rAF sampling, 360×800, production build, fixture, practice
  screen, Q1→Q2 on the final build):
  - Card height: **383.8 (Q1 settled) → 354.1 from the first fade frame → 354.1
    settled**. The card height is the incoming content's height throughout the fade —
    max deviation from settled during the transition **0px** (no 380px balloon; the
    two heights differ only because Q2's content is naturally shorter). The answer box
    moves by the same 29.7px as the card height change — no ~190px displacement.
  - Both wrappers present for 10 frames (~160ms); the outgoing one is `absolute` and
    overlays the incoming `static` one with **320.1px vertical overlap** (same
    `[193, …]` left edge, old on top of new). Opacities cross 0.498/0.502 at t≈41ms
    (cubicOut — fast early), old reaches 0.001 at t≈158ms.
  - Reduced motion (CDP `Emulation.setEmulatedMedia`): swap within **one frame**
    (377.4 → 354.1, single static wrapper at opacity 1), **zero stacking frames**.
  - Earlier run on the same code (Q2→Q3): card 354.1 → 377.4 → 377.4, balloon 0px,
    overlap 320.1px — consistent.

## P2-2 — Print path: every closed disclosure's fill is 0-width at `window.print()` time

- **Review said**: `printTips()` opens every `<details>` and calls `window.print()`
  synchronously in the same task, but ScoreRow defers `filled = true` by two rAFs and
  the width transition then takes 300ms — measured **12/12 fills at width 0** at
  print-call time, fills only reaching full width ~350ms after the opens. The screen
  mechanism itself (first open 0 → 300.8px over ~270-300ms) was healthy.
- **Changed**:
  - `src/lib/ScoreRow.svelte`: `onMount` now registers a document-level
    `dryrun:prepare-print` listener (removed in the same cleanup that removes the
    `toggle` listener). The handler commits the print render synchronously:
    `flushSync(() => { noAnim = true; filled = true; })` — `flushSync` (imported from
    `svelte`) forces the state change into the DOM before the handler returns, because
    Svelte otherwise batches the flush to a microtask that would land after
    `window.print()`; `noAnim` (the P3 close class) drops the width transition so the
    width commits at its final value instead of starting a 300ms grow.
  - `src/lib/Tips.svelte` `printTips()`: opens every `<details>`, then dispatches
    `new CustomEvent('dryrun:prepare-print')`, **then** calls `window.print()`.
- **Verified** (tips screen, real fixture — 4 disclosures, 12 fills; `window.print`
  stubbed to snapshot the DOM synchronously at call time, then the actual
  "Print or save these tips" button clicked):
  - At print-call time: all 4 details open; **12/12 fills at final widths, zero
    0-width** — inline styles read `width: 100%` (×2), `width: 80%` (×5), `width: 60%`
    (×4), `width: 40%` (×1), i.e. exactly `(value/5·100)%`, and computed widths match
    the bar's content width × pct (104/83.2/62.4/41.6px on a 106px bar incl. 1px
    borders). Before the fix the same snapshot showed 12/12 at `width: 0%`.
  - Screen animation intact: on a fresh tips screen the first open grows the fill
    **0 → 104px (100%) monotonically over ~300ms** (9.5px at t≈50ms, 58px at
    t≈150ms, 104px settled); reduced motion renders full width within one frame
    (0 → 104 with no intermediate widths).

## P3-3 — Close → reopen does not replay from 0: a frozen mid-flight shrink resumes

- **Review said**: closing sets `filled = false`, starting a 300ms shrink that freezes
  when the details hides the content — measured the fill still at ~91% (300.8px) 400ms
  after close; reopening resumed the frozen shrink (300.8 → 273.4 on the first visible
  frame) then grew 273.4 → 300.8 in ~100ms: a dip then a fast partial refill instead of
  the spec'd 0 → full 300ms grow.
- **Changed** (`src/lib/ScoreRow.svelte`): added a `noAnim` state bound as
  `class:no-anim` on the `.rows` container, with `.no-anim .fill { transition: none; }`.
  The close branch of the toggle handler now sets `filled = false; noAnim = true` (the
  width commits to 0 instantly — no frozen timeline), and the open branch's double-rAF
  sets `noAnim = false; filled = true`, so every open grows from a committed 0. The
  first open and the reduced-motion paths are unchanged.
- **Verified** (tips screen, fixture; close a full disclosure, wait 400ms, reopen with
  per-frame sampling):
  - After close + 400ms: committed width **0px** (previously frozen ~91%/300.8px).
  - Reopen: first visible width **9.5px** at t≈36ms (0 for the first two open frames —
  the double-rAF), growing monotonically to **104px over ~300ms**; **zero dip frames**
  (no mid-flight resume, no width decrease at any sample).

## Build

`npm run build` passes (the >500 kB chunk-size warning is the pre-existing
environmental one, unchanged). `git status --short` shows only the three remediated
files changed beyond the pre-existing T20 uncommitted work and the user's four parallel
files, which are untouched. No commits.

## Deviations from the review's fix spec

- P1 applied exactly as the review's P1-1 patch (stage + split in/out, absolute out).
- P2: the review offered two mechanisms (delay the print, or a prepare-print event). The
  event mechanism was chosen; the one refinement beyond the review's wording is
  `flushSync` inside the handler — without it, Svelte 5 batches the `filled` state flush
  to a microtask and the DOM still reads 0-width at `window.print()` time (measured,
  first attempt). Tips.svelte was edited only for the dispatch-before-print, per the
  allowed scope.
- P3 applied as recommended (transition-none class on close, dropped on the reopen rAF).
