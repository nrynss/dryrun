# T14 remediation round 1

Date: 2026-09-01

**Closure: 0 P1, 0 P2, 0 P3.** Round-1 review filed one P3; fixed by the
orchestrator per the trivial-P3 protocol (no re-review needed).

## Finding and fix

- **P3 — Global `box-sizing: border-box` (review: `src/lib/Button.svelte:39`).**
  The review predicted that Section 8.3 textareas (T16) under content-box
  would overflow the 360px column (358px vs 328px) and violate the Section 13
  "no horizontal scroll" checklist item, and that every later bordered+padding
  component would re-solve the problem scoped to itself.
- Fix: added the global reset to `src/app.css` (T13 foundation file, in-scope
  for the interface block):
  `*, *::before, *::after { box-sizing: border-box; }`
  and removed the now-redundant scoped `box-sizing: border-box` + comment from
  `src/lib/Button.svelte`.

## Verification

- `npm run build` passes.
- Headless browser on the rebuilt `dist` at 360px: 8 cards, 8 Show-all
  toggles, card computes `border-box`, `scrollWidth === clientWidth` (no
  horizontal scroll).

## Carry-forwards for later tasks (documented, not defects)

- T19 must add `btn.show_less` to `src/lib/copy.js` (the collapse string is
  not in the Section 11 deck) and sweep the inline strings.
- Design-doc bug to note: Section 3.5 says the Show all text button is 44px
  high; R7 (cannot be broken) and 8.2 specify >=48px. T14 built it at 48px.
