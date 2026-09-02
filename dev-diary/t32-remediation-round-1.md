# T32 remediation — round 1

Date: 2026-09-02
Source: `dev-diary/t32-review-round-1.md` (round-1 verdict: NOT APPROVED, P1 x 1,
P2 x 5, P3 x 3)
Scope: `src/lib/Plan.svelte`, `src/lib/Practice.svelte`, `src/lib/Start.svelte`,
`src/lib/Tips.svelte`, `src/lib/session.svelte.js`, `src/lib/fixture.js`,
`.gitignore`, `test/session-capabilities.test.mjs`. `netlify/functions/analyze.mts`
and the prompts were not touched, per instruction. No commit was made.

All nine findings were remediated, including all three P3s.

## P1-1 — A failed score call blocked the interview

- **Review said**: `next()` returned on every non-ok `submitAnswer` result and
  never called `advance()`, so a failing score call wedged the interview on
  the current question forever. Section 10 state 12 says this state must not
  block; the only way past it was Skip, which drops the answer from the
  verdict.
- **Changed**: `src/lib/Practice.svelte:74-97` (`next()`). Took the review's
  fix as given. A second `Next question` press against the same unchanged
  answer, while `session.scoreFailed` is true, now bypasses `submitAnswer`
  entirely and calls `advance()` directly, using the `failedAnswer` latch
  that was already in the file. An edited answer still re-submits, because
  the effect at `Practice.svelte:56-66` clears `scoreFailed` the moment the
  text differs from `failedAnswer`.
- **Verified live**: deployed a draft build (`netlify deploy --build`,
  `https://6a97e16e30a81fc37703d2ed--dryrun-963.netlify.app`) and drove it
  with the Claude Browser tool. Patched `window.fetch` in the page to force
  a 503 `provider_unavailable` on the score task only, leaving the real
  brief call untouched. Pasted a job posting, reached Question 1, answered
  it, pressed `Next question`: the page showed `We could not read that
  answer. Your answer is saved. Try again, or move on.` and stayed on
  Question 1 of 8, reproducing the review's stuck state exactly. Pressed
  `Next question` a second time with the same answer: the page advanced to
  Question 2 of 8, the strip cleared, and `window.__scoreCalls` stayed at 1
  (confirming the second press did not re-hit the network; it took the
  bypass branch). This is a real, working deploy, not a local mock.
- **Not added to the automated suite**: this fix lives entirely in
  `Practice.svelte`'s button handler. The project has no DOM/interaction
  test harness (existing component tests use `svelte/server`'s static SSR
  render, which has no live event handlers, or a full headless-Chrome CDP
  driver reserved for file-picker tests). Rather than build new harness
  scaffolding for one fix, I verified it against a real deploy instead, as
  the task authorized. `submitAnswer`'s own behavior on score failure
  (answer preserved, `scoreFailed` set, `scoring` cleared) was already
  covered by the existing T28 test and is unchanged here.

## P2-1 — An over-limit pasted CV blocked the whole product and blamed the service

- **Review said**: `Start.svelte`'s `startPractice()` sent `session.resume`
  to `setPosting` with no length check. A CV over 20,000 characters made the
  server return 413, which the Start screen shows as the generic
  `service_down` strip — not a CV-specific message — and the state is stuck
  until the person deletes text the interface never named. The file-upload
  route already truncates via `FileChooser.svelte`; the paste route did not.
- **Changed**: `src/lib/Start.svelte`. Took the review's fix, matching the
  existing `FileChooser.svelte` truncate-and-warn pattern rather than
  inventing a new one:
  - `startPractice()` (lines 32-49) now truncates `session.resume` to
    `MAX_RESUME_CHARS` before calling `setPosting`, and sets a local
    `cvWarning` to `copy.warn.cv_long` when it does.
  - A new `cvWarning` state (line 24) and an `--almost` `MessageStrip` in the
    CV block (after the paste textarea) render it, with `.cv :global(.strip)`
    spacing matching `FileChooser.svelte`'s own strip margin.
  - `MAX_RESUME_CHARS` is imported from `session.svelte.js` (already exported
    there for `FileChooser.svelte`); no new export was needed.
- **Verified live**: same draft deploy, a fresh tab, `localStorage` cleared.
  Instrumented `window.fetch` to record the outgoing request body without
  altering it. Set a posting and a 20,001-character pasted CV (all `A`s),
  clicked `Start practice`. The recorded outgoing brief request carried
  `resumeChars: 20000` (truncated client-side before the request), not
  20,001. The service is live and working on this deploy, so the request
  succeeded and the screen reached `Your practice is ready` — no
  `service_down` strip, matching Section 10's rule that states 4-7 never
  block the product.

## P2-2 / P2-3 — The plan screen's primary button could go dead, and the worked example disagreed between a human and an agent

The review filed these separately but ruled the fix belongs mostly in one
place, so they are remediated together.

- **Review said (P2-2)**: `Plan.svelte`'s `startPractice()` called
  `startInterview()` and discarded the result. When the capability refused
  (for example, after a CV request failed mid-interview and rolled the phase
  back to `ready` with answers already in place), `session.error` was set
  but no screen renders it, so the screen's one primary button did nothing,
  silently, on every subsequent press.
- **Review said (P2-3)**: the pre-existing `session.isExample` branch in the
  same function bypassed `startInterview()` entirely to let the worked
  example start by tapping. No tool writes `isExample`, so an agent's
  `start_interview` call on that same on-screen state was refused while the
  human tap succeeded — a parity break on the screen where an agent and a
  person can be looking at the identical state.
- **Changed**:
  - `src/lib/session.svelte.js:478-498` (`startInterview()`): the pristine
    guard now reads `if (!pristine && !session.isExample)`. The worked
    example ships pre-scored, so it can never be pristine; exempting
    `isExample` here means both the human tap and an agent's
    `start_interview` call reach the same successful outcome on that screen,
    closing the parity gap from the capability side rather than the
    component side.
  - `src/lib/Plan.svelte:26-34` (`startPractice()`): reduced to the review's
    fix. It calls `startInterview()` first; if that succeeds, done. If not
    (a plan that already carries answers, from a restored session or a
    rolled-back CV request), it clears `session.error` and moves the phase
    to `interviewing` directly, resuming the interview the screen is already
    showing instead of leaving the button dead. This also removes the
    separate `isExample` branch, since the capability now handles that case.
- **Verified**: `test/session-capabilities.test.mjs` — new test `T32 P2-3:
  startInterview exempts only the worked example from the pristine guard`
  proves both halves: a real (non-example) session with a score in place
  still gets refused (the guard is not weakened), and the same non-pristine
  state with `isExample: true` succeeds and returns Q1. The existing T28
  reproduction at `test/session-capabilities.test.mjs:801-803` (a public
  restart rejected after scoring) stays green, since `isExample` is false in
  that test.

## P2-4 — Skipping an already-scored question deleted the whole saved session

- **Review said**: `skip()` set `skipped = true` unconditionally, including
  on a question that already carried a score. `validPersistedSession`
  rejects that exact shape (scored and skipped together), so `persistSession`
  treats the snapshot as invalid and deletes the stored record. A reload
  then lands on a blank Start screen with zero questions — reachable in two
  taps from the tips screen via `Try again` then `Skip this one`.
- **Changed**: `src/lib/Practice.svelte:104-114` (`skip()`). Took the
  review's fix: a question that already carries a score is not blocked, so
  it cannot be the reason Skip was pressed. `skip()` now only sets
  `skipped = true` when `!question.scores`.
- **Verified**: `test/session-capabilities.test.mjs` — new test `T32 P2-4: a
  skipped question that already carries a score keeps the session
  persistable`. It scores a question, confirms `persistSession()` still
  returns `true` while `skipped` stays `undefined` (mirroring what the fixed
  `skip()` produces), then forces `skipped = true` on that same scored
  question to reproduce the exact shape the review measured, and confirms
  `persistSession()` returns `false` and removes the stored key — proving
  the invariant the fix in `skip()` now protects.

## P2-5 — Skipping during a score call left the next question's primary busy and dead

- **Review said**: `skip()` and `finishEarly()` moved the person off the
  scoring question without retiring the in-flight score request, so
  `session.scoring` stayed `true` and the next question's primary read
  "Reading your answer" with `Next question` refusing all input, for as long
  as the abandoned request took to settle (up to the full 10-second, two-
  attempt timeout in production).
- **Changed**:
  - `src/lib/session.svelte.js:259-268`: new exported `abandonScoring()`,
    wrapping the existing `supersedeActiveScoreRequest()` (which already
    aborts the controller, bumps the generation, and clears
    `session.scoring`). The capability layer owns the request stream, so it
    owns retiring it, per the review's fix.
  - `src/lib/Practice.svelte`: `skip()` (line 104) and `finishEarly()`
    (line 117) both call `abandonScoring()` before moving the phase or
    index.
- **Verified**: `test/session-capabilities.test.mjs` — new test `T32 P2-5:
  abandonScoring retires an in-flight score request and clears the busy
  flag`. Starts a score request, confirms `session.scoring` is `true` and
  the request's `AbortSignal` is live, calls `abandonScoring()`, and
  confirms `session.scoring` flips to `false` and the signal aborts
  immediately. Resolving the abandoned request afterward still resolves as
  `{ ok: false, code: 'superseded' }` and does not resurrect `scoring` or
  attach a stray score — the generation guard in `submitAnswer` already
  covered that half.

## P3-1 — New comments broke the 25-word house limit

- **Review said**: five new comment sentences ran to 50, 41, 33, 33, and 32
  words, against the deck's 24-word settled maximum.
- **Changed**: split the flagged sentences in `src/lib/Plan.svelte:27-34`,
  `src/lib/Practice.svelte:68-73` and `:192-195`, `src/lib/Start.svelte:33-46`,
  and `src/lib/Tips.svelte:15-17`. Took the review's suggested split for the
  worst offender (`Practice.svelte`'s `next()` doc comment) and applied the
  same treatment elsewhere. Every new or touched sentence is now under 25
  words; verified by hand-counting each one after editing (word counts noted
  during the edit, not re-derived by a script — a first automated pass at
  counting produced false positives by merging separate comment blocks
  across blank lines, so it was not trustworthy enough to rely on alone).
  Also caught and fixed one semicolon I had introduced into
  `Practice.svelte:99-101`'s comment while rewriting it ("An agent always
  answers; it never taps Skip" → "and never taps Skip"), which the house
  style forbids in new prose.

## P3-2 — `.claude/` was untracked and unignored

- **Review said**: `.claude/launch.json` is harness configuration, not
  product source, and being untracked-but-unignored means it would be swept
  into the commit by accident.
- **Changed**: `.gitignore` — added `.claude/` alongside the existing
  `node_modules/`, `dist/`, `.netlify/` entries. The directory itself is
  untouched on disk. `git status --porcelain` no longer lists it.

## P3-3 — Comments still deferred to tasks that had already landed

- **Review said**: three comments described T25-T30/T32 as future work when
  T32 is the task that resolves them, naming `Tips.svelte:38-40`,
  `Practice.svelte:192-195`, and `fixture.js:1-4`.
- **Changed**:
  - `src/lib/Tips.svelte` (`tryAgain()`): rewritten to state plainly that
    `Try again` re-enters the practice screen with existing answers and
    scores in place, and to explain *why* it can do that even though
    `startInterview()`'s guard would refuse a scored plan (it does not call
    the capability at all).
  - `src/lib/Practice.svelte:192-195` (state-20 button comment): dropped the
    stale "T28 drives this" and "console-reachable" language; now says
    `submitAnswer` drives `session.scoring` directly, for a human press and
    an agent's `submit_answer` call alike.
  - `src/lib/fixture.js:1-8`: corrected the actually-wrong claim. `fixture.js`
    was not touched by T32 — the real write path lives in `Start.svelte`'s
    `setPosting` call, not in the loader. The header now says the See-the-
    example button is the only caller of `loadExample()`, and that
    `Start.svelte`'s real Start-practice button never reaches this file.
  - **Beyond the three named sites**: the review's own "Measured" note for
    this finding pointed at `session.svelte.js:28-43` as covered by the
    same argument (four field comments referencing `T25-T30`, `T25-T32`,
    and `T28` as still-pending). Since `session.svelte.js` was in scope to
    change and the fix is a small, safe comment cleanup, I fixed those four
    too rather than leave a flagged-but-untouched site: `lastCallAt`,
    `serviceDown`, `isExample`, and `scoring` no longer name task IDs that
    have landed; `isExample`'s note now says "No tool ever sets this" and
    `scoring`'s says `submitAnswer` drives it directly for both callers.

## Testing

- `npm test` — 57 passed, 0 failed (54 pre-existing plus 3 new: `T32 P2-3`,
  `T32 P2-4`, `T32 P2-5`, all in `test/session-capabilities.test.mjs`).
- `npm run build` — passed; only the pre-existing >500 kB chunk-size
  advisory (`index-D6d__1sk.js`, 540.51 kB).
- `git diff --check` — clean.

## Live verification

Ran `netlify deploy --build` (draft deploy, unmetered, does not touch
production): `https://6a97e16e30a81fc37703d2ed--dryrun-963.netlify.app`. Used
it to verify P1-1 and P2-1 directly, as detailed in their sections above —
both against the real deployed function, with `window.fetch` patched only
where the review's own reproduction required forcing a failure (the score
task, for P1-1) or left entirely real (the brief task, for P2-1, which
succeeded because the AI Gateway is active on this deploy). `--prod` was
never run.

## Disputed findings

None. All nine findings as described in the review matched what was in the
code, and the review's proposed fixes were sound; I took them as given
except for the small presentation choices noted in P3-1 and P3-3 above
(splitting sentences differently in a couple of spots, and extending the
P3-3 comment cleanup to `session.svelte.js`'s field comments beyond the
three sites named in the finding's title, per the review's own measurement
of that file).

## Copy deck

No new user-visible string was needed. P2-1's fix reuses `copy.warn.cv_long`
("Your CV was long, so we used the first part of it. That is usually
enough."), which already exists in the deck at `copy.js` 11.9 and is already
used by `FileChooser.svelte` for the same Section 10 state 7 treatment on
the file-upload route.
