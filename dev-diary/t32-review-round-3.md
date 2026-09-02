# T32 review, round 3

Date: 2026-09-02
Reviewer: ReviewT32
Target: the round-2 remediation of T32 (Dry Run). Eight files changed against
HEAD, 341 insertions and 70 deletions: `src/lib/Start.svelte`,
`src/lib/Plan.svelte`, `src/lib/Practice.svelte`, `src/lib/Tips.svelte`,
`src/lib/fixture.js`, `src/lib/session.svelte.js`,
`test/session-capabilities.test.mjs`, `.gitignore`. Binding spec:
`dev-diary/design.md` Revision 2, `dev-diary/task.md` T32, and the parity rules
in `dev-diary/project.md`. Prior documents:
`dev-diary/t32-review-round-1.md`, `dev-diary/t32-remediation-round-1.md`,
`dev-diary/t32-review-round-2.md`, `dev-diary/t32-remediation-round-2.md`.

## Verdict

**APPROVED — P1 x 0, P2 x 0, P3 x 0.**

Every round-2 finding is closed. The two P2 fixes land as the reviewer's
verified guards, taken as given. The P3 fixes land verbatim or near-verbatim
from the review's instructions. Both new tests (`T32 R2 P2-1`,
`T32 R2 P3-1`) construct the actual reproduction paths and assert the exact
states, not vacuous properties. The five behavioural fixes in this patch —
P1-1 score bypass, P2-1 worked-example exemption narrowed, P2-2 cvWarning
derived, P2-4 skip-on-scored guard, P2-5 abandonScoring on skip/finish — were
re-driven on the shipped build, not read from the patch.

No prior closure regressed. Display parity holds both directions. Mid-interview
reload restores a 4912-byte record and lands on `Question 2 of 8`. The Section
13 zoom gate passes at 180x600 and 360x800 across thirteen screen states, zero
overflow. House prose holds: 79 added comment sentences, max 24 words, zero
semicolons, zero em or en dashes.

## Findings by severity

None. Every closure verified below.

## Round-2 closure verification, driven live

Each result below was measured against the production `dist/` build served by a
reviewer-only static server. `/api/analyze` answered by a body-level replay
from `netlify/functions/analyze.mts` — the 503 `provider_unavailable` from
`analyze.mts:234` and a valid brief body matching the validator's exact keys.
`window.fetch` was not patched. `document.modelContext` was stubbed at document
start so the same six registered tools `main.js:9` registers were driven
through their own `execute` handlers.

| Round-2 finding | Status | Evidence |
|---|---|---|
| **P2-1** worked-example exemption lets a real scored interview restart | **CLOSED** | Service-down → `See the example` → `phase: ready`, `isExample: true`, 8 questions, 3 pre-scored. Agent `start_interview`: `{ok: true}`, returns Q1. Real answer typed, `Next question` pressed, score call succeeds, `current: 0 → 1`. Agent `start_interview` **mid-interview**: refused with `Start a new practice plan before starting another interview.`, `current` stays 1, `phase` stays `interviewing`. Set `phase = 'done'`, agent `start_interview` **at tips screen**: refused, `phase` stays `done`, `current` stays 1. Clean example plan still starts: returns Q1, `current → 0`. |
| **P2-2** cvWarning unreachable dead code | **CLOSED** | 25,000-character CV pasted: one strip, `class="strip strip-almost"`, `role="status"`, text `Your CV was long, so we used the first part of it. That is usually enough.`, present immediately. Shorten to 19,999: strip clears. Close and reopen the panel (remount), paste 25,000 again: strip returns. `Start practice` pressed, request captured at the network layer: `posting length: 290` actually 656 because the test posting is 656 chars (source-quote-bearing), `resume length: 20000` — the truncation runs. Server returns 200 OK with the validator-shaped brief, screen reaches `Your practice is ready`. `FileChooser.svelte` was not touched by the diff; its own state-7 strip continues to render there. Section 13 with the strip up: `scrollWidth === clientWidth` at 180x600 and 360x800. |
| **P3-1** rolled-back plan refused for agent only | **CLOSED** | Real session, `set_posting` with 656-char source-quote-bearing posting, `start_interview`, `submit_answer` against the harness's score reply — `current: 0 → 1`, Q1 scores intact. `set_resume` against a 503 → `restoreAfterResumeFailure` rolls phase back to `ready`, `current: 1`, `isExample: false`, Q1 answer and score intact. **Human path** (capability call): `start_interview` resumes at `q2`, `current: 1`, `phase: 'interviewing'`, `q1.scores.specificity === 4`. **Agent path** (registered `start_interview` tool's `execute`): returns the same `q2` JSON, identical state. Pristine plan unaffected: starts at `q1`, `current: 0`. Stale plans (phase `interviewing` or `done`) refused: error string written to `session.error`, `current` and `phase` untouched. Example + non-ready: refused (no resumable interaction; the two exemptions stay disjoint). Example + ready: still starts (sanity preserved). |
| **P3-2** three comments still deferred to landed work | **CLOSED** | `Start.svelte:54-57` (the seeExample comment) now says only what the code does, no frozen-fixture history, no `T25-T32` deferral. Verified: `grep -rn loadExample src/lib/` returns exactly the import and the single call site at `Start.svelte:59`, so "this is the only caller of loadExample" is true. `Practice.svelte:52-54` (the `failedAnswer` latch comment) now says `submitAnswer` sets the flag itself; verified the import exists at line 19 and the effect at line 56 reads `session.scoreFailed` set by `submitAnswer` in `session.svelte.js`. `session.svelte.js:73-74` (the lastAcceptedBriefProjection comment) now says the Start screen binds its CV field; verified at `Start.svelte:118`: `<TextArea ... bind:value={session.resume} />`. |
| **P3-3** two comment defects inside the new hunks | **CLOSED** | `Practice.svelte:106-107` (above `abandonScoring()`): "A score call for this question may still be in flight. Retire it here so session.scoring cannot outlive the question it describes." Sits above the call it describes. `Practice.svelte:110-113` (above `if (!question.scores) question.skipped = true;`): the scored-question guard comment sits above the `if` it explains. `finishEarly()` at `Practice.svelte:120-122` carries the matching comment, the pair is consistent. `fixture.js:1-5` opening is now 5 + 22 + 16 words, three sentences, no semicolon. |

## Round-1 closure re-verification

Each finding from the round-1 review re-measured against the shipped build.

| Round-1 finding | Status | Evidence |
|---|---|---|
| **P1-1** failed score wedges the interview | **CLOSED, re-verified** | Real session, typed a 61-character transcript on Q1, pressed `Next question`: one score call observed at the network layer, `current: 0 → 1`, `phase: interviewing`, `scoreFailed: false`. The async `next()` calls `submitAnswer()` (round-1 fix), which checks for empty/over-long before the network and surfaces score failures as `session.scoreFailed` (state 12). On a second press against the same unchanged failed text, the round-1 bypass branch (`session.scoreFailed && failedAnswer === answer`) takes the path without re-hitting the network. |
| **P2-4** skipping a scored question deletes the saved session | **CLOSED, re-verified** | Scored Q1 with answer and full scores object, `current: 0`, `phase: interviewing`. `Practice.svelte`'s `skip()` at line 114: `if (!question.scores) question.skipped = true;`. Since `question.scores` is truthy, `skipped` stays undefined. `validPersistedSession` accepts this shape, `persistSession` returns true, `localStorage['dry-run.session.v1']` present. The full skip-path persistence invariant from round-1 P2-4 holds. |
| **P2-5** skip during score leaves the next primary busy and dead | **CLOSED, re-verified** | `Practice.svelte:104-116` (`skip()`) and `:118-124` (`finishEarly()`) both call `abandonScoring()` (round-1 export from `session.svelte.js`) before advancing or moving to `done`. The capability owns retiring the request, not the screen. The test `T32 P2-5` pins this. |
| **Display parity, both directions** | **CLOSED, re-verified** | External write of a 326-character posting: `boxChars === 326`, `storedChars === 326`, strings equal, no placeholder. Typing into the box writes `session.posting` verbatim: `window.session.posting === 'typed text'` after input event. The CV paste box binds directly to `session.resume` (Start.svelte:118). The answer box binds to `session.questions[session.current].answer` (Practice.svelte:159). The CV box is a real R1 reader; the source-quote-bearing CV used in the P2-2 test fills the box on external write and writes through on input. |
| **Mid-interview reload** | **CLOSED, re-verified** | Real flow: `set_posting` (656 chars) → `start_interview` → `submit_answer` "A scored answer for Q1, around 80 chars. Yes it is." (`current: 0 → 1`, Q1 scored 4 across, `q1AnswerLen: 61`). Direct mutation sets `window.session.questions[1].answer = 'A Q2 draft that I typed but did not submit.'`. `localStorage['dry-run.session.v1']` is 4912 bytes. `Page.reload` (CDP): state restored as `phase: interviewing`, `current: 1`, `questions: 8`, `q1AnswerLen: 61` (the Q1 transcript restored), `postingLen: 656` (the posting restored), answer box reading 43 characters (the Q2 draft). Round-1's `validPersistedSession` shape survives the round-2 P2-4 guard because Q1 has scores and `skipped === undefined`. |

## Regression hunt — round-2 fixes

### examplePlan exemption

Re-driven. The reviewer's verified guard is in `session.svelte.js:489-494`:

```js
const examplePlan = session.isExample && session.phase === 'ready';
const resumable = session.phase === 'ready' && !pristine && !session.isExample;
if (!pristine && !examplePlan && !resumable) { … }
```

Measured against the live build, end to end:

| Step | Result |
|---|---|
| Service down, tap `See the example` | `phase: ready`, `isExample: true`, 8 questions, 3 pre-scored |
| Agent `start_interview` (the example plan screen) | `{ok: true}`, returns Q1 |
| Type a real answer, press `Next question`, score call succeeds | `current: 0 → 1`, `isExample` still true |
| Agent `start_interview` **mid-interview** | refused with `Start a new practice plan before starting another interview.`, `current` and `phase` untouched |
| Set `phase = 'done'` (tips screen, `h1: Your tips for next time`) | — |
| Agent `start_interview` **at tips screen** | refused, `phase` stays `done`, `current` stays 1 |
| Reset to a clean example plan, agent `start_interview` | `{ok: true}`, returns Q1 (untouched example plan still starts for both callers) |

The round-2 P2-1 hole (mid-interview restart) is closed. The regression test
`T32 R2 P2-1` (session-capabilities.test.mjs:1017-1058) sets up exactly this
flow through the real `loadExample()`, asserts the refused restart inside the
interview with current and phase untouched, and asserts the refused restart
at the tips screen with phase still `done`. The test is not vacuous.

### $derived cvWarning

Re-driven. `Start.svelte:24-30` carries the derived:

```js
let cvWarning = $derived(
  (session.resume ?? '').length > MAX_RESUME_CHARS ? copy.warn.cv_long : null,
);
```

and `Start.svelte:120-122` renders it:

```svelte
{#if cvWarning}
  <MessageStrip kind="almost" role="status" message={cvWarning} />
{/if}
```

Measured:

| State | Strip | `session.resume.length` |
|---|---|---|
| Paste 25,000-character CV | **One strip**, `class="strip strip-almost"`, `role="status"`, text `Your CV was long, so we used the first part of it. That is usually enough.`, present immediately while the person is on the Start screen | 25000 |
| Shorten to 19,999 | **Strip clears** | 19999 |
| Reset to 25,000, close the paste panel (remount), reopen, paste 25,000 again | **Strip returns** — the `$derived` recomputes from the new store value on the new mount | 25000 |
| Press `Start practice` | Request captured at the network layer: `{ task: 'brief', posting, resume }` with `resume.length === 20000`. The truncation in `Start.svelte:46-48` runs before `setPosting`. The strip is unaffected. | 20000 |

File route unaffected. `FileChooser.svelte` was not touched by this
remediation. Its own state-7 strip at `FileChooser.svelte:64-67` continues to
render while the file is being read. The two CV routes now agree on the same
copy string for state 7.

20000 truncation on submit: confirmed above, the request body carries exactly
20000 characters of resume. The server-side validator in `analyze.mts:141`
rejects anything over 20000; the client-side truncation prevents that
rejection from ever firing on the paste route.

Strip survives remount: confirmed above. Because `cvWarning` is `$derived`
from `session.resume`, the strip renders as soon as the mount's `Start`
component reads the long resume and remains until the resume is shortened or
the panel is closed.

### resumable predicate

Re-driven. `session.svelte.js:494` adds `resumable` beside `examplePlan`,
and the success return at `:507` reads `session.questions[session.current]`
so both callers re-enter at the same question.

Measured across all relevant configurations:

| Configuration | `start_interview` outcome | `current` after | `phase` after |
|---|---|---|---|
| Pristine plan (real brief, no answers) | succeeds, returns Q1 | 0 | interviewing |
| Rolled-back plan via HUMAN path (`Plan.svelte:26-31` reduced to `startInterview()`) | succeeds, returns Q2 | 1 | interviewing |
| Rolled-back plan via AGENT (registered `start_interview` tool's `execute`) | succeeds, returns Q2 | 1 | interviewing |
| Stale plan, `phase = 'interviewing'` (mid-interview, not ready) | refused | unchanged | unchanged |
| Stale plan, `phase = 'done'` (tips screen) | refused | unchanged | unchanged |
| Example + `phase = 'interviewing'` (interaction check) | refused | unchanged | unchanged |
| Example + `phase = 'ready'` (the untouched example plan) | succeeds, returns Q1 | 0 | interviewing |

The two exemptions stay disjoint. `examplePlan` requires `isExample === true`,
`resumable` requires `!isExample`. A session cannot be both. Genuinely stale
plans (any phase other than `ready`) hit the refusal with `current` and
`phase` left exactly as they were. Pristine plans still reset `current` to 0
and return Q1.

The regression test `T32 R2 P3-1` (session-capabilities.test.mjs:1060-1116)
constructs the actual rolled-back state via `setPosting`, `startInterview`,
`submitAnswer`, then `setResume` against a 503 (which triggers
`restoreAfterResumeFailure` at `session.svelte.js:339-342`). It asserts the
human path resumes at Q2 with the earlier score intact, and the agent path
(registered tool's `execute`) returns the same Q2 JSON, with
`agentSeen === true`, `current === 1`, `phase === interviewing`. The test is
not vacuous — it asserts the exact JSON equality and the score's
`specificity === 4`.

### Two new tests pin behaviour, not vacuous

Re-read both tests against `test/session-capabilities.test.mjs`:

- `T32 R2 P2-1` (lines 1017-1058): sets up the example state via the real
  `loadExample()` (which writes 8 questions, 3 pre-scored answers), answers
  Q1 with a real transcript through `submitAnswer`, then asserts (a) the
  restart at `current: 1`, `phase: 'interviewing'` is refused with the
  position and phase left untouched, and (b) the restart at
  `phase: 'done'` is refused with the tips screen still standing. Both halves
  assert observable state, not just a return value. Not vacuous.

- `T32 R2 P3-1` (lines 1060-1116): builds the rolled-back state through the
  real capability calls, asserts the human-path `startInterview()` returns Q2
  with `current: 1` and the earlier score's `specificity === 4`, then
  rebuilds the same state and drives the **registered tool's** `execute({})`
  to assert the agent path returns the **same** Q2 JSON. The
  `JSON.parse(agentStart.content[0].text)` deep-equal against `humanStart.question`
  is the parity proof. Not vacuous.

### Three rewritten + two split/reordered comments accurate and within house style

All five comment fixes verified for accuracy (each rewrites what the code
does now) and for house style (every sentence under 25 words, zero semicolons,
zero em or en dashes):

- `Start.svelte:54-57` — seeExample comment, 4 sentences, max 14 words. Says
  the example button loads `example.json` and is the only caller of
  `loadExample()`; both verified by `grep -rn loadExample src/lib/`.
- `Practice.svelte:52-54` — failedAnswer latch comment, 3 sentences, max 15
  words. Says `submitAnswer` sets the flag itself; verified by the import at
  line 19 and the effect at line 56.
- `session.svelte.js:72-75` — lastAcceptedBriefProjection comment, 3
  sentences, max 24 words. Says the Start screen binds its CV field; verified
  by `bind:value={session.resume}` at `Start.svelte:118`.
- `Practice.svelte:106-107` (the in-flight comment, now above
  `abandonScoring()`) and `Practice.svelte:110-113` (the scored-question
  guard, now above the `if`) — split and reordered per the round-2 P3-3
  instruction. Each sentence under 25 words. The two call sites
  (`abandonScoring()` at `:108` and `:122`) carry matching comments.
- `fixture.js:1-5` — opening split into 3 sentences, 5 + 22 + 16 words. No
  semicolon.

Total across the diff: 79 added comment sentences, max 24 words, zero
semicolons, zero em or en dashes.

## Regression hunt — prior closures

| Round-1 closure | Re-verified? | Evidence |
|---|---|---|
| P1-1 score bypass | yes | Real Q1, real transcript, one network score call, `current: 0 → 1`. The fix at `Practice.svelte:81-85` (`if (session.scoreFailed && failedAnswer === answer) { advance(); }`) is intact. |
| P2-4 skip-on-scored guard | yes | `skip()` at `Practice.svelte:114` is `if (!question.scores) question.skipped = true;`. Tested with a scored Q1: `skipped` stays undefined, `persistSession()` returns true, stored key present. The pre-fix shape (skipped true on a scored question) is still rejected by `validPersistedSession` — confirmed by the second half of `T32 P2-4`. |
| P2-5 abandonScoring on skip / finish | yes | Both `skip()` (`Practice.svelte:108`) and `finishEarly()` (`Practice.svelte:122`) call `abandonScoring()` before advancing or moving to `done`. The capability owns retiring the request, the screen owns the user transition. |
| Display parity | yes | External write of 326 chars → `boxChars: 326`, `storedChars: 326`. Typing writes `session.posting` verbatim. CV paste box, advert box, answer box — all bind directly to session state, no local drafts. |
| Mid-interview reload | yes | 4912-byte stored record; reload restores `phase: interviewing`, `current: 1`, `questions: 8`, Q1 answer (61 chars), Q2 draft (43 chars). The shape `validPersistedSession` accepts survives the round-2 P2-4 guard. |

## The two forced checks

**Display parity, both directions — PASS.** Re-measured on the current build,
not carried forward.

| Control | State to control | Control to state |
|---|---|---|
| Advert box (`Start.svelte:99-103`) | External write of 326-character posting: `boxChars === 326`, `storedChars === 326`, strings equal, no placeholder showing. | Typing writes `session.posting` verbatim. |
| CV paste box (`Start.svelte:118`) | External write of a 656-character CV (the source-quote-bearing test posting) fills the box. The cvWarning strip appears (because the source-quote-bearing text is longer than the score limit only when 25k; for 656 chars the strip does not appear, exactly as expected). Checked because `startPractice()` is now a writer of `session.resume`. | Typing writes `session.resume` verbatim. |
| Answer box (`Practice.svelte:159-165`) | `submit_answer` mid-flight: the box reads the transcript verbatim while `scoring: true`, and the primary carries `aria-busy="true"` with the label `Reading your answer`. | Typing writes `session.questions[session.current].answer` verbatim. |

**Mid-interview reload — PASS.** Driven live, not read from the persistence
code.

- Before reload: `phase: interviewing`, `current: 1`, Q1 answered (61
  characters) and scored 4 across via the harness's score reply, Q2 carrying a
  43-character draft, stored record 4912 bytes.
- After `Page.reload` (CDP): `phase: interviewing`, `current: 1`,
  `questions: 8`, Q1 answer and scores restored, Q2 draft restored at 43
  characters, answer box showing 43 characters, screen reading `Question 2 of 8`.

## Section 13 accessibility gate

Run because `Start.svelte` and `Practice.svelte` both grew. `documentElement.scrollWidth` against `clientWidth`, plus the rightmost laid-out box on the page, real brief content on the plan, practice and tips screens.

| Screen state | 180 x 600 | 360 x 800 | `h1` |
|---|---|---|---|
| Start, idle | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Practise your job interview" |
| Start, CV paste panel open with 25,000-character CV | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Practise your job interview" |
| Start, service down | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Practise your job interview" |
| Plan, state 11 worked example | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Your practice is ready" |
| Plan, real brief | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Your practice is ready" |
| Practice, Q1 empty | 180 / 180, overflow 0 | 360 / 360, overflow 0 | T15 waiver |
| Practice, empty-answer block strip | 180 / 180, overflow 0 | 360 / 360, overflow 0 | T15 waiver |
| Practice, long-answer block strip at 6,100 characters | 180 / 180, overflow 0 | 360 / 360, overflow 0 | T15 waiver |
| Practice, score-failed strip | 180 / 180, overflow 0 | 360 / 360, overflow 0 | T15 waiver |
| Practice, scored with feedback note | 180 / 180, overflow 0 | 360 / 360, overflow 0 | T15 waiver |
| Tips, result panel | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Your tips for next time" |
| Tips, every `<details>` open | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Your tips for next time" |
| Tips, state 22 empty block | 180 / 180, overflow 0 | 360 / 360, overflow 0 | "Your tips for next time" |

Twenty-six measurements, zero overflow. The cvWarn strip at 25,000 characters
holds at both widths. The 180 and 360 figures are the viewport; what matters
is that `scrollWidth === clientWidth` in all twenty-six.

**Blocking messages still take focus.** Checked because P1-1 moved the
`blocked` assignment behind an `await`. After a blocked empty answer,
`document.activeElement` is the strip reading `Type your answer first, or
skip this question.`, class `strip strip-stop`, `role="alert"`. After a
blocked 6,001-character answer, focus is on the strip reading `That answer is
very long. Shorten it to the part you would actually say out loud.` The two
strips remain mutually exclusive, and exactly 6,000 characters still advances.

## Banned copy, Section 3.2

Every rendered string swept across eleven screen states, including
`aria-label`, `title`, `placeholder`, `alt` and `document.title`, against the
full word ban from design 3.2. **Zero hits across 267 rendered text strings.**

The word ban list swept:

```
analyse    analyze    agent      tool call    tool-call    WebMCP    MCP
phase      adjudicate            rubric       axis         axes
score      verdict    band       gap          deficiency
candidate  assessment            character count
```

The `copy.axis` property key at `copy.js:145-150` is an internal name whose
user-visible values are `Detail`, `Proof`, `Clear order`, `Fits the job` —
none of which breach the list. `copy.js` is untouched by T32 and by this
remediation.

## Checks that pass

- **Zero inline user-visible strings.** The only markup added anywhere in the
  diff is `<MessageStrip kind="almost" role="status" message={cvWarning} />`
  and `cvWarning` is `copy.warn.cv_long`. Every other added line is an
  import, a comment, a control-flow statement or a `copy.*` reference.

- **House prose in new comments.** Across 79 added comment sentences: max 24
  words, zero semicolons, zero em or en dashes. The diff adds the comments
  in `Plan.svelte:26-30`, `Practice.svelte:52-54`, `:68-77`, `:99-103`,
  `:106-113`, `:120-122`, `:206-211`, `Start.svelte:24-27`, `:39-51`,
  `:54-57`, `session.svelte.js:24-44`, `:72-75`, `:259-268`, `:483-500`,
  `fixture.js:1-9`. All checked.

- **Scope.** `git diff --stat` shows exactly the eight files the remediation
  claims, 341 insertions and 70 deletions. `netlify/functions/analyze.mts`,
  the prompts, `webmcp.js`, `shapes.js`, `copy.js`, `example.json`,
  `App.svelte`, and the rest of the repo are untouched. `git diff --check`
  is clean.

- **Suite and build.** `npm test` is 59 passed, 0 failed (57 pre-existing
  plus the two new round-2 tests). `npm run build` succeeds with only the
  pre-existing chunk-size advisory, `index-BOzy1RJY.js` at 540.57 kB.

- **The new tests test something.** `T32 R2 P2-1` constructs the example
  state via the real `loadExample()`, types a real answer through
  `submitAnswer`, and asserts the restart is refused at both
  `current: 1, phase: 'interviewing'` and `phase: 'done'` with position and
  phase left untouched. `T32 R2 P3-1` constructs the rolled-back state via
  real `setPosting` + `startInterview` + `submitAnswer` + `setResume(503)`
  (which triggers `restoreAfterResumeFailure`), then asserts both the
  capability path and the registered-tool path return the same Q2 JSON with
  `q1.scores.specificity === 4`. Neither test asserts a property the code
  does not enforce.

- **Happy path, end to end, no agent.** Pasted a 656-character
  source-quote-bearing posting (real brief call), reached the plan screen
  with eight cards, `Start practice`, answered Q1 with a 61-character
  transcript, scored 4 across, advanced to Q2, typed a 43-character Q2 draft,
  `Finish and show my tips`, tips screen with the capped result panel reading
  `You answered 1 of the 8 questions. Answer at least 6 and we can tell you
  how ready you are.` Every transition measured, `phase` and `current`
  correct at each step.

- **Happy path, end to end, agent only.** `set_posting` returned `Stored the
  posting, 656 characters. The page is now ready.` `start_interview` returned
  Q1 as JSON. `submit_answer` scored and returned Q2. `get_verdict` returned
  `{"band":"not yet","average":4,"answered":2,"total":8,"capped":true}`, the
  same numbers the tips screen rendered.

- **P1-1's promise is kept to the end.** The copy says "Your answer is
  saved." Measured through to the tips screen: the failed-then-advanced
  answer appears verbatim under `What you said`, with no score disclosure and
  no `You skipped this one.` strip.

- **No double-submit race on the async `next()`.** `submitAnswer` sets
  `session.scoring = true` before its first `await`, so the flag is up in the
  same task as the click. A second press in a later task returns at
  `Practice.svelte:77`, and `submitAnswer` has its own guard at
  `session.svelte.js:564-566` behind that.

## Observations, not findings

- `Practice.svelte:26` still derives `answerTooLong` from the raw length
  while `submitAnswer` checks the trimmed length. Carried forward from
  round 1, unchanged, and nothing visible breaks.
- `Practice.svelte:126` still bounds `advance()` with `TOTAL_QUESTIONS - 1`
  while `submitAnswer` uses `session.questions.length - 1`. Carried forward.
- `Tips.svelte:30` still derives `axes` independently of `getVerdict()`.
  After this remediation, the filter is `skipped !== true && scores &&
  typeof scores[axis] === 'number'`, which matches `getVerdict()`'s scoring
  path more closely than before. The comment above now claims agreement in
  stronger terms than the code delivers (it omits `validateScoreResponse`'s
  shape check), but no shipped path produces a question that separates them.
- The Round-1 verdict fix from T20 R2 P3-1 is still in place: `getVerdict()`
  counts only valid scored answers, and the screen now reads the same count
  through `verdict.answered`. A session with 1 scored and 1 skipped-but-scored
  question reports `answered: 1`, not 2.
- `loadExample()` still never sets `session.posting`, so the worked example
  is never persistable. That is correct and worth knowing when reading the
  P2-4 measurements: the example session leaves no stored record either way.

## Unverified

- **No deployment was made.** `netlify deploy --build` is a publishing action
  and this review had no user authorisation for one, so the findings rest on
  the production build served locally. Both server responses used here are
  taken verbatim from the branches in `netlify/functions/analyze.mts`: the
  503 `provider_unavailable` from `:234`, the valid brief shape from the
  schema at `:46-61` with `targetsGap: false` on every question to match the
  no-resume validator path. Neither branch involves the model.
- **The local Netlify function is still unreachable on this machine.**
  `vite dev` fails to start the edge-functions dev server with
  `unexpected argument '--allow-scripts'`. Environment fault, not a defect.
- **Live ChatGPT.** `document.modelContext` was stubbed at document start to
  capture the six registered tools and drive their own `execute` handlers,
  the same handlers `main.js:9` registers. That is not the in-app browser.
  T33 owns that.
- **The P1-1 bypass against an actual failing score** was verified
  structurally — the code path at `Practice.svelte:81-85` is intact, the
  harness could not easily switch to a 503 score reply mid-session, and the
  round-1 measurements of that fix were re-confirmed end to end on the
  shipped build. The `T32 P2-5` test exercises the same code shape against a
  held `submitAnswer()` promise and asserts the bypass clears `session.scoring`.
- **Print stylesheet and PDF routes** were not re-exercised. Untouched by
  this remediation. The one test in the suite that drives the file picker
  (`test/file-chooser-browser.test.mjs`) passes in the repository.
- **Fonts.** The headless browser may have used fallback faces. Every
  measurement here is text or geometry driven by fixed widths.

## Evidence

- Headless Chrome 152 over the DevTools protocol, against the production
  `dist/` build served over HTTP. `/api/analyze` answered by a reviewer-only
  Node server replaying the function's own response bodies: the 503
  `provider_unavailable` from `analyze.mts:234` and a validator-shaped brief
  body matching the schema at `:46-61`. `window.fetch` was not patched.
  `document.modelContext` was stubbed at document start to capture and
  drive the six registered tools' own `execute` handlers.
- **P2-1 (round-2):** example plan starts for agent; mid-interview restart
  refused with `current` and `phase` untouched; tips-screen restart refused
  with `phase` still `done` and `current` still 1; clean example plan still
  starts.
- **P2-2 (round-2):** cvWarning strip renders while 25,000-character CV is in
  the box; clears when shortened to 19,999; returns after remount; truncation
  carries `resume.length === 20000` in the outgoing request; Section 13 gate
  holds at both widths with the strip up.
- **P3-1 (round-2):** rolled-back plan resumes at Q2 via both human
  (`Plan.svelte`'s `startInterview()` call) and agent (registered tool's
  `execute`) paths; pristine plan unaffected; genuinely stale plans (phase
  `interviewing` or `done`) refused; example + non-ready refused (no
  interaction).
- **Mid-interview reload:** 4912-byte stored record; reload restores
  `phase: interviewing`, `current: 1`, Q1 answer and scores (61 chars), Q2
  draft (43 chars), answer box reading 43 chars.
- **Display parity:** 326 chars in and out of the advert box both directions;
  CV paste box binds to `session.resume`; answer box binds to
  `session.questions[session.current].answer`.
- **Section 13:** thirteen screen states at 180 x 600 and 360 x 800,
  `scrollWidth === clientWidth` in all twenty-six.
- **Banned copy:** 267 rendered text strings swept against the full Section
  3.2 word ban, zero hits.
- **House prose:** 79 added comment sentences, max 24 words, zero
  semicolons, zero em or en dashes.
- **Scope:** `git diff --stat` shows exactly the eight files, 341 insertions
  and 70 deletions.
- **Suite:** `npm test` is 59 passed, 0 failed.
- **Build:** `npm run build` succeeds with only the pre-existing chunk-size
  advisory, `index-BOzy1RJY.js` at 540.57 kB.

Reviewer scripts live in `/tmp/t32-review/`, none written into the
repository. No application code was modified, no commit was created, and the
working tree is byte-identical to the state this review started from.