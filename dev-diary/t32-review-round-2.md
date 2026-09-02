# T32 review, round 2

Date: 2026-09-02
Reviewer: ReviewT32
Target: the round-1 remediation of T32 (Dry Run). Eight files changed against
HEAD, 225 insertions and 56 deletions: `src/lib/Start.svelte`,
`src/lib/Plan.svelte`, `src/lib/Practice.svelte`, `src/lib/Tips.svelte`,
`src/lib/fixture.js`, `src/lib/session.svelte.js`,
`test/session-capabilities.test.mjs`, `.gitignore`. Binding spec:
`dev-diary/design.md` Revision 2, `dev-diary/task.md` T32, and the parity rules
in `dev-diary/project.md`. Prior documents:
`dev-diary/t32-review-round-1.md`, `dev-diary/t32-remediation-round-1.md`.

## Verdict

**NOT APPROVED — P1 x 0, P2 x 2, P3 x 3.**

P1-1 is genuinely closed and closed well. So are P2-2, P2-4, P2-5 and P3-2. The
interview no longer wedges. The saved session no longer disappears. The primary
no longer says it is reading an answer nobody is waiting on. Every one of those
was verified by driving the shipped build, not by reading the patch.

The two open P2s are the same kind of miss. A fix was carried out to the letter
and stopped one step short of the behaviour the spec asks for.

P2-3's fix moved the worked-example exemption into the capability layer. It
removed the phase check along with the progress check, so an agent can now
restart a real interview that carries real scores. P2-1's fix stopped the CV
from blocking the product. It put the warning where the screen can never show
it, so 5,000 characters of somebody's CV now vanish in silence.

## Findings by severity

### P2-1. The worked-example exemption lets ChatGPT restart a real, scored interview

- **File / lines**: defect at `src/lib/session.svelte.js:485-498`
  (`startInterview()`). Fix site is the same guard. Related:
  `src/lib/Start.svelte:60-64` (`seeExample()`, the only writer of
  `session.isExample`), `test/session-capabilities.test.mjs:939-941`.
- **Spec vs code**: the guard's own comment at `session.svelte.js:482-484`
  states the contract it exists to hold. "Starting is a one-way transition from
  the untouched plan. A public capability must not silently restart an
  interview whose answers have already been scored: scores are inseparable from
  their transcript." The `pristine` predicate at `:485-491` has two halves: a
  phase half, `session.phase === 'ready'`, and a progress half, every question
  unanswered and unscored. The new exemption is written against the whole
  predicate:

  ```js
  if (!pristine && !session.isExample) {
  ```

  so when `isExample` is true, both halves are dropped, not just the progress
  half the finding was about. `session.isExample` is set true at exactly one
  site, `Start.svelte:62`. Nothing clears it when the example interview starts.
  The clear sites are `Start.svelte:37`, `Tips.svelte:59`, and
  `session.svelte.js:368`, `:400`, `:457`, `:754`, none of which runs on that
  path. So the flag stays true for the whole life of the session.
- **Measured** (production build from `npm run build`, served by a
  reviewer-only static server that also answers `/api/analyze` with the
  function's own bodies from `netlify/functions/analyze.mts`; headless Chrome
  152 driven over the DevTools protocol; `document.modelContext` stubbed at
  document start to drive the six registered tools' own `execute` handlers):

  | Step | State after |
  |---|---|
  | Brief call answers 503 `provider_unavailable` | `phase: idle`, `serviceDown: true`, `err.service_down` strip, `See the example` button |
  | Tap `See the example` | `phase: ready`, `isExample: true`, 8 questions, 3 pre-scored |
  | Agent calls `start_interview` | `{ ok: true }`, returns `q1`. **This is P2-3 closed.** |
  | Tap `Start practice`, type an answer, press `Next question`, score service up | one real score call, `q1.scores = {specificity:4, evidence:4, structure:4, relevance:4}`, `isExample` still `true` |
  | Answer a second question | `current: 2`, screen reads `Question 3 of 8` |
  | Agent calls `start_interview` **now** | `{ ok: true }`, `current` goes 2 → 0, screen goes back to `Question 1 of 8` |
  | Set `phase` to `done` (tips screen, `h1: Your tips for next time`) | — |
  | Agent calls `start_interview` **there** | `{ ok: true }`, `phase` back to `interviewing`, `current: 0`, the tips screen disappears |

  The payload the agent gets back on the two restarts is
  `session.questions[0]`, which by then carries the person's own answer, their
  scores, their missed points and their model answer.
- **Why it is a defect**: it is the exact behaviour the guard's comment
  forbids, reached by a public tool, on the demo-insurance path. The
  exemption's own justification does not hold: "No tool writes
  session.isExample, so this cannot weaken the guard for a real session." No
  tool needs to. A person writes it by tapping the Section 10 state 10 button,
  and the session stops being an example the moment they answer a question for
  real. The realistic sequence is the judge's: the service is flaky, the judge
  taps `See the example`, then asks ChatGPT to run the practice. A second
  `start_interview` from the agent — after a hiccup, or a retry — throws the
  judge back to Question 1 or wipes their tips screen.

  The new regression test hides this rather than catching it.
  `test/session-capabilities.test.mjs:939-941` sets `session.phase = 'ready'`
  on the line immediately before `session.isExample = true`, so it only ever
  exercises the one phase in which the exemption is safe. The test asserts a
  property the code does not enforce.
- **Fix** (verified: applied to a scratch copy of the tree, built with
  `npm run build`, served and driven the same way):

  ```js
  // The worked example ships pre-scored, so it can never be pristine. Exempt
  // it on its own plan screen only. Once the example interview starts it
  // carries real answers and real scores, so it must not be restartable
  // either (Section 10 note on state 10).
  const examplePlan = session.isExample && session.phase === 'ready';
  if (!pristine && !examplePlan) {
    return inputError('Start a new practice plan before starting another interview.');
  }
  ```

  Measured on that build: the example plan screen still starts for the agent
  and for the person; the mid-interview call and the tips-screen call are both
  refused with `Start a new practice plan before starting another interview.`
  and leave `current` and `phase` untouched; a real pristine plan still starts
  for both callers. `node --test test/session-capabilities.test.mjs` is 19
  passed, 0 failed on the patched tree, including the `T32 P2-3` test, which
  passes because its own setup sets `phase = 'ready'` first. Add a regression
  that sets `isExample: true` with `phase: 'interviewing'` and a scored
  question, and asserts the refusal.
- **Priority**: 2 — **Confidence**: 0.9.

### P2-2. The over-long pasted CV is now truncated in silence, and state 7's strip can never render

- **File / lines**: defect at `src/lib/Start.svelte:35-52` (`startPractice()`),
  with the unreachable strip at `:120-122` and its spacing rule at `:272-274`.
  Fix site is the `cvWarning` declaration at `:24-26`. Contrast:
  `src/lib/FileChooser.svelte:64-67`.
- **Spec vs code**: Section 10 row 7 is `CV too long | Extracted text over
  20,000 | --almost strip, first 20,000 kept | warn.cv_long | Blocks? No`. The
  fix delivers the truncation and drops the strip. `cvWarning` is `$state`
  local to `Start.svelte` and is assigned inside `startPractice()`, which then
  calls `setPosting`. `setPosting` sets `session.phase = 'analysing'`
  synchronously at `session.svelte.js:406`, and `App.svelte:21-23` swaps
  `Start` for `GettingReady`, so the component unmounts in the same flush that
  set the flag. A later remount resets `cvWarning` to `null`. No path leaves
  `startPractice()` without navigating away. The primary is
  `disabled={!canStart}` at `Start.svelte:157`, so `setPosting` never reaches
  the `settlePostingValidation` branch that would keep the person on the
  screen.
- **Measured** (same harness; a `MutationObserver` armed on `document.body`
  watching for the exact `warn.cv_long` string, plus `document.body.innerText`
  sampled at every step):

  | Run | Outcome |
  |---|---|
  | 20,001-character pasted CV, valid advert, brief answers 200 | Request carries `resumeChars: 20000`. Truncation works, the 413 is gone, the plan screen is reached. Strip appearances: **0**. `innerText` never contains the string. |
  | 20,001-character CV, brief answers 503 | Back on Start, `phase: idle`. Strip appearances: **0**. |
  | 25,000-character CV, brief answers 503 | Back on Start. `session.resume.length === 20000`. **5,000 characters of the person's CV are gone.** The CV paste panel is closed again (`pasteCv` reset on remount). The only strip on screen reads `We cannot build new questions right now. Try again in a minute.` Reopening the panel shows a 20,000-character box and still no message. |

  The file route behaves differently by construction:
  `FileChooser.svelte:65-67` sets its own `warning` while the file is being
  read, with the Start screen still on screen, so the same copy string does
  reach the person there.
- **Why it is a defect**: the Treatment cell of a Section 10 row is not
  delivered. `cvWarning`, its `{#if}` block and its `.cv :global(.strip)` rule
  are dead code that make the diff read as though state 7 is handled on both
  routes. The two CV routes still disagree, which is the asymmetry P2-1 was
  filed to remove. The person is never told that part of their CV was dropped.
  The Section 10 note on state 12 calls losing what somebody typed the worst
  thing this product can do, and 5,000 characters is a lot of CV.
- **Fix** (verified: scratch copy, built, served and driven): warn where the
  person can still see it, the way the file route does, and keep the
  truncation on submit so the request stays inside the limit.

  ```js
  // Section 10 state 7 on the paste route. FileChooser warns while the file
  // is read. Warn while the CV is pasted, for the same reason: a flag set on
  // the way out is never seen, because setPosting leaves this screen in the
  // same flush.
  let cvWarning = $derived(
    (session.resume ?? '').length > MAX_RESUME_CHARS ? copy.warn.cv_long : null,
  );
  ```

  with the two `cvWarning = ...` assignments removed from `startPractice()`
  and its `session.resume = resume.slice(0, MAX_RESUME_CHARS)` kept. Measured
  on that build: pasting 25,000 characters renders one strip, class
  `strip strip-almost`, `role="status"`, text `Your CV was long, so we used the
  first part of it. That is usually enough.`, immediately and for as long as
  the person is on the screen. `Start practice` still sends
  `resumeChars: 20000` and still reaches the plan screen. The Section 13 gate
  holds with the strip up: `scrollWidth` equals `clientWidth` at both 180 x 600
  and 360 x 800.
- **Priority**: 2 — **Confidence**: 0.9.

### P3-1. The rolled-back plan still tells a person and ChatGPT different things

- **File / lines**: `src/lib/Plan.svelte:26-37` (`startPractice()`), against
  `src/lib/session.svelte.js:496`.
- **Spec vs code**: this is the residue of P2-3's ruling. The capability
  header at `session.svelte.js:4-7` sets the standard, "So the page never tells
  a human and an agent different things," and round 1 ruled that the fix for a
  screen where the two callers disagree belongs in the capability. The
  remediation moved one of the two such cases there, the worked example, and
  left the other in the component: `Plan.svelte:35-36` flips
  `session.phase = 'interviewing'` directly when `startInterview()` refuses.
- **Measured** (same harness, the round-1 P2-2 reproduction):
  - Real session, Q1 answered and scored, `current: 1`. Agent calls
    `set_resume`; the brief call answers 503; `restoreAfterResumeFailure`
    rolls the phase back. State: `phase: ready`, `current: 1`, `isExample:
    false`, Q1 answer and score intact, screen shows `Your practice is ready`
    with one primary.
  - Person taps `Start practice`: `phase: interviewing`, `current: 1`,
    `Question 2 of 8`, score intact. **P2-2 is closed.**
  - Agent, same state, same moment: `start_interview` returns `Start a new
    practice plan before starting another interview.`; `submit_answer` returns
    `Start the interview before submitting an answer.` Both write tools are
    refused. `get_verdict` still reads.
- **Why it is a defect**: the agent created this state with its own tool call
  and then cannot leave it, while the person can, with one tap, on the same
  screen. It is the same shape as round 1's P2-3, one screen over. It sits at
  P3 rather than P2 because the agent is not permanently stuck — it can call
  `set_posting` again — and because round 1's own prescribed P2-2 fix is
  what is in the file, verbatim.
- **Fix**: give the resume-rollback case the same treatment the example case
  got, so the fallback stops being component-only. A `resumable` predicate in
  `startInterview()` that accepts a `ready` plan whose questions carry progress
  but whose brief is intact, returning `session.questions[session.current]`
  rather than `questions[0]`, would let both callers through the same door and
  reduce `Plan.svelte:26-37` to `startInterview();`. Whatever shape is chosen,
  the test to add is the one this finding measures: the same on-screen state,
  both callers, same outcome.
- **Priority**: 3 — **Confidence**: 0.75.

### P3-2. P3-3 is not closed: three comments in the changed files still defer to landed work

- **File / lines**: `src/lib/Start.svelte:57-59`,
  `src/lib/Practice.svelte:52-54`, `src/lib/session.svelte.js:73`.
- **Spec vs code**: P3-3's requirement was that no comment still describes T25
  to T32 as future work, and the remediation states it fixed the three named
  sites plus four field comments in `session.svelte.js:26-43`. Those seven are
  genuinely fixed and accurate. Three more, all in files this remediation
  edited, are not.
  - `Start.svelte:57-59`: "fixture.js is frozen for T19, so the
    `loadExample({ asExample })` option of the state audit is honoured here at
    the call site instead; T25-T32 may move it into the loader." T32 is this
    task and it did not move it. `fixture.js` is also no longer frozen — this
    same remediation edited it. The sentence is 65 words and carries a
    semicolon, so it is also the longest and least house-style comment
    sentence left in the changed files.
  - `Practice.svelte:52-54`: "the flag itself is set externally (console, then
    T28), so the effect must not react to the flag alone". This is the same
    stale "console-reachable" claim the remediation removed from
    `Practice.svelte:208-211`, left standing forty lines above it. `T28`
    landed and `submitAnswer` sets the flag.
  - `session.svelte.js:73`: "The Start screen will bind its CV field directly
    to `session.resume` in T32". It binds it now, at `Start.svelte:118`.
- **Measured**: `grep -n 'T1[0-9]\|T2[0-9]\|T3[0-9]'` over `src/lib` returns
  nineteen hits. Sixteen are accurate historical attributions. These three are
  future-tense or stale-fact statements about work that has landed, and all
  three sit in files the remediation changed.
- **Why it is a defect**: it is the same argument P3-3 made and the same
  argument the T19 P2-2 ruling made. A stale "for now" or "will" is how the
  next task inherits a workaround as though it were sanctioned. The
  `Start.svelte` one is the worst of the three, because it tells the next
  reader that `fixture.js` is untouchable when it has just been touched.
- **Fix**: rewrite the three to describe what the code does now. For
  `Start.svelte:54-59`, drop the frozen-fixture history and the deferral, and
  keep only the behaviour and its spec reference:

  ```js
  // Section 10 state 10/11: the demo insurance. When the service is down the
  // example button must be prominent, not hidden. It loads example.json and
  // marks the session as the worked example, so the plan screen shows
  // notice.example. This is the only caller of loadExample.
  ```

  For `Practice.svelte:52-54`, say that `submitAnswer` sets the flag and that
  the effect watches the answer text rather than the flag so the strip is not
  cleared the instant it appears. For `session.svelte.js:73`, change "will
  bind" to "binds".
- **Priority**: 3 — **Confidence**: 0.8.

### P3-3. Two comment defects inside the new hunks

- **File / lines**: `src/lib/Practice.svelte:104-114` (`skip()`),
  `src/lib/fixture.js:1-3`.
- **Spec vs code**: R6 asks for short sentences and active voice, and Section
  11.10 records the house limit in force, "The longest sentence in the deck is
  24 words."
  - `skip()` merges the P2-4 and P2-5 fixes and the comment ends up above the
    wrong statement. The four-line comment explains why a scored question must
    not be flagged, and it is placed directly above `abandonScoring()`, which
    it does not describe. `abandonScoring()` is the P2-5 fix and gets no
    comment here at all, while the identical call in `finishEarly()` at
    `:118-119` does get one. A reader meets "A question that already carries a
    score is not blocked" immediately above an abort call.
  - `fixture.js:1-3`'s rewritten opening sentence is 26 words. It is a
    sentence this remediation authored, in the file P3-1 and P3-3 were both
    about, and it is over the limit the remediation was measuring against.
- **Measured**: comment sentences over 25 words across the six changed source
  files, counted by script and checked by hand where the splitter merges a
  sentence ending in `.` with one starting on a lowercase identifier. All five
  sentences round 1 named — 50, 41, 33, 33 and 32 words — are split and every
  replacement is under 25. Every added comment line in the diff contains zero
  semicolons and zero em dashes. The two sites above are the only new-prose
  residue. Every other over-limit sentence in these files is byte-identical to
  HEAD.
- **Why it is a defect**: the misplaced comment attaches the reasoning for one
  fix to the line belonging to another, in the function that carries two of
  the five behavioural fixes in this patch. The 26-word sentence is small, and
  it is filed because it is new prose over the limit and every P3 is to be
  fixed.
- **Fix**: move the comment onto the line it explains and give
  `abandonScoring()` its own, matching `finishEarly()`:

  ```js
  function skip() {
    blocked = null;
    // A score call for this question may still be in flight. Retire it here
    // so session.scoring cannot outlive the question it describes.
    abandonScoring();
    const question = session.questions[session.current];
    // A question that already carries a score is not blocked, so it cannot be
    // the reason Skip was pressed. Marking it skipped would contradict the
    // stored score and make the session unsavable (T30's persisted-question
    // rule), so only an unscored question gets the flag.
    if (!question.scores) question.skipped = true;
    advance();
  }
  ```

  For `fixture.js`, split the opening sentence: "Function-down path stand-in
  (task.md T16). The See the example button renders src/lib/example.json
  instead of calling the analyse function, so the demo still works with no
  server." That is 5 words and 22 words.
- **Priority**: 3 — **Confidence**: 0.7.

## Round 1 closures, verified independently

Each verified from the code and from the running build, not from the
remediation's account.

| Round 1 finding | Status | Evidence |
|---|---|---|
| **P1-1** failed score wedges the interview | **CLOSED** | Score service answers 503. Answer Q1, press `Next question`: `current: 0`, `scoreFailed: true`, strip `We could not read that answer. Your answer is saved. Try again, or move on.`, one score call. Press again unchanged: `current: 1`, `Question 2 of 8`, strip cleared, answer intact at 103 characters, **still one score call** — the bypass took the branch, not the network. Edit the answer and press again: score calls go 3 → 4, the retry really happens, and a failing retry leaves the person on the question. |
| **P2-1** over-long pasted CV blocks the product | **PARTIAL** | Truncation works: 20,001-character CV, request carries `resumeChars: 20000`, no 413, no `err.service_down`, plan screen reached. The strip half never renders. Filed as **P2-2** above. |
| **P2-2** plan screen's only primary does nothing | **CLOSED** | Rolled-back plan, `phase: ready`, `current: 1`, Q1 scored. Tap `Start practice`: `phase: interviewing`, `current: 1`, `Question 2 of 8`, score intact, `session.error` cleared. Two presses in round 1 did nothing; one press now works. Residual agent-side half filed as **P3-1**. |
| **P2-3** worked example diverges human and agent | **CLOSED, with a new hole** | Agent `start_interview` on the example plan now returns Q1 and moves the phase, matching the human tap exactly. The exemption is too wide. Filed as **P2-1** above. |
| **P2-4** skipping a scored question deletes the saved session | **CLOSED** | Tips screen, `Try again`, `Skip this one` on the scored Q1. `skipped` stays `false`, `scores` intact, `localStorage['dry-run.session.v1']` is 2,673 bytes before and 2,673 bytes after. Reload restores `phase: interviewing`, `current: 1`, Q1 answer and score, Q2 draft, box value. `get_verdict` counts it: `answered: 2`, `average: 4`, `capped: true`. Tips shows the answer under `What you said` and never shows `You skipped this one.` for it. |
| **P2-5** skip during a score leaves the primary busy and dead | **CLOSED** | Score held open 3,000 ms. During: `scoring: true`, primary `aria-busy="true"` reading `Reading your answer`. Press `Skip this one`: `scoring: false` immediately, primary reverts to `Next question`. The Q2 press then scored and advanced **158 ms** after the skip, against round 1's 1,815 ms dead. The abandoned request lands later and attaches nothing: `q1.scores` stays `null`. `finishEarly()` mid-score: `phase: done`, `scoring: false`, tips render, and the late response changes nothing. |
| **P3-1** comments over the house sentence limit | **CLOSED, small residue** | All five named sentences split, every replacement under 25 words, zero semicolons and zero em dashes in every added comment line. Two residual sites filed as **P3-3**. |
| **P3-2** `.claude/` untracked and unignored | **CLOSED** | `.gitignore` line 4 is `.claude/`. `git check-ignore -v .claude/launch.json` returns `.gitignore:4:.claude/`. `git status --porcelain` no longer lists it. The directory is still on disk with its one file. |
| **P3-3** comments deferring to landed tasks | **PARTIAL** | The three named sites and the four extra `session.svelte.js` field comments are all rewritten and all accurate. Three more remain. Filed as **P3-2** above. |

## `abandonScoring()`, the new export

Checked because a new export on the capability layer is part of the parity
surface.

- **Does an agent need it?** No. No registered tool can leave a question with a
  score in flight. `start_interview` (`session.svelte.js:499`), `set_posting`
  (via `beginBriefRequest` at `:230`) and `set_resume` (`:430`) each call
  `supersedeActiveScoreRequest()` themselves. `submit_answer` refuses while
  `session.scoring` is true (`:564-566`). `get_brief` and `get_verdict` are
  reads. Its absence from the tool set is **not** a divergence. The doc comment
  at `:259-265` says exactly this and it checks out.
- **Called with nothing in flight?** Harmless, measured. Two consecutive
  `Skip this one` presses on unscored questions with no request pending:
  `current` 2 → 4, `scoring` stays `false`, both questions flagged `skipped`,
  and the next `Next question` press scored and advanced normally.
  `supersedeActiveScoreRequest()` aborts a null controller safely, bumps a
  generation nothing is holding, and writes `false` over `false`.
- **Ordering in `skip()`** is right: the abort runs before `question.scores` is
  read, so an in-flight request cannot attach a score between the read and the
  flag. Verified — the abandoned request landed 3.5 s later and `q1.scores`
  was still `null`.

## `fixture.js`, the unannounced change

Fourteen lines, **all of them comment**. `git diff` shows no change to any
statement in `loadExample()`. The remediation does describe it, under P3-3; the
task brief's note that the summary never mentions it does not match the
document.

The rewrite is a correction, not a behaviour change. The old header claimed
"T32 wires the real analyse call in here", which was false: T32 wired it into
`Start.svelte`'s `setPosting` call. The new header says the `See the example`
button is the only caller and that the real `Start practice` button never
reaches this file. Both claims verified: `grep -rn loadExample src/` returns
exactly two sites, the import at `Start.svelte:16` and the call at
`Start.svelte:61`.

**States 10 and 11 stay distinct.** They are carried by two separate flags with
two separate treatments, and nothing in this remediation merged them. State 10
is `session.serviceDown`, rendered on the Start screen at `Start.svelte:131-135`
as `err.service_down` plus the prominent example button at `:149-156`. State 11
is `session.isExample`, rendered on the plan screen at `Plan.svelte:44-48` as
`notice.example`. `seeExample()` moves the session from one to the other by
setting `isExample` and clearing `serviceDown`. Measured on the running build:
service down gives `phase: idle` with the stop strip and both buttons; tapping
`See the example` gives `phase: ready`, `isExample: true`, `serviceDown: false`,
three pre-scored questions and the note strip at the top of the plan. The only
defect touching this pair is P2-1 above, which is about what happens after the
example interview starts.

## The two forced checks, re-run

**Display parity, both directions — PASS.** Re-measured on the current build,
not carried forward.

| Control | State to control | Control to state |
|---|---|---|
| Advert box (`Start.svelte:99-103`) | External write of the 326-character posting fills the box. `boxChars: 326`, `storedChars: 326`, strings equal, no placeholder showing. | Typing writes `session.posting` verbatim. |
| Advert box, agent route | `set_posting` answered 503: `phase: idle`, box holds all 326 characters, `boxMatchesStore: true`. The historical bug does not reproduce. | n/a |
| CV paste box (`Start.svelte:118`) | External write of 20,001 characters fills the box. `cvBox: 20001`, `stored: 20001`, strings equal. Checked because `startPractice()` is a new writer of `session.resume`. | Typing writes `session.resume` verbatim. |
| Answer box (`Practice.svelte:159-165`) | `submit_answer` mid-flight: the box reads the 88-character transcript verbatim while `scoring: true`, and the primary carries `aria-busy="true"` with the label `Reading your answer`. | Typing writes `session.questions[current].answer`. |

**Mid-interview reload — PASS.** Driven live, not read from the persistence
code, and run after the P2-4 change because it touches what gets written.

- Before reload: `phase: interviewing`, `current: 1`, Q1 answered (80
  characters) and scored, Q2 carrying a 76-character draft, `Skip this one`
  already pressed on the scored Q1, stored record 2,673 bytes.
- After `Page.reload`: `phase: interviewing`, `current: 1`, `questions: 8`, Q1
  answer and scores restored, Q2 draft restored at 76 characters, answer box
  showing 76 characters, screen reading `Question 2 of 8`.
- A second reload path was measured through the P1-1 branch: a question
  answered but never scored, advanced past by the second press, persists and
  restores as a 2,484-byte record and renders on the tips screen under
  `What you said`.

## Section 13 accessibility gate

Re-run because `Start.svelte` and `Practice.svelte` both grew.
`documentElement.scrollWidth` against `clientWidth`, plus the rightmost
laid-out box on the page, real brief content on the plan, practice and tips
screens.

| Screen state | 180 x 600 | 360 x 800 | `h1` |
|---|---|---|---|
| Start, idle | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Start, CV paste panel open | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Start, service down with the example button | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Plan, state 11 worked example | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Practice, example Q1 with feedback note | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 0, T15 waiver |
| Getting ready | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Plan, real brief with fit lists and gap items | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Practice, Q1 empty | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 0, T15 waiver |
| Practice, empty-answer block strip | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 0, T15 waiver |
| Practice, long-answer block strip at 6,100 characters | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 0, T15 waiver |
| Practice, score-failed strip | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 0, T15 waiver |
| Practice, scored with feedback note | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 0, T15 waiver |
| Tips, result panel | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Tips, every `<details>` open | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |
| Tips, state 22 empty block | 165 / 165, overflow 0 | 345 / 345, overflow 0 | 1 |

Thirty measurements, zero overflow. The 165 and 345 figures are the viewport
less the headless scrollbar; what matters is that `scrollWidth` equals
`clientWidth` in all thirty. The widest laid-out element never exceeds the
client width on any screen. The P2-2 fix's strip was also measured on the
patched build and holds at both widths.

**Blocking messages still take focus.** Checked because P1-1 moved the `blocked`
assignment behind an `await`. After a blocked empty answer,
`document.activeElement` is the strip reading `Type your answer first, or skip
this question.`, class `strip strip-stop`, `role="alert"`. After a blocked
6,001-character answer, focus is on the strip reading `That answer is very long.
Shorten it to the part you would actually say out loud.` The two strips are
still mutually exclusive, and exactly 6,000 characters still advances.

## Checks that pass

- **Zero inline user-visible strings.** The only markup added anywhere in the
  diff is `<MessageStrip kind="almost" role="status" message={cvWarning} />`,
  and `cvWarning` is `copy.warn.cv_long`. Every other added line is an import,
  a comment, a control-flow statement or a `copy.*` reference. `copy.js` is
  untouched.
- **Banned copy, Section 3.2.** Every rendered string was swept across
  thirteen screen states, including `aria-label`, `title`, `placeholder`, `alt`
  and `document.title`, against the full word ban. One hit, `axes`, and it is
  inside `example.json`'s `modelAnswer` prose, in a plain-English use ("triage
  on two axes"). `example.json` is untouched by T32 and by this remediation.
  Not a finding for this task; noted below.
- **House prose in new comments.** Zero semicolons, zero em dashes and zero
  en dashes across every added comment line in the diff. Every new sentence is
  under 25 words except the one filed at P3-3.
- **Scope.** `git diff --stat` shows exactly the eight files the remediation
  claims. `netlify/functions/analyze.mts`, the prompts, `webmcp.js`,
  `shapes.js`, `copy.js`, `example.json` and `App.svelte` are untouched.
  `git diff --check` is clean.
- **Suite and build.** `npm test` is 57 passed, 0 failed. `npm run build`
  succeeds with only the pre-existing chunk-size advisory,
  `index-D6d__1sk.js` at 540.51 kB.
- **The three new tests do test something.** `T32 P2-4` asserts both
  directions of the persistence invariant, including that the pre-fix shape
  removes the stored key. `T32 P2-5` asserts the abort signal fires, the busy
  flag clears, and the late response returns `superseded` without attaching a
  score. `T32 P2-3` asserts the guard is not weakened for a real session, and
  its second half is the one that hides P2-1 above.
- **Happy path, end to end, no agent.** Paste an advert, `Start practice`,
  brief call, plan screen with eight cards, `Start practice`, answer Q1, score,
  advance, answer Q2, `Finish and show my tips`, tips screen with the capped
  result panel reading `You answered 2 of the 8 questions.` Every transition
  measured.
- **Happy path, end to end, agent only.** All six tools registered.
  `set_posting`, `start_interview`, `submit_answer` and `get_verdict` all
  return the expected payloads, and `get_verdict` returns the same numbers the
  tips screen renders.
- **P1-1's promise is kept to the end.** The copy says "Your answer is saved."
  Measured through to the tips screen: the failed-then-advanced answer appears
  verbatim under `What you said`, with no score disclosure and no
  `You skipped this one.` strip. `Tips.svelte:110-136` renders exactly that
  shape. Round 1's stated harm is gone.
- **No double-submit race on the async `next()`.** `submitAnswer` sets
  `session.scoring = true` at `session.svelte.js:581`, before its first
  `await`, so the flag is up in the same task as the click. A second press in a
  later task returns at `Practice.svelte:77`, and `submitAnswer` has its own
  guard at `:564-566` behind that.

## Observations, not findings

- `Practice.svelte:26` still derives `answerTooLong` from the raw length while
  `submitAnswer` checks the trimmed length. Carried forward from round 1,
  unchanged, and nothing visible breaks.
- `Practice.svelte:126` still bounds `advance()` with `TOTAL_QUESTIONS - 1`
  while `submitAnswer` uses `session.questions.length - 1`. Carried forward.
- The `axes` filter at `Tips.svelte:26-35` is still weaker than
  `getVerdict()`'s: it omits the non-empty-answer check and
  `validateScoreResponse`. The comment above it now claims agreement with
  `getVerdict()` in stronger terms than the code delivers. No shipped path
  separates them, so it stays an observation, but the comment is now the part
  that overstates.
- Pressing `Skip this one` while a score is in flight leaves the question with
  the typed answer and `skipped: true`, so the tips screen shows
  `You skipped this one. Try it next time.` over an answer the person did type.
  This is pre-existing skip behaviour, not new, and the person chose it.
- `example.json`'s `modelAnswer` for q1 contains the word "axes". Section 3.2
  bans it as product copy. It is fixture data, it predates T32, and it is out
  of this task's diff.
- `loadExample()` still never sets `session.posting`, so the worked example is
  never persistable. That is correct and worth knowing when reading the P2-1
  measurements: the example session leaves no stored record either way.

## Unverified

- **No deployment was made.** `netlify deploy --build` publishes to a
  reachable URL, and the authorisation for it reached me from another agent
  rather than from the user, so I did not run it. `--prod` was never
  considered.
- **The measurements do not rest on reading code branches, though.** Every
  finding above was driven against the production `dist/` build over real HTTP,
  with `/api/analyze` answered by a reviewer-only Node server replaying the
  function's own response bodies verbatim: the 503 `provider_unavailable` from
  `analyze.mts:234` and the 413 limit branch from `:141`. `window.fetch` was
  never patched. Neither replayed branch involves the model.
- **The local Netlify function is still unreachable on this machine.**
  `vite dev` fails to start the edge-functions dev server with
  `unexpected argument '--allow-scripts'`. Environment fault, not a defect.
- **Live ChatGPT.** `document.modelContext` was stubbed at document start to
  capture the six registered tools and drive their own `execute` handlers, the
  same handlers `main.js:9` registers. That is not the in-app browser. T33
  owns that.
- **The file-picker and print/PDF routes** were not re-exercised. Untouched by
  this remediation. The one test in the suite that drives the file picker
  (`test/file-chooser-browser.test.mjs`) passes in the repository; it fails in
  a copied tree with a symlinked `node_modules`, which is a harness artifact
  and reproduces identically with and without the proposed fixes.
- **Fonts.** The headless browser may have used fallback faces. Every
  measurement here is text or geometry driven by fixed widths.

## Evidence

- Headless Chrome 152 over the DevTools protocol, against the production
  `dist/` build served over HTTP with a reviewer-only `/api/analyze`. Sixteen
  measurement scripts, all in the reviewer scratchpad, none written into the
  repository.
- Zoom gate: fifteen screen states at 180 x 600 and 360 x 800, `scrollWidth`
  equal to `clientWidth` in all thirty.
- P1-1: two presses, one score call, `current` 0 → 1; edited answer, score
  calls 3 → 4.
- P2-1 (round 2): `start_interview` accepted at `Question 3 of 8` with a real
  score in place, and again on the tips screen.
- P2-2 (round 2): zero `warn.cv_long` appearances across three runs and two
  observation methods; 5,000 characters of a 25,000-character CV removed with
  no message.
- P2-4: stored record 2,673 bytes before and after the skip; reload restores
  everything.
- P2-5: primary usable 158 ms after the skip, against 1,815 ms in round 1.
- Proposed fixes for P2-1 and P2-2 built and driven on a scratch copy of the
  tree; `node --test test/session-capabilities.test.mjs` 19 passed, 0 failed
  with both applied.

No application code was modified, no commit was created, and the working tree
is byte-identical to the state this review started from.
