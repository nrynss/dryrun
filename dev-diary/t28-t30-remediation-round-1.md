# T28–T30 remediation — round 1

Date: 2026-09-02  
Scope: review-round-1 P2 findings in `src/lib/session.svelte.js` and focused
capability regressions. T31/T32 were not changed.

## Decisions

### Score and restart lifecycle

`startInterview()` now permits only a pristine `ready` plan to enter
`interviewing`; it rejects an in-progress or completed session rather than
silently reusing its answers. Independently, `submitAnswer()` clears `scores`,
`missed`, and `modelAnswer` before attaching any replacement transcript. Thus a
503, malformed response, or network failure leaves the replacement answer
unscored and cannot make `getVerdict()` count feedback for a former answer.

The regression reproduces the reviewer sequence: score Q1 at 5/5, attempt a
restart, replace Q1, and receive a 503. The restart is rejected; the replacement
has no scoring artifacts; and the verdict is `not yet`, `answered: 0`,
`average: 0`.

### CV privacy and restore behavior

The visible promise is that the CV is never saved. Persistence is now schema
version 2 and contains no `resume` field. A CV-backed session is deliberately
not persisted: raw CV text and its fit/gap-derived plan are treated as
CV-related material, and any earlier no-CV snapshot is removed once a CV-backed
session is active. No-CV sessions retain the existing validated, resumable
snapshot behavior.

The storage key remains stable so a version-1 record (which could contain a raw
CV) is rejected and removed during restore. Corrupt, stale, and unsafe records
are also removed without surfacing storage errors.

## Verification

- `node --test --test-name-pattern='T28|T29|T30' test/session-capabilities.test.mjs` — 5 passed, 0 failed.
- `npm test` — 48 passed, 0 failed.
- `npm run build` — passed; existing Vite >500 kB chunk advisory only.
- `git diff --check` — clean.

No commit was made and no review was performed by this remediation pass.
