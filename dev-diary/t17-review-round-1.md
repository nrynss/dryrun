# T17 review — round 1

Date: 2 September 2026 (design.md Revision 2)
Reviewer: ReviewT17 (adversarial, read-only)
Scope: `src/lib/Plan.svelte`, `src/lib/ListBlock.svelte`, `src/lib/FitList.svelte`
(new, untracked), `src/App.svelte` (modified) — Your practice screen 9.3,
list block 8.9, fit item 8.10, question cards 8.7, action bar 7.3, copy deck
11.4, banned copy 3.2, accessibility 13. Binding spec: design.md Revision 2.

**Verdict: APPROVE — 0 P1, 0 P2, 0 P3.**

The T17 surface is faithful to the spec and the judge view works end to end.
Every numbered item in the change list was verified in a real browser
(headless Chromium against `npm run build` + `npx vite preview`, 360px and
900px) and by code reading: 9.3 order and gating, ListBlock 8.9 pixel-exact,
FitList 8.10 pixel-exact with `size` never rendered and "gap" absent from
visible text, no placeholders, no horizontal scroll, one `<h1>`, sticky/static
action bar, all four design tensions implemented per the rulings, zero banned
copy on the rendered screen, exact scope, and a clean build. `Start practice`
flips `session.phase` to `interviewing` and App falls back to the T14 harness.
No commits made; nothing outside the listed files touched.

## Findings by severity

None.

## Design tensions (adjudicated, recorded)

All four tensions from the change list were implemented as ruled. Each is
recorded as *decided*, not as a finding.

- **(a) 8px vs 12px heading rhythm in ListBlock** — `ListBlock.svelte:20-23`
  sets `.heading { margin: 0 0 8px 0 }` (measured 8px), while the fit and
  questions section headings use 12px (`Plan.svelte:132-135`, measured 12px).
  Ruling applied: 8.9 is "specified to the pixel", so the pixel-exact
  component spec wins inside the list block; 7.2's 12px rhythm governs the
  headings 8.9 does not cover. Correct split.
- **(b) wordmark → title gap** — 9.3 item 1-2 does not name a gap; implementer
  used 12px (`Plan.svelte:109-112`, measured 12px), per 7.2 "between a heading
  and its first child: 12px". Decided; consistent with the rhythm rule. (The
  Start screen uses 16px for the same pair, but 9.3 is silent and 7.2 is the
  stated rule — acceptable.)
- **(c) fit-section heading spec** — 8.10 gives no section-heading spec;
  implementer reused `t-h3`, `--ink`, 12px margin-bottom (`Plan.svelte:132-135`),
  matching 7.2 and the other sections. Decided.
- **(d) Show all placement** — quiet button sits under the gap panel,
  left-aligned (inline-flex, `width: auto`), 8px margin-top
  (`Plan.svelte:138-140`; measured gap panel → button = 8px). Decided.

One further spec-internal tension surfaced and is recorded as decided, same
logic as (a): 8.9 fixes each list item's `margin-bottom: 10px`, and 9.3 fixes
32px between sections; with both applied literally the visual gap from the
last dot item to the next section heading is 42px (10px + 32px). Both specs
are pixel-exact and cannot both hold; the component spec governs the item,
so this is accepted, not a defect.

## Checklist

**1. 9.3 order and content — PASS.** Browser heading order (DOM order =
visual order): `H1 "Your practice is ready"` → `H2 "What this job is really
about"` → `H2 "Worth reading before you go"` → `H2 "They may go deeper on
these"` → `H2 "You already have this"` → `H2 "Things they may ask you about"`
→ `H2 "Your 8 questions"`. Wordmark `Dry Run` is `t-h2` in `--strong`
(measured rgb(27,94,74)) with 24px top padding (`.plan` padding-top measured
24px). Title `t-h1` 12px below the wordmark; sub-line `t-body` 12px below the
title. Low-confidence strip: with the fixture (`high`) absent; forcing
`session.brief.confidence = 'low'` in the live page renders the `--note`
MessageStrip (`role="status"`) with `copy.warn.thin_advert` directly under the
sub-line; restoring `high` removes it. owns/study/angles list blocks render 4
items each. Fit sections render only when `fitMatch` exists and confidence is
`high` (verified: evidenced panel 3 rows on `--strong-wash`, gaps panel 3 rows
on `--note-wash`). `Your 8 questions` renders 8 QuestionCards with a 12px gap
(measured). Action bar (7.3) holds one primary `Start practice`; clicking it
sets `session.phase = 'interviewing'` and App falls back to the T14 harness
(8 cards, no `<h1>`).

**2. ListBlock 8.9 exact — PASS.** All measured in the live page: heading
`t-h3` `--ink` margin-bottom 8px; `<ul>` `list-style: none`, `padding: 0`
(plus `margin: 0`, the 8.9 default); item `t-body` `--ink`, padding-left 22px,
position relative, margin-bottom 10px; marker a 6px round dot (`border-radius:
999px`) in `--strong` at left 4px, top 0.7em (computed 11.9px = 0.7 × 17px
line). Dot is `aria-hidden="true"`; heading element is `<h2>` with the `t-h3`
class (one `<h1>` per screen, 13).

**3. FitList 8.10 exact — PASS.** Measured: evidenced panel background
rgb(234,243,239) = `--strong-wash`; gaps panel rgb(233,240,249) =
`--note-wash`; padding 12px, border-radius 8px, 8px row gap. Requirement
`t-body-b` 600 weight `--ink`; evidence/why `t-small` 15px `--ink-quiet`
(rgb(85,89,95)) with 4px top margin. `size` is never referenced outside the
header comment — never rendered. The word "gap" appears nowhere in visible
text (full-text scan of the rendered screen: zero hits; the heading is the
caller's `plan.may_ask`, "Things they may ask you about"). Show all/Show less
use deck keys `btn.show_all` / `btn.show_less` (the latter is the documented
deck addition carried from T14, `copy.js:6-10,45`) and are real `<button>`
controls: measured 48×113, 8px below the panel. Top-3 preview: 3 rows shown,
`Show all` expands to 4, label flips to `Show less` and collapses back.

**4. No placeholders — PASS.** Rendered text contains no `{`, `}`, `undefined`,
`null` or `NaN` (full-text scan). Deck strings substitute cleanly; fixture
strings carry no braces.

**5. Spacing and layout — PASS.** `.sections` gap 32px (measured) and 32px
below the sub-line; `.plan` padding 24px top / 32px bottom. Single column;
DOM order is screen order. `documentElement.scrollWidth` == clientWidth at
both 360px (360/360) and 900px (900/900) — no horizontal scroll. Exactly one
`<h1>` per screen (measured 1 on the plan screen). Action bar: `position:
sticky` at 360px, `static` with no border-top and no inline padding at 900px
(existing `.actionbar` CSS, 7.3).

**6. Design tensions — PASS.** All four adjudicated as above, matching the
rulings in the change list.

**7. Banned copy (3.2) — PASS.** Zero hits for the full ban list (analyse,
analyze, agent, tool call, tool-call, WebMCP, MCP, phase, adjudicate, rubric,
axis, axes, score, verdict, band, gap, deficiency, candidate, assessment,
character count) in the rendered screen text, button labels, and all
attributes (aria-*, title, placeholder) on the plan screen. Phase-name
`interviewing` exists only in code, never as a status label.

**8. Scope — PASS.** `git status` shows exactly the three new files
(`src/lib/ListBlock.svelte`, `src/lib/FitList.svelte`, `src/lib/Plan.svelte`,
untracked) + `src/App.svelte` (modified) + the four parallel T09-T12 files
(`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`,
`test/analyze-contract.test.mjs`), which this review did not touch and does
not flag. Nothing else. The App.svelte diff is limited to the `Plan` import,
the `phase === 'ready'` branch, and the harness comment.

**9. Build + judge view — PASS.** `npm run build` succeeds (142 modules; only
the pre-existing pdfjs chunk-size warning). Browser judge view at 360px and
900px: full fixture renders (owns/study/angles 4 each, evidenced 3, gaps 3 +
`Show all` → 4), `Start practice` flips to `interviewing`, App falls back to
the eight-question harness. No console errors, no page errors.

## Unverified / notes

- Nothing on the plan screen was unverifiable in the browser; all measured
  values above are from the live page.
- One out-of-scope observation, recorded for completeness only (pre-existing,
  not introduced by this patch, so not a finding): `index.html`'s `<meta
  name="description">` contains the banned word "scores" ("…the page scores
  every answer"). It is not primary product copy and predates T17; flagging
  for the main agent in case the T19 copy pass wants to scrub it.
- The T14 QuestionCard quote toggle ("Show all"/"Show less" per card below
  480px) renders alongside the gap section's toggle on this screen; it is
  T14's approved 3.5 behaviour, not T17 scope.
