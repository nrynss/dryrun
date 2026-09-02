# T25–T27 round-2 remediation

Resolved the remaining round-2 P1 from
[`t25-t27-review-round-2.md`](./t25-t27-review-round-2.md): a CV text area is
directly bound to `session.resume`, so an over-limit draft can exist in
reactive state before `setResume` validates it.

## Change

`setResume` now captures the coherent rollback projection before local CV
validation. If validation fails, it reapplies that projection, then returns the
existing validation error. This restores the accepted resume, fit match,
questions, question position, and phase for both accepted no-resume and
accepted-resume sessions. Local validation does not set `serviceDown`, so the
on-screen validation feedback remains distinct from a server failure. No
request is issued for the invalid draft; valid requests, abort/generation
handling, and server-failure rollback are unchanged.

## Regression coverage

Added one exact T25 regression covering both direct-bound states:

- a 20,001-character draft after a no-resume brief restores `resume: null`,
  null fit match, no-resume questions (including saved answer/current index),
  and the original validation message;
- the same draft after an accepted CV restores the accepted CV, fit match, and
  questions (including saved answer/current index), with the same message.

Both request doubles fail if invoked, proving local validation does not reach
`/api/analyze`.

## Verification

- `node --test --test-concurrency=1 test/session-capabilities.test.mjs` — pass,
  5/5.
- `npm test -- --test-concurrency=1` — pass, 37/37.
- `npm run build` — pass. Existing Vite warning remains for a minified chunk
  above 500 kB.
- `git diff --check` — pass.

## Scope and Lambo

Only the T25–T27 session capability and its capability regression test were
changed; T28–T32 were not touched. Lambo recall succeeded with the required
`gpt-5.6-terra` identity and confirmed the P1. A reservation was attempted,
but the available recalled concept did not expose a UUID and the server rejects
concept text for `lambo_reserve`; no soft lock could be taken.

No commit was created.
