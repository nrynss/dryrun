# T13 review round 1

Date: 2026-09-01

**Verdict: APPROVE — 0 P1, 0 P2, 0 P3.**

## Findings

None at any severity.

## Checklist

1. **Token exactness — PASS.** Every custom property in `src/app.css` `:root` matches design.md Section 5 verbatim: all 18 colour tokens (`--paper #FBFAF8`, `--card #FFFFFF`, `--band #F1EFEA`, `--ink #1B1D21`, `--ink-quiet #55595F`, `--on-fill #FFFFFF`, `--edge #DDDCD8`, `--edge-firm #84817A`, `--strong #1B5E4A`, `--strong-deep #0F3F31`, `--strong-wash #EAF3EF`, `--almost #8A5300`, `--almost-wash #FCF3E3`, `--note #1F4E8C`, `--note-wash #E9F0F9`, `--stop #8E3038`, `--stop-wash #FCEBEC`, `--disabled #6E6B65`), the four 5.4 tokens (`--radius-card 10px`, `--radius-input 8px`, `--radius-pill 999px`, `--shadow-card 0 1px 2px rgba(27,29,33,.06), 0 2px 8px rgba(27,29,33,.05)` — rgba values exact), the two Section 6 font stacks, and the three Section 7.1 frame tokens. No missing token, no invented token (no spacing-variable system, no extras).

2. **One light theme — PASS.** `color-scheme: light` on `:root` in app.css. No dark block, no `prefers-color-scheme: dark` section anywhere. Grep across `index.html` and `src/` finds no `#0A0A0C`, `#00FF41`, `#E0E0E6`, `monospace`, or `text-transform`. Built `dist/` bundle likewise contains no `0a0a0c`/`00ff41`/`e0e0e6` (case-insensitive check).

3. **Focus rule (5.3) — PASS.** `:where(a, button, input, textarea, select, summary, [tabindex]):focus-visible` with `outline: 3px solid var(--ink)`, `outline-offset: 2px`, `border-radius: 6px`, plus the `.btn-primary:focus-visible { box-shadow: 0 0 0 2px var(--card); }` companion. Exact match to spec, including the `:where()` selector.

4. **Type scale (6.1) — PASS.** All eleven classes present with exact values: t-display (ui 30→36px 600/1.20/-0.01em), t-h1 (ui 24→28px 600/1.25/-0.005em), t-h2 (ui 19px 600/1.30/0), t-h3 (ui 15px 600/1.40/0), t-question (ui 22→26px 500/1.35/0), t-body (text 17px 400/1.60/0), t-body-b (text 17px 600/1.60/0), t-small (text 15px 400/1.55/0), t-micro (ui 13px 600/1.50/0.01em), t-button (ui 17px 600/1.00/0), t-number (ui 17px 600/1.00/0 + `font-variant-numeric: tabular-nums`). Face split correct (8 ui classes → `--font-ui`, 3 text classes → `--font-text`). `text-wrap: balance` only on t-display/t-h1/t-question. 640px step-up only for t-display (36px), t-h1 (28px), t-question (26px). No uppercase transforms, nothing below 13px.

5. **Page frame (7.1) — PASS.** `.page { background: var(--paper); min-height: 100dvh; }`, `.column { max-width: var(--column); margin-inline: auto; padding-inline: var(--gutter); }`, and the 480px gutter media query switching to `--gutter-wide` (24px). `--gutter 16px`, `--gutter-wide 24px`, `--column 640px`. Exact match.

6. **Action bar (7.3) — PASS.** `.actionbar` sticky at bottom, `background: var(--paper)`, `border-top: 1px solid var(--edge)`, `padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom))`, and the 768px media query `position: static; border-top: 0; padding-inline: 0; padding-bottom: 0`. Exact match.

7. **Spacing scale (7.2) — PASS.** The 8 values (4 8 12 16 24 32 48 64) documented as a comment. No invented spacing-variable system.

8. **Reduced motion (12) — PASS.** Verbatim block: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }`. All four declarations with `!important`.

9. **index.html — PASS.** Both preconnect links present (`fonts.googleapis.com`, `fonts.gstatic.com` with `crossorigin`); stylesheet URL exactly `https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&family=Source+Sans+3:wght@400;600&display=swap`; `meta name="color-scheme" content="light"`; inline style declares `:root { color-scheme: light; background: #FBFAF8; }` before app CSS with an honest comment ("Dry Run ships light only…"). The old `color-scheme: dark` meta and `#0A0A0C` inline rule are gone.

10. **main.js — PASS.** `import './app.css';` added at the top.

11. **App.svelte — PASS.** Full diff reviewed: only the `<style>` block changed, strictly removals. Gone: `:global(body) { background: #0A0A0C; color: #E0E0E6; }`, system-ui font on `main`, h1 uppercase/letter-spacing, monospace on `.status/.phase/.count`, `.dot.on #00FF41`, `.error #FF3366`, `.ok #00FF41`, label uppercase, textarea dark bg/monospace/zero radius, button green-fill/zero radius/uppercase, custom focus-visible rule. Markup and script untouched. No new styles beyond neutral layout. No NEW banned strings from design 3.2 were added by this patch (the pre-existing T02 gate strings — "Agent connected…", "phase:", "Analyse", "chars" — are temporary gate copy replaced by T16/T19 and were not flagged per the brief).

12. **Scope discipline — PASS.** `git status` shows exactly: `index.html`, `src/App.svelte`, `src/main.js` modified; `src/app.css` untracked; plus `netlify/functions/analyze.mts` modified, whose diff (token ceilings, prompt text, reasoning effort, debug logging) is entirely unrelated to T13 and was already uncommitted before this task. `src/lib/*` untouched.

13. **Build — PASS.** `npm run build` completes: 114 modules transformed, `dist/index.html` 1.20 kB, CSS 3.58 kB, JS 34.04 kB, no errors.

14. **Judge view — PASS (verified headlessly).** Served the production `dist/` build and drove it with headless Chromium via CDP. At an emulated 360px viewport and the ~500px default headless viewport: root background computes to `rgb(251, 250, 248)` = `#FBFAF8`, `color-scheme: light`, body background transparent (canvas shows paper), textarea renders white, no horizontal scroll (`scrollWidth === clientWidth` at both widths). No inherited dark body styles anywhere, no min-height issues. Note: the temporary T02 gate screen renders its text in the browser-default face and colour (Times New Roman / black) — a direct consequence of the instructed neutral-layout strip (the old font stack was removed and no new styles were to be added). This is the temp gate surface replaced by T16, not a T13 defect; the `.t-*` classes and tokens that will carry the faces are present and correct. Note also that the vite dev server itself cannot start in this environment (Netlify edge-functions deno subprocess crashes with `unexpected argument '--allow-scripts'`) — unrelated to this patch; the static `dist/` serving used instead exercises the same built output a judge loads.
