# T32 remediation — round 2

Date: 2026-09-02
Source: `dev-diary/t32-review-round-2.md` (round-2 verdict: NOT APPROVED, P2 x 2,
P3 x 3)
Scope: `src/lib/Start.svelte`, `src/lib/Plan.svelte`, `src/lib/Practice.svelte`,
`src/lib/fixture.js`, `src/lib/session.svelte.js`,
`test/session-capabilities.test.mjs` — six of the eight files already in the T32
diff (`Tips.svelte` and `.gitignore` needed no change this round). No file
outside the T32 diff was touched. No commit was made.

All five findings were remediated, including all three P3s. The two P2 fixes
land as the reviewer's verified guards, taken as given.

## P2-1 — The worked-example exemption let ChatGPT restart a real, scored interview

- **Review said**: the round-1 guard `if (!pristine && !session.isExample)`
  dropped the phase check along with the progress check. Nothing clears
  `isExample` once the example interview starts, so an agent's
  `start_interview` could throw the person back to Question 1 mid-interview
  and wipe the tips screen from `done`. The reviewer measured both restarts
  on the shipped build and verified the fix on a scratch copy.
- **Changed**: `src/lib/session.svelte.js` (`startInterview()`). Took the
  reviewer's verified guard as given:

  ```js
  const examplePlan = session.isExample && session.phase === 'ready';
  if (!pristine && !examplePlan) {
    return inputError('Start a new practice plan before starting another interview.');
  }
  ```

  The comment is the reviewer's, with one mechanical split: the last sentence
  ("Once the example interview starts it ... (Section 10 note on state 10).")
  became two sentences, because the single sentence reaches 25 words once the
  citation tokens are counted and every new sentence must be under 25. No
  wording was dropped.
- **Verified**: new test `T32 R2 P2-1: the example exemption stops at the
  example plan screen` builds the measured flow through the real fixture:
  `loadExample()` plus `isExample: true` (the plan screen still starts),
  one real scored answer inside the example interview, then the restart
  attempt is refused with `current` and `phase` untouched, and the same call
  on the tips screen (`phase: 'done'`) is refused with the tips screen left
  standing. The existing `T32 P2-3` test is unchanged and green — its
  `phase = 'ready'` setup is its own legitimate scenario, and the new test is
  the one that covers the hole its setup masked. The `T28` restart-refusal
  reproduction is green too. Live, on the draft deploy: with
  `document.modelContext` stubbed at document start (the review's own
  harness technique) the example plan screen start returned `q1`; after two
  real scored answers, at `Question 3 of 8`, the agent call returned the
  refusal and the screen did not move; from the tips screen the call returned
  the refusal and `Your tips for next time` was still on screen. The two
  score calls went through the real deployed function.

## P2-2 — The over-long pasted CV was truncated in silence, and state 7's strip could never render

- **Review said**: `cvWarning` was a local `$state` assigned inside
  `startPractice()`, which unmounts the Start screen in the same flush
  (`setPosting` moves the phase synchronously), so the strip was unreachable
  dead code and 5,000 characters of a 25,000-character CV could vanish with
  no message. The reviewer verified the derived fix on a scratch build.
- **Changed**: `src/lib/Start.svelte`. Took the reviewer's fix as given:

  ```js
  let cvWarning = $derived(
    (session.resume ?? '').length > MAX_RESUME_CHARS ? copy.warn.cv_long : null,
  );
  ```

  Both `cvWarning = ...` assignments were removed from `startPractice()` and
  `session.resume = resume.slice(0, MAX_RESUME_CHARS)` was kept, so the
  request still goes out inside the limit. The existing `{#if cvWarning}`
  `MessageStrip` block and the `.cv :global(.strip)` rule are untouched. The
  comment above the derived is the reviewer's, with one mechanical split at
  the colon ("for the same reason." / "A flag set on the way out ..."), which
  keeps both sentences under the 25-word limit — as one colon-joined sentence
  it is 29 words. In `startPractice()`, the comment now says the derived
  strip already shows while the person is on the screen and this only
  truncates.
- **Verified live** (draft deploy `https://6a97ee9ab6f54f14c7c89e2a--dryrun-963.netlify.app`,
  headless Chrome over the DevTools protocol): pasting 25,000 characters into
  the CV box renders exactly one strip, class `strip strip-almost`,
  `role="status"`, reading `Your CV was long, so we used the first part of
  it. That is usually enough.`, immediately and while still on the Start
  screen — against round 2's measured zero appearances. With the strip up,
  `Start practice` sent the brief request with `resumeChars: 20000` (request
  body captured over the network, not by patching `fetch`) and reached
  `Your practice is ready` through the real deployed function. Section 13
  gate with the strip up: `scrollWidth` equals `clientWidth` at 180 x 600
  and at 360 x 800.

## P3-1 — The rolled-back plan still told a person and ChatGPT different things

- **Review said**: `Plan.svelte`'s `startPractice()` still flipped
  `session.phase` directly when `startInterview()` refused, so on the
  resume-rollback screen (phase `ready`, `current` 1, Q1 scored) the person
  could start with a tap while both agent write tools were refused. The fix
  belongs in the capability: a `resumable` predicate that accepts a ready
  plan carrying progress with its brief intact, returning
  `session.questions[session.current]`, and the test must show the same
  on-screen state, both callers, same outcome.
- **Changed**:
  - `src/lib/session.svelte.js` (`startInterview()`): new predicate beside
    the P2-1 guard — `const resumable = session.phase === 'ready' &&
    !pristine && !session.isExample;` — added to the refusal condition. A
    resumed plan keeps `session.current` (only a pristine or example plan
    resets to question 1) and the success return is now
    `session.questions[session.current]`, so both callers re-enter at the
    same question. The capability owns clearing `session.error`, which its
    success path already did. The two exemptions stay disjoint: the example
    plan is never `resumable`, so each predicate names one case.
  - `src/lib/Plan.svelte` (`startPractice()`): reduced to `startInterview();`
    with a comment saying both callers share this door. Every plan state this
    screen can show — pristine, the worked example, a rolled-back plan with
    answers — now passes the shared guard, so the dead-primary failure of
    round 1's P2-2 cannot recur through a reachable state.
- **Verified**: new test `T32 R2 P3-1: a rolled-back plan starts for both
  callers at the same question`. It builds the review's reproduction through
  the real capabilities (`setPosting`, `startInterview`, `submitAnswer`,
  then `setResume` against a 503, which is `restoreAfterResumeFailure`), and
  asserts the rolled-back state: `phase: 'ready'`, `current: 1`,
  `isExample: false`, Q1 scored. The human path — the capability call
  `Plan.svelte` now makes — resumes at `q2` with `current` and the Q1 score
  intact. The state is then rebuilt identically and the agent path drives
  the real registered tool (`webmcp.js`'s `registerTools()` under a stubbed
  `document.modelContext`, the same pattern as `webmcp-tools.test.mjs`):
  `start_interview` returns the same `q2` JSON and the same state. Live, on
  the draft deploy: after the agent's `set_resume` failed and rolled the
  session back to `Your practice is ready`, the person's `Start practice`
  tap resumed at `Question 2 of 8`; rebuilding the same rolled-back state,
  the agent's `start_interview` returned `q2` and also landed on
  `Question 2 of 8` — against round 2's measurement of that call being
  refused. The existing `T25–T27` start-at-Q1 test stays green (a pristine
  plan still resets `current` to 0 and returns `q1`).

## P3-2 — Three comments still deferred to landed work

- **Review said**: `Start.svelte:57-59` still claimed `fixture.js` is frozen
  for T19 and that T25-T32 may move the loader option; `Practice.svelte:52-54`
  still said the flag is set externally (console, then T28);
  `session.svelte.js:73` still said the Start screen "will bind" its CV field
  in T32.
- **Changed**: `Start.svelte` took the reviewer's comment verbatim (Section
  10 state 10/11, the example button prominent, `loadExample` is the only
  caller). `Practice.svelte` was rewritten to the review's instruction:
  `submitAnswer` sets the flag itself, the effect watches the answer text
  rather than the flag, otherwise it would clear the strip the instant it
  appears. `session.svelte.js:73` now says the Start screen binds its CV
  field, with the stale "in T32" gone and the old semicolon replaced by a
  rejoiner (the sentence is 24 words).
- **Verified**: the three sites now state current facts; none of them
  describes T25-T32 work as pending. Every sentence in the rewritten blocks
  is under 25 words (counted per sentence across the touched blocks, maximum
  24), with zero semicolons and zero em or en dashes in the added lines.

## P3-3 — Two comment defects inside the new hunks

- **Review said**: in `skip()`, the four-line scored-question comment sat
  directly above `abandonScoring()`, which it does not describe, while the
  P2-5 call itself had no comment here; `fixture.js`'s rewritten opening
  sentence was 26 words.
- **Changed**: `Practice.svelte` (`skip()`) reordered to the review's block
  verbatim: the in-flight comment ("A score call for this question may still
  be in flight. Retire it here so session.scoring cannot outlive the
  question it describes.") now sits above `abandonScoring()`, matching
  `finishEarly()`, and the unscored-question comment sits above the `if` it
  explains. `fixture.js`'s opening colon became a period, giving the
  reviewer's 5-word plus 22-word form.
- **Verified**: the comment-to-statement mapping in `skip()` now matches the
  review's block exactly. A per-sentence word count across every comment
  block this round touched reports a maximum of 24 words, and a grep over
  all added comment lines in the diff reports zero semicolons, zero em
  dashes and zero en dashes.

## Testing

- `npm test` — 59 passed, 0 failed (57 pre-existing plus the two new round-2
  tests, both in `test/session-capabilities.test.mjs`).
- `npm run build` — passed; only the pre-existing >500 kB chunk-size
  advisory (`index-BOzy1RJY.js`, 540.57 kB).
- `git diff --check` — clean.

## Live verification

Ran `netlify deploy --build` (draft, `--prod` was never run):
`https://6a97ee9ab6f54f14c7c89e2a--dryrun-963.netlify.app`. Drove it with
headless Chrome over the DevTools protocol. The agent path was exercised the
way the review exercised it: `document.modelContext` stubbed at document
start so `main.js` registers the six real tools, then invoked through their
own `execute` handlers. `window.fetch` was never patched. The first brief
call and the P2-1 score calls went through the real deployed function and
succeeded; when the live function later began refusing (its gateway quota),
the remaining scenarios replayed the function's own response shapes over
CDP request interception — the same body-level replay the review's harness
used, with `sourceQuote` chosen verbatim in the posting so the client's own
`validateBriefResponse` accepts the replay. Details per finding above.

## Disputed findings

None. All five findings matched the code, and the P2 fixes landed exactly as
the reviewer verified them. Two presentation notes, both mechanical and
neither changing any wording the review relied on: the reviewer's proposed
comment for P2-1 had its final sentence split in two (25 words with the
citation, as one sentence), and the proposed P2-2 comment had its
colon-joined third sentence split at the colon (29 words, as one sentence),
both to hold the under-25-word house limit that this remediation was itself
measured against in P3-3.

## Copy deck

No new user-visible string. P2-2 reuses `copy.warn.cv_long` ("Your CV was
long, so we used the first part of it. That is usually enough."), already in
the deck and already used by `FileChooser.svelte` for the same Section 10
state 7 treatment on the file route. `copy.js` is untouched.
