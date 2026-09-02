# T32 review, round 1

Date: 2026-09-02
Reviewer: ReviewT32
Target: T32 (Dry Run) — wire the interface to real state, keep the fixture only as the function-down path. Four files changed: `src/lib/Start.svelte`, `src/lib/Plan.svelte`, `src/lib/Practice.svelte`, `src/lib/Tips.svelte`. Binding spec: `dev-diary/design.md` Revision 2, `dev-diary/task.md` T32, and the parity rules in `dev-diary/project.md`.

## Verdict

**NOT APPROVED — P1 x 1, P2 x 5, P3 x 3.**

The write half is wired and it works on the happy path. Every failure path that T32 newly made reachable is broken. A failed score call is the failure this product will actually hit in front of a judge. It now wedges the interview, against the Section 10 table.

## Findings by severity

### P1-1. A failed score call blocks the interview, and Section 10 state 12 says it must not

- **File / lines**: defect at `src/lib/Practice.svelte:74-90` (`next()`). Fix site is the same function. Related: `src/lib/Practice.svelte:108-115` (`advance()`), `src/lib/Practice.svelte:55-66` (the `failedAnswer` latch that already tracks exactly what the fix needs).
- **Spec vs code**: Section 10 row 12 reads `Scoring failed | Score call fails after retries | --almost strip under the answer box, answer kept | err.score_failed | Blocks? No`. Section 11.9 gives that row the string `We could not read that answer. Your answer is saved. Try again, or move on.` The code returns from `next()` on every non-ok result and never calls `advance()`. Nothing moves on. Before T32 the same function validated locally and then always advanced, so this is a T32 regression, not an inherited one.
- **Measured** (production build, `vite preview`, headless Chrome 152 driven over CDP, `/api/analyze` answering the score task with the function's own 503 `provider_unavailable` body from `netlify/functions/analyze.mts:234`):

  | Action | `session.current` | `scoreFailed` | Strip shown |
  |---|---|---|---|
  | Answer Q1, press `Next question` | 0 | true | `We could not read that answer. Your answer is saved. Try again, or move on.` |
  | Press `Next question` again | 0 | true | same |
  | Press `Next question` a third time | 0 | true | same |

  The answer survives in the box on all three presses. `boxValue` equals the stored answer at 54 characters. The only control that moves the person forward is `Skip this one`. Skipping sets `skipped: true`, which drops the answer out of `getVerdict()`. The tips screen then shows `You skipped this one. Try it next time.` in its place. The person is told their answer is saved, then shown a screen saying they skipped.
- **Why it is a defect**: it fails the one column in the Section 10 table that says whether a state blocks. It fails it on the screen design 9.4 calls the screen the demo lives on. It also makes a shipped copy string false. If the score service is down for a session, the interview degrades to eight skipped questions and no result panel.
- **Fix** (verified in-browser: executing the branch by hand from the measured stuck state advanced to Q2 with the Q1 answer intact and the strip cleared):

```js
  async function next() {
    // State 20: a score call in flight — the primary is busy and nothing
    // advances until it settles.
    if (session.scoring) return;
    const answer = question?.answer ?? '';
    // Section 10 state 12 does not block. The score already failed for this
    // exact text, so a second press is the person choosing to move on.
    if (session.scoreFailed && failedAnswer === answer) {
      blocked = null;
      advance();
      return;
    }
    const result = await submitAnswer(answer);
    if (!result.ok) {
      if (result.error === copy.err.empty_answer) blocked = 'empty';
      else if (result.error === copy.err.answer_long) blocked = 'long';
      return;
    }
    blocked = null;
  }
```

  `failedAnswer` is already latched at `Practice.svelte:55-66` and already cleared when the text changes, so an edited answer re-submits rather than skipping the retry. Add a regression that presses Next twice against a failing score request and asserts `session.current` advances.
- **Priority**: 1 — **Confidence**: 0.95.

### P2-1. A pasted CV over the limit blocks the whole product and blames the service

- **File / lines**: defect at `src/lib/Start.svelte:32-39` (`startPractice()`) with `src/lib/Start.svelte:104-106` (the pasted-CV box, bound straight to `session.resume`). Fix sites: `src/lib/Start.svelte:32-39`, or `src/lib/session.svelte.js:376-410` (`setPosting`, which never validates the resume it sends).
- **Spec vs code**: Section 10 row 7 is `CV too long | Extracted text over 20,000 | --almost strip, first 20,000 kept | warn.cv_long | Blocks? No`. The note under the table is explicit: "States 4, 5, 6 and 7 never block the whole product. The CV is optional. A failed CV leaves the person exactly where they were, with the job advert still ready to submit." `setPosting` reads `session.resume` at `session.svelte.js:381` and sends it with no length check. `validateResume` exists at `session.svelte.js:101-110` and only `setResume` calls it. The file route truncates at `FileChooser.svelte:55`, the paste route does not.
- **Measured** (same harness, `/api/analyze` answering with the function's own 413 branch from `analyze.mts:141`):
  - Human pastes a 20,001-character CV, pastes a 545-character advert, presses `Start practice`. The outgoing request carries `postingChars: 545, resumeChars: 20001`. The response is 413.
  - Screen after: `phase: idle`, `serviceDown: true`, visible strip `We cannot build new questions right now. Try again in a minute.` No message mentions the CV. `session.error` holds `Resume exceeds the 20,000 character limit.` and no screen renders it (`Start.svelte:5-7` says so).
  - Pressing `Start practice` again reproduces it exactly. The CV stays at 20,001 characters. The only way out is deleting text the interface never named.
  - The agent path on the identical input returns `CV is 20,001 characters. The limit is 20,000. Paste the most relevant sections.` and leaves `phase: ready`, `serviceDown: false`. ChatGPT is told what is wrong. The person is not.
- **Why it is a defect**: it breaks the Section 10 note that the CV never blocks the product. It shows the wrong copy key for the state. It is also a parity break in the direction R2 protects. T32 created it. Before this change `startPractice()` called `loadExample()` and never sent `session.resume` anywhere.
- **Fix** (the human control must reach the same validation the agent does, and state 7 must be honoured on both CV routes):

```js
  function startPractice() {
    // T32: the real write path. A pasted CV takes the Section 10 state 7
    // treatment the file route already applies, so an over-long CV never
    // blocks the advert (Section 10 note on states 4 to 7).
    session.isExample = false;
    const resume = session.resume ?? '';
    if (resume.length > MAX_RESUME_CHARS) {
      session.resume = resume.slice(0, MAX_RESUME_CHARS);
      cvWarning = copy.warn.cv_long;
    }
    setPosting(session.posting);
  }
```

  with `MAX_RESUME_CHARS` imported from `session.svelte.js` and `cvWarning` rendered as an `--almost` strip in the CV block, matching `FileChooser.svelte`'s existing state-7 treatment. Truncation before the call is what `prepareUploadedResumeText` already does for files, so both routes then agree.
- **Priority**: 2 — **Confidence**: 0.9.

### P2-2. The plan screen's only primary button can do nothing, silently

- **File / lines**: defect at `src/lib/Plan.svelte:26-43` (`startPractice()` drops the result of `startInterview()`). Fix site: the same function. Guard at `src/lib/session.svelte.js:468-490`.
- **Spec vs code**: design 9.3 item 9 gives this screen one action bar with one primary, `Start practice`. R2 says "Every step has a button. A person tapping on a phone completes the whole product." `startInterview()` returns `inputError(...)` when the plan is not pristine. `Plan.svelte:42` calls it and discards the return. `session.error` is not rendered by any screen, so the refusal is invisible.
- **Measured** (agent adds a CV mid-interview and the brief call fails, which rolls the phase back through `restoreAfterResumeFailure` at `session.svelte.js:339-342` and `captureResumeRollbackProjection` at `:192-216`):
  - Before: `phase: interviewing`, `current: 1`, Q1 answered and scored.
  - `set_resume` returns `down provider_unavailable`. After: `phase: ready`, `current: 1`, Q1 answer and score intact, screen shows `h1: Your practice is ready`, action bar shows one button, `Start practice`. No strip of any kind is rendered.
  - Click `Start practice`: `phase` stays `ready`, `session.error` becomes `Start a new practice plan before starting another interview.` Nothing appears on screen. Click again: identical.
  - The person's interview is now unreachable by any control on the page.
- **Why it is a defect**: it is a dead primary on a screen that has exactly one, which R2 forbids. It is also a blocking condition with no message, which Section 13 forbids. That checklist item reads "Blocking messages are `role="alert"` and take focus when they appear". Every T32 caller that swapped a phase flip for a capability call has to handle the capability saying no. This one does not.
- **Fix**, verified in-browser. From the measured stuck state, running the fallback returned the person to Question 2. The Q1 answer and score were intact and the action bar read `Skip this one` / `Next question`.

```js
  function startPractice() {
    // A pristine plan starts through the shared capability, so a human and an
    // agent pass the same guard.
    if (startInterview().ok) return;
    // This plan already carries answers, from a restored session or from a CV
    // request that failed and rolled the phase back. Section 9.3 gives this
    // screen one primary and R2 requires it to work, so resume the interview
    // this plan is showing rather than restarting it.
    session.error = null;
    session.phase = 'interviewing';
  }
```

  This also subsumes the `session.isExample` branch, which is the same case. See P2-3 for the capability-side half.
- **Priority**: 2 — **Confidence**: 0.9.

### P2-3. The worked-example plan does one thing for a person and another for ChatGPT

- **File / lines**: defect at `src/lib/Plan.svelte:35-39` (the `session.isExample` branch). Fix site: `src/lib/session.svelte.js:475-484` (the pristine guard), then delete the branch.
- **Spec vs code**: the Section 10 note on state 10 says "The worked example in `example.json` is fully explorable." The capability layer's own header at `session.svelte.js:4-7` states the standard: "Both callers go through this file... So the page never tells a human and an agent different things." `project.md` applies the same rule to the file picker, which "extracts text and calls the same function. That is the same parity rule as everything else." The branch flips `session.phase` directly and never reaches `startInterview()`.
- **Measured** (service marked down, `See the example` pressed, so the screen is exactly state 11 with `isExample: true`, `phase: ready`, three pre-scored questions):

  | Caller, same screen, same moment | Result |
  |---|---|
  | Person taps `Start practice` | `phase: interviewing`, `current: 0`, Q1 renders with its canned answer and feedback note |
  | Agent calls `start_interview` | `Start a new practice plan before starting another interview.`, `phase` stays `ready` |

  The implementer's stated premise checks out. `isExample = true` is written at exactly one site, `Start.svelte:49`, and no tool reaches it. `restoreSession` forces it false at `session.svelte.js:740`. So an agent cannot fake the state. That is not the problem. The problem is that once a person creates the state, the two callers disagree on the same screen. Once a person starts the example interview the agent works normally again: `submit_answer` returned Q2 and advanced `current` to 1.
- **Why it is a defect**: state 10 is the demo insurance for the exact situation where ChatGPT is driving and the service is down. In that situation the judge's agent cannot start the example the judge can start by tapping. The evaluated pristine predicate on the live example state is `false` today and `true` under the fix, with `questions[0].id` of `q1` either way.
- **Fix** (put the exemption in the capability so both callers share it, then delete the UI branch):

```js
  // The worked example ships pre-scored, so it can never be pristine. No tool
  // writes session.isExample, so exempting it cannot weaken the guard for a
  // real session, and it keeps the example startable by both callers.
  if (!pristine && !session.isExample) {
    return inputError('Start a new practice plan before starting another interview.');
  }
```

  `Plan.svelte:26-43` then reduces to the P2-2 fix alone. The T28 reviewer reproduction at `test/session-capabilities.test.mjs:801-803` stays green, because `session.isExample` is false in that test after `reset(session)`.
- **Priority**: 2 — **Confidence**: 0.9.

### P2-4. Skipping a question that already carries a score deletes the whole saved session

- **File / lines**: defect at `src/lib/Practice.svelte:97-101` (`skip()`), reachable through `src/lib/Tips.svelte:37-43` (`tryAgain()`). Fix site: `src/lib/Practice.svelte:97-101`. Rule at `src/lib/session.svelte.js:684-693`.
- **Spec vs code**: T30 persists and restores a session. `validPersistedSession` rejects any question that has scores and `skipped === true` (`session.svelte.js:691`). `persistSession` treats an invalid snapshot as a reason to delete the stored record (`session.svelte.js:705-708`). `skip()` sets `skipped = true` unconditionally and never clears the score, so a human control produces the one question shape the session's own validator calls impossible.
- **Measured**:
  - Answer Q1 against a working score call. `localStorage['dry-run.session.v1']` present, 3,024 bytes. Reload restores `phase: interviewing`, `current: 1`, Q1 answer and score and model answer intact, Q2 draft answer intact, box value correct. Persistence works.
  - Reach the tips screen, press `Try again` (`phase: interviewing`, `current: 0`), press `Skip this one`. State becomes `skipped: true` with `scores` still set. `localStorage['dry-run.session.v1']` is now **absent**.
  - Reload: `phase: idle`, `questions: 0`, `posting` empty, screen is a blank Start. Everything is gone.
  - Isolated confirmation on a scored question: stored key present, set `skipped = true`, stored key gone, set `skipped = false`, stored key back.
  - The tips screen agrees the answer no longer exists. With the scored question marked skipped the result panel disappears and the empty block renders `You have not answered any questions yet.`
- **Why it is a defect**: it destroys work on reload. The Section 10 note on state 12 calls that the worst outcome this product can produce, "Losing what somebody typed is the worst thing this product can do". It is two taps from the tips screen. T32 made real scores reachable from the UI, so T32 made this state reachable.
- **Fix** (verified: the same state persists cleanly when the flag is not set on a scored question):

```js
  function skip() {
    blocked = null;
    const question = session.questions[session.current];
    // Skip is the way past a blocked Next. A question that already carries a
    // score is not blocked, and marking it skipped would contradict the stored
    // score and make the session unsavable (T30's persisted-question rule).
    if (!question.scores) question.skipped = true;
    advance();
  }
```

  Add a regression that scores a question, marks it skipped through the UI path, and asserts `persistSession()` returns true.
- **Priority**: 2 — **Confidence**: 0.95.

### P2-5. Skipping during a score call leaves the next question's primary busy and dead

- **File / lines**: defect at `src/lib/Practice.svelte:97-101` (`skip()`) and `src/lib/Practice.svelte:104-106` (`finishEarly()`), read at `src/lib/Practice.svelte:77` and `:196`. Fix sites: those two functions plus an export from `src/lib/session.svelte.js:253-258` (`supersedeActiveScoreRequest`).
- **Spec vs code**: Section 10 row 20 is `Reading the answer | Score call in flight | Primary button busy, spinner | busy.scoring | Blocks? Yes, briefly`. The busy state belongs to the answer being scored. `skip()` and `finishEarly()` move the person off that question without retiring the request, so `session.scoring` stays true and `next()` returns immediately at `Practice.svelte:77`.
- **Measured** (score request held open for 3,000 ms):
  - Press `Next question` on Q1, then `Skip this one` 250 ms later. `current: 1`, `scoring: true`, action bar reads `Skip this one` / `Reading your answer`.
  - Type an answer for Q2 and press `Next question`. Nothing happens. `current` stays 1, `q2scored` stays false. The control is dead for 1,815 ms in this run.
  - Clear the stale flag: the primary reverts to `Next question` immediately, the next press scores Q2 and advances. The abandoned Q1 request lands later and is correctly rejected by the generation guard, so `q1scored` stays false either way.
  - In production the window is not 1,815 ms. `project.md` documents a 10-second attempt timeout with up to two attempts.
- **Why it is a defect**: the primary on the demo screen says it is reading an answer nobody is waiting on. It refuses input while it says so. Section 10 scopes state 20 to a call in flight for the current answer. R3 asks that every coloured state carry a word, and the word here is wrong. T32 introduced it, because before this change no UI action started a real score.
- **Fix** (the capability layer owns the request stream, so it should own the abandonment):

```js
// session.svelte.js — the UI can leave a question before its score settles.
// Retiring the request is the layer's job, not the screen's.
export function abandonScoring() {
  supersedeActiveScoreRequest();
}
```

```js
  // Practice.svelte
  function skip() {
    blocked = null;
    abandonScoring();
    const question = session.questions[session.current];
    if (!question.scores) question.skipped = true;
    advance();
  }

  function finishEarly() {
    abandonScoring();
    session.phase = 'done';
  }
```

  `supersedeActiveScoreRequest()` already aborts the controller, bumps the generation and sets `session.scoring = false`, which is exactly the observed correct outcome.
- **Priority**: 2 — **Confidence**: 0.85.

### P3-1. New comments break the house sentence limit

- **File / lines**: `src/lib/Plan.svelte:27-34`, `src/lib/Practice.svelte:68-73`, `src/lib/Start.svelte:33-36`, `src/lib/Tips.svelte:15-17`.
- **Spec vs code**: R6 asks for short sentences and active voice. Section 11.10 records the house limit in force, "The longest sentence in the deck is 24 words."
- **Measured**: the added comments contain five sentences over 25 words, at 50, 41, 33, 33 and 32 words. Per file, longest comment sentence at HEAD against the working tree: `Plan.svelte` 16 to 41, `Practice.svelte` 37 to 50, `Start.svelte` 35 to 35, `Tips.svelte` 36 to 36. Two files set new maxima. No new semicolons. Em dashes appear in the new comments. They are already the settled style in every file in `src/lib`, so they are not counted against this patch.
- **Why it is a defect**: the two new maxima are the longest comment sentences in the codebase. The 50-word one at `Practice.svelte:69-72` explains the most delicate control flow in the patch. It is the sentence most worth splitting.
- **Fix**: split each of the five into two or three sentences. For the worst one:

```js
  // T32: go through the real capability. submitAnswer checks for an empty or
  // over-long answer before it touches the network, so a blocked answer costs
  // nothing. It then scores the transcript, stores the result on this
  // question, and advances the index or moves to 'done'. That is exactly what
  // an agent's submit_answer tool call does, and re-implementing it here would
  // be the drift the parity rule forbids.
```

- **Priority**: 3 — **Confidence**: 0.8.

### P3-2. `.claude/` is untracked, unignored, and would land in the T32 commit

- **File / lines**: `.claude/launch.json` (untracked). Fix site: `.gitignore`.
- **Spec vs code**: `.gitignore` lists `node_modules/`, `dist/`, `.netlify/`, `.env`, `.DS_Store`. It does not list `.claude/`, so `git status` shows `?? .claude/` and a `git add -A` at commit time sweeps it in.
- **Measured**: `git status --porcelain` reports four modified files and `?? .claude/`. The directory holds one file, a dev-server launch config naming `npm run dev` on port 5173. Nothing in the product reads it.
- **Why it is a defect**: it is one agent's harness configuration, not project source, and this repository is a submission a judge clones. `project.md` describes the stack as three ES modules plus one function, and tool scaffolding is not part of it. Leaving it untracked but unignored is the worst of the two options, because it will be committed by accident rather than by decision.
- **Fix**: add `.claude/` to `.gitignore`, and leave the directory in place on disk.

```
node_modules/
dist/
.netlify/
.claude/
.env
.DS_Store
```

- **Priority**: 3 — **Confidence**: 0.75.

### P3-3. Comments still defer to tasks that have landed

- **File / lines**: `src/lib/Tips.svelte:38-40`, `src/lib/Practice.svelte:192-195`, `src/lib/fixture.js:1-4`.
- **Spec vs code**: `task.md` marks T25 through T31 as this task's dependencies, and T32 is the task that consumes them. Three comments still describe them as future work.
  - `Tips.svelte:38-40` says "T25-T30 define the real semantics of a fresh attempt; for now this re-enters the practice screen with the existing answers and scores in place." T25 to T30 have landed. This is also the route that reaches P2-4, and the comment carries a semicolon.
  - `Practice.svelte:192-195` says "The real score call (T28) drives session.scoring; the flag is console-reachable." T28 drives it now, and the console caveat is a T19-era note.
  - `fixture.js:1-4` says "T25-T30 define the real state contract, and T32 wires the real analyse call in here." T32 wired it into `Start.svelte:38` instead, and `fixture.js` was not touched.
- **Measured**: `git diff --stat` shows `fixture.js` unchanged. `grep 'T25\|T28\|T30\|T32'` over `src/lib` returns these three deferrals plus the interface-block flag notes in `session.svelte.js:28-43`, which the same argument covers.
- **Why it is a defect**: T32 is the task whose whole content is that these deferrals are now resolved. A stale "for now" is how the next task inherits a workaround as though it were sanctioned. That is what the T19 P2-2 ruling was about.
- **Fix**: rewrite the three to describe what the code does now. The `Tips.svelte` one should say plainly that `Try again` re-enters the practice screen with the existing answers and scores in place. It should add that this does not go through the capability, so the reader knows why the screen and the guard differ.
- **Priority**: 3 — **Confidence**: 0.8.

## The two forced checks

**Display parity, both directions — PASS.** Measured on the production build.

| Control | State to control | Control to state |
|---|---|---|
| Advert box (`Start.svelte:86-90`) | External write of a 545-character posting fills the box. `boxChars: 545`, `storedChars: 545`, strings equal. No placeholder showing. | Typing writes `session.posting` verbatim. |
| Advert box, agent route | `set_posting` with the service down leaves `phase: idle` and the box holding all 545 characters, `boxMatchesStore: true`. The historical bug does not reproduce. | n/a |
| Answer box (`Practice.svelte:143-149`) | `submit_answer` mid-flight: the box reads the transcript verbatim while `scoring: true` and the primary carries `aria-busy="true"` with the label `Reading your answer`. | Typing writes `session.questions[current].answer`. |

**Mid-interview reload — PASS.** Not read from the persistence code. Driven live.

- Before reload: `phase: interviewing`, `current: 1`, Q1 answered and scored, Q2 carrying a 29-character draft, stored record 3,024 bytes.
- After `Page.reload`: `phase: interviewing`, `current: 1`, Q1 answer, scores and `modelAnswer` all restored, Q2 draft restored, posting restored at 545 characters, answer box showing the Q2 draft, question card showing Question 2 of 8 with its source quote.
- The one way to lose it is P2-4.

## Section 13 accessibility gate

Run because T32 touched every screen. `documentElement.scrollWidth` against `clientWidth`, every screen, real `example.json` content on the plan, practice and tips screens.

| Screen | 180 x 600 (200% zoom at 360px) | 360 x 800 | `h1` |
|---|---|---|---|
| Start | 180 / 180, overflow 0 | 360 / 360, overflow 0 | 1 |
| Start, state 10 with the example button | 180 / 180, overflow 0 | 360 / 360, overflow 0 | 1 |
| Getting ready | 180 / 180, overflow 0 | 360 / 360, overflow 0 | 0, T19 waiver |
| Your practice, state 11 | 180 / 180, overflow 0 | 360 / 360, overflow 0 | 1 |
| Practice | 180 / 180, overflow 0 | 360 / 360, overflow 0 | 0, T15 waiver |
| Your tips | 180 / 180, overflow 0 | 360 / 360, overflow 0 | 1 |
| Your tips, every `<details>` open | 180 / 180, overflow 0 | 360 / 360, overflow 0 | 1 |

The rightmost laid-out box sits at 172px inside a 180px viewport on every screen. The T19 P2-1 overflow does not reproduce. The `@media (max-width: 260px)` treatments in `ScoreRow`, `ResultPanel` and `Tips` are holding.

Blocking messages still take focus. After a blocked empty answer, `document.activeElement` is the strip reading `Type your answer first, or skip this question.` The empty and long strips remain mutually exclusive.

## Rulings on the six disclosures

1. **`Plan.svelte:35` bypasses the capability layer.** The premise holds and the conclusion does not. No agent tool writes `session.isExample`, verified by reading all sixteen sites. The branch still diverges the two callers on the same screen. Filed as **P2-3**, with the fix moved into the capability.
2. **`setResume()` is unreachable from any human control.** Confirmed and **not a finding**. A person adds a CV on the Start screen, where `FileChooser.svelte:69` and `Start.svelte:105` write `session.resume` and `setPosting` sends it. Design 9.1 puts the CV block on Start, and 9.3 gives the plan screen no CV control, so no screen state is missing a button. R2 asks that a person complete the whole product, not that every ordering be available. The real problem with that route is that it skips `validateResume`, filed as **P2-1**.
3. **`getBrief()` is never called from the UI.** **Not a finding.** It returns `session.brief` by identity, asserted at `test/session-capabilities.test.mjs:104`. `Plan.svelte:69-77` reads `session.brief` directly, which is what R1 requires. No divergence is reachable.
4. **Three controls bypass the capability layer.** Each really has no agent equivalent, confirmed against the six registered tools. `Finish and show my tips` is clean: it produces `phase: done` with partial answers, which `validPersistedSession` accepts and `getVerdict` reports honestly as a capped `not yet` at 1 of 8. `Skip this one` is not clean, twice over, filed as **P2-4** and **P2-5**. `Try again` is the route into P2-4 and carries a stale deferral, filed as **P3-3**.
5. **The `buildVerdict` bug is fixed.** Confirmed. Take a session with one skipped-but-scored question at 5 across, and one live question at 1 across. The old expression counts 2 answered and the new one counts 1. The rendered panel reads `You answered 1 of 8 questions. Your answers averaged 1 out of 5.` The axis rows read 1, matching. Top-line and per-axis numbers now agree with `getVerdict()`.
6. **No component tests were added.** **Acceptable, not a finding.** The project has no DOM harness and adding one is not T32's scope. It is not free, though. Five of the six defects above are behavioural and none of them are catchable by the current suite. The remediation for P1-1 and P2-4 should carry capability-level regressions, which the existing Vite-SSR harness can express without a DOM.

## Checks that pass

- **Zero inline strings.** The diff adds no user-visible text. Every added line is an import, a comment, a control-flow statement or a `copy.*` reference. `copy.js` is untouched.
- **Banned copy, 3.2.** Nothing rendered changed, so nothing new can breach the list. Every string measured on screen during this pass is a Section 11 deck key.
- **Scope.** `git diff --stat` shows exactly the four files T32 claims, 58 insertions and 36 deletions. `session.svelte.js`, `webmcp.js`, `shapes.js`, `copy.js`, `fixture.js` and the tests are untouched.
- **Suite and build.** `npm test` is 54 passed, 0 failed. `npm run build` succeeds with only the pre-existing chunk-size advisory, `index-wOLLxZL-.js` at 540.18 kB.
- **Happy path, end to end, no agent.** Paste an advert, `Start practice`, brief call, plan screen with eight cards, `Start practice`, answer Q1, score, advance, skip twice, `Finish and show my tips`, tips screen with the capped result panel. Every transition measured, `phase` and `current` correct at each step.
- **Happy path, end to end, agent only.** `set_posting` returns "Stored the posting, 545 characters. The page is now ready." `start_interview` returns Q1 as JSON. `submit_answer` scores and returns Q2. `get_verdict` returns the same numbers the tips screen renders.
- **State 20 busy treatment.** The primary carries `aria-busy="true"` and the label `Reading your answer` while a real score is in flight, and `next()` refuses to re-enter. P2-5 is about the state outliving the question, not about the state itself.

## Observations, not findings

- `Practice.svelte:26` derives `answerTooLong` from the raw length while `submitAnswer` checks the trimmed length. An answer of exactly 6,000 characters plus trailing whitespace is now accepted where T19 blocked it. The block and its clearing stay consistent in both directions, so nothing visible breaks. Worth one line of comment if the remediation touches this function anyway.
- `Practice.svelte:110` still bounds `advance()` with `TOTAL_QUESTIONS - 1` while `submitAnswer` uses `session.questions.length - 1`. Both validators force exactly eight questions, so the two agree today. `session.questions.length - 1` would make that independent of the constant.
- The `axes` filter at `Tips.svelte:29-31` is weaker than `getVerdict()`'s. It omits the answer check and `validateScoreResponse`, so the comment above it overstates the agreement. No shipped path produces a question that separates them.
- `loadExample()` never sets `session.posting`, so the worked example is never persisted and loading it clears any stored record. That is correct behaviour and worth knowing when reading P2-4's measurements.

## Unverified

- **No deployment was made.** `netlify deploy --build` is a publishing action and this review had no user authorisation for one, so the findings rest on the production build served locally. Both server responses used here are taken verbatim from the branches in `netlify/functions/analyze.mts`: the 413 at `:141` and the 503 at `:234`. Neither branch involves the model.
- **The local function is unreachable on this machine**, for a reason unrelated to the AI Gateway. `vite dev` fails to start the Netlify edge-functions dev server with `unexpected argument '--allow-scripts'`, and `/api/analyze` returns no response at all. This is an environment fault, not a defect in the patch.
- **Live ChatGPT.** `document.modelContext` was stubbed at document start to capture the six registered tools and drive their `execute` handlers. That exercises the same handlers `main.js:9` registers, but it is not the in-app browser. T33 owns that.
- **Print stylesheet, PDF and file-picker routes.** Untouched by T32 and not re-exercised.
- **Fonts.** The headless browser may have used fallback faces. Every measurement here is text or geometry driven by fixed widths, so this does not move the numbers.

## Evidence

- Headless Chrome 152 over the DevTools protocol, against `vite preview` serving `dist/`. Nine measurement scripts, all reviewer-only, none written into the repository.
- Zoom gate: seven screen states at 180 x 600 and 360 x 800, `scrollWidth` equal to `clientWidth` in all fourteen.
- Parity: 545 characters in and out of the advert box in both directions, transcript verbatim in the answer box while `scoring` is true.
- Reload: 3,024-byte record restored with `phase`, `current`, answers, scores and model answer intact.
- P1-1: three presses, `current` stays 0.
- P2-1: `resumeChars: 20001` sent, 413 returned, `err.service_down` shown, identical on retry.
- P2-2: two clicks, `phase` stays `ready`, `session.error` set and never rendered.
- P2-4: stored key present, then absent, then present again as `skipped` is toggled on a scored question. Reload after the toggle lands on a blank Start with zero questions.
- P2-5: `Next question` dead for 1,815 ms behind a stale `Reading your answer`.

No application code was modified and no commit was created by this review.
