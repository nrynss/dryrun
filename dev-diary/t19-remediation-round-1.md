# T19 remediation — round 1

Date: 2 September 2026 (design.md Revision 2)
Author: RemedT19 (subagent)
Source: `dev-diary/t19-review-round-1.md` (round-1 verdict: NOT APPROVED, 0 P1, 2 P2, 0 blocking)
Scope: `src/lib/ScoreRow.svelte`, `src/lib/ResultPanel.svelte`, `src/lib/Plan.svelte`,
`src/App.svelte` (all already modified by the uncommitted T19 work) — the only files
changed beyond that work and the user's four parallel files (`dev-diary/project.md`,
`netlify/functions/analyze.mts`, `src/lib/shapes.js`, `test/analyze-contract.test.mjs`),
which were read but not touched. No commits made; the only new file written is this diary.

**Closure: both P2 findings remediated, verified in a real browser against
`npm run build` + `npx vite preview`; round-1 verdict clears to APPROVE.**

## P2-1 — Tips screen pans horizontally at 200% zoom / 360px (Section 13 gate)

- **Review said**: at a 180 CSS-px viewport (200% zoom on a 360px device) the tips
  screen measured `scrollWidth 197` vs `clientWidth 165` — the one Section 13 checklist
  item the interface failed. Two contributors: (1) the ScoreRow name is fixed at
  `width: 120px; flex: none` beside the 28px fixed value (8.12), so the row's min-content
  exceeds the ~149px column; (2) the result-panel title (`t-display`, `text-wrap:
  balance`) renders as one 148px line in a 67px box and holds the overflow even after the
  row fix. The review shipped a verified-in-browser fix: a `@media (max-width: 260px)`
  treatment relaxing the name (and only the name) below normal phone widths, plus the
  same breakpoint wrapping the title.
- **Changed**:
  - `src/lib/ScoreRow.svelte` lines 62-71: added the narrow-width media query —
    `.row .name` becomes `width: auto; min-width: 0; flex: 0 1 auto;
    overflow-wrap: anywhere`. The bar keeps `flex: 1` and the value stays fixed at
    `width: 28px; flex: none`, so 8.12 is pixel-exact at ≥260px and the treatment
    applies nowhere else.
  - `src/lib/ResultPanel.svelte` lines 100-107: same breakpoint — `.result-panel .title`
    gets `text-wrap: wrap; overflow-wrap: anywhere;` so the balance-wrapped title can
    break words instead of overflowing its 67px content box.
  - Both changes are scoped inside `@media (max-width: 260px)`; normal-width rendering
    is untouched (verified at 360px below).
- **Verified** (headless Chromium, `npm run build` + `npx vite preview` at 4173, fixture
  session with 3 scored answers, phase `done`):
  - At **180×600** viewport: `documentElement.scrollWidth === clientWidth` (180 = 180)
    with **all four disclosures closed** and again with **all four open** (score-row
    names visible in both — Chrome lays out hidden disclosure content). Sample row at
    180px: right edge 139px (inside the viewport), name `Detail` wraps
    (`overflow-wrap: anywhere` computed), bar `flex-grow: 1`, value `28px`, `flex: 0 0
    auto`. Title `Keep practising` fits its box (`clientWidth === scrollWidth`, 82 = 82).
  - At **360px** viewport: `scrollWidth === clientWidth` (360 = 360), title fits
    (262 = 262) — normal widths unchanged.
  - The plan screen with the state-11 notice is also scroll-free at 180px
    (`sw=cw=180`). Zero page errors throughout.

## P2-2 — State-11 worked-example notice renders from App.svelte instead of the plan screen

- **Review said**: Section 9.3 (with 8.13) — screens own their message strips; App.svelte
  is the phase map (Section 9) and rendering screen content there was a workaround for
  the frozen `Plan.svelte`/`fixture.js`. Section 10 state 11's "go to Your practice,
  `--note` strip at the top" is screen content and belongs in Plan.svelte.
- **Changed**:
  - `src/lib/Plan.svelte` lines 35-41: the `{#if session.isExample}` block now renders
    as the **first child of the `.plan` column**, above the wordmark, with the same
    `--note` MessageStrip (`role="status"`, `copy.notice.example`) that App.svelte used;
    lines 129-131 add the `.example-notice` wrapper style (`margin-bottom: 12px` — the
    column's existing 24px top padding and `.page` paper ground supply the top spacing
    the old App-level wrapper had to fake with its own background/margins). Trigger is
    `session.isExample`, unchanged (set by Start.svelte's `seeExample()`; the
    `loadExample({ asExample })` loader option stays Start-level per the review's ruling 3).
  - `src/App.svelte`: deleted the entire `{#if session.isExample}` block (was lines
    22-26), the `<style>` block that existed only for `.example-notice` (was lines
    36-53), the `MessageStrip` and `copy` imports that were used only by it, and the
    "Plan is frozen for T19, so the notice renders here beside the phase map" comment.
    The `ready` branch is now just `<!-- 3. Your practice (9.3). --> <Plan />`.
- **Verified** (same environment):
  - State 11 path: set `session.serviceDown = true` on Start → `err.service_down` strip
    and prominent "See the example" button render → clicked it → plan screen with the
    notice as the **first element child of `.column.plan`**, **above the wordmark**
    (`Dry Run`), text exactly `This is a worked example for a technical writing job. It
    is here so you can see how Dry Run works.` (the `copy.notice.example` string),
    class `strip strip-note`, `role="status"`, `isExample` true, `serviceDown` cleared.
  - Normal start: fresh load, posting set, "Start practice" → plan screen with **no**
    `.example-notice` (`isExample` false). Zero page errors in both paths.
  - `src/App.svelte` has no trace: grep for `notice|MessageStrip|isExample|copy\.`
    returns no matches.

## Build

`npm run build` passes (the >500 kB chunk-size warning is the pre-existing
environmental one noted in round 1, unchanged). `git status --short` shows only the four
remediated files changed beyond the existing T19 uncommitted work and the user's four
parallel files, which are untouched. No commits.

## Carry-forwards (unchanged T19 items)

- None beyond the existing notes: the T25-T32 formalization of the interface-block flags
  (`serviceDown`, `isExample`, `scoreFailed`, `scoring`) and the `loadExample({ asExample })`
  loader option stay in `session.svelte.js` / `Start.svelte` with their carry-forward
  comments (review ruling 3). The round-1 observations (`Tips.svelte:22` comment
  "Reachable by skipping every question", and the unreferenced `err.service_down_action`
  deck string) are deck/comment notes, not defects, and remain as recorded.
