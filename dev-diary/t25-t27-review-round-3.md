# T25–T27 closing adversarial review — round 3

**Verdict: REMEDIATE — P1: 1, P2: 0, P3: 0.**

This is a read-only independent review of the uncommitted T25–T27 change set
after remediation round 2. It reviewed rounds 1–2 and both remediation
records, the current diff, the design/copy contract, and the capability tests.
No implementation code was changed and no commit was made.

## Remaining finding

### P1-1 — local over-limit CV validation does not supersede stale state

Round 2 correctly captures the rollback projection before it validates a
direct-bound CV draft. In the quiet baseline, that restores the saved resume,
fit match, questions, answers, and current index. It does not, however,
perform the two state transitions required for an invalid attempt to become the
current result:

1. **A pre-existing service-down flag survives local validation.** After an
   accepted no-resume brief (and separately after an accepted resume brief), I
   made a replacement CV call return 503, then directly assigned a
   20,001-character draft to `session.resume` and called `setResume`. The
   returned validation message was correct and the accepted data projection
   was restored, but `session.serviceDown` remained `true` in both states.
   The required local-validation state is `serviceDown: false`; otherwise the
   UI can simultaneously present an obsolete service-outage state and a local
   input error.

2. **An already-running valid CV call remains current.** Starting a held,
   direct-bound valid CV request sets `phase` to `analysing`. Submitting an
   over-limit direct-bound replacement draft then returns the correct CV-limit
   message and restores the old resume/fit/questions, but leaves
   `phase: 'analysing'`. When the held request subsequently succeeds, it is
   still the current generation: it clears the validation message and installs
   the old candidate CV, its re-aimed question set, and fit match. I reproduced
   this from both an accepted no-resume projection and an accepted-resume
   projection.

The latter violates the round-one latest-operation rule: cancellation alone is
not authoritative, and the local validation branch currently neither aborts
nor advances `briefRequestGeneration`. It also contradicts the requested
round-two invariant that an over-limit direct-bound attempt restores a
coherent accepted projection, retains its validation feedback, and leaves no
stale state.

Remediation should make local `setResume` validation supersede an active brief
operation (abort and advance/invalidate the generation before returning),
restore a ready accepted projection rather than the in-flight `analysing`
phase, explicitly leave `serviceDown` false, and retain the validation error.
Add deterministic regressions for each accepted baseline with (a) a preceding
server failure and (b) a held older CV request that later resolves or rejects.

## Rechecked contracts that pass

- The existing direct-bound over-limit regression passes for the two quiet
  baselines: accepted no-resume and accepted-resume. It restores the intended
  resume/fit/questions/answers/index, makes no request, and returns the exact
  CV validation text. It only misses the stale-status and in-flight cases
  above.
- Current server-side CV failures roll back a no-resume accepted projection:
  `phase: 'ready'`, `resume: null`, `fitMatch: null`, retained answer, and
  `serviceDown: true` (the intended server-error state).
- The prior out-of-order P1 remains fixed. Independent held-request checks
  confirmed that both an old posting success and an old posting 503 resolve as
  `{ ok: false, code: 'superseded' }` after a newer posting is ready; neither
  overwrites its posting/questions nor sets `error`/`serviceDown`.
- Posting validation uses the exact copy-deck values:
  `copy.err.empty_posting` = `Paste the job advert first.` and
  `copy.err.over_limit` = `That is longer than we can read. Paste just the job
  title, the duties, and the requirements.` No deprecated numeric
  posting-limit copy remains.
- Successful request shape, strict persisted response validation, resume fit
  requirements, quote/gap fields, fresh answer residue, `getBrief`,
  `startInterview`, and WebMCP's awaited `set_posting` behavior remain
  consistent with rounds 1–2.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` —
  **pass, 5/5**.
- `npm test -- --test-concurrency=1` — **pass, 37/37**.
- `npm run build` — **pass**; the pre-existing Vite warning for a minified
  chunk above 500 kB remains.
- `git diff --check` — **pass**.
- Focused Vite-SSR reproductions — direct-bound over-limit after an accepted
  no-resume and accepted-resume projection with a preceding 503: **fail**
  (`serviceDown: true`); same two baselines with a held earlier valid CV call:
  **fail** (transient `analysing`, then stale completion overwrites validation).
  Current CV server rollback and delayed old posting success/failure checks:
  **pass**.

## Lambo

Required recall succeeded before source inspection with stable agent id
`gpt-5.6-terra`. It confirmed the round-2 accepted-projection decision and its
existing quiet-baseline coverage. This review records a residual P1; it did not
reserve a shared concept because it made no implementation edit.
