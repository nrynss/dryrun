# T19 review, round 2

Date: 2026-09-02
Reviewer: ReviewT19R2
Target: T19 (Dry Run) round-2 adversarial review of `dev-diary/t19-remediation-round-1.md` against `dev-diary/t19-review-round-1.md` (2 P2 findings). Read-only on code; browser verification via `npm run build` + `npx vite preview` (port 4173, Chrome 151 headless over CDP).

## Verdict

**REMEDIATE — 1 finding (P2 × 1, 0 blocking).** P2-2 is fixed correctly and completely. P2-1 is only partially fixed: the score-row and title contributors are gone, but a residual 7px horizontal scroll remains on the tips screen at 180px when the per-question score disclosures are open, in the standard (classic-scrollbar) browser configuration — the same configuration in which round 1 measured the original defect.

## Findings by severity

### P2-1r. Tips screen still pans horizontally at 180px with disclosures open — the P2-1 fix is incomplete

- **File / lines**: `src/lib/ScoreRow.svelte:62-71` (the P2-1 media-query fix in this patch's diff). Fix site: `src/lib/Tips.svelte:261-264` (`.quote-text`), inside the same `@media (max-width: 260px)` breakpoint.
- **Measured** (Chrome 151, production build, classic scrollbars — layout width 165 at a 180px viewport, the exact configuration where round 1 measured the original bug, `cw=165`):
  - Details **closed**: `scrollWidth 165 === clientWidth 165` — clean, the fix works. ✓
  - Details **open** (all three scored disclosures): `scrollWidth 172 > clientWidth 165` — **7px horizontal page scroll**; text-node offender is Q2's source quote `"Experience with tools such as Swagger/OpenAPI, GitHub, and Jira"` (unbreakable run `Swagger/OpenAPI,` extends to x=172). Opening only Q1's disclosure is clean (Q1's quote extent 152 < 165).
  - At 360px, open and closed: `sw=cw=345` — clean.
- **Why it is a defect**: round 1's P2-1 acceptance requires "scrollWidth === clientWidth with details closed AND open", restated verbatim in this round's brief (check 1). The open state fails in a standard desktop browser at 200% zoom (classic scrollbar reserving ~15px), which is the natural reading of Section 13's "Page zooms to 200% at 360px with no horizontal scroll". The residual was missed twice: round 1's open-state check clicked only the *first* summary (shortest quote), and the remediation's verification measured with overlay scrollbars (`--hide-scrollbars`, their recorded `cw=180`), which mask the layout-width shrink. In the classic-scrollbar config the failure is real and reproduces by the natural demo action of opening "See the scores" on question 2.
- **Verified fix** (injected in-browser, no source edit): adding `overflow-wrap: anywhere` to `.quote-text` under `@media (max-width: 260px)` makes `sw=cw=165` with **all** disclosures open. This is the identical Section 13 treatment already sanctioned on QuestionCard's quote text (round-1 ruling 4) and on ScoreRow's name; Tips' `.quote-text` is the one quote surface without it.
- **Priority**: 2 — **Confidence**: 0.9 (overflow, offender, and fix measured directly; the judgment is whether classic scrollbars are the canonical judge configuration — round 1's own failing measurement used them).

## Checklist

1. **P2-1 fix (tips zoom) — PARTIAL, see P2-1r.** Code: `ScoreRow.svelte:62-71` has the `@media (max-width: 260px)` block (`.name` → `width: auto; min-width: 0; flex: 0 1 auto; overflow-wrap: anywhere`; bar `flex: 1` and value `width: 28px; flex: none` untouched). `ResultPanel.svelte:100-107` has `.title` → `text-wrap: wrap; overflow-wrap: anywhere` at the same breakpoint. Browser (180×600): closed `sw=cw=165` ✓; name computed `width: auto / min-width: 0 / flex: 0 1 auto / overflow-wrap: anywhere`, bar `flex-grow: 1`, value `28px / flex: 0 0 auto` ✓; title fits its box (`cw=sw=67`) ✓; **open (all disclosures) `sw=172 > cw=165` ✗ — 7px scroll from Q2's quote (P2-1r)**. At 360×800: `sw=cw=345` closed and open ✓; name still `120px`, value `28px`, title `text-wrap: balance` ✓ (8.12 holds at normal widths).
2. **P2-2 fix (state-11 notice) — PASS.** Code: `Plan.svelte:35-41` renders the `{#if session.isExample}` block as the **first child of `.column.plan`**, above the wordmark, MessageStrip `kind="note" role="status"` with `copy.notice.example`; `.example-notice { margin-bottom: 12px }` at `Plan.svelte:129-131`. `App.svelte` is a pure phase map — zero trace (grep `notice|MessageStrip|isExample|copy\.` and `example`: no matches; the `{#if}` block, `.example-notice` styles, and the MessageStrip/copy imports are gone). Browser: `serviceDown=true` on Start → `err.service_down` strip (`role="alert"`, exact copy) and prominent "See the example" → click → plan with the notice as the first element child above the `Dry Run` wordmark, exact `copy.notice.example` text, `strip strip-note`, `role="status"`, `isExample=true`, `serviceDown=false`; plan + notice scroll-free at 180px (`sw=cw=165`); normal Start practice → no `.example-notice`, `isExample=false`. Zero page errors in both paths.
3. **Round-1 PASS items — PASS (no regressions).** Spot-checked in-browser: S10 service-down (strip + alert role + See the example); S11 notice (above); S12 `score_failed` strip under the answer box, answer kept, clears on edit and on advance; S13 empty-answer strip `role="alert"`, takes focus, no advance; S14 long-answer strip `role="alert"`, no advance, 6,000-char boundary advances and 6,001 blocks (MAX_ANSWER_CHARS enforced, `Practice.svelte` raw-length check unchanged); S13/S14 exclusivity (exactly one strip, `strip-stop`); S20 `scoring` blocks advance; S21 `analysing` → GettingReady loading block; S22 `done` with zero scored → `.empty-block` with exact `copy.empty.no_answers`, no result panel. Zero inline strings: the four remediated files contain no literal text nodes or `aria-label`/`placeholder`/`title`/`alt`/`summary` literals (grep clean); the notice string is deck-sourced. Flags additive: `session.svelte.js` untouched by remediation; the four T19 flags remain additive booleans with their T25-T32 comments. Banned copy: remediation introduced no visible strings. Scope: remediation changed exactly `ScoreRow.svelte`, `ResultPanel.svelte`, `Plan.svelte`, `App.svelte` (mtimes 02:12); the user's four parallel files (`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`, `test/analyze-contract.test.mjs`) untouched (mtimes 00:06-00:40, diffs free of remediation content); no commits; no other files modified.
4. **Build — PASS.** `npm run build` succeeds (only the pre-existing >500 kB chunk-size warning). `npx vite preview` (port 4173) served the fresh build; zero page errors across all browser walks.

## Observations (not findings)

- The `.numbers` axis row inside the result panel's "See the numbers" disclosure overflows its box internally (`scrollWidth 74` vs `clientWidth 67`) but stays inside the viewport (extent 123 < 165) and never scrolls the document — no action.
- Round 1's open-state check (`t19-zoom.mjs`) clicked only the first disclosure, and the remediation's open-state claim (`sw=cw=180`) used overlay scrollbars; the two together hid Q2's quote overflow. Worth noting as a measurement-hygiene lesson for the next gate check: open **all** disclosures and keep the scrollbar configuration consistent with the failing measurement.

## Unverified

- State 5 (locked PDF): live upload not performed (no fixture); code path unchanged from T16 (as in round 1).
- ChatGPT-line flash states (S16-S18) and the 4-second flash timing: pre-existing T16 behaviour, not exercised.
- Google Fonts: headless Chrome may use fallback fonts; all string checks are text-based and the overflow geometry is driven by the quoted text's unbreakable run (independent of font metrics), so the P2-1r result holds.
- Print stylesheet (`window.print()`) not exercised (T18 scope, unchanged); note `printTips()` opens all disclosures before printing, which would also hit the P2-1r overflow at 200% zoom.

## Evidence

- 34-check browser walk (Chrome 151, production build): 33 pass; the single failure is the P2-1r open-state measurement (`sw=172 > cw=165`). All P2-2 and spot-check items pass with exact strings, roles, focus and block/advance behaviour.
- Overflow pinpointing: text-node scan shows `"Experience with tools such as Swagger/OpenAPI, GitHub, and Jira"` (`t-small quote-text`, Q2) extending to x=172 at a 165px layout width; injecting `overflow-wrap: anywhere` on `.quote-text` (media ≤260px) restores `sw=cw=165` with all disclosures open; at 360px open-all `sw=cw=345`.
- `npm run build` passes; preview server at 4173 served the current `dist/`; zero page errors.
