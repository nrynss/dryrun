# T18 review — round 2

Date: 2 September 2026 (design.md Revision 2)
Reviewer: ReviewT18R2 (adversarial, read-only)
Source: `dev-diary/t18-review-round-1.md` (round-1 verdict: REMEDIATE, 0 P1,
2 P2, 0 P3) and `dev-diary/t18-remediation-round-1.md` (claim: both P2s fixed).
Scope: verify the two remediations in code and a real browser, re-run the
round-1 PASS checks for regressions, confirm build and scope. Read-only on
code; the only file written is this diary. The user's four parallel files
(`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`,
`test/analyze-contract.test.mjs`) were not touched. No commits, no deploy.

**Verdict: APPROVE — 0 P1, 0 P2, 0 P3.** (Round-1 verdict clears; the
remediation is correct, complete, and regression-free.)

## Findings by severity

None. Both P2 findings from round 1 are properly closed:

- **P2-1** — `Tips.svelte:87` now branches `{:else if q.answer}` and the
  score-dependent sections (`What to add` + missed ListBlock, `A good answer
  could say` + modelAnswer, the `See the scores` disclosure with ScoreRow +
  source quote) are gated `{#if q.scores}` (lines 90-113), mirroring
  Practice's partial-state pattern. The `{:else}` comment now reads "no
  answer, not skipped", matching the actual condition. Verified in the
  browser: answered+scored → full block (3 h2s, missed list 2 items, 4
  ScoreRows, quote); answered-but-unscored → `Question {n}`, prompt, `What
  you said`, the answer, and **no** What to add / good answer / See the
  scores / details / rows / quote; skipped → strip and nothing else; truly
  unanswered → prompt only, T19 gap comment intact. Zero page errors across
  all four renders (window `error` + `unhandledrejection` listeners installed
  from the first document).
- **P2-2** — `App.svelte:6` restores `import example from
  './lib/example.json';` with the comment that the import exists only for the
  fallback harness and that T19 removes branch and import together. Verified:
  `session.phase = 'bogus'` renders the eight-QuestionCard harness from
  example.json with zero page errors (round 1 fired `ReferenceError: example
  is not defined` on the same probe).

## Checklist

**1. P2-1 fix (four render shapes) — PASS.** All four shapes verified in a
real browser (headless Chromium, `npm run build` + `npx vite preview`,
console session manipulation) with zero page errors: answered+scored →
full block; answered-but-unscored → Question {n}, prompt, What you said,
answer, and NO score sections (no What to add, no A good answer could say, no
See the scores, no details, no score rows, no quote); skipped → strip only
(`role="status"`, no headings); unanswered → prompt only (T19 gap comment
intact in source, `Tips.svelte:115-121`).

**2. P2-2 fix (unknown phase fallback) — PASS.** `session.phase = 'bogus'`
renders the fallback harness: `.column.cards` with 8 QuestionCards, first
card carries q1's prompt; window error + unhandledrejection listeners report
zero errors (round 1: ReferenceError crash). `done` phase still routes to
Tips (branch ordering unchanged).

**3. No regressions in round-1 PASS items — PASS.** All re-verified:
- **9.5 order**: wordmark `t-h2 --strong` rgb(27,94,74), 24px top padding →
  one h1 "Your tips for next time" → `.result` 16px below → `.blocks` 32px
  with 16px gap, eight cards in fixture order → action bar with quiets above
  primary. DOM order matches visual order.
- **14.1 verdict cases**: all four reachable and correct — ready
  (panel-strong / --strong-wash / "You are ready" / ready_line), nearly
  (panel-almost / --almost-wash / "Nearly ready" / nearly_line), not-yet
  content (panel-note / --note-wash / "Keep practising" / notyet_line),
  capped (panel-note, capped_line with `{answered}`=3, capped_kind present
  for fixture avg 3.67 ≥ 3; absent for avg 2.0). Arithmetic still 3.667 →
  "3.7" (the doc's 3.75 remains a round-1-recorded doc slip, not a code
  defect).
- **ResultPanel (8.11 + 3.4 + 11.7)**: band colours, 24px padding, `t-display`
  title in band colour, line `t-body --ink` mt 8px, "See the numbers" summary
  t-micro 44px → "You answered 3 of 8 questions." / "Your answers averaged 3.7
  out of 5." / four axis means (Detail 4, Proof 3, Clear order 3.3, Fits the
  job 4.3).
- **ScoreRow (8.12)**: 4 rows in AXES order; name 120px flex none; bar 8px /
  radius 4px / --edge bg / 1px --edge-firm border; fill (v/5*100)% in band
  colour (5→100% --strong, 4→80% --strong); value 28px right-aligned; row
  min-height 32px, gap 12px; quote label "From the job advert", straight
  quotes, 3px --edge-firm rule, 12px pad, summary 44px.
- **Print stylesheet**: print media computed — white ground on
  :root/html/body/.page, `.actionbar` display none, no card/panel shadows;
  practice screen `.chatline`, `.segments`, `p.t-micro.label` hidden; screen
  media unchanged (--paper ground, shadows present). Print button opens all 4
  `<details>` then calls `window.print()` (stubbed, 1 call).
- **Action bar**: quiets (Practise a different job, Print or save these tips,
  48px each, 8px gap) above primary Try again (52px); Try again → current 0 +
  phase interviewing; Practise a different job → full 10-field reset, phase
  idle, Start screen renders; Print semantics verified.
- **One h1** on the tips screen; **no horizontal scroll** at 900px or 360px.
- **Scope**: `git status --short` — beyond the existing T18 uncommitted work
  (`src/app.css`, `src/lib/ResultPanel.svelte`, `src/lib/ScoreRow.svelte`,
  the two diary records), only `src/lib/Tips.svelte` and `src/App.svelte`
  changed; `App.svelte` diff is the import restore + comment (P2-2 fix) and
  the existing `done` branch; `app.css` remains a single additions-only append
  hunk. The user's four parallel files show their own pre-existing
  modifications only, untouched by this work.

**4. Build — PASS.** `npm run build` completes cleanly; the >500 kB chunk
warning is the pre-existing environmental one noted in round 1, unchanged.
Full UI-click path re-verified against the built output: Start → `Start
practice` → Plan → `Start practice` → Practice → Next ×2 → `Finish and show
my tips` → done → tips screen with capped "Keep practising".

## Verification environment and unverified items

Headless Chromium (google-chrome-stable `--headless=new`, CDP) against
`npm run build` + `npx vite preview` (strict port 4173). `window.error` and
`unhandledrejection` listeners injected via
`Page.addScriptToEvaluateOnNewDocument` before the first navigation, so the
zero-error claim covers the whole session (check Z1, 50/50 PASS). Driver and
results: `/tmp/t18verify2/drive.mjs`, `/tmp/t18verify2/results.json`
(50 PASS / 0 FAIL); screenshots in `/tmp/t18verify2/shots/`
(`r2-answered-unscored.png`, `r2-skipped.png`, `r2-done-capped-900.png`,
`r2-done-360.png`, `r2-fallback-bogus-phase.png`, `F1-ready.png`,
`F2-nearly.png`, `F3-notyet.png`, `r2-ui-path-done-capped.png`). Note: the
answered-unscored and skipped screenshots are byte-identical because at the
default viewport those cards sit below the fold — the per-card DOM assertions
targeted the cards directly and are authoritative.

Unverified (unchanged from round 1, non-blocking): an actual printed PDF
(verified the print-media computed styles and the open-details handler
instead — the stylesheet's contract is the media query); page-break /
pagination behaviour (the stylesheet adds none and 9.5 asks for none); the
action bar's sticky-vs-inline behaviour below 768px on the tips screen
(unchanged T13 rule, spot-checked at 900px). `npm run dev` was not used (it
crashes on the Netlify deno emulator — environment noise); build + preview
was the sanctioned path.
