# T25–T27 round-3 remediation

Resolved the residual P1 in
[`t25-t27-review-round-3.md`](./t25-t27-review-round-3.md): an over-limit CV
submitted through the direct-bound field restored the data projection but could
retain a preceding service outage or permit an older CV analysis to overwrite
the validation result.

## Change

Local `setResume` validation now supersedes an active brief request before it
restores the accepted projection: it aborts the controller, advances the
generation, and removes the active controller reference. The generation change
is authoritative for injected requests that ignore abort signals or settle
after cancellation.

The validation path restores an accepted question-bearing projection to
`ready`, clears `serviceDown`, and then records the existing exact validation
message. It therefore retains accepted resume/fit/questions/answer/current
data while leaving local input feedback as the current result. Valid request
flows, server-error rollback, and posting/resume race guards are unchanged.

## Regression coverage

Added deterministic capability tests for both accepted baselines:

- after a failed replacement CV request, an over-limit direct-bound draft
  clears `serviceDown` while restoring the no-resume and prior-resume
  projections;
- with a held older valid CV request, an over-limit direct-bound draft aborts
  the request and invalidates its generation for both baselines;
- each held request then settles as both a valid success and a 503 failure.
  Every stale completion returns `superseded` and cannot clear the validation
  error or replace the accepted resume, fit match, questions, answer, or
  current index.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` — pass,
  7/7.
- `npm test -- --test-concurrency=1` — pass, 39/39.
- `npm run build` — pass. The pre-existing Vite minified chunk warning above
  500 kB remains.
- `git diff --check` — pass.

## Scope and Lambo

Only the T25–T27 session capability, its focused regression test, and this
record were changed; T28–T32 were not touched. Required Lambo recall completed
with stable identity `gpt-5.6-terra`, and the round-3 validation/race concept
was reserved before editing.

No commit was created.
