# T25–T27 closing adversarial review — round 6

**Verdict: APPROVE — P1: 0, P2: 0, P3: 0.**

This independent closing review examined the full uncommitted T25–T27 diff,
the task/design/copy and shared-shape contracts, all review and remediation
records through round 5, focused capability coverage, and the complete
test/build results. No application source was changed and no commit was made.

## Round-5 repair — verified

`setPosting` now creates a private `initialBriefProjection` at the valid
request boundary. It contains the normalized posting and optional saved CV,
but no brief/questions and an `idle` phase; it is separate from the live
request-owned `analysing` state. Before a brief has been accepted,
`setResume` rollback uses that stable projection rather than a live snapshot.

Independent review of the deterministic cases confirms the required initial
state behavior. With a first posting request deliberately held while ignoring
its abort signal:

- a newer valid CV request that receives a 503 aborts/supersedes the posting,
  restores an empty `idle` session with the original posting and no CV,
  preserves the 503 feedback, and sets `serviceDown: true`;
- an over-limit direct-bound CV aborts/supersedes the posting without making a
  CV request, restores the same `idle` projection, preserves the exact CV
  validation feedback, and clears `serviceDown`;
- in both cases, delayed success and delayed 503 completion of the original
  posting resolve as `{ ok: false, code: 'superseded' }` and cannot install
  questions, change phase, clear/replace feedback, or alter service status.

The related nested in-flight paths also remain coherent: latest valid CV
failure restores the accepted no-resume or prior-resume projection to `ready`,
local CV validation invalidates older CV work and retains its local feedback,
and invalid direct-bound posting supersedes older work into a quiet `idle`
start state. Generation checks—not cancellation alone—guard all stale success,
503, and abort-ignoring request completions.

## Contract recheck

- T25 sends the bounded JSON brief request with a non-empty CV only when one
  is present; success allows only persisted brief fields plus transport-only
  `meta`, then passes the shared strict validator before storage.
- Accepted state preserves question id/prompt/verbatim quote/gap targeting,
  clears answer and score residue on a fresh analysis, and keeps fit/gap data
  consistent with the presence of a CV.
- Posting validation uses the exact copy-deck strings. Failure paths preserve
  coherent idle/ready projections and distinguish local validation from
  service-down status.
- T26 atomic rollback, T27 `getBrief`/`startInterview`, and awaited WebMCP
  `set_posting` behavior remain correct. No T28–T31 implementation was added.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` —
  **pass, 11/11**.
- `npm test -- --test-concurrency=1` — **pass, 43/43**.
- `npm run build` — **pass**. The existing Vite advisory for a minified chunk
  over 500 kB remains.
- `git diff --check` — **pass**.

## Lambo

Required Lambo recall ran before filesystem inspection using the stable
identity `gpt-5.6-terra`; it returned every prior round's decisions, including
the round-5 P1 and remediation. Inspection exposed no reservable concept UUID
for this new review record, so no soft lock could be taken. The approval
decision and completed review are recorded after this diary is written.
