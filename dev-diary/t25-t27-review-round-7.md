# T25–T27 final independent review — round 7

**Verdict: APPROVE — P1: 0, P2: 0, P3: 0.**

This was an independent, reviewer-only final-gate inspection of the complete
uncommitted T25–T27 change set after round-six remediation. It re-read the
task/design/copy/shape contracts and every T25–T27 review and remediation
record from rounds 1–6, then inspected the current application and test
changes. No application code was modified and no commit was created.

## T25–T27 approval invariants

- **T25 request and commit boundary — PASS.** `setPosting` trims and validates
  with the exact shared posting copy, sends only the bounded brief request,
  allows only endpoint transport metadata, validates the persisted projection,
  and resets question answer/score residue. Its abort plus monotonically
  increasing generation makes posting and CV supersession safe even when an
  injected requester ignores the abort signal. Invalid direct-bound postings
  also retire held work before exposing their local error.
- **T26 atomic CV state — PASS.** A successful CV analysis commits resume, fit
  match, and re-aimed question set together. Network, malformed-response, and
  local validation failures restore the coherent accepted projection while
  retaining live answer/current-position progress, set service status only for
  service failures, and cannot be overwritten by an older completion. The
  first-posting edge case has a separate stable idle rollback projection.
- **T27 ready/interview boundary — PASS.** `getBrief()` preserves its null-or-
  saved-brief contract. `startInterview()` rejects an unready session, and for
  a saved brief resets to question one, enters `interviewing`, and returns that
  saved question. The existing `set_posting` WebMCP tool awaits the async
  capability, so its completion result cannot claim readiness before analysis
  has settled.

## Round-six Vite/test final gate

`vite.test.config.js` is intentionally test-only and contains the Svelte Vite
plugin required to transform the Svelte application in both SSR module-loader
tests and real browser servers. It disables both `server.hmr` and `server.ws`;
the latter is necessary because disabling HMR alone does not suppress Vite's
middleware-mode WebSocket listener on port 24678.

Every affected SSR loader explicitly uses this configuration and keeps
middleware mode. Every real browser regression launches Vite with this same
configuration on an independently allocated strict HTTP port, so the full
concurrent suite still exercises transformed Svelte code in Chrome rather than
replacing browser coverage with a mock or a non-Svelte server. `vite.config.js`
has no diff and retains its normal Svelte plus Netlify development/production
configuration; `package.json` likewise has no diff.

## Verification

- `npm test` — **pass, 43/43** in 8.85 s under Node's default concurrent test
  execution. This includes three live headless-Chrome file-chooser regressions,
  the resume SSR regression, and all T25–T27 capability/race regressions. The
  complete output contained **no** `24678 is already in use` / WebSocket port
  warning.
- `npm run build` — **pass**. The only notice is Vite's existing advisory for a
  530.01 kB minified client chunk, not a test-config or application failure.
- `git diff --check` — **pass**.
- Diff audit — only the intended T25–T27 session/tool/test files and the
  dedicated test Vite config are relevant application/test changes; production
  and ordinary development Vite configuration are untouched.

The earlier P1 request-ordering, atomic rollback, direct-binding validation,
and initial-projection races remain covered by deterministic regressions. The
round-six P3 is closed without weakening Svelte transformation or live browser
coverage. There is no actionable P1, P2, or P3 residue.
