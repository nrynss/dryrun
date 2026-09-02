# T31 adversarial review — round 2

Date: 2026-09-02  
Scope: uncommitted T31 WebMCP registration after round-1 remediation
(`src/lib/webmcp.js`, `test/webmcp-tools.test.mjs`). Reviewer-only pass: no
application code was changed and no commit was made. The round-1 review file
was not edited. T32 UI wiring, T33 live ChatGPT, and session-capability
rewrites are out of scope.

## Verdict: APPROVE

`APPROVE` requires zero P1/P2/P3 findings. This closing review found **P1: 0 /
P2: 0 / P3: 0**.

## Prior findings verified

### P2-1 — superseded `set_posting` / `set_resume` returns a content block with no text — PASS

Both mutating brief wraps now return `failureText(result)` whenever
`!result.ok` (`src/lib/webmcp.js:63-65` and `:86-88`). `failureText` already
joined `error` and `code` and fell back to `"The request could not be
completed."`; `submit_answer` was already on that helper. A code-only
`{ ok: false, code: 'superseded' }` therefore yields string `text:
"superseded"` inside `{ content: [{ type: 'text', text }] }`.

The suite now overlaps two held `set_posting.execute` calls and two held
`set_resume.execute` calls (`test/webmcp-tools.test.mjs:195-264`). The later
call keeps the stored-posting / stored-resume sentence; the superseded call
must be a non-empty string matching `superseded` (or the fallback), must not
look like a silent success, and must keep a `"text"` key after
`JSON.stringify`.

An independent Vite-SSR probe of the live wraps reproduced the same sequence:
later posting execute returned `Stored the posting, 46 characters. The page is
now ready.`; the superseded posting execute returned `text: "superseded"` /
`{"content":[{"type":"text","text":"superseded"}]}`. The resume overlap
matched. Session posting stayed the later value and phase stayed `ready`.

### P3-1 — the suite never asserts `submit_answer`'s last-question verdict branch — PASS

After a valid `set_posting` / `start_interview`, the new subtest sets
`session.current` to the last saved question index and submits one spoken
transcript (`test/webmcp-tools.test.mjs:266-295`). Execute text parses as
`{ band, average, answered, total, capped }` (`not yet` / `4` / `1` / `8` /
`true`), has no `id` or `prompt`, and `session.phase` is `done`. Jumping
`current` is the wrap-faithful path round 1 asked for: `submitAnswer` scores
the current saved question and returns `{ ok: true, verdict }` when that index
is last. The thin path still asserts Q1 → Q2, so stringifying only
`result.question` would now fail this test (`JSON.stringify(undefined)` is not
a verdict object).

The same last-question execute in the independent probe returned
`{"band":"not yet","average":4,"answered":1,"total":8,"capped":true}` with
phase `done`.

## Findings

None.

## Regression hunt

- **Error-only failures still have string `text` — PASS.** Empty posting
  execute is `Paste the job advert first.`; CV without a posting is `Paste the
  job posting before adding your CV.`. Both are `inputError` results with
  `error` and no `code`; `failureText` returns that sentence unchanged.
  `JSON.stringify` keeps the `text` key.
- **Error-plus-code failures still include the error sentence — PASS.** A 503
  CV analysis wrap is `CV analysis failed. upstream_failed`. The public error
  string is still present; the code is appended the same way `submit_answer`
  already did. The thin-path `/CV analysis failed/` assertion still holds.
- **Success path unchanged — PASS.** A winning `set_posting` / `set_resume`
  still returns the stored-posting / stored-resume sentence, not
  `failureText`. Overlap tests assert the later call matches that sentence.
- **`submit_answer` overlap still uses `failureText` — PASS.** A second
  execute while scoring is in flight still returns
  `Reading your answer scoring_in_progress`.
- **No wrap other than the two named tools was rewritten onto a weaker
  path — PASS.** `start_interview` still uses `result.error`;
  `startInterview()` only fails via `inputError`, which always has a string
  `error`. `get_brief` / `get_verdict` / `runTool` are unchanged.

## Contract checks that hold

Round-1 PASSes were re-checked against the current files; none regressed.

- **Host contract vs execute signature — PASS.** Object `inputSchema` values,
  object execute args, no `JSON.parse` in `webmcp.js`. Six
  `document.modelContext.registerTool` calls share one `AbortController`;
  abort is unregister. Feature-detect is `document` then `navigator`; missing
  `modelContext` still returns a no-op teardown.
- **Annotations — PASS.** `set_posting` and `set_resume`:
  `untrustedContentHint: true`, omit `readOnlyHint`. `get_brief` and
  `get_verdict`: `readOnlyHint: true`. `start_interview` and `submit_answer`
  omit `annotations`. No tool sets `readOnlyHint: false` explicitly.
- **Spoken-answer sentence — PASS.** Description still states the transcript
  is the user's spoken answer, transcribed from what they said out loud, and
  tells the agent not to invent an answer. Schema property is `transcript`;
  `set_resume` property is `resume`.
- **Agent-usable payloads — PASS.** `get_brief` none-yet sentence then
  `{ owns, study, angles, confidence }` JSON. `start_interview` returns Q1
  JSON. Mid-interview `submit_answer` returns the next question.
  Last-question `submit_answer` returns `getVerdict()` JSON (now pinned by
  the suite). `get_verdict` returns `{ verdict, questions }` with stored
  scores / missed / model answers.
- **Call flash / `runTool` — PASS.** Every execute, including the remediated
  brief wraps, goes through `runTool`.
- **Capability wrapping, not duplication — PASS.** Tools await the async
  capabilities and call the sync ones. `git diff` still does not touch
  `session.svelte.js`.
- **Teardown / isolation / scope — PASS.** Duplicate-name HMR abort remains
  safe to call twice. The test still restores `document` and `fetch`, loads
  through `vite.test.config.js` with `hmr`/`ws` false, and mocks
  `/api/analyze`. Tracked diff is only `src/lib/webmcp.js`. Untracked T31
  product files are `test/webmcp-tools.test.mjs` plus the diary records. No
  creep into UI, `copy.js`, `vite.config.js`, `package.json`, or session
  capabilities.

## Evidence

- `git status` — modified `src/lib/webmcp.js`; untracked
  `test/webmcp-tools.test.mjs`, `dev-diary/t31-review-round-1.md`,
  `dev-diary/t31-remediation-round-1.md` (plus this review record).
- `git diff -- src/lib/webmcp.js` — `set_posting` / `set_resume` wraps now
  call `failureText(result)` on `!result.ok`; success sentences unchanged.
- `git diff --check` — clean.
- `node --test --test-concurrency=1` — **54 passed, 0 failed**, including the
  five T31 subtests (annotations/spoken-answer/schemas, thin interview path,
  overlapping superseded brief tools, last-question verdict, HMR abort). No
  `24678 is already in use` warning.
- `npm run build` — passed. Vite issued only the existing >500 kB chunk-size
  advisory (`index-cX0_da6j.js` 540.12 kB).
- Reviewer-only Vite-SSR probe (stdin script, no tracked files written)
  confirmed P2-1, P3-1, error-only wraps, the 503 error+code wrap, success
  sentences, JSON `text` survival, and concurrent `submit_answer`
  `failureText`.

No application code was modified and no commit was created by this review.
