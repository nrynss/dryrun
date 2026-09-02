# T25–T27 closing adversarial review — round 5

**Verdict: REMEDIATE — P1: 1, P2: 0, P3: 0.**

This independent, read-only review examined the full current T25–T27 diff,
the task/design/copy and shared-shape contracts, every preceding T25–T27
review and remediation record, focused capability coverage, and the complete
test/build results. No application source was changed and no commit was made.

## Round-4 P1 repairs — verified

Both requested repairs work when there is an accepted brief to restore.

- **Overlapping valid CV requests:** from each accepted baseline (no resume and
  accepted resume), I held an older valid CV request, submitted a newer valid
  CV whose response was a 503, then completed the older request. The new
  result returned its 503; the aborted older signal later resolved as
  `{ ok: false, code: 'superseded' }`; and the final session was the accepted
  projection in `ready`, with its resume/fit/questions retained, the newest
  error retained, and `serviceDown: true`. This confirms that the phase and
  structural data now come from `lastAcceptedBriefProjection`, rather than
  the older request's transient `analysing` state.
- **Local invalid direct-bound posting:** I held a valid posting analysis that
  intentionally ignored `AbortSignal`, directly bound a 20,001-character
  posting, and submitted it locally. The local result returned the exact
  count-free copy-deck error; its signal was aborted; the session stayed
  `idle` with the invalid text and feedback, no brief/fit/questions, and
  `serviceDown: false`. The held request then resolved as `superseded` and
  could not alter that state. The checked-in regression also covers empty and
  over-limit inputs, with both delayed success and 503 completion shapes.

## Finding

### P1-1 — a CV operation that supersedes an initial posting request can leave the application permanently `analysing`

`captureResumeRollbackProjection()` correctly takes its rollback state from
`lastAcceptedBriefProjection` when one exists. But when a CV operation races
with the first posting analysis, there is no accepted projection, so it falls
back to `captureBriefProjection()` (`src/lib/session.svelte.js:159-176`). That
fallback records the posting request's transient `phase: 'analysing'`.

If the latest valid CV request fails, `restoreAfterResumeFailure()` reapplies
that transient snapshot (`275-278`). If the latest local CV validation fails,
the validation branch does the same unless questions exist (`356-367`). In
both cases the earlier posting operation is already generation-stale and
cannot make the state ready; the latest request has finished and cleared its
controller. The final state nevertheless remains `analysing` forever.

Independent Vite-SSR reproductions:

1. Start a valid posting request and hold it.
2. Direct-bind a valid CV and call `setResume`; return 503.
3. Resolve the old posting successfully.

The CV call returns the expected 503 and the posting returns `superseded`,
but the final state is `phase: 'analysing'`, zero questions,
`error: 'cv latest failed'`, and `serviceDown: true`.

The same sequence with a direct-bound 20,001-character CV makes the local
validation call and old posting both return their expected results, but final
state is still `phase: 'analysing'`, with the validation feedback and no live
request. `App.svelte` maps that phase solely to `GettingReady`, so the Start
screen (including retry and the service-down example action) is unreachable.

This is the same snapshot-ownership defect fixed in round 4, in the no-
accepted-brief branch. A latest CV outcome that retires the initial request
must settle to a coherent start-state projection (`idle` when no questions
exist), rather than reapplying the displaced request's busy phase. Add
deterministic valid-failure and local-validation regressions with a held first
posting, and assert that its late success and failure both remain superseded.

## Contracts rechecked

- `setPosting` and `setResume` make a JSON `POST /api/analyze` brief request;
  resume is omitted when empty. Success accepts only `brief`, `questions`,
  `fitMatch`, and transport-only `meta`, then uses the shared strict validator
  before persistence.
- The accepted session retains required question fields (`id`, `prompt`,
  verbatim `sourceQuote`, `targetsGap`), clears answer/score residue on a new
  analysis, has no fit/gap questions without a resume, and requires valid fit
  data with one.
- Earlier valid posting/CV generations, accepted-session resume rollbacks,
  local CV validation supersession, exact posting validation copy, `getBrief`,
  `startInterview`, and WebMCP's awaited `set_posting` all remain correct.
- The diff contains no later T28–T31 work; per scope, that absence is not a
  finding.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` —
  **pass, 9/9**.
- `npm test -- --test-concurrency=1` — **pass, 41/41**.
- `npm run build` — **pass**; the existing Vite advisory for a minified chunk
  above 500 kB remains.
- `git diff --check` — **pass**.
- Independent Vite-SSR race probes verified both round-4 P1 repairs and
  reproduced P1-1 for both latest CV 503 and direct-bound over-limit CV
  validation against a held initial posting request.

## Lambo

Required recall ran before any filesystem inspection with stable identity
`gpt-5.6-terra`; it returned the round-4 remediation decision and prior
P1 history. The diary is a new review record, so no existing concept UUID was
available to reserve before creating it. The verdict and completed review are
recorded in Lambo after this file is written.
