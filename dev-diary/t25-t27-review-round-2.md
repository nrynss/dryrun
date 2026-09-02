# T25–T27 closing adversarial review — round 2

**Verdict: REMEDIATE — P1: 1, P2: 0, P3: 0.**

This is a read-only closing review of the uncommitted T25–T27 changes after
round-one remediation. It independently checked the task and product contracts,
the copy deck, the current diff, and the two prior review records. T28–T31
remain unimplemented and untouched by this change set.

## Remaining finding

### P1-1 — a direct-bound invalid CV draft still corrupts the accepted session

`setResume` validates before it captures or restores the coherent accepted
projection ([`session.svelte.js`](../src/lib/session.svelte.js#L313-L318)).
The CV textarea is explicitly bound directly to `session.resume` (design rule
R1), so by the time the capability is called the invalid draft is already in
reactive state. `validateResume` then returns via `inputError` and leaves that
draft in place.

Independent Vite-SSR reproduction, with an injected requester that would fail
if called:

1. Accept a no-resume brief, directly bind a 20,001-character CV draft to
   `session.resume`, then call `setResume(draft)`. The call correctly returns
   `{ ok: false, error: "CV is 20,001 characters..." }`, but final state is
   `phase: "ready"`, `resume.length: 20001`, `fitMatch: null`, and zero
   gap-targeted questions.
2. Accept a CV brief, replace the directly bound value with that same over-limit
   draft, then call `setResume(draft)`. Final state retains the old fit match
   and three gap-targeted questions while `resume.length` is still 20,001.

The second state is an invalid pairing: the visible saved resume is neither the
resume used for the fit match nor a valid request value. It is the same
atomic-projection/direct-binding invariant resolved for network and malformed
responses in round one, but the local validation branch bypasses it. It also
breaks the design requirement that a failed optional-CV attempt leaves the
person where they were (section 10, states 4–7 notes).

Before returning an input error from `setResume` in an existing accepted
session, restore the last coherent projection (while keeping the validation
error). Cover both an initial no-resume session and replacement of an accepted
resume, with direct field binding simulated. Do not send a malformed or
over-limit value to `/api/analyze`.

## Verified remediation and contracts

- Every valid brief operation gets a generation and an abort signal. A delayed
  older posting returning a 503 after a newer posting has become ready resolved
  as `{ ok: false, code: "superseded" }` and left the newer posting, questions,
  `error: null`, and `serviceDown: false` unchanged. The checked-in tests also
  cover stale success and stale CV failure.
- A direct-bound CV draft followed by an unreadable 503 response restored a
  previously accepted no-resume session exactly: `resume: null`,
  `fitMatch: null`, original answer and current index retained, no gap-targeted
  questions, `phase: "ready"`, and `serviceDown: true`. The checked-in test
  additionally covers replacement of an accepted CV.
- Posting validation uses the exact required deck keys:
  `copy.err.empty_posting` and `copy.err.over_limit`; their returned strings
  exactly match design section 11.9. No deprecated numeric posting-limit copy
  remains. The deck has no specified equivalent keys for the CV-only capability
  validation messages, so this review does not invent a copy requirement.
- Request shape is `POST /api/analyze` with JSON `{ task: "brief", posting }`
  plus a non-empty `resume` only when present. Successful payloads allow only
  `brief`, `questions`, `fitMatch`, and transport-only `meta`, then pass the
  shared exact-shape/grounding/fit validator before state is stored.
- The accepted projection preserves question id, prompt, verbatim quote, and
  `targetsGap`, clears old answer/score residue on a new accepted analysis, and
  maintains null fit/no gap targeting without a resume.
- `getBrief()` returns the saved brief (and `null` before one exists).
  `startInterview()` rejects an unready session with its documented result
  shape; on readiness it clears the error, resets `current` to zero, sets
  `interviewing`, and returns saved Q1. `set_posting` awaits the async
  capability, preserving tool completion parity.
- The diff adds no T28–T31 behavior or registrations. Existing question fields
  required by later scoring (`id`, `prompt`, `sourceQuote`, `targetsGap`) remain
  intact.

## Verification

- `npm test -- --test-concurrency=1` — **pass, 36/36**.
- `npm run build` — **pass**. The existing Vite warning for a minified chunk
  above 500 kB remains.
- `git diff --check` — **pass**.
- Focused Vite-SSR repros: stale posting 503 after newer ready success (pass);
  malformed CV-analysis rollback with a direct-bound draft (pass); local
  over-limit CV validation rollback in both no-resume and accepted-resume
  sessions (fail, P1-1 above).

No implementation code was modified and no commit was created by this review.
