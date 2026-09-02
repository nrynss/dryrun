# T23/T24 closing review, round 2

Date: 2026-09-02  
Reviewer: gpt-5.6-terra  
Target: the uncommitted T23/T24 remediation in `FileChooser.svelte`,
`resume-input.js`, and their focused tests.

This is an independent, read-only closing review of the remediation recorded
in `t23-t24-remediation-round-1.md`. No application, test, dependency,
configuration, or deployment code was modified or committed. Lambo recall ran
before source review; inspection showed the earlier review/remediation chain
and its design/task dependencies. The inspected record did not expose a graph
node UUID, so a soft reservation could not be taken for this documentation
write.

## Verdict

**APPROVE — 0 P1, 0 P2, 0 P3.**

The round-1 P2 is closed: accepted text-file read failures now use approved
generic copy, and the scan/locked classifications are reachable only when the
accepted file name is a PDF. The prior P3 is also closed with durable,
meaningful behavioural coverage for each T23 outcome and the T24 placement
contract. No residue that blocks the T23/T24 integration gate was found.

## P2 closure: PDF-only classification boundary

`FileChooser.svelte` first rejects unsupported extensions, then computes
`isPdf` before the `try`/`catch` boundary. It uses that same value for the
extractor, the under-40-character scan rule, and the error branch:

- PDFs with a `PasswordException` render `copy.err.pdf_locked`.
- Other PDF extraction/read failures render `copy.err.pdf_scan`.
- Accepted non-PDF reads (`.txt` and `.md`) render only
  `copy.err.unknown`: “Something went wrong. Try again in a minute.”

This is a real shared non-PDF path, not a TXT-only special case. The
foundation test verifies `.txt` and `.md` (including mixed case) are accepted;
the browser regression forces `File.prototype.text()` to reject for an
accepted TXT file and observes the generic copy. Since both accepted text
extensions take `isPdf === false` and the same `file.text()`/catch expression,
an MD read error has the identical generic outcome. No scan or locked string
is reachable in that branch.

`session.resume` is assigned only after a successful read, normalization, and
PDF scan validation. The browser regression starts with pasted text and proves
that text still exists after scan, locked, and rejected-text failures, including
after the CV field is unmounted and remounted.

## T23 and T24 acceptance evidence

| Contract | Independent evidence | Result |
|---|---|---|
| Scanned/image-only PDF | Real Vite/headless-Chrome test selects a generated blank PDF and asserts the exact `err.pdf_scan` alert and preserved pasted CV. | Pass |
| Locked PDF | The same real-browser test selects a Ghostscript user-password PDF and asserts the distinct exact `err.pdf_locked` alert and preserved pasted CV. | Pass |
| Over-cap CV | Real-browser test selects a 20,001-character TXT file; it retains the head, shows exact non-blocking `warn.cv_long`, and replaces the picker with `✓ long-resume.txt`. | Pass |
| Content that is not a CV | Vite SSR component regression sets `session.fitMatch.confidence` to `low`; it asserts exact `warn.not_cv`, `role="status"`, and availability of `Next question`. This matches design state 8's downstream, non-blocking confidence flow. | Pass |
| T24 privacy | Real-browser test asserts the exact `copy.start.privacy` value. DOM order places the always-visible `.privacy` panel immediately after the picker/file row, and its CSS supplies the specified 12px adjacent gap, band panel, 12px padding, and 8px radius. | Pass |

The coverage is meaningful rather than source-pattern-only: scan, locked, cap,
and text-read-rejection run through a native file input in a live Vite/Chrome
session with generated local fixtures. The downstream low-confidence flow is
rendered by Vite SSR and verifies both its accessible non-blocking treatment
and that practice remains available.

## Checks run by this review

- `npm test` — **PASS**: 32 passed, 0 failed. This includes all three live
  chooser browser tests and the low-confidence component regression.
- `node --test --test-name-pattern='PDF-specific|low-confidence' test/file-chooser-browser.test.mjs test/resume-foundation.test.mjs` — **PASS**: 2 passed, 0 failed; direct focused evidence for the PDF/text failure matrix and non-CV flow.
- `npm run build` — **PASS**: 160 modules transformed; same-origin PDF worker
  emitted. The only output was Vite's existing non-failing >500 kB chunk
  advisory.
- `git diff --check` — **PASS**.

The diff is limited to the intended chooser/helper behaviour and focused
coverage, plus the three review/remediation records. T24 copy itself was not
changed and exactly matches design sections 8.4 and 11.3; all four T23
messages match section 11.9.
