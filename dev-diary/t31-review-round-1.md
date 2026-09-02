# T31 adversarial review — round 1

Date: 2026-09-02  
Scope: uncommitted T31 WebMCP registration of the remaining five tools
(`set_resume`, `get_brief`, `start_interview`, `submit_answer`, `get_verdict`)
in `src/lib/webmcp.js`, plus `test/webmcp-tools.test.mjs`. Reviewer-only pass:
no application code was changed and no commit was made. T32 UI wiring, T33
live ChatGPT, and T25–T30 session-capability rewrites are out of scope.

## Verdict: REMEDIATE

`APPROVE` requires zero P1/P2/P3 findings. This pass found **P1: 0 / P2: 1 /
P3: 1**.

## Findings

### P2-1 — superseded `set_posting` / `set_resume` returns a content block with no text

- **Id**: P2-1
- **Severity**: P2
- **File**: [`src/lib/webmcp.js`](../src/lib/webmcp.js#L61-L88) (`set_posting`
  `:63-65`, `set_resume` `:86-88`); capability shape at
  [`session.svelte.js`](../src/lib/session.svelte.js#L281-L283)
- **Description**: Both mutating brief tools wrap failure as `result.error`
  only. `setPosting` / `setResume` can fail with `{ ok: false, code:
  'superseded' }` and no `error` (overlapping posting or CV analysis, or an
  aborted in-flight brief). `runTool` then returns `{ content: [{ type:
  'text', text: undefined }] }`. JSON serialisation drops the `text` key, so
  the host sees `{ "content": [{ "type": "text" }] }` — a success-shaped MCP
  result with no message, not a failure.
- **Spec vs code**: Execute must return `{ content: [{ type: 'text', text:
  '...' }] }` with a string. The wrap already has `failureText()` for this
  class of result (`error` + `code`, with a fallback string) and uses it on
  `submit_answer`. It is not used on `set_posting` or `set_resume`. Dropping
  `code: 'superseded'` here is not a cosmetic inconsistency: the agent that
  issued the superseded call is told nothing, and may treat the empty result
  as success while the later call is the one that actually landed.
- **Evidence**: Vite-SSR probe, two overlapping `set_posting.execute` calls
  with the first brief held. After the second completed, the first settled as
  `text: undefined` / `{"content":[{"type":"text"}]}`; the second returned the
  stored-posting sentence. The same hole appears on overlapping `set_resume`.
  A concurrent `submit_answer` while scoring is in flight correctly returns
  `Reading your answer scoring_in_progress` because that path uses
  `failureText`.
- **Suggestion**: Return `failureText(result)` (or equivalent) from
  `set_posting` and `set_resume` whenever `!result.ok`, so a code-only
  failure still yields a string. Add an overlapping-call regression that
  asserts the superseded execute result has string `text` and does not look
  like a silent success.
- **Status**: open

### P3-1 — the suite never asserts `submit_answer`'s last-question verdict branch

- **Id**: P3-1
- **Severity**: P3
- **File**: [`test/webmcp-tools.test.mjs`](../test/webmcp-tools.test.mjs#L161-L165)
- **Description**: The thin interview path scores Q1 and asserts the wrap
  returns Q2. It never submits the last question. The wrap itself is correct
  by inspection and by an independent last-question execute: with
  `session.current = 7` after `start_interview`, `submit_answer` returned
  `{"band":"not yet","average":4,"answered":1,"total":8,"capped":true}` and
  `phase` was `done`. The capability on a full Q1–Q8 run returns
  `{ ok: true, verdict }` with no `question` field, which is the branch
  `if (result.question) … else JSON.stringify(result.verdict)` is written
  for.
- **Spec vs code**: `submit_answer` must return the next question **or the
  verdict**. That second half is the distinctive contract, and the current
  test would still pass if the wrap stringified only `result.question`
  (`JSON.stringify(undefined)` is `undefined`, i.e. the same empty-text
  hole as P2-1).
- **Suggestion**: After a valid start, drive `submit_answer` through the last
  question (or set `session.current` to the last saved question after Q1 is
  in play) and assert the execute text parses as the verdict object, not as
  a question.
- **Status**: open

## Contract checks that hold

- **Host contract vs execute signature — PASS.** Registration still passes
  object `inputSchema` values, not JSON strings. Every `execute` handler
  destructures a parsed object (`{ posting }`, `{ resume }`, `{ transcript }`,
  or no args). There is no `JSON.parse` in `webmcp.js`, and execute was not
  changed to take a string. Six literal `document.modelContext.registerTool`
  calls share one `AbortController`; abort is unregister. Feature-detect is
  `document` then `navigator`; missing `modelContext` still returns a no-op
  teardown.
- **Annotations — PASS.** Exact table: `set_posting` and `set_resume` have
  `untrustedContentHint: true` and omit `readOnlyHint`; `get_brief` and
  `get_verdict` have `readOnlyHint: true`; `start_interview` and
  `submit_answer` omit `annotations` entirely. No tool sets
  `readOnlyHint: false` explicitly.
- **Spoken-answer sentence — PASS.** `submit_answer`'s description states
  that the transcript is the user's spoken answer, transcribed from what they
  said out loud, and tells the agent not to invent an answer. The schema
  property repeats "The user's spoken answer, as transcribed." Required input
  name is `transcript`; `resume` is the `set_resume` property. Sending only
  `answer` or `text` is rejected as empty input.
- **Agent-usable payloads — PASS, apart from P3-1 coverage.** `get_brief`
  returns a clear "none yet" sentence, then JSON of `{ owns, study, angles,
  confidence }`. `start_interview` returns Q1 JSON, not a mere "started"
  ack. Mid-interview `submit_answer` returns the next question. Last-question
  `submit_answer` returns `getVerdict()` JSON (verified by probe; not pinned
  by the suite). `get_verdict` returns `{ verdict, questions }` so the
  description's per-question scores, missed points, and model answers are
  actually present; `getVerdict()` itself remains `{ band, average, answered,
  total, capped }`.
- **`$state` JSON.stringify — PASS.** `JSON.stringify(session.questions)` in
  the Vite-SSR `$state` proxy round-trips as an array with stored
  `scores` / `missed` / `modelAnswer`. The browser persist `$effect` already
  does `JSON.stringify(session)` for deep tracking, so the same proxy
  serialisation is live on the client path.
- **Call flash / `runTool` — PASS.** Every execute, including read-only and
  the refactored `set_posting`, goes through `runTool`, which writes
  `agentSeen` and `lastCallAt` before awaiting work. There is no execute path
  that skips recording. A throw inside work still leaves the flash start,
  which is the intended in-flight behaviour. Execute cannot throw before
  `runTool` on the registered handlers.
- **Capability wrapping, not duplication — PASS.** Tools await the async
  capabilities (`setPosting`, `setResume`, `submitAnswer`) and call the sync
  ones (`getBrief`, `startInterview`, `getVerdict`) without a needless extra
  protocol. `git diff` does not touch `session.svelte.js`; session semantics
  are unchanged.
- **Teardown / isolation / scope — PASS.** Page remains usable without
  WebMCP. Duplicate-name HMR abort is the existing shared-signal pattern and
  is safe to call twice. The new test restores `document` and `fetch`, loads
  through `vite.test.config.js` with `hmr`/`ws` false, and mocks `/api/analyze`
  (no live network). Tracked diff is only `src/lib/webmcp.js`; the new test
  file is untracked. No creep into UI, `copy.js`, `vite.config.js`, or
  `package.json`.

## Evidence

- `git status` — modified `src/lib/webmcp.js`; untracked
  `test/webmcp-tools.test.mjs` only (plus this review record).
- `git diff --check` — clean on the tracked T31 diff.
- `node --test --test-concurrency=1` — **52 passed, 0 failed**, including the
  three T31 subtests (annotations/spoken-answer/schemas, thin interview path,
  HMR abort). No `24678 is already in use` warning.
- `npm run build` — passed. Vite issued only the existing >500 kB chunk-size
  advisory (`index-C5kJdzjx.js` 540.13 kB).
- Reviewer-only Vite-SSR probe (stdin script, no tracked files written)
  reproduced P2-1, confirmed the last-question wrap returns verdict JSON,
  confirmed `$state` question serialisation, and confirmed specified input
  names (`transcript` / `resume`) rather than `answer` / `text` aliases.

No application code was modified and no commit was created by this review.
