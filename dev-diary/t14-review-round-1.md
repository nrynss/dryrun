# T14 review — round 1

Date: 1 September 2026 (design.md Revision 2)
Reviewer: ReviewT14 (adversarial, read-only)
Scope: `src/lib/Card.svelte`, `src/lib/Button.svelte`, `src/lib/QuestionCard.svelte` (new), `src/App.svelte` (modified) — question card 8.7 + source quote 3.5, card 8.1, button 8.2.

**Verdict: REMEDIATE — 0 P1, 0 P2, 1 P3.**

The four files are faithful to the spec and the judge view is correct at both
target widths. One P3 remediation is filed (global `box-sizing`); it is a
preventive interface-block recommendation, not a defect in the T14 code.
`npm run build` passes (vite, 122 modules, no warnings). No commits made;
nothing outside the four files touched.

## Findings by severity

### P3-1 — app.css has no global `box-sizing`; add one before 8.3 lands

- **File**: `src/app.css` (T13, committed) — remediation target; the trigger
  is the decision in `src/lib/Button.svelte:39-40`.
- **Spec vs code**: Section 8 says "Every component below is specified to the
  pixel." `app.css` sets no `box-sizing`, so the default `content-box` applies
  everywhere. Button.svelte scopes `box-sizing: border-box` to itself (line 40)
  so the 8.2 heights are exact totals — verified: computed height 48px with the
  1px border included. That is correct, but it solves the problem once, for one
  component. Section 8.3 (T16) specifies the textarea as `width: 100%`,
  `padding: 12px 14px`, `border: 1px solid`, `min-height: 160px/140px`. Under
  `content-box` the textarea's outer width becomes 100% + 28px + 2px: at 360px
  viewport that is 358px against a 328px column, and at 480px 462px against
  432px — a horizontal overflow on every screen, which Section 13's checklist
  bans ("Page zooms to 200% at 360px with no horizontal scroll"). 8.8, 8.10,
  8.11 and 8.13 all pair borders/padding with exact sizes and will each have to
  re-solve this.
- **Why it matters**: not a bug today (Card has no fixed height and is fine on
  content-box; Button is already correct), but the interface block will re-hit
  it at T16 and beyond.
- **Concrete fix**: add to `src/app.css` (in scope for the interface block):

```css
/* Section 8 — all components are specified to the pixel, borders included. */
*, *::before, *::after { box-sizing: border-box; }
```

Button's scoped rule then becomes redundant (harmless; can be removed when the
global lands).

## Design tensions — adjudicated

1. **44px vs 48px for the Show all control — ruling: 48px is right, 3.5's
   "44px high" is a doc bug.** R7 (Section 4, "Rules that cannot be broken")
   mandates >=48px on the shorter side for every interactive element; 8.2
   specifies the quiet button at 48px; Section 13's checklist re-states the
   48px minimum. The only 44px carve-out in the checklist is for `<details>`
   summaries (8.8's 44px is therefore NOT a bug — it is the sanctioned
   exception; the implementer's note wondering about it can be closed).
   3.5's line is the one discrepancy. The implementation's 48px quiet button
   is spec-correct and was verified computed at 48px. Section 15 says treat
   doc gaps as bugs and say so: noted here.
2. **'Show less' copy gap — flag confirmed, no code action in T14.**
   Section 11.2 contains `btn.show_all` = "Show all" and no `show_less`. The
   implementation renders 'Show less' inline (QuestionCard.svelte:31). The
   flag lives in the implementer's report (design_doc_gaps[0]) and is now
   carried in this record; it is correct: T19 ("Build `src/lib/copy.js` first
   and replace every inline string") MUST add `btn.show_less` to the deck and
   sweep the inline 'Show all' / 'Show less' strings. No action is needed in
   T14 beyond the flag — `copy.js` is T19's deliverable, and T14's scope
   constraint forbids creating it. 'Show less' is a deck gap, not a 3.2 ban
   violation (it is not on the banned list).
3. **Box-sizing — ruling: scoped is acceptable for T14, but global is right;
   filed as P3-1** (see above). The scoped rule makes the 8.2 heights exact
   today; the global rule prevents 8.3+ from re-solving the same problem and
   keeps the "specified to the pixel" contract honest.
4. **Card no-nesting enforcement — judged acceptable.** 8.1 forbids nesting
   absolutely. `.card :global(.card)` (Card.svelte:26-31) strips the inner
   card's chrome so a violation is visible as a mistake rather than silently
   rendered as a card. No legit nested-card use exists in the design (other
   panels use `--band`/washes, not `.card`), so there is no unintended side
   effect to worry about today; if the design ever sanctions nesting, this
   rule must be revisited — noted, not a finding.

## PASS/FAIL checklist

1. **Card (8.1) — PASS.** Verified in the built app: background `--card`
   (#FFFFFF), 1px `--edge` border, radius 10px, card shadow present, padding
   16px at 360px and 20px at 900px. Nested-card stripping judged acceptable
   (see tensions).
2. **Button (8.2) — PASS.**
   - Primary: `--strong`/`--on-fill`, no border, 52px, 100%; hover only
     background `--strong-deep` (no lift/shadow/scale); active `--strong-deep`
     + `translateY(1px)`. Code-verified.
   - Secondary: `--card`/`--ink`, 1px `--edge-firm`, 48px, 100%; hover
     `--band`. Code-verified.
   - Quiet: transparent/`--strong`, no border, 48px, auto width, min 48px;
     hover underline. Computed-verified: height 48px, min-width 48px, width
     auto (used 113px).
   - Disabled: `--disabled` fill, `--on-fill` text, no border, 52px, 100%,
     cursor not-allowed, `aria-disabled="true"`, no native `disabled` attr so
     it stays focusable; the `onclick` wrapper returns early when disabled, so
     the button cannot fire its handler (code-verified; keyboard activation
     routes through the same handler). The "sentence above it" is correctly a
     screen-level concern for T16+, not this component.
   - Shared: radius 10px, `t-button`, padding-inline 20px, pointer, centered.
   - Focus: no rule removes or weakens the Section 5.3 ring; the compiled CSS
     contains `outline:3px solid var(--ink)` and the `.btn-primary:focus-visible`
     white-gap companion; primary carries `btn-primary`. PASS.
   - Busy: `aria-busy="true"`, 20px spinner, 8px gap left of the label (flex
     `gap: 8px`), label swaps to `busyLabel`, width unchanged. Code-verified.
   - Reduced motion: verified empirically by reproducing the exact app.css
     global block + Button.svelte spinner rules with
     `prefers-reduced-motion: reduce` emulated: `animation-name` is `none`
     (wins over the global `!important` duration/iteration), border becomes a
     full 3px `--edge-firm` circle — static circle, no frozen arc. Normal
     motion: `1.2s linear infinite` rotation with the scoped keyframes present
     in the compiled CSS. PASS.
3. **QuestionCard (8.7 + 3.5) — PASS.**
   - Card holds only the question and the quote (verified in the DOM).
   - Question: `t-question`, `--ink`, margin-bottom 16px. Computed-verified
     (colour #1B1D21, margin 16px, Lexend, 22px at 360 / 26px at 900).
   - Label 'From the job advert': 13px / 600 / `--ink-quiet`. Computed-verified
     (rgb(85,89,95), 13px, 600).
   - Quote: 15px `--font-text`, `--ink-quiet`, straight ASCII quotes; 3px
     `--edge-firm` left rule, 12px padding-left; weight 400 — never strong,
     bold, or larger than the question (15px vs 22px). Computed-verified, and
     all eight quotes match `example.json` verbatim wrapped in straight quotes.
   - <480px: clamps to 3 lines + Show all control. Truncation verified
     functionally: injecting a 600-char quote gives clientHeight 70px (3 ×
     23.25px) with scrollHeight 419px; the toggle expands (class dropped,
     label 'Show less', height 419px) and collapses back (class restored,
     label 'Show all', height 70px). Note: no fixture quote exceeds 3 lines at
     360px, so the clamp is latent on real fixture data — structural and
     functional verification done by injection.
   - >=480px: full render, no clamp, toggle hidden (`display: none`, so it is
     also out of the tab order). Computed-verified.
   - `sourceQuote` empty/missing → `{#if sourceQuote}` renders nothing: no
     label, no rule, no toggle. Code-verified.
   - Expanded state resets: `$effect` reads `question` and resets
     `expanded = false`, so expanding one question never leaks into the next.
     Code-verified; also observed card 2 stays collapsed while card 1 is
     expanded.
4. **Design tensions — PASS** (rulings recorded above: 48px wins over 3.5's
   44px; Show less gap flagged for T19 with no T14 action; global box-sizing
   filed as P3-1; card nesting rule judged acceptable).
5. **Banned copy (3.2) — PASS.** New user-visible strings are exactly:
   'From the job advert' (sanctioned `plan.quote_label`), 'Show all'
   (sanctioned `btn.show_all`), 'Show less' (flagged deck gap, not on the
   banned list). None of the banned words appear in any user-visible string,
   aria-label, or title in the four files. The old App.svelte banned copy
   ('Agent connected. A tool call reached this page.', 'phase:', 'Analyse',
   'chars') was fully removed by the diff.
6. **Scope — PASS.** `git status` shows exactly: `src/lib/Card.svelte`,
   `src/lib/Button.svelte`, `src/lib/QuestionCard.svelte` (untracked),
   `src/App.svelte` (modified), plus `netlify/functions/analyze.mts`
   (modified). The analyze.mts diff (token ceilings, timeouts, prompt text) is
   unrelated to T14 and was already uncommitted before T13 (documented in
   `t13-review-round-1.md`); T14 did not touch it. Nothing else changed.
7. **Build — PASS.** `npm run build` passes: vite 8.2.2, 122 modules
   transformed, no warnings; output matches the implementer's reported sizes.
8. **Judge view — PASS (independently verified headlessly by this reviewer at
   360px and 900px, beyond the implementer's run).**
   - 8 cards, 8 questions, 8 quotes, 8 labels.
   - Prompts and quotes verbatim from `example.json`, straight quotation
     marks.
   - No horizontal scroll at 360px or 900px (`scrollWidth <= clientWidth`).
   - Show all / Show less toggles work (expand, collapse, label swap).
   - Card list gap 12px; `.page > .column` structure used; screen padding
     block 24px top / 32px bottom.
   - Card padding 16px at 360px, 20px at 900px; question 22px → 26px.
   - No page errors or console errors at either width.

## Verification method notes

- Visual/DOM verification: headless Chromium (Playwright) against `vite
  build` output served locally, at 360px and 900px viewports. Computed styles,
  DOM counts, verbatim text comparison, scroll-width checks, and click-driven
  toggle assertions.
- Disabled click-guard and busy-spinner rendering are code-verified: the
  harness renders no disabled or busy buttons, so those paths are not
  exercised in the DOM.
- Reduced-motion spinner behaviour was verified by reproducing the exact
  rules from `src/app.css` and `src/lib/Button.svelte` with the media feature
  emulated, since no spinner exists in the harness DOM.
- Checks not possible/not run: none material. All eight numbered checks were
  verified either in the DOM or by code reading as stated above.

## Carry-forward for T19 (from this record)

- Add `btn.show_less` to the Section 11 deck and replace the inline
  'Show all' / 'Show less' strings in `QuestionCard.svelte` (and any later
  callers) with `copy.js` entries.
- Apply P3-1 (global `box-sizing: border-box` in `app.css`) before building
  8.3 textareas at T16; Button's scoped rule may then be removed.
- Note for the spec owner: 3.5's "Show all text button, 44px high" should be
  corrected to 48px (R7).
