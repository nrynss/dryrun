# T19 remediation — round 2

Date: 2026-09-02
Author: RemedT19R2 (subagent)
Source: `dev-diary/t19-review-round-2.md` (round-2 verdict: REMEDIATE, 0 blocking, 1 P2)
Scope: `src/lib/Tips.svelte` (already modified by the uncommitted T19 work) — the only
file changed beyond that work and the user's four parallel files (`dev-diary/project.md`,
`netlify/functions/analyze.mts`, `src/lib/shapes.js`, `test/analyze-contract.test.mjs`),
which were read but not touched. No commits made; the only new file written is this diary.

**Closure: the round-2 P2 finding (P2-1r, tips screen 7px horizontal scroll at 180px
with score disclosures open) is remediated and verified in a real browser against
`npm run build` + `npx vite preview`; the round-2 verdict clears to APPROVE.**

## P2-1r — Tips screen still pans horizontally at 180px with disclosures open

- **Review said**: round 1's P2-1 fix removed the score-row and title contributors, but a
  residual 7px horizontal page scroll remained on the tips screen at 180px with the
  "See the scores" disclosures open, in the classic-scrollbar configuration (Chrome 151,
  layout width 165 at a 180px viewport — the same config where round 1 measured the
  original defect): `scrollWidth 172 > clientWidth 165`. The offender is Q2's source
  quote `"Experience with tools such as Swagger/OpenAPI, GitHub, and Jira"` — the
  unbreakable run `Swagger/OpenAPI,` extends to x=172. The review verified in-browser
  that adding `overflow-wrap: anywhere` to `.quote-text` under the
  `@media (max-width: 260px)` breakpoint restores `sw=cw=165` with all disclosures open;
  Tips' `.quote-text` was the one quote surface without the Section 13 treatment already
  sanctioned on QuestionCard's quote text and ScoreRow's `.name`.
- **Changed**:
  - `src/lib/Tips.svelte`, after the `.quote-text` rule (previously lines 261-264):
    added the narrow-width media query — `.quote-text { overflow-wrap: anywhere }`
    scoped inside `@media (max-width: 260px)`, mirroring the identical breakpoint
    treatment on `ScoreRow.svelte` (`.name`) and `ResultPanel.svelte` (`.title`).
    Tips.svelte had no media block of its own (the 260px breakpoint lives
    per-component), so this adds the block for the quote text only; no other rule in
    the file was touched.
- **Verified** (Chrome for Testing 151.0.7922.34 — the same browser generation as the
  round-2 reviewer — launched headless with `--disable-features=OverlayScrollbar` to
  force **classic scrollbars**, against `npm run build` + the vite preview serving the
  fresh build on port 4173; the built CSS was confirmed to contain the new rule before
  measuring):
  - Scrollbar configuration: at a 180×600 viewport `window.innerWidth = 180` and
    `documentElement.clientWidth = 165` — the classic scrollbar reserves ~15px, the
    exact layout width (`cw=165`) of the reviewer's failing measurement.
  - At **180px, all score disclosures open**: `documentElement.scrollWidth ===
    clientWidth` (165 = 165); Q2's quote wraps instead of overflowing (computed
    `overflow-wrap: anywhere`; `scrollWidth === clientWidth` on the quote text,
    68 = 68; right edge 124 < 165). No offender elements.
  - At **360×800, all disclosures open**: `scrollWidth === clientWidth` (345 = 345);
    computed `overflow-wrap` on `.quote-text` is `normal` — the ≤260px treatment does
    not fire at normal widths, so nothing changed at 360px.
  - The fixture (`src/lib/example.json`, frozen for T19) scores only q1-q3 — three of
    the eight questions carry `scores`, and the function-down demo has no scoring
    backend — so the tips screen renders exactly three "See the scores" disclosures,
    the same "all three scored disclosures" config the round-2 reviewer measured. All
    disclosures present were opened for the measurement; the open-state acceptance
    (`sw=cw=165`) holds.
  - `npm run build` passes (only the pre-existing >500 kB chunk-size warning); zero
    page errors during the walk.

## Build

`npm run build` — PASS (pre-existing chunk-size warning only). `npx vite preview`
served the fresh build; browser walk: Start (posting pasted) → Plan → Practice (all 8
questions answered) → Tips (3 scored disclosures) → measurements above. Zero page
errors. No formatters/linters/test suites run (per assignment); no netlify deploy, no
`/api/analyze` calls.
