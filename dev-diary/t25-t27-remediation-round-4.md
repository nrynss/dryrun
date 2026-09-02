# T25–T27 remediation — round 4

Resolved both P1 findings in
[`t25-t27-review-round-4.md`](./t25-t27-review-round-4.md). The changes keep
request ownership in the state machine rather than relying on cancellation or
the live bound-field projection.

## P1-1 — overlapping valid CV requests roll back to accepted state

`captureResumeRollbackProjection()` now takes the structural brief data and
phase from `lastAcceptedBriefProjection`, never from reactive state owned by a
request already in flight. It still takes answers and the current question
position from live state, preserving progress since the accepted analysis.

Consequently, when a newer valid CV request fails while an older CV request is
still settling, the current request restores the accepted no-resume or
prior-resume projection with `phase: 'ready'` and its server-failure state.
The older request is generation-stale and cannot make that projection busy or
overwrite it.

The focused regression covers both accepted baselines and both delayed older
completion shapes (valid success and 503 failure). In every combination, the
newest request returns its 503, the older one returns `superseded`, and the
saved resume, fit match, questions, answers, current position, ready phase,
error, and service-down state remain owned by the newest outcome.

## P1-2 — invalid direct-bound posting becomes the latest operation

Local posting validation now calls the same request-supersession transition as
other local validation: it aborts the active controller, advances the brief
generation, clears the accepted projection for the abandoned posting session,
and installs a coherent non-busy start projection. The direct-bound posting
input and its exact validation feedback stay in `session`; stale brief, fit,
and question data are removed. Local validation also clears `serviceDown`.

The deterministic regression covers empty and over-limit direct-bound inputs,
each after a held valid posting request that deliberately ignores cancellation
and later settles both successfully and as a 503. The held call returns
`superseded` in all cases and cannot replace the validation input, feedback,
idle state, or clear service status.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` —
  pass, **9/9**.
- `npm test -- --test-concurrency=1` — pass, **41/41**.
- `npm run build` — pass. Vite retains the pre-existing advisory for a
  minified chunk over 500 kB.
- `git diff --check` — pass.

## Scope and Lambo

Only the T25–T27 session state capability, its focused regression suite, and
this remediation record changed. T28 onward remains untouched. Required Lambo
recall completed before source inspection with stable identity `gpt-5.6-terra`;
the round-4 P1 concept was reserved before editing. No commit was created.
