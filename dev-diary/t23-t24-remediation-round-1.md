# T23/T24 remediation, round 1

Date: 2026-09-02  
Implementer: gpt-5.6-terra  
Scope: the P2 and P3 findings in `t23-t24-review-round-1.md`.

## Outcome

**Remediated.** The PDF-only failure boundary is now explicit, and the
missing behaviour has permanent browser/component coverage. No T24 privacy
copy or pre-existing resume-ingestion behaviour was changed.

## P2 — accepted TXT/MD read failures no longer claim the file is a scan

`FileChooser.svelte` now determines `isPdf` after the extension gate and
before the `try`/`catch` boundary.

- PDF failures still use `err.pdf_locked` only for PDF.js
  `PasswordException`, and `err.pdf_scan` for other PDF extraction failures.
- Accepted TXT/MD `File.text()` failures use the approved generic
  `copy.err.unknown`: “Something went wrong. Try again in a minute.” They
  never show PDF-only scan or password language.
- `session.resume` remains assigned only after successful read, normalisation,
  and (for PDFs) text validation, so every failed upload preserves an existing
  pasted CV.

## P3 — durable coverage added

`test/file-chooser-browser.test.mjs` now drives a real Vite/Chrome file input
with locally generated fixtures:

- a blank valid PDF verifies the exact scanned-PDF alert;
- a Ghostscript password-protected PDF verifies the exact locked-PDF alert;
- each failed PDF upload keeps a prior pasted CV after the CV field is
  unmounted and remounted, proving the shared session value survives;
- a selected `.txt` with `File.prototype.text()` forced to reject verifies the
  exact generic error and the same preservation rule.

`test/resume-foundation.test.mjs` now Vite-SSR-renders `Practice.svelte` with
`fitMatch.confidence === 'low'`. It verifies the exact non-CV notice, its
non-blocking `role="status"`, and that `Next question` remains available.

The focused foundation assertions also guard the ordering of `isPdf` before
the `try` block and the generic non-PDF catch branch.

## Verification

- `node --test --test-name-pattern='PDF-specific' test/file-chooser-browser.test.mjs` — PASS (1/1).
- `node --test test/resume-foundation.test.mjs` — PASS (5/5).
- `npm test` — PASS (32/32).
- `npm run build` — PASS; Vite emitted the same-origin PDF worker. The only
  output was the existing non-failing >500 kB chunk advisory.
- `git diff --check` — PASS.

## Residue

No known P2/P3 functional residue remains from the round-1 review. The
generic non-PDF read error deliberately reuses the approved `err.unknown`
copy; no new T24 copy was introduced.
