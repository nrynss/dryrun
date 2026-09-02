# T35 review, round 1

Date: 2026-09-02
Reviewer: ReviewT35
Target: the uncommitted T35 implementation (Dry Run, branch main, HEAD
6933b9c). Seven files changed against HEAD, 228 insertions and 31 deletions:
`dev-diary/design.md`, `dev-diary/task.md`, `src/lib/Plan.svelte`,
`src/lib/copy.js`, `src/lib/session.svelte.js`,
`test/file-chooser-browser.test.mjs`, `test/session-capabilities.test.mjs`.
The task.md edit is the binding spec for this task and predates the
implementation. It was treated as binding text, not as implementation to
review. Binding documents: `dev-diary/task.md` row T35 and its
"T35 in detail" section, `dev-diary/design.md` Revision 2, and the parity
rules in `dev-diary/project.md`. The one clear control on the Plan screen,
its exact deck string, and the clean-Start reload acceptance are user
decisions and were treated as fixed. Prior documents:
`dev-diary/t32-review-round-1.md`, `dev-diary/t32-review-round-2.md`,
`dev-diary/t32-review-round-3.md`.

## Verdict

**NOT APPROVED. P1 x 0, P2 x 1, P3 x 2.**

The state work is correct and complete. Every task.md step landed as
specified. The declared requireFitMatch deviation is exactly the brief
boundary rule and it closes holes rather than opening them. The full CV
round trip restores the posting, brief, eight questions, answers, scores,
fitMatch, position, phase and the CV text on the shipped build. The version-2
record is discarded live, never half-read. The 20,000 character cap holds at
both edges. The clear control clears everything and a fresh reload lands on a
clean Start. Copy parity is byte exact. npm test is green at 65 of 65, and
all four new tests construct real paths and assert exact states.

The P2 is a layout conformance break on the Plan screen. The new quiet
button sits below the primary with a 0px gap at natural width. Design 7.3
allows only a secondary above the primary, or two full-width buttons stacked
with an 8px gap. Live geometry on the built site proves the violation on
every render, with and without a CV.

## Findings by severity

### P2-1 The Plan clear control sits below the primary with no gap, against design 7.3

Design 7.3 says the bar holds one primary at full width and a secondary
sits above it as a text button. The only other allowed arrangement is two
full-width buttons stacked with an 8px gap. The patch appends the quiet
button after the primary inside a plain block `div`, so it renders below the
primary at natural width and the two edges touch. Measured on the production
build. At 360x800 the primary is 297x52 at y688 and the quiet is 295x48 at
y740, a 0px gap. At 1280x900 the quiet measures 295px wide under a 640px
primary, again touching. Both Plan variants are affected, fitMatch present
and absent. `Practice.svelte:195-205` implements 7.3 correctly: a `.quiets`
column with `gap: 8px` holding full-width quiet buttons above the primary.
Move the Plan button into the same pattern. Zoom gate overflow is unaffected,
both widths still pass at zero overflow.

```svelte
  <div class="actionbar">
    <div class="actionbar-inner">
      <div class="quiets">
        <Button variant="quiet" style="width: 100%" onclick={removeCv}>{copy.plan.remove_cv}</Button>
      </div>
      <Button onclick={startPractice}>{copy.btn.start}</Button>
    </div>
  </div>
```

```css
  /* 7.3: the secondary sits above the primary, stacked with an 8px gap. */
  .quiets {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
```

### P3-1 On a no-CV plan the clear control names a CV that does not exist

The button renders unconditionally, so a plan built without a CV offers
"Remove my CV and start over" although there is no CV to remove. Ruling:
this is a copy coherence note, not a defect against the binding decision.
The decision fixes one unconditional button implemented as a call to
startOver(), and the acceptance names the exact deck string, so no
conditional rendering and no rewording are authorised inside this task. The
action stays truthful in both states, since startOver clears everything and
lands on Start either way, which matches the unconditional Tips button. Live
evidence: a no-CV plan at phase ready showed the action bar as
`["Start practice", "Remove my CV and start over"]`, and pressing it landed
on idle with no stored record. Recorded so a later copy pass can weigh a
state-neutral string if wanted.

### P3-2 design 9.3 still describes the Plan action bar as one button

The patch adds the deck row in section 11.4 but leaves section 9.3 item 9
reading "Action bar with `Start practice`". The design doc promises that an
implementer never needs to invent a placement, and this stale line is what
let the P2-1 arrangement through. Update 9.3 item 9 to name the quiet
secondary above the primary per 7.3 when the P2-1 fix lands.

## What was verified, driven live

`npm run build` produced `dist/`. A reviewer-only static server on loopback
served it. Headless Chrome was driven over the DevTools protocol.
`/api/analyze` was answered by a body-level replay: the real
`createAnalyzeHandler` from `netlify/functions/analyze.mts` ran in the
review harness with a fake model client and returned the exact JSON the
shipped function would return, validator-checked by the function itself.
`window.fetch` was not patched. `document.modelContext` was stubbed at
document start, so the six tools registered through `main.js` and were
driven through their own `execute` handlers. `npm test`: 65 tests, 65 pass,
0 fail, including the three live file-chooser browser tests.

### task.md steps 1 to 4, in `src/lib/session.svelte.js`

| Step | Status | Evidence |
|---|---|---|
| 1. Delete the persistentSnapshot guard, add resume | DONE | `session.svelte.js:684-707`. The guard is gone. The snapshot returns `resume: session.resume` first. No null return path remains. |
| 2. Seven-key validation capped at MAX_RESUME_CHARS | DONE | `session.svelte.js:709-713`. Exactly seven keys listed. `resume` must be null or a string of at most 20,000 characters. |
| 3. restoreSession stops forcing resume null | DONE | `session.svelte.js:785`. `applyBriefProjection({ ...saved.session, isExample: false, scoreFailed: false })`. The Start textarea binds `session.resume` at `Start.svelte:116`, so display parity follows. |
| 4. Version 3 with an honest adjacent comment | DONE | `session.svelte.js:66-71`. The comment states the CV text is stored, the key keeps its v1 name so older records are found and removed, and the version check discards every older envelope including the CV-free version 2 shape. All three claims are true in the code. |

### The declared requireFitMatch deviation

`validPersistedSession` now calls
`validateBriefResponse(briefData, { posting: value.posting, requireFitMatch: value.resume !== null })`
at `session.svelte.js:729`. Checked against `shapes.js`. Line 209 rejects
gap-aimed questions when `requireFitMatch` is false. Line 216 requires a
fitMatch when it is true. Line 217 requires fitMatch to be exactly null when
it is false. The brief boundary itself uses
`requireFitMatch: Boolean(resume)` at `session.svelte.js:361`. The storage
rule is therefore the same consistency rule the boundary already enforces:
gap material exists exactly when a CV rode along. It closes holes. A no-CV
record carrying a fitMatch or any gap question is still rejected. A CV
record without a fitMatch is rejected, which is stricter than anything v2
could express because v2 never persisted a CV record at all. No-CV records
validate exactly as strictly as before. One note: the example fixture
(`example.json`) carries a non-null fitMatch and three gap questions with no
resume, so it cannot persist under v3. That matches v2, where the deleted
guard also refused it. No example-plan regression.

### persistSession without the dying clause

`persistSession` at `session.svelte.js:747-760` now reads
`if (!validPersistedSession(value))`. `persistentSnapshot` has no null
return path left, so the removed `!value ||` clause was dead. An absent or
invalid posting cannot reach storage: line 714 requires a string posting
that passes `validatePosting`, and any failure removes the record and
returns false. Verified by the full test suite and by live reloads.

### The CV round trip, end to end on the shipped build

Posting and CV pasted on Start, plan built, one answer scored, reload.

| Field | After reload |
|---|---|
| phase | `interviewing`, Practice screen shows `Question 2 of 8` |
| current | 1 |
| posting | byte-identical to the pasted advert |
| resume | byte-identical to the pasted CV, 135 characters |
| brief | owns/study/angles/confidence restored, owns line verbatim |
| fitMatch | full structure restored, confidence high, 2 evidenced, 2 gaps ordered 3 then 1 |
| questions | 8, exactly 3 with `targetsGap: true` |
| q1 answer and scores | restored verbatim, scores 4 across all four axes, missed point restored |
| stored record | version 3, seven session keys, 2,963 bytes |

Display parity holds both directions. External write of the CV text into
`session.resume` filled the Start paste box byte for byte, and typing into
the box wrote `session.resume` verbatim.

### Old and hostile records, driven live

| Stored record | Outcome |
|---|---|
| Version 2, six keys, rebuilt from a real v3 record on the live origin | Reload discarded it. Storage empty after load. Session not half-read: phase idle, zero questions, null posting. Start screen. |
| Resume of 20,001 characters | Reload discarded it. Storage empty. Start screen. |
| Resume of exactly 20,000 characters | Reload restored it. `session.resume.length === 20000`, phase ready, fitMatch intact. |

The boundary test at `test/session-capabilities.test.mjs:1232-1258`
constructs the real boundary, not a property near it: `'x'.repeat(MAX_RESUME_CHARS + 1)`
must be discarded and `'x'.repeat(MAX_RESUME_CHARS)` must restore. Not
vacuous.

### The clear control

| Step | Result |
|---|---|
| CV plan on Plan screen | Action bar reads `["Start practice", "Remove my CV and start over"]` |
| Press the clear control | Phase idle. resume, posting, fitMatch all null. Zero questions. Storage record removed. |
| Fresh reload | Phase idle, no record, clean Start screen |
| No-CV plan, same two steps | Button present unconditionally, press lands idle with no record |

### Section 13 zoom gate, Plan screen

`documentElement.scrollWidth` against `clientWidth`, plus the rightmost
laid-out box. Real brief content, both Plan variants.

| Screen state | 180 x 600 | 360 x 800 |
|---|---|---|
| Plan, fitMatch absent | 165 / 165, rightmost 157, overflow 0 | 345 / 345, rightmost 337, overflow 0 |
| Plan, fitMatch present | 165 / 165, rightmost 157, overflow 0 | 345 / 345, rightmost 337, overflow 0 |

Four measurements, zero overflow.

### Copy deck parity

`copy.js:63` and the design 11.3 row for `start.privacy` are byte exact at
117 bytes: "Your CV stays in this browser on this device. We read it only to
build your questions. Nothing is stored on a server." `copy.js:96` and the
11.4 row for `plan.remove_cv` are byte exact: "Remove my CV and start over".
The old "We never save" claim is gone from the deck, the source, and the
rendered Start screen. The live chooser browser test asserts the new string
verbatim and passes.

### House prose

All 15 added or rewritten comment lines were swept. 11 sentences. Longest is
22 words. Zero semicolons. Zero em or en dashes. The new strings carry no
banned vocabulary from design 3.2 or project.md.

### The four new tests are not vacuous

| Test | Lines | Why it is real |
|---|---|---|
| CV-backed session persists and restores | 1156-1194 | Builds the state through `setPosting` and `setResume` with an injected brief, persists, resets, restores, and asserts resume, fitMatch deep equality, the saved answer, exact scores, current, phase and three gap questions. |
| Version-2 six-key record discarded | 1196-1230 | Builds a real record via `persistSession`, deletes the resume key, stamps version 2, asserts restore false, the key removed, storage empty, and the session not half-read. |
| Character cap edges | 1232-1258 | Constructs both sides of the boundary with the actual constant and asserts discard plus restore with length exactly 20,000. |
| Clear control | 1260-1291 | SSR renders Plan and asserts the exact deck string in the body, then drives `startOver` and asserts idle, nulls across the board, an empty store, and a failed re-restore. |

The T30 update is honest. The old block asserted a CV session cannot persist.
It now asserts a CV session persists under version 3 with the resume in the
record, and the version-1 discard block is untouched.

## Prior-closure re-verification

Closures that touch files this diff changes, re-driven on the shipped build.

| Prior finding | Status | Evidence |
|---|---|---|
| T32 R2 P2-1 restart-refusal guards, now with a CV present | HELD | Restored CV session at `current: 2`, `phase: interviewing`. Tool `start_interview` refused with "Start a new practice plan before starting another interview.", `current` and `phase` untouched. With `phase` set to `done` the tool refused again and `phase` stayed `done`. |
| T32 R1 P2-4 skip-on-scored persistence | HELD | Q1 carried a real score. `skip()` left `skipped` undefined, advanced to question 2, and the storage record survived at 2,963 bytes. |
| T32 R1 P1-1 score bypass, one call per press | HELD | Two presses produced exactly two score calls at the network layer, `current` moved 0 to 1 to 2, no duplicate or skipped calls. |
| Mid-interview reload, now with a CV present | HELD, extended | The full CV round trip above restores position, answers, scores and the CV text. Prior rounds proved the no-CV shape. The no-CV reload also re-passed in this round. |
| file-chooser browser test change | GREEN | Only the asserted privacy string changed. The test passed against the built behaviour with warning and filename assertions untouched. |

## Regression hunt

| Area | Result |
|---|---|
| No-CV sessions | No regression. Plan built, record version 3 with `resume: null`, reload restored posting, brief, eight questions. |
| Example plan | Unchanged. The fixture's fitMatch plus gap questions with no resume cannot validate, so the example still never persists, same as v2. |
| Storage failure paths | Unchanged. `persistSession` still returns false and removes the record on any invalid shape. |
| Agent path | Tools read live session state only. Nothing consumes the persisted envelope except `restoreSession`, whose seven-key branch handles the new field explicitly. No silent drop anywhere on the new boundary. |
