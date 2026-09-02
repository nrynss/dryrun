# T28–T30 closing review — round 2

Date: 2026-09-02  
Scope: uncommitted T28 (`submitAnswer`), T29 (`getVerdict`), and T30
(`localStorage` persistence) after remediation round 1. Reviewer-only pass:
no implementation code was changed and no commit was made. T31/T32 UI and
WebMCP wiring are deliberately out of scope.

## Verdict: APPROVE

`APPROVE` requires zero P1/P2/P3 findings. This closing review found **0 P1,
0 P2, 0 P3**.

## Prior P2 remediation verified

### Lifecycle and replacement-score association — PASS

`startInterview()` now permits exactly a pristine `ready` plan: every question
must have no answer, score, missed points, model answer, or skipped marker.
It rejects an interviewing or completed plan instead of resetting it. Before a
new transcript is attached, `submitAnswer()` clears `scores`, `missed`, and
`modelAnswer`; a network, HTTP, malformed-response, or superseded score then
leaves that transcript unscored. Thus a former score cannot be counted for a
replacement answer.

The added regression exercises the original sequence (score Q1 at 5/5, attempt
restart, replace Q1, receive 503) and observes the rejected restart, no score
artifacts, and a zero-answer `not yet` verdict.

### CV localStorage privacy and legacy removal — PASS

Version-2 persistence emits no `resume` field. More importantly, a
resume-backed session returns no snapshot at all and removes any prior
no-resume record; this also excludes CV-derived `fitMatch` and
gap-targeted-question material. A persisted no-CV record is accepted only when
`fitMatch` is null and every question has `targetsGap: false`.

The unchanged key lets restore encounter prior version-1 values. It rejects
every non-v2 envelope and removes the record, so a v1 raw-CV snapshot is not
restored or retained. Corrupt JSON, strict-schema failures, storage exceptions,
and SSR imports are likewise safe.

## Closing audit

- **Submit generation races — PASS.** Score work uses its own abort controller
  and monotonic generation. Settlement additionally requires the original
  phase, index, question identity, and exact saved transcript, covering
  ignored aborts, posting/CV replacement, navigation, and direct-bound answer
  edits.
- **Answer and state validation — PASS.** Submission requires `interviewing`,
  a current saved question and brief, a nonblank trimmed answer at or below
  6,000 characters, and one in-flight score at a time. The request sends only
  immutable score context; successful score bodies permit only transport
  metadata and must satisfy the strict shared validator.
- **Verdict bands and coverage — PASS.** Only non-skipped, nonblank answers
  with a complete validator-approved score contribute. `buildVerdict()` owns
  the documented average bands and six-of-eight coverage cap; malformed or
  hand-mutated score residue cannot inflate the result.
- **Restore and corruption safety — PASS.** The exact versioned envelope and
  persisted field allowlist are validated before state application. Valid
  restore supersedes both request streams and clears transient/error state;
  storage is accessed only behind a browser guard.

## Evidence

- `node --test --test-name-pattern='T28|T29|T30'
  test/session-capabilities.test.mjs` — **5 passed, 0 failed**.
- `node --test test/file-chooser-browser.test.mjs` — **3 passed, 0 failed**,
  including the visible privacy-copy assertion.
- `node --test --test-concurrency=1` — **48 passed, 0 failed**.
- `npm run build` — passed; only the existing Vite >500 kB chunk-size advisory.
- `git diff --check` — clean.

One initial default-concurrency `npm test` run timed out waiting for the
existing real-browser file chooser to render (47/48). Its direct run and the
serialized complete run both passed, so this was not reproducible as a T28–T30
product or contract finding.
