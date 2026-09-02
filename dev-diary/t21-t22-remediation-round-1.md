# T21/T22 remediation, round 1

This record remediates every finding in
[t21-t22-review-round-1.md](t21-t22-review-round-1.md). It makes no deployment,
provider/API, or production change.

| Round-1 finding | Local change | Local validation |
|---|---|---|
| P1-1: “Choose a file” was not associated with the hidden file input because Svelte `{inputId}` emitted `inputid`, not `id` | Changed the file input in `src/lib/FileChooser.svelte` to `id={inputId}`. The visible label retains `for={inputId}`, so it names the generated input ID. | Added `test/file-chooser-browser.test.mjs`. It starts the local Vite app and a headless Chrome instance, queries the rendered chooser DOM through DevTools, asserts `label.control === input`, and verifies that `label.click()` dispatches exactly one click to the hidden file input. This would fail for the former `inputid` attribute. |

## Local gates

- `node --test test/file-chooser-browser.test.mjs` — passed: 1 passed, 0 failed.
- `node --test test/resume-foundation.test.mjs test/file-chooser-browser.test.mjs` — passed: 4 passed, 0 failed.
- `npm test` — passed: 28 passed, 0 failed.
- `npm run build` — passed: Vite transformed 160 modules and emitted the
  application plus the same-origin PDF.js worker. Vite reports its standard
  >500 kB main-chunk warning; there was no build error.
- `git diff --check` — passed.

## Scope and residue

T23 (the four distinct failure modes) and T24 (privacy copy) remain intentional
next-workstream scope and were not changed or scored here. There is no remaining
T21/T22 round-1 remediation residue.

## Lambo state

Recall and inspection were performed before source review. The load-bearing
`dev-diary/t21-t22-review-round-1.md` resource exposed no concept-node UUID,
so it could not be reserved; no reservation was taken.
