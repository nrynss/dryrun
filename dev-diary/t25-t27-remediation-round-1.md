# T25–T27 remediation — round 1

Remediated every finding from `t25-t27-review-round-1.md`. No work from the
deferred T28, T29, T30, T31, or T32 scopes was implemented.

## P1-1 — latest brief call wins

`src/lib/session.svelte.js` now treats every brief request as a single,
monotonically numbered generation. Beginning a valid posting or CV request
aborts the previous browser request and creates the next generation. Both
success and failure paths check that their generation remains current before
they can alter session state. The token check is still authoritative when an
injected requester ignores `AbortSignal`, or when an old response was already
in flight.

Superseded calls resolve as `{ ok: false, code: 'superseded' }` and make no
state changes. A new posting also clears the saved accepted projection, so a
later CV failure cannot restore data for the previous posting.

The deterministic capability test covers:

- posting A success completing after posting B has reached `ready`, including
  an injected requester that deliberately ignores cancellation;
- a held CV failure completing after a newer posting is ready, proving a stale
  failure cannot restore old data or set the service-down state.

## P1-2 — atomic CV projection and rollback

Accepted brief state is stored as a private, plain-data projection containing
the posting, resume, brief, fit match, questions, and position. `setResume`
does not commit its new resume until the matching response has validated. On a
current failure it restores the prior projection and retains current answer
edits/position, while restoring the last accepted resume value. This also
handles the future T32 direct CV binding: a bound draft can temporarily change
`session.resume`, but cannot become paired with an old no-resume question set.

The deterministic test exercises both a failed first CV after a successful
no-resume brief and a failed replacement CV after a successful CV brief. It
also simulates the direct bound draft in each case. The restored sessions have
the matching resume, fit match, questions, answers, and `ready` phase.

## P2-1 — exact validation copy

`validatePosting` imports the shared copy deck and returns only
`copy.err.empty_posting` and `copy.err.over_limit`. The deprecated “job
posting” string and numeric limit message are gone. The capability test pins
both exact deck strings.

## Verification

- `npm test -- --test-concurrency=1 test/session-capabilities.test.mjs` — pass,
  4/4.
- `npm test -- --test-concurrency=1` — pass, 36/36.
- `npm run build` — pass. The pre-existing Vite warning for a minified chunk
  above 500 kB remains.
- `git diff --check` — pass.

Expected round-one finding residue: **zero** (P1-1, P1-2, and P2-1 addressed).
