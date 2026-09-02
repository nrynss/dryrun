# T28–T30 adversarial review — round 1

Date: 2026-09-02  
Scope: uncommitted T28 (`submitAnswer`), T29 (`getVerdict`), and T30
(`localStorage` persistence) in `src/lib/session.svelte.js`, plus their added
capability tests. Reviewer-only pass: no application code was changed and no
commit was made.

## Verdict: REMEDIATE

`APPROVE` requires zero P1/P2/P3 findings. This pass found **0 P1, 2 P2, 0
P3**.

## Findings

### P2 — restarting permits a failed replacement answer to inherit an old score

`startInterview()` accepts every phase as long as a brief and questions exist
and resets only `current` (`src/lib/session.svelte.js:465-474`). It neither
limits the transition to `ready` nor clears an existing answer score. A caller
can therefore score Q1, call `startInterview()` again, then submit a new Q1
answer whose score request fails. `submitAnswer()` replaces `question.answer`
before sending but leaves an existing `scores`, `missed`, and `modelAnswer`
intact on the failure path (`:538-576`). `getVerdict()` then validates and
counts the old score against the new, unscored transcript (`:591-605`). The UI
does not yet expose restart/back navigation (T32 is out of scope), but this is
a reachable public capability sequence and violates the score/answer
association.

Reproduction used the injected requester boundary: score Q1 at 5/5, call
`startInterview()` again, then return a 503 for a replacement Q1 answer. The
result retained `answer: "Replacement answer."` alongside the former all-5
score and `getVerdict()` returned `answered: 1, average: 5`.

Remediate by defining the permitted `startInterview` phases and/or clearing
all prior answer/score state for a deliberate restart. Independently, clear
previous score artifacts before assigning a replacement answer (or restore
them atomically if the replacement score fails), so a failed re-score cannot
claim feedback for another transcript. Add the two-step regression.

### P2 — T30 persists the complete CV despite the required privacy promise

The required, browser-visible copy says: “Your CV stays on your phone or
computer. We read the words in it here in your browser. **We never save it**
and there is no account.” (`src/lib/copy.js:62`; asserted by the live chooser
test). T30's `persistentSnapshot()` includes `resume` and `persistSession()`
serializes it unencrypted into `localStorage` under `dry-run.session.v1`
(`src/lib/session.svelte.js:616-635, 668-678`). Thus the full pasted/uploaded
CV survives a browser restart and is readable by other same-origin scripts or
the next person using the browser profile, contrary to the displayed promise.

Focused reproduction created a valid resume-backed brief, called
`persistSession()` with a memory-storage adapter, and observed the stored JSON
contain the exact `resume` value (`"Jane Candidate CV: home address 1 Private
Street"`).

Decide the intended privacy policy before shipping: omit/clear `resume` from
the persistent schema (and restore a non-resume session), or change the
prominent approved privacy copy and document the local-device retention and
clear-data behavior. Do not silently retain the current unconditional claim.

## Passing checks

- **Request boundary — PASS.** T28 trims and bounds the transcript, sends the
  exact score body `{ task, answer, question: { id, prompt, sourceQuote,
  targetsGap }, brief }` to `/api/analyze` with JSON POST and abort signal. It
  snapshots only question/brief scoring context, allows only transport `meta`,
  and rejects malformed score shapes with `validateScoreResponse()`.
- **Normal lifecycle and late-result guard — PASS.** Successful scores are
  copied into the saved question, progress advances Q1–Q8, and Q8 returns
  `getVerdict()`. Generation, controller, phase, index, question identity, and
  transcript checks prevent an ignored-abort late result from committing after
  a posting/resume replacement, navigation, or in-flight answer edit. Failure
  preserves an otherwise unscored transcript and exposes `scoreFailed`.
- **Verdict integrity — PASS.** T29 counts only non-skipped questions with a
  nonblank answer and a complete validator-approved score. `buildVerdict()`
  supplies the documented 4/3 bands and coverage cap, so high scoring skipped
  sessions cannot render ready or nearly ready.
- **Persistence hardening — PASS, apart from the privacy finding.** The
  snapshot excludes reactive/transient error, service, agent, and in-flight
  fields; uses an exact versioned envelope and strict brief/question/score
  validation; catches unavailable/quota/security storage exceptions; removes
  malformed or old records; and aborts/invalidates both request streams before
  applying a valid restore. Browser-only guards avoid SSR storage access.

## Evidence

- `git diff --check` — clean.
- `npm test` — **47 passed, 0 failed** (includes the existing headless-Chrome
  browser suite).
- `npm run build` — passed. Vite issued only the existing >500 kB chunk-size
  advisory.
- Focused: `node --test --test-name-pattern='T28|T29|T30'
  test/session-capabilities.test.mjs` — **4 passed, 0 failed**.
- Browser-focused: `node --test --test-name-pattern='live chooser'
  test/file-chooser-browser.test.mjs` — **2 passed, 0 failed**, including the
  required literal privacy copy.
- Two reviewer-only Vite-SSR injection probes reproduced the stale-score path
  and observed the complete `resume` string in the persistence payload; neither
  modified tracked files.

## Deliberate scope boundary

T31/T32 registration and UI wiring remain absent by plan and are not findings
in this review. They do not excuse the public capability and persistence
invariants above.
