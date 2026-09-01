# T15 review — round 1

Date: 2 September 2026 (design.md Revision 2)
Reviewer: ReviewT15 (adversarial, read-only)
Scope: `src/lib/Practice.svelte`, `src/lib/ProgressRow.svelte`,
`src/lib/FeedbackNote.svelte` (new, untracked), `src/App.svelte` (modified) —
the Practice screen 9.4, progress row 8.6, feedback note 8.8, answer box 8.3,
action bar 7.3, copy deck 11.5/11.6/11.2/11.9, banned copy 3.2, accessibility
13. Binding spec: design.md Revision 2. The user's four parallel files
(`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`,
`test/analyze-contract.test.mjs`) were read but not touched.

**Verdict: APPROVE — 0 P1, 0 P2, 0 P3.**

The practice screen is faithful to the spec and the judge view works end to
end. Every numbered item in the change list was verified in a real browser
(headless Chromium via CDP against `npm run build` + the running
`npx vite preview` at 4173, at 360px and 900px) and by code reading:
9.4 order and spacing, ProgressRow 8.6 pixel-exact, FeedbackNote 8.8
pixel-exact with the fixture bands, empty-answer blocking with focus and
clear-on-type, skip with the additive `skipped` field, finish early, Show my
tips on Q8, display parity both directions, both placeholder/hint paths
(connected and not), no horizontal scroll, sticky/static action bar, zero
banned copy on the rendered screen, exact scope, and a clean build. Screenshots
from the verification run: `/tmp/t15shots/practice-900-q1.png`,
`/tmp/t15shots/practice-900-q1-details.png`,
`/tmp/t15shots/practice-900-blocked.png`, `/tmp/t15shots/practice-360-blocked.png`.
No commits made; nothing outside the listed files touched.

## Findings by severity

None.

## The two flagged design gaps (adjudicated, recorded)

Both were deliberately flagged by the implementer rather than guessed, which
is exactly what design.md lines 11-13 demand ("if you find a gap, treat it as
a bug in this document and say so rather than guessing"). Each is recorded as
*decided*, not as a finding.

### Ruling (a): no `<h1>` on the practice screen — WAIVER, documented

Decided: **accept with a documented waiver** (option i). Evidence:

- 9.4 enumerates the practice screen content and lists **no title element**;
  the copy deck 11.5 has **no practice-screen title string**. The deck is
  exhaustive ("Every user-visible string … No string is written inline in a
  component"), and design.md forbids inventing a word. Filing option (ii)
  (new deck string + sr-only h1) would invent copy the spec bans.
- The screen's dominant heading content **is the question** (t-question,
  22px→26px, weight 500 — the largest text on the screen, per 6.1). Start
  maps its main heading (the promise) to `<h1>` (`Start.svelte:42`); Plan
  maps its title to `<h1>` (`Plan.svelte:36`); both follow the "screen's main
  content is the h1" reading of checklist item 13.
- Option (iii) — making QuestionCard render the question as `<h1>` — is
  genuinely wrong: QuestionCard is also used on the Plan screen, which shows
  all eight questions (9.3 item 8); eight h1s would break the same checklist
  item there. The element is T14's reviewed, committed contract.

Consequence, recorded for T19's a11y gate: the Section 13 item "The document
has one `<h1>` per screen" is **waived for the practice screen**, with the
question as the de facto main heading; T19 must not re-flag this as a defect
without a design.md change adding a practice-screen title string.

### Ruling (b): ChatGPTLine's baked `margin-top: 24px` vs 9.4's 16px — OVERRIDE ACCEPTED

Decided: **the `.practice :global(.chatline) { margin-top: 0 }` override is
acceptable**; not a finding. Evidence:

- The override is scoped to `.practice`, documented with a comment
  (`Practice.svelte:146-150`), and verified in the built CSS and in the
  browser: computed `margin-top` is `0px` on the practice screen and `24px`
  on the Start screen (Start unchanged). The 16px comes from the column's
  `padding-block: 16px 32px` (9.4 item 1 "16px top padding"), and the 16px
  gap to the progress row from the column `gap: 16px` (9.4 item 2).
- CSS-order note: the override wins because the two rules have equal
  specificity (0,2,0) and Practice's style is emitted after ChatGPTLine's in
  the bundle — verified in `dist/assets/index-Bl8vBktP.css`
  (`.chatline.svelte-1lq3pnc` before `.practice.svelte-1anlf9a .chatline`).
  This is a latent fragility (a future import reorder would silently put 24px
  back), but it is the same `:global` override pattern the codebase already
  uses for child components (`Start.svelte:219-224`, `Plan.svelte:138-140`,
  `.actionbar-inner :global(.strip)` in all three screens).
- The hoist (ChatGPTLine carries no margin; Start adds 24px, Practice adds
  16px) is architecturally cleaner but touches T16's reviewed component and
  `Start.svelte` — outside T15 scope. Recorded here so T19/T20 can hoist if
  the margin ever moves again.

## Checklist

**1. 9.4 order — PASS.** Browser order (DOM order = visual order): ChatGPT
line (16px top padding, measured) → ProgressRow (16px column gap) →
QuestionCard (16px gap) → answer label `Your answer` + TextArea (8px block
margin + 16px column gap = 24px, measured; `min-height: 140px` measured) →
hint `t-small --ink-quiet` 8px under the box (state 19: connected + empty →
`hint.waiting`, else `practice.hint` — both paths verified) → FeedbackNote
when `question.scores` exists (16px column gap). Action bar: quiet `Skip this
one` above the primary; `Finish and show my tips` below Skip from
`current >= 2` (question 3 onward); primary becomes `Show my tips` on
question 8. No list of previous answers anywhere — only the current question
renders. Two full-width quiet buttons stacked with an 8px gap (the 7.3
limit).

**2. ProgressRow (8.6) — PASS.** Label `Question {n} of 8` with n =
current+1, `t-micro`, `--ink-quiet` (measured). Eight segments, `flex: 1`,
6px high, 3px radius, 4px gap (measured). Colours measured: answered (index <
current) `--strong` rgb(27,94,74); current `--ink` rgb(27,29,33); not reached
`--edge` rgb(221,220,216); skipped `--edge-firm` rgb(132,129,122), taking
precedence over answered. Row `aria-hidden="true"`; the label carries the
meaning; segments are `<span>`s, not buttons.

**3. FeedbackNote (8.8 + 5.2) — PASS.** Band = `scoreBand(answerAverage(score))`,
mapped good→`--strong`/`Strong answer`, mid→`--almost`/`Almost there`,
bad→`--note`/`Try adding one example` (5.2; bad band code-read, not reachable
from the fixture). Fixture bands verified in the browser: Q1 avg 4.25 → good
→ Strong answer; Q2 avg 3.0 → mid → Almost there; Q3 avg 3.75 → mid →
Almost there (all computed from the actual fixture scores). Wash background,
4px band-colour border-left, 8px radius, 14px 16px padding (all measured).
Title `t-h2` in the band colour; one sentence `t-body --ink` from
`missed[0]` via `feedback.one_thing`, or `feedback.nothing_missing` when
empty (code-read). `<details>` summary `See what to add` (`btn.see_add`),
`t-micro` at 44px (measured); inside: `What to add` `t-h3` + full missed
list (ListBlock), `A good answer could say` `t-h3` + `modelAnswer` `t-body`,
8px under the heading (9.5 pattern). Details opens on click (measured).

**4. Behaviours — PASS.** Next with empty/whitespace box: blocked; `--stop`
MessageStrip with `err.empty_answer` (`Type your answer first, or skip this
question.`) appears directly above the primary (measured), `role="alert"`,
`tabindex="-1"`, takes focus (activeElement measured), nothing advances,
answer not lost. Strip clears once the box has text (measured). Next with
text advances current (Q1→Q8, measured at each step). On Q8 the primary is
`Show my tips` and clicking it (with an answer) sets `phase = 'done'`
(measured). Skip sets `questions[current].skipped = true` (additive field,
commented T25-T30) and advances without the empty check (measured; also
clears a pending block). Finish early → `phase = 'done'` from question 3
onward (measured from Q6). Display parity R1: `bind:value` directly on
`session.questions[session.current].answer`; console-set answer fills the
box and typing writes session state (both measured).

**5. The two flagged design gaps — PASS, rulings recorded above.** (a) h1
waiver documented for T19's a11y gate; (b) `:global(.chatline)` override
accepted with the CSS-order note.

**6. Banned copy (3.2) — PASS.** Every new visible string comes from a deck
key (`practice.*`, `hint.waiting`, `btn.skip/finish_early/tips/next/see_add`,
`err.empty_answer`, `feedback.*`); no inline strings in any of the three new
files. Rendered-screen scan for the full ban list (including
score/verdict/gap/phase/agent/MCP/axis) found nothing on the practice screen
with the strip, note, and details all visible.

**7. Scope — PASS.** `git status`: T15 = `src/App.svelte` (modified) + the
three new files (untracked). The user's four parallel files are dirty and
untouched. New imports from `shapes.js` are exactly `TOTAL_QUESTIONS`
(Practice), `answerAverage` and `scoreBand` (FeedbackNote) — all three
confirmed present at HEAD (`git show HEAD:src/lib/shapes.js`). No new deck
keys were added to `copy.js` (not in the diff).

**8. Build + judge view — PASS.** `npm run build` succeeds (149 modules;
chunk-size warning is pre-existing and unrelated). Browser (headless
Chromium, CDP, against the preview at 4173): Q1→Q8 advance; the three scored
fixture answers show their feedback (Strong answer / Almost there / Almost
there); empty-answer block works with focus; skip marks the segment
`--edge-firm`; display parity both directions; Show my tips on Q8 → done;
finish early from Q3 onward → done (T18 harness renders); no horizontal
scroll at 360px or 900px (scrollWidth ≤ clientWidth, measured); action bar
`sticky` below 768px and `static` above, contents capped at 640px (measured).
Zero console errors and zero page exceptions across the whole run. Quiet
buttons 48px, primary 52px, 8px gap (measured).

## Not verified / verified by code only

- **Bad band (`--note`) and `nothing_missing`** — unreachable from
  `example.json` (no scored answer averages below 2.5, and all scored answers
  have `missed`). Verified by code reading only: `BAND_TITLE.bad` →
  `Try adding one example`, `.note-bad` classes, and the
  `missed?.length ? one_thing : nothing_missing` branch.
- **Keyboard tab order** was checked by DOM order (which equals visual order
  here) and label wiring, not by scripted Tab-key traversal.
- **Reduced motion, 200% zoom, focus-ring rendering** are T19/T20/T13
  checklist domains; not re-verified for this change beyond the focus ring
  being the global 5.3 rule.
- The `done` phase renders the T18 verification harness (App.svelte
  `{:else}`); only the phase transition and harness presence were verified —
  the tips screen itself is T18's scope.
