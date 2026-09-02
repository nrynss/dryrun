# T25–T27 remediation — round 5

Resolved the remaining P1 in
[`t25-t27-review-round-5.md`](./t25-t27-review-round-5.md): a CV failure or
local CV validation could supersede the first held posting request, then roll
back to that request's transient `analysing` state.

## Change

The capability now records `initialBriefProjection` when a valid posting
starts a new session. It is an explicit, stable entry projection: the
normalized posting and any CV accepted at that request boundary, no brief or
questions, and `phase: 'idle'`. It is separate from the reactive in-flight
projection, whose phase belongs to the request and is `analysing`.

When a CV operation needs a rollback before any brief has been accepted,
`captureResumeRollbackProjection()` uses this stable initial projection. A
latest CV service failure therefore restores the editable idle start state,
then retains the server error and `serviceDown: true`. A latest local CV
validation restores the same idle state, preserves the existing validation
message, and clears `serviceDown`. Successful brief acceptance and invalid
posting validation retire the initial projection, so it cannot cross a new
session boundary.

## Regression coverage

Added deterministic cases for a held first posting request that ignores its
abort signal:

- a newer valid CV receives a 503 and rolls back to the stable idle entry
  projection;
- an over-limit direct-bound CV performs local validation and rolls back to
  that same projection without issuing a CV request;
- in both cases the held posting later settles as both a valid success and a
  503 failure. Its signal is aborted, its result is `superseded`, and it
  cannot install questions, change the newest message/service state, or leave
  the interface transitional.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` —
  pass, **11/11**.
- `npm test -- --test-concurrency=1` — pass, **43/43**.
- `npm run build` — pass. The existing Vite advisory for a minified chunk over
  500 kB remains.
- `git diff --check` — pass.

## Scope and Lambo

Only the T25–T27 session capability, its focused capability regression suite,
and this remediation record changed. T28 onward was not touched. Required
Lambo recall ran with stable identity `gpt-5.6-terra`; the recalled concept did
not expose a UUID for `lambo_reserve`, so a fresh reservation could not be
taken. No commit was created.
