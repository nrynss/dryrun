# T21/T22 closing review, round 2

Date: 2026-09-02
Reviewer: gpt-5.6-terra
Target: T21 (browser-side PDF.js extraction with a same-origin worker) and T22
(pasted text plus `.txt`/`.md` ingestion), after round-1 remediation.

This was an independent, read-only implementation review. It reviewed the
round-1 review/remediation records, the current uncommitted implementation and
tests, the task/design/project conventions, and the complete current diff. No
application code, dependency, configuration, deployment, provider, or
production state was changed. Lambo recall and inspection ran before source
review. The existing memory resource exposes no UUID suitable for a soft lock,
so no reservation could be taken.

## Verdict

**APPROVE — 0 P1, 0 P2, 0 P3.**

There is exactly zero T21/T22 residue.

## Round-1 P1 closure

`FileChooser.svelte` now renders its hidden native file input as
`id={inputId}` and retains the visible `Choose a file` label as
`for={inputId}`. That makes the label target the actual, generated input ID
rather than the former invalid `inputid` attribute.

The new real-browser regression test launches Vite and headless Chrome, then
asserts all of the following against the rendered DOM:

1. `input.id === label.htmlFor`;
2. `label.control === input`; and
3. `label.click()` dispatches exactly one click to that hidden input.

The focused test passed. This is behavioral coverage of the association and
activation path, not a source-pattern assertion; it would fail with the
round-1 `{inputId}` defect.

## T21/T22 acceptance evidence

- **PDF extraction and locality:** `pdfjs-dist@6.3.289` is installed. The
  chooser uses only browser `File.arrayBuffer()`/`File.text()` reads,
  `getDocument({ data }).promise`, and page-wise `getTextContent()` joined
  from `item.str`; the reviewed ingestion code makes no network request.
- **Same-origin worker/bundle:** the production Vite build succeeds and emits
  `dist/assets/pdf.worker.min-Dswkl-cV.mjs`. `GlobalWorkerOptions.workerSrc`
  is a Vite `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)`
  asset URL. A local `vite preview` returned HTTP 200 for both the document and
  `/assets/pdf.worker.min-Dswkl-cV.mjs`; the worker response was
  `text/javascript`. No CDN worker is configured.
- **Paste, text, and Markdown:** the optional pasted-CV `TextArea` binds
  directly to `session.resume`, the same state written after a successful
  upload. `.txt` and `.md` use `File.text()`; PDFs take the PDF.js route.
  This preserves the direct-state display-parity convention.
- **Accepted types:** the picker advertises exactly
  `.pdf,.txt,.md,text/plain,text/markdown,application/pdf`, and the extension
  gate accepts PDF/TXT/MD case-insensitively while rejecting unsupported and
  double-extension names such as `resume.pdf.exe`.
- **Limits:** uploaded text is null-safe, trimmed before assessment, and keeps
  the first 20,000 post-trim characters only when over the cap. Independent
  boundary verification passed: an exactly-20,000-character value is not
  truncated; a 20,001-character value is clipped to 20,000 and marked
  truncated. Text under 40 characters remains rejected before it can write
  `session.resume`.
- **Accessibility and UI contract:** the native input remains focusable while
  visually hidden, the associated visible label is a 48px control, its focus
  treatment follows the input, and the successful-file row preserves the
  required filename, decorative tick, and 48px Remove control. The privacy
  note is visible below the control. The repaired label/input association also
  restores the native input's accessible label.
- **Regression scope:** the helper has focused acceptance/normalization tests;
  the browser association regression passed; the full suite, production build,
  and diff whitespace check all pass. The only Vite output is the known
  non-failing main-chunk size warning; the design supplies no bundle budget.

## Commands run

- `npm test` — **PASS**, 28 passed, 0 failed.
- `node --test test/resume-foundation.test.mjs test/file-chooser-browser.test.mjs`
  — **PASS**, 4 passed, 0 failed.
- `npm run build` — **PASS**, 160 modules transformed; app and local PDF
  worker emitted.
- Local production-preview document/worker HTTP checks — **PASS**, both 200;
  worker served as JavaScript from the preview origin.
- Direct cap/type boundary check — **PASS**.
- `git diff --check` — **PASS**.

## Scope boundary

T23's four distinct failure-mode work (including the complete pasted-text
overlength path and fit-confidence result) and T24's privacy-copy ownership
remain intentionally deferred and were not counted as omissions. Their future
implementation is not blocked: T21/T22 already expose capped uploaded text,
the common `session.resume` state source, and the existing error/warning
surfaces needed for those tasks.
