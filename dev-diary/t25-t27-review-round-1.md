# T25–T27 adversarial review — round 1

**Verdict: REMEDIATE — P1: 2, P2: 1, P3: 0.**

Review scope was the uncommitted T25/T26/T27 state work only: the brief
request/store boundary, WebMCP `set_posting` await parity, `setResume`,
`getBrief`, and `startInterview`. T28–T31 implementation remains out of
scope; its absence is not a finding.

## Findings

### P1-1 — an older brief request can overwrite a newer session

`setPosting` commits its result unconditionally after `await requestBrief`
([`session.svelte.js`](../src/lib/session.svelte.js#L181-L188)). There is no
generation/identity check or cancellation. Two overlapping calls therefore
leave the current posting from call B but install the brief, questions, and
quotes returned for call A.

Reproduction using the injectable requester:

1. Start `setPosting(A)` and hold its response.
2. Complete `setPosting(B)` with a valid B-shaped brief.
3. Complete the held A response.

Final observed state was `posting: "Explain infrastructure incidents."`,
`questions[0].prompt: "OLD question 1"`, and
`questions[0].sourceQuote: "Write clear API documentation."`, with
`phase: "ready"`.

This violates the grounded-question contract and is especially unsafe on the
agent path because the WebMCP handler now correctly awaits the capability
([`webmcp.js`](../src/lib/webmcp.js#L39-L49)) but does not serialize requests.
Make the latest request win (for example, a monotonically increasing request
token checked before both success and failure commits), and test posting→posting
and resume→posting overlap orders. Do not let a stale failure restore an
otherwise newer ready session either.

### P1-2 — failed `setResume` leaves a no-resume brief paired with a resume

`setResume` writes `session.resume` before requesting
([`session.svelte.js`](../src/lib/session.svelte.js#L203-L209)). On a failed
request it retains the existing questions and restores `phase` to `ready`
([`session.svelte.js`](../src/lib/session.svelte.js#L210-L213),
[`session.svelte.js`](../src/lib/session.svelte.js#L144-L147)), but neither
rolls back nor clears the newly stored resume.

Reproduction: create a successful no-resume brief, then call `setResume('CV')`
with a 503 response. The observed state is `phase: 'ready'`, `resume: 'CV'`,
`fitMatch: null`, and zero gap-targeted questions. That breaks the explicit
invariant that a resume requires a valid fit match (and that the returned
questions are re-aimed only when the fit result supports it). It also conflicts
with the failure-state requirement that an optional-CV failure leaves the user
where they were ([design section 10](design.md#L964-L966)).

Treat the resume, fit match, and re-aimed question set as one atomic accepted
brief projection. Preserve/restore the last coherent projection on error (and
account for the direct UI binding in T32), then add a regression test for a
failed first CV and a failed replacement CV.

### P2-1 — T25 kept deprecated, non-deck validation copy

`validatePosting` returns `"Paste the job posting first."` and an over-limit
message with character counts ([`session.svelte.js`](../src/lib/session.svelte.js#L62-L70)).
The design expressly says T25 must replace this exact-count message with the
Section 11.9 strings ([design section 3.6](design.md#L201-L206)); that deck
requires `"Paste the job advert first."` and an over-limit message with no
numbers ([design section 11.9](design.md#L1141-L1143)). This is externally
observable through the WebMCP result now and will leak into the human path at
T32. Use `copy.err.empty_posting` and `copy.err.over_limit` (or a shared
non-circular error module) rather than duplicate prose.

## Contract checks that hold

- `setPosting` sends `POST /api/analyze` with `{ task: 'brief', posting }`, and
  includes a non-empty saved resume when applicable.
- Successful responses permit endpoint-only `meta`, reject extra top-level
  fields, validate the persisted `{ brief, questions, fitMatch }` projection,
  preserve IDs/quotes/gap flags, and reset answer/score residue.
- No-resume output requires `fitMatch: null` and no `targetsGap`; resume output
  goes through the shared fit/gap validator. The documented 2–4 prompt target
  is intentionally backed by the established loose 1–6 validator bound, so
  this review does not misreport that decision as a defect.
- `getBrief()` returns `null` before a brief exists. `startInterview()` rejects
  an unready session and, on a valid brief, resets `current` to 0, moves to
  `interviewing`, and returns saved Q1.
- `set_posting` now awaits `setPosting`, maintaining async tool parity.

## Verification

- `npm test -- --test-concurrency=1` — pass: 34/34, including the new
  `test/session-capabilities.test.mjs`.
- `npm run build` — pass. Vite reports the pre-existing >500 kB chunk warning.
- `git diff --check` — pass.
- Focused Vite-SSR reproducers established P1-1 and P1-2 above. The checked-in
  capability test covers the happy path and fresh-session failures, but not a
  failed CV after a successful brief or out-of-order async completions.

No application code was modified and no commit was created by this review.
