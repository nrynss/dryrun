# T20 review, round 1

Date: 2026-09-02
Reviewer: ReviewT20
Target: T20 (Dry Run) — Motion, design.md Section 12 (+ 3.3, 8.2, 8.5, 8.8, 8.12, 8.14). Binding spec: `dev-diary/design.md` Revision 2. Scope: `src/App.svelte`, `src/lib/QuestionCard.svelte`, `src/lib/FeedbackNote.svelte`, `src/lib/ChatGPTLine.svelte`, `src/lib/ScoreRow.svelte`, `src/lib/Button.svelte`. Read-only review.

## Verdict

**NOT APPROVED — 3 findings (P1 × 1, P2 × 1, P3 × 1).** Round 2 required. The question-change cross-fade stacks the outgoing and incoming card blocks in normal flow, so every question change swings the card height by ~350-380px (both questions readable at once, content below jumps and snaps) — a visible defect in the demo's central moment. One secondary regression: the print path prints empty score bars.

## Method

Headless Chromium 152.0.7977.64 (google-chrome-stable), CDP-driven. Production build (`npm run build`, dist rebuilt 2026-09-02 02:55, served by `vite preview` on localhost:4173). Viewports 360×800 and 900×1000 via `Emulation.setDeviceMetricsOverride`; reduced motion via `Emulation.setEmulatedMedia` (`prefers-reduced-motion: reduce`). All motion measured by in-page rAF sampling (opacity / transform / width / background-color / element rects per frame). Real fixture (`src/lib/example.json`) walked through the actual UI (See the example → Start practice → questions → tips).

## Findings by severity

### P1-1. Question-change cross-fade stacks the two blocks — card height swings ~380px, both questions visible at once

- **File / lines**: `src/lib/QuestionCard.svelte:44-63` (the `{#key question}` block with `transition:crossFade`).
- **Spec vs code**: Section 12 "Question changes | Card content cross-fades | 160ms ease-out". A cross-fade overlays one block over the other. The implementation stacks them. Svelte 5's keyed-block transition keeps the outro-ing element in the document at its normal-flow position until the outro completes (`BranchManager.#commit` → `pause_effect`; `transition:` out does not absolutely position the element — the absolute-position machinery in the runtime belongs to `animate:`/flip only, verified in `node_modules/svelte/src/internal/client/dom/elements/transitions.js`). The incoming block mounts below the outgoing one, so for the duration of the fade both blocks occupy normal flow.
- **Measured** (real fixture, 360×800, Q1 → Q2):
  - Card height: **414 → 763 while both wrappers are present → 384 settled**. The two wrapper rects are `[193,573]` and `[573,922]` — zero vertical overlap, gap 0.
  - Both questions are fully legible simultaneously: old wrapper opacity 1→0 and new wrapper 0→1 cross at ~0.5/0.5 around t≈80ms (the opacity cross itself is the spec'd 160ms cubicOut — that part is right).
  - The answer box below the card is displaced ~190px down during the fade, then settles 30px up.
  - Reduced motion: verified instant (single element throughout, swap within one frame, card goes 210→175 directly — no stacking frame).
- **Why it is a defect**: this is the demo's centerpiece moment — a machine updating the page — and every question change balloons the card by ~90% with duplicated, simultaneously-readable text, then snaps. Section 12's own preamble: "Motion is minimal and it earns its place". A ~380px layout jump is not a cross-fade; it reads as a rendering glitch.
- **Fix** (stays inside QuestionCard.svelte): wrap the keyed block in a `position: relative` stage and split the transition into `out:`/`in:` where the out-transition absolutely positions the outgoing wrapper against the stage, so it fades out over the incoming content instead of pushing it down:

```svelte
<Card>
  <div class="stage">
    {#key question}
      <div in:fadeIn out:fadeOut>
        …existing content…
      </div>
    {/key}
  </div>
</Card>
```

```js
function fadeIn(node, { duration = 160 } = {}) {
  if (reduceMotion()) return { duration: 0 };
  return { duration, easing: cubicOut, css: (t) => `opacity: ${t}` };
}
function fadeOut(node, { duration = 160 } = {}) {
  if (reduceMotion()) return { duration: 0 };
  // Overlay the outgoing block on the incoming one: out of flow, anchored
  // to the stage top. The stage height is then the new content's height
  // throughout — no layout jump, a true cross-fade.
  node.style.position = 'absolute';
  node.style.left = '0';
  node.style.right = '0';
  node.style.top = '0';
  return { duration, easing: cubicOut, css: (t) => `opacity: ${t}` };
}
```

```css
.stage { position: relative; }
```

Keep the `mounted ? 160 : 0` first-mount gating and the reduced-motion check in both functions.
- **Priority**: 1 — **Confidence**: 0.85 (geometry, heights and opacities all measured per frame; severity judgment on the demo's headline moment).

### P2-2. Print path: every closed disclosure's score fill is 0-width at `window.print()` time — the printed tips sheet shows empty bars

- **File / lines**: `src/lib/ScoreRow.svelte:41-59` (onMount + toggle handler, double-rAF deferral of `filled`).
- **Spec vs code**: Section 12 "Score bar fills | Width transition | 300ms ease-out" interacts with T18's print feature: `Tips.svelte:printTips()` opens every `<details>` via JS and calls `window.print()` synchronously in the same task. ScoreRow's comment claims "printTips opens every <details> before printing — render the fills final", but only the details-open-**at-mount** case (`if (details.open) filled = true`, line 49) is handled. The toggle path defers `filled = true` by two animation frames, and the width transition then takes a further 300ms — all after `window.print()` has already been called.
- **Measured** (tips screen, real fixture; exact printTips sequence — open all `<details>` via JS, snapshot synchronously, i.e. the DOM state at `window.print()` call time):
  - At call time: **12/12 fills at width 0** (inline `width: 0%`).
  - At +120ms: still mid-grow (43.5, 34.8, 34.8, 26.1… of 300.8 max). Fills only reach full width ~350ms after the opens.
  - The mechanism itself is healthy on screen: first open grows 0 → 300.8px over ~270-300ms ease-out; reduced motion instant.
- **Why it is a defect**: a judge (or user) printing the tips sheet gets empty — or race-dependent partially-filled — score bars on every disclosure that was closed at print time. Before T20 the fill width was rendered unconditionally, so this is patch-introduced; the T18 print feature regressed. The implementer's own comment describes the intended behavior; the code does not deliver it.
- **Fix**: coordinate the print path. Cleanest within the current architecture: in `Tips.svelte:printTips()`, after opening the details, wait for the grow before printing (e.g. `setTimeout(() => window.print(), 400)`) or set the fills final synchronously for print (dispatch a `dryrun:prepare-print` event that ScoreRow answers by setting `filled = true` without the rAF deferral). Tips.svelte is outside the 6-file scope, so this needs coordination with the T20 owner before round 2.
- **Priority**: 2 — **Confidence**: 0.75 (the state at print-call time is measured deterministically; the exact print-render sampling is browser-internal, but `window.print()` blocks the main thread, so the fills cannot complete before the print render).

### P3-3. Score fill on close → reopen does not replay from 0: a frozen mid-flight transition resumes

- **File / lines**: `src/lib/ScoreRow.svelte:50-55` (close sets `filled = false`; the width transition freezes when the details hides the content).
- **Spec vs code**: Section 12 expects the fill to grow 0 → (value/5·100)% when the disclosure opens. It does on the first open; on later opens it does not start from 0.
- **Measured**: close a full disclosure → 400ms later the fill width is still 300.8 (the 300ms shrink stalls because the element goes `display: none` mid-transition, freezing the timeline at ~91% of full width). Reopen: the frozen shrink resumes briefly (300.8 → 273.4 on the first visible frame), then the grow takes over 273.4 → 300.8 in ~100ms. Net effect: a quick dip then a fast partial refill, instead of a clean 0 → full 300ms grow.
- **Why it is a defect**: minor but real and measurable; second and later opens of a score disclosure look different from the first. The first open — the spec'd moment — is correct.
- **Fix**: when closing, drop the transition for that one change (e.g. a `.fill.no-anim { transition: none }` class applied on close and removed on the reopen rAF), so the width commits to 0 and every open grows from a clean 0.
- **Priority**: 3 — **Confidence**: 0.75 (measured; impact is cosmetic and confined to the close→reopen edge).

## PASS/FAIL checklist (checks 1-11)

1. **Question changes** — **FAIL** (P1-1). The opacity cross-fade itself is correct (160ms, cubicOut, old out / new in), and reduced motion is instant. But the two blocks stack in normal flow: card 414 → 763 → 384 on every question change (real fixture, 360px). Quote collapse/expand toggle: **PASS**, zero running animations. Screen entry: **PASS** — practice entry shows opacity 1 throughout (26 frames), plan entry shows all 8 card wrappers at opacity 1; first-mount intro is correctly skipped (Svelte's `REACTION_RAN` gate plus the `mounted ? 160 : 0` guard; the guard ordering verified against the Svelte 5.57 runtime — the intro effect is created before the deferred onMount effect runs).
2. **Feedback note appears** — **PASS**. Fade in + rise 4px over 200ms ease-out (measured: opacity 0 → 1, translateY 3.08px → 0, cubicOut curve, completes at ~228ms). Reduced: instant (opacity 1 at first sample, 13ms).
3. **ChatGPT flash** — **PASS**. Background appears instantly with the flash text (`rgb(234,243,239)` = `--strong-wash` at first frame); text reverts at 4s; the background then fades to transparent linear over 1200ms from the 4s mark (measured 1033ms from alpha 0.847 ≈ 1200ms total; fully gone by 5.2s). A later call re-flashes cleanly (both timers reset; `fading` flips false so the wash returns instantly). Reduced: no fade — background already `rgba(0,0,0,0)` at 4.2s, text reverted.
4. **Score bar fills** — **PARTIAL FAIL**. First open: 0 → 300.8px over ~270-300ms ease-out, and the mechanism is robust for "opened after mount" (ScoreRow mounts inside closed `<details>`, grow fires on the toggle). Reduced: instant (0 → 300.8 within one frame). Failures: print path (P2-2) and close→reopen (P3-3).
5. **Button press** — **PASS**. `translateY(1px)` over ~80ms on `:active` (measured 0 → 1px over ~84ms). Reduced: instant (1px at first sample). Disabled variant exempt (`transform: none`).
6. **No count-up** — **PASS**. Grep: no rAF/setInterval counter machinery anywhere in `src/` (the only rAFs are ScoreRow's two-frame grow deferral). DOM: `.value` spans and numbers static over 400ms of sampling.
7. **Screen changes** — **PASS**. No page transition (0 running animations after every phase swap); document scrolls to top on phase change — `scrollY` 800 → 0 at the first sample and stays 0 (instant; app.css sets no `scroll-behavior: smooth`, and the reduce block forces `auto`).
8. **Reduced-motion honesty** — **PASS**. The two JS-driven transitions (cross-fade, note) check `prefers-reduced-motion` themselves and go instant (verified under CDP emulation: cross-fade swaps within one frame with no stacking frame; note opacity 1 at 13ms). The CSS-driven rows (flash fade, score width, button transform) go instant via the global app.css block (flash transparent at 4.2s; score 0 → full in one frame; button 1px at first sample). Spinners render as static 3px `--edge-firm` circles under reduce — LoadingBlock 32px, Button 20px, `animation: none`, uniform `rgb(132,129,122)` border, no `--strong` arc (replaced, not frozen); normal motion spins 1.2s linear with the `--strong` arc. app.css block is byte-identical to the Section 12 required block.
9. **Banned copy / strings** — **PASS**. The T20 diff adds zero user-visible strings (comments only). Substring scan of the tips screen flagged "See the scores" (disclosure summary) and "…on two axes…" (fixture question text) — both pre-existing: `btn.see_scores` is in the design's own Section 11 deck (line 1014), and the fixture text is example.json content; neither is T20-introduced.
10. **Scope** — **PASS**. `git status`: exactly the six target files + the user's four parallel files (`dev-diary/project.md`, `netlify/functions/analyze.mts`, `src/lib/shapes.js`, `test/analyze-contract.test.mjs`). `src/app.css` not modified (empty diff).
11. **Build + judge view** — **PASS**. `npm run build` clean. Demo path end-to-end via real clicks: Start → See the example → plan → Start practice → practice → Finish and show my tips → tips; phase transitions confirmed; one `<h1>` per screen ("Your tips for next time" on tips). No horizontal scroll at 360 (`scrollWidth == clientWidth == 345`) or 900 (`885 == 885`) on all four screens.

## Unverified / noted

- The exact printed artifact was not captured (window.print() is not drivable headlessly); P2-2 rests on the deterministically measured DOM state at print-call time plus the main-thread-blocking behaviour of `window.print()`.
- Chrome 152 only; Safari/Firefox timing of WAAPI transitions not checked.
- OS-level reduced-motion (vs CDP emulation) not checked; the JS guards use `matchMedia` so both sources behave identically.
- Screenshots captured (`/tmp/t20-crossfade-mid-360.png`, `/tmp/t20-crossfade-settled-360.png`) but the numeric per-frame DOM measurements are the evidence recorded above.
