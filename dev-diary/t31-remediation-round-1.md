# T31 remediation — round 1

Date: 2026-09-02  
Scope: round-1 P2 and P3 findings in `src/lib/webmcp.js` and
`test/webmcp-tools.test.mjs`. Session capability semantics, `runTool`,
annotations, and the spoken-answer contract were not changed. T32 was not
started. No commit was made.

## P2-1 — superseded `set_posting` / `set_resume` returns a content block with no text

**What the review said**: both mutating brief tools wrapped failure as
`result.error` only. `setPosting` / `setResume` can fail with
`{ ok: false, code: 'superseded' }` and no `error`. `runTool` then returned
`{ content: [{ type: 'text', text: undefined }] }`. JSON serialisation dropped
the `text` key, so the host saw a success-shaped MCP result with no message.
`failureText()` already existed and was used on `submit_answer`.

**What changed**:
- `src/lib/webmcp.js:65` — `set_posting` now returns `failureText(result)`
  whenever `!result.ok`, instead of `result.error`.
- `src/lib/webmcp.js:88` — `set_resume` does the same.

A code-only failure now yields the string `"superseded"` (or the existing
fallback `"The request could not be completed."` if both `error` and `code`
are missing). Session capability return values are unchanged.

**How verified**: `test/webmcp-tools.test.mjs:195-264` stubs `globalThis.fetch`
with a deferred brief, starts a held `set_posting.execute`, completes a second
call, then releases the first. The superseded execute result has non-empty
string `text` matching `superseded` (or the fallback), does not match the
stored-posting success sentence, and keeps a `"text"` key after
`JSON.stringify`. The same overlap is asserted for `set_resume`.

## P3-1 — the suite never asserts `submit_answer`'s last-question verdict branch

**What the review said**: the thin interview path scored Q1 and asserted Q2.
It never submitted the last question, so the wrap
`if (result.question) … else JSON.stringify(result.verdict)` was untested.
Stringifying only `result.question` would still have passed.

**What changed**:
- `test/webmcp-tools.test.mjs:266-295` — after a valid `set_posting` /
  `start_interview`, the test sets `session.current` to the last saved
  question index and calls `submit_answer` with the existing stubbed
  `/api/analyze` score fetch. The execute text parses as the verdict object
  (`band`, `average`, `answered`, `total`, `capped`) and is not a question
  (`id` / `prompt`). `session.phase` is `done`.

Jumping `session.current` is faithful to the wrap: `submitAnswer` scores the
current saved question and returns `{ ok: true, verdict }` when that index is
the last. Scoring all eight is not required.

## Verification

- `node --test --test-concurrency=1` — 54 passed, 0 failed (two new T31
  subtests: overlapping superseded brief tools, last-question verdict).
- `npm run build` — passed. Vite issued only the existing >500 kB chunk-size
  advisory (`index-cX0_da6j.js` 540.12 kB).
- `git diff --check` — clean.

No commit was made and no review Status fields were edited by this
remediation pass.
