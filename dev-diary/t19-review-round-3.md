# T19 review, round 3

Date: 2026-09-02
Reviewer: ReviewT19R3
Target: T19 (Dry Run) round-3 verification of the round-2 remediation (`dev-diary/t19-remediation-round-2.md`) against the round-2 verdict (REMEDIATE, 0 blocking, 1 P2: P2-1r — 7px horizontal page scroll on the tips screen at 180px with the score disclosures open, classic-scrollbar config). Read-only on code (the only file written is this diary); browser verification via `npm run build` + `npx vite preview`, driven over CDP with Chrome for Testing 151.0.7922.34 headless, classic scrollbars (`--disable-features=OverlayScrollbar`).

## Verdict

**APPROVE — zero findings.** The P2-1r fix is correct and complete, verified in the exact classic-scrollbar configuration where round 2 measured the residual overflow (180px viewport, `clientWidth` 165): with **all** scored disclosures open — plus the result panel's "See the numbers" disclosure, a stricter superset — the tips screen has `scrollWidth === clientWidth === 165` (round 2: `sw=172 > cw=165`). Q2's quote `"Experience with tools such as Swagger/OpenAPI, GitHub, and Jira"` wraps instead of overflowing (`overflow-wrap: anywhere`, `scrollWidth === clientWidth` 68=68, right edge 124 < 165). At 360px nothing changed: open and closed `sw=cw=345`, quote `overflow-wrap: normal` (the ≤260px treatment does not fire). All round-1/2 PASS items hold; `npm run build` passes. 56 browser checks, zero failures, zero page errors.

## Findings by severity

None.

### Considered, not findings

- **`.numbers` axis row internal overflow** — the "See the numbers" row inside the result panel still overflows its box internally (`scrollWidth` 74 > `clientWidth` 67) but its right edge is 116 < 165, so it never scrolls the document. Byte-identical to the round-2 observation; unchanged; no action.
- **The word "axes" in q1's fixture model answer** — the tips screen renders the fixture's model answer "Describe triage on two axes, release-coupled versus standalone…" (`src/lib/example.json`, frozen for T19, pre-existing T16 content). This is displayed content in the same category as a user's pasted advert — not interface copy governed by 3.2 (buttons, labels, headings, tooltips, errors, placeholders, aria-labels, titles). Round 1's own banned-copy scan passed on the same rendered data. Not a finding; not patch-introduced.

## Checklist

1. **P2 fix (P2-1r, check 1) — PASS.**
   - **Code**: `src/lib/Tips.svelte:270-274` adds `@media (max-width: 260px) { .quote-text { overflow-wrap: anywhere } }` immediately after the existing `.quote-text` rule (261-264) — the identical Section 13 treatment already sanctioned on ScoreRow's `.name` and ResultPanel's `.title`. The full-file git diff confirms this media block is the only change in this round; the other hunks (state-22 empty block, `differentJob` flag resets) are the pre-existing T19 work reviewed in rounds 1-2. No other rule in the file touched. Built CSS contains the rule: `@media (width<=260px){.quote-text.svelte-1d302m1{overflow-wrap:anywhere}}`.
   - **Browser** (Chrome 151, production build, classic scrollbars — `innerWidth` 180, `documentElement.clientWidth` 165, the exact config of round 2's failing measurement): tips reached via the natural demo path (paste advert → Start practice → plan → practice: q1-q3 answered from the fixture, q4-q8 skipped → tips). The fixture scores q1-q3, so exactly 3 "See the scores" disclosures render (+ the result panel's "See the numbers").
     - Disclosures **closed**: `sw=cw=165` ✓
     - **All disclosures open** (all 3 score disclosures + "See the numbers"): `sw=cw=165` — the round-2 residual `sw=172` is gone ✓
     - Q2's quote: computed `overflow-wrap: anywhere`; `scrollWidth === clientWidth` (68 = 68); right edge 124 < 165; no element anywhere overflows the viewport; no horizontal scrollbar ✓
     - **360×800**: open and closed `sw=cw=345`; computed `overflow-wrap` on the quote is `normal` — nothing changed at normal widths ✓; back at 180px closed: `sw=cw=165` ✓
2. **No regressions (check 2) — PASS.** 56-check browser walk, zero page errors:
   - **State walk spot checks** (exact strings, roles, focus, block/advance): S10 service-down strip (`role="alert"`, takes focus, exact `err.service_down`) with "See the example" above "Start practice"; S11 worked-example notice — first element child of `.column.plan` above the wordmark, `role="status"`, exact `copy.notice.example`, `serviceDown` cleared, `isExample` set; S12 `err.score_failed` strip (`kind="almost"`, `role="status"`) under the answer box, answer kept, clears on edit; S13 `err.empty_answer` strip (`role="alert"`, takes focus, no advance); S14 `err.answer_long` strip (`role="alert"`, no advance at 6,001 chars, advances at exactly 6,000 — `MAX_ANSWER_CHARS` enforced, raw-length check); S13/S14 exclusivity (exactly one strip at any time); S20 `scoring` — primary `aria-busy="true"` with "Reading your answer" and spinner, clicking it does not advance; S21 `analysing` → GettingReady with exact `busy.brief`/`busy.brief_sub` copy; S22 zero scored → `.empty-block` with exact `copy.empty.no_answers` + `no_answers_action` button, no result panel; `differentJob` resets all four flags plus posting/questions/phase.
   - **Zero inline strings**: scan of all `src/lib/*.svelte` + `App.svelte` templates with `<script>` blocks and comments excluded — 0 literal user-visible text nodes, 0 string attributes (`aria-label`/`placeholder`/`title`/`alt`/`summary`/`message`).
   - **MAX_ANSWER_CHARS**: `session.svelte.js:49` (`6_000`, design 15.6 comment) unchanged; browser boundary verified (6,000 advances / 6,001 blocks).
   - **Flags**: `serviceDown`, `isExample`, `scoreFailed`, `scoring` additive in `session.svelte.js`; cleared by `differentJob` — verified live.
   - **Banned copy**: rendered-UI scan of every screen (fixture content containers — model answers, source quotes, user answer text — excluded as data) — no banned words; phase values not rendered as status labels.
   - **Notice from Plan.svelte**: `Plan.svelte:37-41` renders it as the first child of `.column.plan`; `App.svelte` is a pure phase map with zero trace.
   - **Scope**: file mtimes — `Tips.svelte` (02:24) is the only edit after round 2's batch (App 02:12, Plan/ScoreRow/ResultPanel 02:12); the user's four parallel files (`dev-diary/project.md` 00:06, `netlify/functions/analyze.mts` 00:32, `src/lib/shapes.js` 00:40, `test/analyze-contract.test.mjs` 00:40) predate all remediation edits and were not touched. Round-1/2 fix sites intact: `ScoreRow.svelte:64-71` and `ResultPanel.svelte:102-107` media blocks, QuestionCard's `overflow-wrap: anywhere`, Plan's notice block.
3. **Build (check 3) — PASS.** `npm run build` succeeds (only the pre-existing >500 kB chunk-size warning). The preview server on port 4173 served the current build — served `index.html` byte-identical to the freshly built `dist/index.html`, and the built CSS contains all three 260px media blocks including the new `.quote-text` rule. Zero page errors across all browser walks.

## Observations (not findings)

- `.numbers` axis row internal overflow (74 vs 67) — see "Considered, not findings".
- The Tips.svelte state-22 comment "Reachable by skipping every question" still overstates the demo: skipping all eight questions keeps the fixture's q1-q3 scores, so zero-scored needs the scores cleared (console-reachable). Wiring itself correct; round-1 observation, unchanged.
- Round 3's measurement opened **all four** disclosures (the three score disclosures plus the result panel's "See the numbers"), one stricter than round 2's open set — the `sw=cw=165` result holds under the stricter config.

## Unverified

- State 5 (locked PDF): live upload not performed (no fixture); code path unchanged from T16 (as in rounds 1-2).
- ChatGPT-line flash states (S16-S18) and the 4-second flash timing: pre-existing T16 behaviour, not exercised.
- Google Fonts: headless Chrome may use fallback fonts; all checks are text-based and the overflow geometry is driven by the quoted text's unbreakable run, so the fix result holds.
- Print stylesheet (`window.print()`) not exercised (T18 scope, unchanged); note `printTips()` opens all disclosures before printing, which the fix now leaves scroll-free at 200% zoom.

## Evidence

- 56-check browser walk (Chrome for Testing 151.0.7922.34, production build, classic scrollbars, CDP-driven): 56 pass, 0 fail, 0 page errors. Exact strings, roles, focus and block/advance behaviour per state (see checklist 2).
- P2-1r geometry: 180px open-all `sw=cw=165` (round 2: `sw=172`); Q2 quote `clientWidth=scrollWidth=68`, right edge 124; no overflowing elements; 360px open+closed `sw=cw=345`, quote `overflow-wrap: normal`; 180px closed `sw=cw=165` before and after the 360px excursion.
- Code: `Tips.svelte` diff (media block is the only round-3 change); built CSS contains `@media (width<=260px){.quote-text…{overflow-wrap:anywhere}}`; ScoreRow/ResultPanel/QuestionCard fix sites unchanged; App.svelte pure phase map; session flags and `MAX_ANSWER_CHARS` intact.
- `npm run build` passes; preview served the current build; zero page errors.
