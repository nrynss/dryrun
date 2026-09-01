# T20 review, round 2

Date: 2026-09-02
Reviewer: ReviewT20R2
Target: T20 (Dry Run) — remediation of `dev-diary/t20-review-round-1.md` (P1-1 cross-fade stacking, P2-2 print-path fills, P3-3 close→reopen fill). Round-1 verdict: NOT APPROVED (1 P1, 1 P2, 1 P3). Remediation agent's own account: `dev-diary/t20-remediation-round-1.md`. Scope of remediation: `src/lib/QuestionCard.svelte`, `src/lib/ScoreRow.svelte`, `src/lib/Tips.svelte` (print-path coordination only). Read-only review.

## Verdict

**APPROVED — zero findings.** All three round-1 findings are correctly remediated, verified independently in code and in a real browser against the production build, with no regressions in the round-1 PASS rows.

## Method

Headless Chromium 152.0.7977.64 (google-chrome-stable), CDP-driven from a Node harness (`/tmp/t20r2/measure.mjs`). Production build (`npm run build`, clean, 2026-09-02 — the >500 kB chunk warning is the pre-existing environmental one), served by the running `vite preview` on localhost:4173 (fresh `dist/` verified served). Viewports 360×800 and 900×1000 via `Emulation.setDeviceMetricsOverride`; reduced motion via `Emulation.setEmulatedMedia` (`prefers-reduced-motion: reduce`). All motion measured by in-page rAF sampling (opacity / transform / width / rects / `getAnimations()` per frame). Real fixture (`src/lib/example.json`) walked through the actual UI (typed posting → Start practice → plan → Start practice → practice → questions → Finish and show my tips → tips) in every scenario; `window.session` (main.js dev/judge affordance) used only to drive states with no UI path (ChatGPT flash, analysing phase, scoring busy, scores-flip for the note appear).

## Findings by severity

None.

## Remediation verification

### P1-1 — Question-change cross-fade stacks the two blocks (card height swings ~380px) — FIXED

- **Code**: QuestionCard.svelte wraps the `{#key question}` block in `<div class="stage">` with `.stage { position: relative; }` (lines 64, 94-96); the transition is split into `in:fadeIn` / `out:fadeOut`, and `fadeOut` sets `node.style.position = 'absolute'; left: 0; right: 0; top: 0` (lines 49-60) so the outgoing block is out of flow and overlays the incoming content. Both functions keep the `prefers-reduced-motion` check (`reduceMotion()`, lines 28-33, 36, 50), and the keyed block keeps `duration: mounted ? 160 : 0` on both in and out (lines 67-68) — first-mount gating intact.
- **Measured** (360×800, production build, Q1→Q2 on the practice screen):
  - Card height **constant 383.8 px through every fade frame** (2 wrappers present t=4.4–153 ms) **and after settle** (single wrapper, t=170 ms onward). Max deviation from settled during the transition: **0 px** — no ~380 px balloon. (Q1's content is naturally 379.5 px tall vs Q2's 349.8 px, so the card itself steps 413.5 → 383.8 on the question change — the 29.7 px content difference, not duplicated stacking. Round-1's defect was 414 → 763 → 384, i.e. ~350 px of duplicated height; that geometry is gone.)
  - Both wrappers present for ~150 ms, **same top anchor (193)** — outgoing `position: absolute` overlays the incoming `static` wrapper with full 349.8 px vertical overlap; both question texts present simultaneously.
  - Opacities cross 0.498/0.502 at t≈36.5 ms, old reaches 0.001 at t≈153 ms — the spec'd 160 ms cubicOut cross is intact.
  - First-mount gating: practice entry shows a single wrapper at opacity 1 across 16 frames (~240 ms) — no intro fade on screen entry.
  - Reduced motion (CDP emulation): swap within **one frame** (413.5 → 383.8 at the next sample), single static wrapper at opacity 1 throughout, **zero stacking frames**.
  - The answer box below the card stays at aTop 583.8 in every fade frame — no displacement.
- The remediation's own numbers (383.8 → 354.1, overlap 320.1) differ in absolute value from this run's (413.5 → 383.8, overlap 349.8) but the geometry is identical (constant card height through the fade, same left edge, full overlap, one-frame reduced swap). The absolute heights differ by a font-metrics effect (fresh Chrome profile, Google Fonts state) — not a defect.

### P2-2 — Print path: closed disclosures print with 0-width fills — FIXED

- **Code**: ScoreRow.svelte registers a document-level `dryrun:prepare-print` listener in onMount (removed in the same cleanup as the `toggle` listener, lines 56, 62, 80-83). The handler commits the print render synchronously: `flushSync(() => { noAnim = true; filled = true; })` (lines 50-55) — forcing the width change into the DOM before the handler returns (Svelte's batched microtask flush would land after `window.print()`). `noAnim` (the P3 class) drops the transition so the width commits at its final value. Tips.svelte `printTips()` opens every `<details>`, dispatches `new CustomEvent('dryrun:prepare-print')`, **then** calls `window.print()` (lines 72-74).
- **Measured** (tips screen, fixture — 3 scored disclosures × 4 axes = 12 fills; `window.print` stubbed to snapshot the DOM synchronously at call time, then the real "Print or save these tips" button clicked):
  - At call time: all 4 `<details>` on the page open; **12/12 fills at final widths — zero at 0%**. Inline styles: `100%` ×2, `80%` ×5, `60%` ×4, `40%` ×1, i.e. exactly `(value/5·100)%` against the displayed values (5/4/4/4/3/2/3/4/4/3/3/5); computed widths match value × 8.9 px unit (89 / 71.19 / 53.39 / 35.59 px). The `.rows` containers carry `no-anim` at call time, confirming the flushSync'd transition-less commit. Round-1 measured 12/12 at `0%` in the same snapshot.
  - Screen animation intact: a fresh first open grows the fill **0 → 89 px monotonically over ~300 ms** (8.1 px at t≈45 ms, 58 px at t≈150 ms, settled by ~350 ms) — the spec'd grow still plays on screen; reduced motion renders full width within one frame (0 → 89 with no intermediate widths, p3-reduced / s4-reduced-notes).

### P3-3 — Close → reopen does not replay from 0 (frozen mid-flight shrink resumes) — FIXED

- **Code**: ScoreRow.svelte adds a `noAnim` state bound as `class:no-anim` on `.rows` with `.no-anim .fill { transition: none; }` (lines 41, 87, 154-156). The close branch sets `filled = false; noAnim = true` (lines 74-77) — the width commits to 0 instantly, no frozen timeline; the open branch's double-rAF sets `noAnim = false; filled = true` (lines 68-73), so every open grows from a committed 0.
- **Measured** (tips screen, fixture): close a full disclosure → width **89 px → 0 px within one frame** (t=0.4: 89; t=1.6: 0) and stays 0 through 400+ ms (after400 = 0 px). Reopen → first visible width 8.1 px at t≈47 ms (0 for the first two frames, the double-rAF), growing monotonically to 89 px over ~300 ms — **zero dip frames** (no width decrease at any of 28 samples), trajectory identical to the first open. Reduced motion: full width within one frame.

## PASS/FAIL checklist (round-2 checks 1-5, referencing round-1 checks 1-11)

1. **P1 fix (cross-fade overlay)** — **PASS**. Stage + absolute out-transition; card height constant through the fade (deviation 0 px), no balloon; both texts overlay while opacities cross over ~160 ms; first-mount 0 ms gating and the reduced-motion check intact (code + measured); reduced motion swaps in one frame with zero stacking frames.
2. **P2 fix (print path)** — **PASS**. `dryrun:prepare-print` + flushSync commit all fills at final (value/5·100)% widths synchronously at `window.print()` call time (stubbed snapshot: 12/12 final, zero 0%); screen first-open grow still animates 0 → full over ~300 ms; reduced instant.
3. **P3 fix (close → reopen)** — **PASS**. Close commits width to 0 with no transition (no-anim), stays 0; reopen grows from a committed 0 over ~300 ms with no dip/resume; reduced motion instant.
4. **No regressions (round-1 PASS rows)** — **PASS**:
   - Feedback note appears: fade 0 → 1 + rise 4 px over ~200 ms cubicOut (measured on the scoring-appears event: op 0 → 0.23 → 0.42 → … → 1, translateY 4 → 3.08 → … → 0, WAAPI animation attached, completes ~200 ms); reduced instant (opacity 1 at first sample). Note: on screen entry the note renders at opacity 1 with no animation — consistent with round-1's "screen entry instant" row (the fade plays on mid-practice appearance, which is what check 2 measured in round 1).
   - ChatGPT flash: `--strong-wash` background + flash text immediately; text reverts at 4 s ("ChatGPT just updated this page." → "ChatGPT is running your practice…"); background fades linear over 1200 ms from the 4 s mark (alpha 0.804 at ~4.22 s; fully transparent by ~5.5 s).
   - Button press: primary `:active` translateY 0 → 1 px over ~80 ms (0.31 → 0.71 → 0.90 → 0.98 → 1), holds while pressed, returns on release.
   - No count-up: `.value` texts static over 420 ms of sampling (single unique value-set).
   - Scroll-to-top: on phase change scrollY 3921 → 0 at the first sample and stays 0 (instant).
   - Static spinners under reduce: LoadingBlock 32 px and Button busy 20 px, `animation: none`, uniform `rgb(132,129,122)` (`--edge-firm`) border, no `--strong` arc; with motion both spin 1.2 s linear with the `--strong` top arc (LoadingBlock measured mid-rotation at 45° — its 45 px bounding box is 32×√2, confirming the rotation, not a size change).
   - Reduced-motion honesty for the fixed pieces: cross-fade, note, and fill all instant under `prefers-reduced-motion: reduce` (matchMedia-gated for the JS transitions; the app.css block `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; …` covers the CSS-driven rows — block present and byte-unchanged, mtime 01:11, empty diff).
   - Scope: `git status` shows only the three remediated files changed beyond the pre-existing T20 uncommitted work (App/Button/ChatGPTLine/FeedbackNote, mtimes 02:45) and the user's four parallel files (`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`, `test/analyze-contract.test.mjs`) — which were not touched by remediation (mtimes of the three remediated files 03:10-03:13; the other T20 files 02:45; app.css 01:11). `src/app.css` untouched.
5. **Build + demo path** — **PASS**. `npm run build` clean (pre-existing chunk warning). End-to-end path works via real clicks in every scenario: Start → plan → practice → questions → tips; phase transitions confirmed; no horizontal scroll at 360 or 900 on all four screens (`scrollWidth <= clientWidth` true everywhere).

## Unverified / noted

- The actual print rendering is not captured (headless `window.print()` is not drivable); P2-2 rests on the deterministically measured DOM state at print-call time (stubbed snapshot) plus `window.print()`'s main-thread-blocking behaviour — the same limitation as round-1.
- Chrome 152 only; Safari/Firefox WAAPI timing not checked.
- OS-level reduced motion (vs CDP emulation) not checked; the JS guards use `matchMedia`, so both sources behave identically.
- Pre-existing, not patch-introduced: the practice screen has no `<h1>` (h1 counts: Start 1, plan 1, practice 0, tips 1). Section 13's one-h1-per-screen holds on Start/plan/tips; the practice screen predates T20 and was not touched by T20 or the remediation — flagged for completeness, not a finding.
- Round-1 check-1 rows not re-measured this round: quote collapse/expand toggle (zero running animations) and plan-screen card entry (8 wrappers at opacity 1) — verified by code: the toggle is a class change with no transition, and plan cards use the identical `mounted ? 160 : 0` gating that was measured on practice entry.
- Screenshots not captured this round; the numeric per-frame DOM measurements above are the evidence.
