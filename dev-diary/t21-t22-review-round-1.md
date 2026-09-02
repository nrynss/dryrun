# T21/T22 review, round 1

Date: 2026-09-02
Reviewer: gpt-5.6-terra
Target: T21 (browser-side PDF.js extraction with a same-origin worker) and T22 (pasted text plus `.txt`/`.md` ingestion). Read-only review of the uncommitted implementation in `src/lib/FileChooser.svelte`, `src/lib/resume-input.js`, and `test/resume-foundation.test.mjs`; this record is the sole review artifact written.

Lambo inspection identified the load-bearing T21/T22 resource but exposed no concept-node UUID suitable for `lambo_reserve`; no reservation was taken.

## Verdict

**REMEDIATE — 1 P1, 0 P2, 0 P3.**

## Findings by severity

### P1-1 — The visible “Choose a file” control is not associated with the hidden file input, so it cannot open the picker

`FileChooser.svelte` declares the input with `{inputId}` and the label with `for={inputId}`. In Svelte, the shorthand uses the variable name as the attribute name, so the input gets an `inputid` attribute rather than an `id`. The label consequently has no labelable control with the ID it names. This is a load-bearing pre-existing line in the chooser, but it blocks the human upload path that T21/T22 must make usable.

Reproduction/evidence:

1. Build the current tree with `npm run build`.
2. Inspect the emitted `FileChooser` code in `dist/assets/index-wXOxo1g1.js`. Its DOM update is `ea(n, \`inputid\`, a)` for the `<input>` and `ea(r, \`for\`, a)` for the `<label>`; it never sets `id`.
3. Browser label activation resolves `label.htmlFor` only against a matching `input.id`; here no such element exists. Clicking the visible `Choose a file` label therefore has no picker to activate. The off-screen native input also lacks its intended accessible name association.

Fix `src/lib/FileChooser.svelte` to use `id={inputId}` on the `<input>`, retain `for={inputId}` on the label, and add a DOM/browser-level regression test that asserts the association and label activation. Do not rely only on source-regex assertions.

## Verified behaviour

- **PDF.js API/version compatibility:** installed `pdfjs-dist` is `6.3.289`; it exports `getDocument` and `GlobalWorkerOptions`, and contains `build/pdf.worker.min.mjs`. The code uses the v6-compatible `await getDocument({ data }).promise`, page-wise `getTextContent()`, and `item.str` joining.
- **Vite/same-origin worker:** the production build succeeds and emits `dist/assets/pdf.worker.min-Dswkl-cV.mjs` (1,265,413 bytes). The application resolves `GlobalWorkerOptions.workerSrc` to that hashed `/assets/...mjs` URL. A local `vite preview` served both the document and worker at `127.0.0.1:4173` with HTTP 200; the worker is `Content-Type: text/javascript`. No CDN worker is used.
- **Browser-side extraction/privacy boundary:** the chooser uses `File.arrayBuffer()` for PDFs and `File.text()` for TXT/MD, then writes text into the Svelte `session.resume` state. There is no upload request in this code. `Start.svelte` binds pasted CV input directly to the same `session.resume` source.
- **Type acceptance:** acceptance is intentionally filename-extension based, consistent with the design’s explicit “extension decides” rule. PDF/TXT/MD are case-insensitive; `resume.pdf.exe` is rejected. The picker’s accept value exactly matches design section 8.4: `.pdf,.txt,.md,text/plain,text/markdown,application/pdf`.
- **Text semantics:** normalization coerces nullish input, trims before evaluation, retains the first 20,000 post-trim characters, and reports truncation only when post-trim text exceeds the cap. Independent boundary check: exactly 20,000 characters returns `truncated=false`; 20,001 returns a 20,000-character result with `truncated=true`. The chooser checks the under-40 scan condition after normalization and writes the capped text only on successful extraction.
- **T23/T24 separation:** the deferred T23 error/cap and T24 privacy work is not scored as missing. T21/T22’s helper return shape (`text`, `truncated`) and current state flow do not preclude the four errors or privacy copy later.

## Checks run

- `npm test` — **PASS**: 27 tests passed, 0 failed.
- `npm run build` — **PASS**: Vite transformed 160 modules and emitted the application plus the local worker. Vite reports its standard >500 kB main-chunk warning; no build error.
- `git diff --check` — **PASS**.
- Direct helper boundary checks — **PASS**: cap/exact-cap/one-over and PDF-case/double-extension cases as described above.
- Production-preview HTTP checks — **PASS**: page and worker both HTTP 200 on the same local origin.

The available browser-control runtime reported no connected browser (`[]`), so a live click/upload run could not be performed. The generated DOM evidence is nevertheless conclusive for P1-1; it shows the literal wrong attribute name in the production bundle.

## Non-finding observations

- The static `pdfjs-dist` import produces a 524 kB unminified main JavaScript chunk and Vite’s chunk-size warning. This is worth considering for mobile performance, but the design supplies no bundle budget and it does not prevent T21/T22 correctness.
- The current focused test checks the worker source and pasted-state binding by source regex. It validates neither file-picker activation nor an actual PDF fixture; the P1 remediation should close that gap with behavioral coverage.
