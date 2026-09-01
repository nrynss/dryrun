# T19 review, round 1

Date: 2026-09-02
Reviewer: ReviewT19
Target: T19 (Dry Run) — every Section 10 state wired to the copy deck, zero inline strings, Section 13 a11y gate. Binding spec: `dev-diary/design.md` Revision 2.

## Verdict

**NOT APPROVED — 2 findings (P2 × 2, 0 blocking).** Round 2 required for the tips-screen zoom overflow (mandatory a11y finding) and the state-11 notice layering.

## Findings by severity

### P2-1. Tips screen pans horizontally at 200% zoom / 360px — Section 13 checklist failure

- **File / lines**: `src/lib/Tips.svelte:78-90` (the result-panel branch, in this patch's diff). Fix sites: `src/lib/ScoreRow.svelte:55-61` and `src/lib/ResultPanel.svelte:92-96`.
- **Spec vs code**: Section 13 requires "Page zooms to 200% at 360px with no horizontal scroll" (checklist item, and the T19 gate: "Run this before calling T19 done"). 8.12 fixes the score row name at `width: 120px, flex: none` and the value at `width: 28px`; 7.4 specifies no reflow at narrow widths. The two conflict at a 180 CSS-px layout width.
- **Measured** (headless Chromium 151, production build, viewport 180×600 = 200% zoom on a 360px device, `documentElement.scrollWidth` vs `clientWidth`):
  - Tips screen, score rows: `sw=197, cw=165` → 32px horizontal page scroll. The offending boxes are the ScoreRow `.value` cells at right edge 215px; the row's fixed min-content (120 + 12 + bar + 12 + 28 = ~174px) exceeds the ~149px column content. Reproduces with the `<details>` disclosures **closed** — Chrome lays out the hidden content.
  - Second contributor: the result-panel title (`t-display`, `text-wrap: balance`) renders as **one 148px line in a 67px content box** (`clientWidth 67, scrollWidth 148, lines 1`) at this width — "Keep practising" cannot wrap and overflows the panel. With only the score-row fix applied, the page still scrolls (`sw=197`); it is this title that holds the overflow.
  - Control screens at the same width: Start, Plan, Practice, Getting ready all `sw=cw=165` — clean. At 360px the tips screen is clean (`sw=cw=345`).
- **Why it is a defect**: it is the one Section 13 gate item the interface fails, on the screen a judge lands on at the end of the demo. The implementer's own audit recorded it (scrollWidth 197-215); it was not waived, it must be fixed.
- **Fix (verified in-browser)**: a narrow-width media treatment that relaxes 8.12 only below normal phone widths, so the row stays pixel-exact per 8.12 at ≥~260px. Applying this made the page scroll-free (`sw=cw=165`):

```css
/* ScoreRow.svelte — below 260px the fixed 120px name cannot fit beside the
   bar and the 28px value; let it shrink and wrap. Bar keeps flex:1,
   value stays fixed (8.12 holds at normal widths). */
@media (max-width: 260px) {
  .row .name {
    width: auto;
    min-width: 0;
    flex: 0 1 auto;
    overflow-wrap: anywhere;
  }
}

/* ResultPanel.svelte — the t-display title (text-wrap: balance) does not
   wrap at this width and overflows its content box; allow word breaks. */
@media (max-width: 260px) {
  .result-panel .title {
    text-wrap: wrap;
    overflow-wrap: anywhere;
  }
}
```

- **Priority**: 2 — **Confidence**: 0.95 (both contributors and the complete fix measured directly in-browser).

### P2-2. State-11 worked-example notice renders from App.svelte instead of the plan screen

- **File / lines**: `src/App.svelte:18-27` (the `{#if session.isExample}` block).
- **Spec vs code**: Section 9.3 (with 8.13) — screens own their message strips; `Plan.svelte` already renders its own `warn.thin_advert` strip under the sub-line (9.3: "a --note message strip sits directly under the sub-line"). `App.svelte` is the phase map (Section 9: "Five screens. They map to session.phase exactly"); rendering screen content there is the wrong layer. Section 10 state 11's treatment ("go to Your practice, --note strip at the top") is screen content and belongs in Plan.svelte.
- **Why it is a defect**: the implementer placed it in App.svelte as a workaround for the frozen `Plan.svelte`/`fixture.js` (an orchestrator scoping error, per the T19 brief). It renders correctly today (verified: strip at the very top, above the wordmark, `role="status"`, exact `notice.example` string, `serviceDown` cleared), but the deviation will otherwise be baked in: a future edit to Plan's strips will miss the notice, and App.svelte will keep accumulating screen content. Remediation is a straight move.
- **Fix**: when the freeze lifts, move the notice into `Plan.svelte` at the top of the `.plan` column (above the wordmark, same `--paper` ground and 24px top padding), keeping `session.isExample` as the trigger; delete the App.svelte block and its styles.
- **Priority**: 2 — **Confidence**: 0.8 (design-interpretation judgment; the deviation is deliberate-but-constrained, not user-visible today).

## Rulings (recorded explicitly)

1. **Tips zoom overflow (Section 13 item "200% zoom / 360px, no horizontal scroll")** — **FAILURE, filed as P2-1** (mandatory finding). Not waived. Both contributors and the complete fix are verified in-browser.
2. **GettingReady has no `<h1>`** — **WAIVER, consistent with the T15 practice-screen waiver** (`dev-diary/t15-review-round-1.md` ruling (a), which records "T19 must not re-flag this as a defect without a design.md change"). Evidence: 9.2 enumerates Getting-ready content as wordmark + loading block only ("No other content"); the copy deck has no getting-ready title string (11.5 carries only `busy.brief`/`busy.brief_sub`); inventing an `<h1>` means inventing deck copy the spec bans. The screen's dominant content is the wordmark. Section 13's "one h1 per screen" therefore reads as "one h1 per screen that has a title element in its design" — Start, Plan and Tips each have exactly one (verified in-browser); Practice carries the T15 waiver; Getting ready carries this one.
3. **State 10/11 architecture** — **the notice belongs in Plan.svelte; filed as P2-2.** The loader option (`loadExample({ asExample })`) is **accepted at Start-level** with the T25-T32 carry-forward comment: the flags are explicitly interface-block flags pending T25-T32, `Start.svelte`'s `seeExample()` sets `isExample` at the call site with the fixture frozen, and the alternative (touching `fixture.js`) was out of scope. Not filed.
4. **QuestionCard `overflow-wrap: anywhere`** — **sanctioned.** It is a Section 13 fix (long-word overflow at 200% zoom), the same treatment already sanctioned on FileChooser's `.name` (T16), and it does not contradict 8.7 (which specifies text style and margins, not wrapping). Verified: the plan screen (the screen with the eight question cards) is scroll-free at 180px (`sw=cw=165`).
5. **FileChooser `✓` tick** — **sanctioned** (check 7): `aria-hidden="true"`, decorative per 8.4.

## Checklist (per the T19 brief, checks 1-9)

1. **23-state walk — PASS.** Full browser walk (production build, Chromium 151): 75 checks, all passing, zero page errors. Every reachable state shows its EXACT Section 11 string, verified by DOM text equality:
   - Spot-checks, all with exact strings and roles/focus: S6 wrong file type (`err.file_type`, nothing written to `session.resume`); S8 not a CV (`warn.not_cv`, note strip at top of the practice column, `role="status"`); S10 service down (`err.service_down` strip, `role="alert"`, takes focus, prominent primary "See the example" above "Start practice", Start practice still present); S11 worked example (click → plan screen, `notice.example` at the very top above the wordmark, `serviceDown` cleared, `role="status"`); S12 scoring failed (`err.score_failed` `--almost` under the answer box, answer kept, clears on edit and on advance); S13/S14 empty vs long (`err.empty_answer` / `err.answer_long` `--stop` above the primary, `role="alert"`, takes focus, no advance, exclusivity verified in both directions); S20 scoring (primary `aria-busy`, spinner, label "Reading your answer", width unchanged at 297.0px, `next()` refuses while busy); S21 building questions (Getting ready: wordmark + LoadingBlock, `role="status"`, exact `busy.brief`/`busy.brief_sub`, no progress bar, no stage names, no cancel); S22 zero scored (empty block with `empty.no_answers` + "Start practice" button, no result panel, button re-enters practice at question 1); S23 capped (result panel, "Keep practising").
   - S1-S4, S7, S9 verified with exact strings (S4 short-text scan, S7 CV-truncation to 20,000, S9 thin advert).
   - S5 (locked PDF) **not re-walked in-browser** — requires a password-protected PDF; the code path is unchanged from T16 (`PasswordException` → `err.pdf_locked`), verified by code read. S16-S18 (ChatGPT line active/flash states) are pre-existing T16 code and environment-dependent (S15 resting copy verified in-browser: the line renders `chat.ready` in a modelContext-present environment and `chat.none` in a plain browser — both deck strings, no regression). S19 (`hint.waiting`) is pre-existing T15 code, verified by code read.
2. **MAX_ANSWER_CHARS — PASS.** `session.svelte.js:49` `export const MAX_ANSWER_CHARS = 6_000` with a comment citing design 15.6 and its eventual home in shapes.js (T07). `shapes.js` at HEAD has `MAX_SCORE_INPUT_CHARS = 12_000` only — confirmed absent, not added. Used in `Practice.svelte`'s `answerTooLong` derived and `next()` (raw length, blocking with `err.answer_long`); empty-vs-long precedence and exclusivity verified live.
3. **Zero inline strings — PASS.** `src/lib/*.svelte` + `App.svelte`: no literal user-visible text nodes (grep of `>...<` text and of `aria-label`/`placeholder`/`title`/`alt`/`summary` attributes — no matches outside comments). QuestionCard's Show all/Show less/From the job advert now come from `copy.js` (`btn.show_all`, `btn.show_less`, `plan.quote_label`). The only literal glyph is the FileChooser `✓`, `aria-hidden`, decorative — sanctioned.
4. **Session flags — PASS.** `serviceDown`, `isExample`, `scoreFailed`, `scoring` added to `session.svelte.js` as additive booleans, each documented as an interface-block flag with a T25-T32 formalization note; no existing field changed; `differentJob()` and `startPractice()` clear them appropriately. Verified against the existing session contract (setPosting/loadExample untouched).
5. **Section 13 a11y gate — FAIL (one item), see P2-1.** The implementer's self-audit is otherwise corroborated in-browser: blocking strips `role="alert"` + take focus (S3/S10/S13/S14); non-blocking `role="status"` (S8/S11/S12/S21, chatline); one `<h1>` per titled screen (Start 1, Plan 1, Tips 1; Practice 0 and Getting-ready 0 under the waivers); disabled primary has its sentence (S1); summary heights and progress-row `aria-hidden` are pre-existing T15/T18 and unchanged. The mandatory finding is the tips zoom overflow (P2-1), filed with a verified fix. The GettingReady-h1 ruling (waiver) and the QuestionCard overflow-wrap ruling (sanctioned) are recorded above.
6. **State 10/11 architecture — FAIL (layering), see P2-2.** The notice renders correctly but from App.svelte; remediation is a move into Plan.svelte. The loader option stays Start-level with the T25-T32 comment (ruling 3).
7. **Banned copy (3.2) — PASS.** Every visible string is a Section 11 deck key; the banned-word list was scanned against rendered copy (browser innerText) and against any non-deck literal — no hits. Deck keys are sanctioned by the brief, including `btn.see_scores` ("See the scores") which the deck itself lists; `err.service_down_action` exists in the deck but no state treatment references it (state 10 keys `err.service_down` + the example button) — observation only, not a finding.
8. **Scope — PASS.** `git status`: exactly the 2 new files (`LoadingBlock.svelte`, `GettingReady.svelte`) + 7 modified (`App.svelte`, `FileChooser.svelte`, `Practice.svelte`, `QuestionCard.svelte`, `Start.svelte`, `Tips.svelte`, `session.svelte.js`); the user's four parallel files (`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`, `test/analyze-contract.test.mjs`) untouched; `src/lib/webmcp.js` untouched. No other files modified.
9. **Build + judge view — PASS.** `npm run build` succeeds (only the pre-existing chunk-size warning). The demo path start → practice → done works end to end with the state wiring: fill advert → Start practice → plan (8 question cards) → Start practice → practice (advance/answer/skip) → tips with result panel and per-question cards.

## Observations (not findings)

- `Tips.svelte:22` comment "Reachable by skipping every question" overstates the demo: the shipped fixture carries 3 scored answers, so zero scores needs those cleared (console) or a session that never loaded the fixture. The wiring itself is correct (verified); the comment could say "with zero scored answers".
- `err.service_down_action` ("Or look at a full worked example while you wait.") is a deck string with no state reference. The state-10 treatment ("plus the example button") uses `btn.see_example` instead. Deck completeness, no action required unless the spec changes.

## Unverified

- State 5 (locked PDF): live upload of an encrypted PDF not performed (no fixture); code path read and unchanged from T16.
- ChatGPT-line flash states (S16-S18) and the 4-second flash timing: pre-existing T16 behaviour, not exercised in this round.
- Google Fonts rendering: the headless browser may have used fallback fonts; all string checks are text-based and the zoom geometry is fixed-width-driven, so this does not affect the results. A visual check on the real build remains part of the judge's pass.
- Print stylesheet (`window.print()`) not exercised (T18 scope, unchanged).

## Evidence

- 75-check browser walk, zero page errors; exact strings, roles, focus and block/advance behaviour per state (see checklist 1).
- Zoom measurements: tips 180px `sw=197` vs `cw=165` (P2-1, reproduced with details closed and open); after the verified fix `sw=cw=165`. Start/Plan/Practice/Getting-ready all clean at 180px; tips clean at 360px.
- `npm run build` passes; preview server (`vite preview`) served the production build.
