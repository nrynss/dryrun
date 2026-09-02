# T37 review, round 1

Date: 2026-09-02
Reviewer: ReviewT37
Target: uncommitted T37 changes in the working tree (branch main, HEAD e715bfa).
Binding documents: dev-diary/task.md (lines 220 to 395), dev-diary/design.md, dev-diary/project.md, and house style rules.
Prior documents: dev-diary/t36-review-round-1.md, dev-diary/t35-review-round-2.md.

## Verdict

**NOT APPROVED. P1 x 0, P2 x 0, P3 x 3.**

The brand mark and motion pass are well crafted and robust. Semantic text in Brand.svelte preserves accessibility and responsive typography. The single shell mount in App.svelte draws once on initial load. It does not redraw across phase changes. It does not replay on reactive updates. Per-screen wordmarks and classes have been removed across all five screens.

Secondary SVGs in PathPulse, ChatGPTLine, FeedbackNote, and ResultPanel remain purely decorative. Each component includes an inline static reduced-motion fallback. Headless Chrome verifies zero horizontal overflow at 360px, 180px, and 900px viewports across all five screens. All 75 tests pass cleanly in npm test. The Vite production build succeeds without errors.

The three findings are documentation and house prose style issues in dev-diary/design.md. Five semicolons appear in the Section 12 motion table. Two sentences in sections 11.1 and 12 exceed the 30-word limit. In addition, sections 9.3 and 9.5 retain stale per-screen wordmark entries.

## Findings by severity

### P3-1 Semicolons in dev-diary/design.md Section 12 motion table

The Section 12 motion table contains five semicolons across four rows. House style strictly forbids semicolons.

Occurrences in Section 12:
- Row 1: Two semicolons divide the clauses for path draw, point fade, and settle cycle.
- Row 4: One semicolon separates the feedback note rise and the accent fade.
- Row 5: One semicolon separates the cue draw and the text reversion note.
- Row 6: One semicolon separates the score bar fill and the accent settle description.

Remediation:
Replace all semicolons with full stops or commas.

### P3-2 Sentences exceeding thirty words in dev-diary/design.md

Two newly updated sentences in dev-diary/design.md exceed the house style limit of 30 words per sentence.

Occurrences:
1. Section 11.1 note (lines 1018 to 1021): 38 words. The single sentence packs name, component, font weights, case, color, SVG mark, and shell mount.
2. Section 12 fallback description (lines 1240 to 1243): 32 words. The single sentence packs component fallbacks, media query, stroke offset, opacity, and dot rest state.

Remediation:
Split each description into two concise sentences under 25 words.

### P3-3 Stale per-screen wordmark entries in sections 9.3 and 9.5

T37 moved the wordmark to Brand.svelte in the app shell. It also moved the 24px top padding to the shell. Sections 9.1 and 9.2 properly describe this superseding architecture. However, sections 9.3 and 9.5 still list wordmark and 24px top padding as their first item.

Occurrences:
- Section 9.3 line 864 lists wordmark and 24px top padding.
- Section 9.5 line 910 lists wordmark and 24px top padding.

Remediation:
Update item 1 in sections 9.3 and 9.5 to state that the shell wordmark sits above the screen.

## Detailed audit verification

### 1. Brand identity and accessibility in src/lib/Brand.svelte

The Brand component implements the Open Path identity cleanly.
- Semantic text: Dry and Run render as real text. The mark does not use an SVG text element. It does not use path glyphs.
- Typography: It uses Lexend 500 on Dry and Lexend 600 on Run. It uses sentence case with color var(--strong) and 0.01em tracking.
- SVG geometry: The SVG measures 28 by 28 CSS pixels with viewBox 0 0 28 28.
- Accessibility: The SVG element declares aria-hidden true and focusable false.
- Color inheritance: Stroke and fill use currentColor.
- Open Path mark: A single 2px line starts at (4, 20) and curves gently to (18, 9). It opens toward the upper right. Round caps and joins are set. The mark avoids arrows, ticks, road signs, and grades.
- Calm destination point: A circle sits at (22, 6) with radius 2. Open space separates the line end from the point.
- Welcome animation: The path draws once on mount via CSS keyframes. The point fades in after it.
- Start screen settle cycle: On the Start screen, the point executes one slow brighten-and-settle cycle. It finishes at opacity 1 via forwards fill mode.
- Practice and tips isolation: When the phase leaves idle, the breathing class is removed. The point does not pulse during practice or on tips.
- Reduced motion fallback: Component styles include a reduced-motion media query. The path sets stroke-dashoffset to 0. The point sets opacity to 1. Both disable animation.

Status: PASS.

### 2. App shell mounting and screen wordmark removal

The mounting architecture conforms to T37 requirements.
- Shell mount: App.svelte imports Brand. It places Brand inside a header above the phase block.
- Single mount: Brand mounts once per session. It does not unmount or redraw on phase changes.
- Top padding: The shell header provides 24px top padding. This maintains the required spacing across all screens.
- Wordmark removal: Per-screen wordmarks and classes are gone from Start, GettingReady, Plan, Practice, and Tips.
- Padding migration: Screen containers in Start, GettingReady, Plan, and Tips set top padding to 0.

Status: PASS.

### 3. Secondary SVG components

All secondary SVG elements follow the visual language and accessibility rules.
- PathPulse.svelte:
  - Dimensions: 48 by 48 CSS pixels with viewBox 0 0 28 28.
  - Geometry: Uses the identical path curve and calm point.
  - Dot motion: A small dot travels along the path via CSS offset-path and settles back in a 2.2s loop.
  - Restraint: Contains no numbers, timers, percentages, or stage names.
  - Accessibility: Declares aria-hidden true and focusable false.
  - Static fallback: Sets track stroke-dashoffset to 0 and full opacity. Pulse traveler dot rests at 0% with opacity 0.
- ChatGPTLine.svelte:
  - Open-path cue: A 16 by 16 decorative cue draws once when an external update arrives.
  - Supplement: Sits alongside status text inside the polite live region.
  - Accessibility: Declares aria-hidden true and focusable false.
  - Static fallback: Sets stroke-dashoffset to 0 and full point opacity with animations disabled.
- FeedbackNote.svelte and ResultPanel.svelte:
  - Static accents: Small decorative path-to-point marks sit beside titles.
  - Behavior: Fades in with the container. Does not animate separately.
  - Neutrality: Neutral line and point avoid trophy, star, checkmark, or grade shapes.
  - Accessibility: Both declare aria-hidden true and focusable false.
  - Static fallback: Sets stroke-dashoffset to 0 and full opacity under reduced motion.

Status: PASS.

### 4. Strict reduced-motion compliance

The global declaration in app.css sets animation duration to 0.01ms with important. This global rule can leave looping dots frozen mid-path. It can also leave dash offsets incomplete.

Each SVG component directly provides its own reduced-motion media query:
- Brand.svelte: sets stroke-dashoffset to 0, point opacity to 1, and disables animation.
- PathPulse.svelte: sets stroke-dashoffset to 0, point opacity to 1, dot offset to 0%, dot opacity to 0, and disables animation.
- ChatGPTLine.svelte: sets stroke-dashoffset to 0, point opacity to 1, and disables animation.
- FeedbackNote.svelte: sets stroke-dashoffset to 0, point opacity to 1, and disables animation.
- ResultPanel.svelte: sets stroke-dashoffset to 0, point opacity to 1, and disables animation.

Computed styles in headless Chromium confirm:
- Path strokeDashoffset computes to 0px.
- Point opacity computes to 1.
- Pulse traveler dot opacity computes to 0 and rests at offset 0%.

Status: PASS.

### 5. Viewport and zoom verification

A real browser test running via Chrome DevTools Protocol verified layout geometry across all five screens. Each screen was evaluated across three viewports.
- Mobile 360px.
- 200% zoom equivalent at 180px.
- Desktop 900px.

Measurement results.
- Start screen: scrollWidth is less than or equal to clientWidth across all viewports.
- Getting ready screen: scrollWidth is less than or equal to clientWidth across all viewports.
- Plan screen: scrollWidth is less than or equal to clientWidth across all viewports.
- Practice screen: scrollWidth is less than or equal to clientWidth across all viewports.
- Tips screen: scrollWidth is less than or equal to clientWidth across all viewports.

Zero horizontal overflow was detected. Content flows within a single column without reflow surprises.

Status: PASS.

### 6. Review documentation in dev-diary/design.md

Documentation updates in design.md record T37 superseding rules across sections 8.5, 8.14, 9.1, 9.2, 11.1, and 12.

Auditing against house prose rules revealed three issues:
- Section 12 table contains five semicolons (recorded as P3-1).
- Section 11.1 and Section 12 contain two sentences exceeding 30 words (recorded as P3-2).
- Sections 9.3 and 9.5 retain stale wordmark references (recorded as P3-3).

Status: REMEDIATE (P3 x 3).

### 7. Automated tests and build

Both the test suite and production build were executed live.
- Automated tests: npm test passed all 75 tests across all suites.
- Coverage: Includes 5 new dedicated T37 assertions in test/brand-motion.test.mjs.
- Verifications: Confirms accessibility, shell mount, screen cleanup, reduced-motion fallbacks, and real Chrome layout.
- Build: npm run build completed cleanly in 584ms.
- Emitted assets: HTML, CSS, JS, and the PDF worker script built without errors.

Status: PASS.

## Concrete remediation diffs

### 1. Fix for P3-1 and P3-2 in dev-diary/design.md Section 11.1 and Section 12

```markdown
### 11.1 App title, promise and steps

T37 note: Brand.svelte renders app.name (Dry Run) as real semantic text in the shell. Dry uses Lexend 500 and Run uses Lexend 600 in sentence case with --strong. The decorative Open Path SVG mark sits beside it.
```

```markdown
## 12. Motion

Motion is minimal and calm: a signal of state change or gentle orientation, never a performance or a countdown.

| Moment | Motion | Duration | Reduced motion |
|---|---|---|---|
| App first loads / Shell mount | Open Path draws once. Destination point fades in. Point makes 1 slow settle cycle on Start screen | 600ms path draw, 350ms point fade, 2.6s settle | Instant resting state (`stroke-dashoffset: 0`, full opacity) |
| Questions are being built | `PathPulse` indeterminate cue: small dot travels along curved path and settles back | 2.2s loop | Plain still path and point, pulse dot at rest |
| Question changes | Card content cross-fades with 4px upward settle | 160ms ease-out | Instant swap |
| Answer feedback | Feedback note fades in and rises 4px. Static path accent beside title fades with it | 200ms ease-out | Instant appear |
| ChatGPT page update | Wash flash plus one-time path draw in tiny cue in ChatGPT line | 500ms cue draw, 1200ms bg fade | Instant complete path and point. Text reverts at 4s |
| Progress and result | Score bar fills. Static path accent settles beside result panel title | 300ms ease-out | Instant width and instant appear |
| Button press | `translateY(1px)` | 80ms | None |
```

```markdown
T37 static component fallbacks: The global `0.01ms` block alone is not sufficient for paths and looping pulse dots. Every SVG component provides explicit static properties inside its own reduced-motion block. It sets `stroke-dashoffset: 0`, gives destination points full opacity, and places pulse dots at rest (`opacity: 0`, `offset-distance: 0%`). Under reduced motion, every mark is complete, `PathPulse` is a plain still path and point, and no frozen partial paths or stalled dots remain.
```

### 2. Fix for P3-3 in dev-diary/design.md sections 9.3 and 9.5

```markdown
### 9.3 Your practice

1. App shell wordmark (`Brand.svelte`) sits above the screen.
2. `t-h1` title.
```

```markdown
### 9.5 Your tips

1. App shell wordmark (`Brand.svelte`) sits above the screen.
2. `t-h1` `Your tips for next time`.
```
