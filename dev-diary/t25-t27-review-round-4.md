# T25–T27 closing adversarial review — round 4

**Verdict: REMEDIATE — P1: 2, P2: 0, P3: 0.**

This read-only review examined the full uncommitted T25–T27 diff; task and
design contracts; the round-1 through round-3 review/remediation records; and
the focused and complete test suites. It made no application-code change and
created no commit.

## Round-3 P1 repair — verified

The requested direct-bound over-limit CV repair is correct. In
`setResume`, the local validation branch now aborts the active controller and
increments `briefRequestGeneration` before it restores the prior accepted
projection. It explicitly restores a question-bearing projection to `ready`,
clears `serviceDown`, then records the local validation error.

The checked-in deterministic test exercises both accepted baselines
(no-resume and an accepted-resume session), each with a held earlier valid CV
request that deliberately ignores `AbortSignal` and then settles as both a
valid response and a 503. It verifies that the signal is aborted, the accepted
resume/fit/questions/answer/current projection is restored, `serviceDown` is
false, the exact validation feedback remains, and each delayed completion is
`{ ok: false, code: 'superseded' }`. The independent focused suite passes all
seven tests. This closes round 3's stated P1; neither delayed success nor
failure can overwrite the local validation result.

## New findings

### P1-1 — a newer valid CV failure restores an older request's transient `analysing` phase

`captureResumeRollbackProjection()` copies the current `phase` from reactive
state (`session.svelte.js:145-167`). A second valid CV operation can begin
while the first valid CV operation is still in flight. Its rollback capture
therefore has the accepted questions but `phase: 'analysing'`. If the second
(latest) request fails, `restoreAfterResumeFailure()` reapplies that projection
unchanged (`265-268`), setting `serviceDown` but leaving the session
permanently in `analysing`. The first request is correctly generation-stale,
so it returns `superseded` and cannot make the UI ready again.

Independent Vite-SSR reproduction:

1. Accept a no-resume brief.
2. Direct-bind CV B and hold its request.
3. Direct-bind CV C; return a 503 for C.
4. Resolve B with a valid resume response.

The latest C result is correctly the 503 and B correctly returns
`superseded`, but the final state is `phase: 'analysing'`, `resume: null`,
eight accepted no-resume questions, and `serviceDown: true`. This violates the
failure requirement that an optional-CV failure leaves the person where they
were, and the race/rollback invariant requires the accepted projection to be
coherently ready. Cover both no-resume and accepted-resume baselines, and
success/failure settlements of B; rollback must source its phase from the
accepted projection (or normalize an accepted question-bearing rollback to
`ready`), not from a transient request.

### P1-2 — invalid posting validation does not supersede an active posting request

`setPosting` returns directly from its validation branch
(`282-285`) without aborting or invalidating the current generation. With the
required direct `session.posting` binding, a held valid posting request can be
followed by a direct-bound empty or over-limit posting and a failed
`setPosting` call. The old response remains current and installs its prior
posting, questions, and ready state, clearing the newer validation feedback.

Independent Vite-SSR reproduction held a valid posting request, assigned
`session.posting = ''`, then called `setPosting('')`. The immediate result was
the exact deck error `Paste the job advert first.` with `phase: 'analysing'`.
When the held request resolved, it returned success and the final state became
`phase: 'ready'`, the old 60-character posting, eight old questions, and
`error: null`. Thus an earlier request overwrote the latest direct-bound input
operation. This is the same latest-operation requirement applied in round 3
to local CV validation; T25 must invalidate/abort active work on local posting
validation as well, with an explicit coherent non-busy validation state and
regressions for delayed old success and failure.

## Contracts rechecked and passing

- A valid T25 request posts `{ task: 'brief', posting }` and includes a
  non-empty resume only when present. Successful payloads permit only
  `brief`, `questions`, `fitMatch`, and transport-only `meta`, then pass the
  shared strict brief/quote/fit validator before persistence.
- The accepted projection preserves `id`, `prompt`, verbatim `sourceQuote`,
  and `targetsGap`; fresh successful analysis clears answer/score residue.
  No-resume state has `fitMatch: null` and no gap-targeted questions; a resume
  requires the validated fit projection.
- Existing delayed posting success and failure after a newer *valid* posting,
  plus delayed CV completion after local over-limit CV validation, are
  generation-safe. The direct-bound CV server-failure rollback still preserves
  the accepted data and sets `serviceDown` as intended.
- T25 validation uses the exact copy-deck strings: empty posting is `Paste the
  job advert first.` and over-limit posting is the required count-free copy.
- `getBrief()` remains null before readiness; `startInterview()` rejects an
  unready session and otherwise resets to Q1 and enters `interviewing`; the
  WebMCP `set_posting` execution awaits the async capability.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` —
  **pass, 7/7**. These tests prove the round-3 CV repair, but do not cover the
  two races above.
- `npm test -- --test-concurrency=1` — **pass, 39/39**.
- `npm run build` — **pass**. Vite retains the pre-existing advisory for a
  minified chunk over 500 kB.
- `git diff --check` — **pass**.
- Current code diff is limited to `src/lib/session.svelte.js` and
  `src/lib/webmcp.js`; the focused capability test and round records are
  untracked review/work artifacts. No T28–T31 behavior or registration is
  included.

## Lambo

Required recall ran before source inspection with stable identity
`gpt-5.6-terra`; it confirmed the round-3 decision and remediation. An inspect
of the available review concept returned no reservable node UUID, so no soft
lock could be taken for this diary-only record. This review's verdict and
action are recorded in Lambo after the diary is written.
