# Build breakdown

Atomic tasks for Dry Run. Numbered in dependency order, so every task depends
only on lower numbers. Read top to bottom and no dependency ever points
forwards.

Track is a label, not an ordering. Tasks from different tracks run in parallel
whenever their dependencies allow.

## How to read this

- A task is atomic when one person can finish it and see it work without
  waiting on anyone.
- **Needs** lists prerequisites. **Blocks** lists what waits on this task, computed
  from Needs so the two can never disagree. The word "none" means nothing does.
- T03 to T06 are a gate. Nothing below them is worth building until they pass.
- No time estimates. The useful structure here is what blocks what.

---

## Sequence

| ID | Track | Size | Task | Needs | Blocks |
|---|---|---|---|---|---|
| T01 | Submission | S | Source the real job posting that ships as the worked example. **Done.** Walmart Connect, Manager Technical Writing, saved to `dev-diary/example-posting.md`. | none | T08 |
| T02 | Gate | S | Give `set_posting` a real `execute` handler. Store the posting, flip `session.phase`, render the change. No inference. **Done.** | none | T03 |
| T03 | Gate | S | Confirm the tool registers and invokes. **Done.** Verified on the live origin in Chrome 152 with NO flag, driven over the DevTools protocol. `getTools()` returns our tool and `executeTool` ran the handler, flipping the page to `phase: ready`. | T02 | T06 |
| T04 | Gate | S | Settle the production origin. **Done.** `dryrun.nryn.dev`, wired as a grey-cloud CNAME in Cloudflare, certificate issued, serving 200. | none | T05 |
| T05 | Gate | S | Register the WebMCP origin trial token and serve it. **Done.** Two tokens, one per origin, both expiring 17 Nov 2026, delivered comma-separated in a single `Origin-Trial` header and verified live on both hosts. | T04 | T06 |
| T06 | Gate | M | Confirm on the deployed origin inside ChatGPT's in-app browser. **Done.** ChatGPT listed the site tools, called `set_posting`, and the page flipped to `Agent connected` with `phase: ready` untouched by hand. Gate closed. | T03, T05 | T07 |
| T07 | Shapes | M | Fix the JSON shapes in one module: `Brief`, `Question`, `FitMatch`, `AnswerScore`, `Verdict`. `Question` must carry `sourceQuote`. | T06 | T08, T09, T10, T13, T21, T22, T25 |
| T08 | Shapes | M | Hand-write the example fixture. **Done.** `src/lib/example.json`, validated against `shapes.js`. Eight questions with verbatim quotes, fit match ordered by gap size, three scored answers demonstrating the coverage cap. | T01, T07 | T12, T15, T17, T18 |
| T09 | Function | L | Brief task. Fixed prompt plus structured output schema. Posting and optional resume produce brief, eight questions, fit match. | T07 | T11, T12, T25, T26 |
| T10 | Function | M | Score task. Fixed prompt plus structured output schema. One answer produces four axis scores, missed points, model answer. | T07 | T11, T12, T28 |
| T11 | Function | M | Handle a malformed or refused response without breaking the session. | T09, T10 | T32 |
| T12 | Function | S | Measure real token cost against the example posting and check it against the credit budget. | T08, T09, T10 | none |
| T13 | Interface | M | `src/app.css`, plus the critical CSS in `index.html`. Design doc sections 5, 6 and 7. Tokens, `color-scheme: light`, the Lexend and Source Sans 3 links, the type scale as classes, the page frame, the spacing scale, the focus rule, the reduced-motion block. **Replace the existing `color-scheme: dark` and `#0A0A0C` in `index.html`.** Done when a blank page renders paper white with ink text in both faces. | T07 | T14, T16 |
| T14 | Interface | S | Question card, design doc 8.7, and the source quote, 3.5. Plus Card 8.1 and Button 8.2. Done when all eight fixture questions render with their quotes at 360px and at 900px. | T13 | T15, T17, T18 |
| T15 | Interface | M | Practice screen, design doc 9.4. Progress row 8.6, feedback note 8.8. Done when Q1 through Q8 advance and the three scored fixture answers show their feedback. | T08, T14 | T19, T20 |
| T16 | Interface | M | Start screen, design doc 9.1. Text box 8.3, file chooser 8.4, ChatGPT line 8.5, message strip 8.13. The `I have a job advert` route only. Done when typing writes `session.posting` **and** setting `session.posting` from the console fills the box. That second half is the display-parity rule, and it is the bug that made the agent path look broken. | T13 | T19 |
| T17 | Interface | M | Your practice screen, design doc 9.3. List block 8.9, fit item 8.10. Done when the whole fixture renders with no placeholder text left anywhere. | T08, T14 | T19 |
| T18 | Interface | M | Your tips screen, design doc 9.5. Result panel 8.11, score row 8.12, print stylesheet. Done when all four result cases in design doc 14.1 render correctly. Note the fixture alone only ever produces `not yet` plus `capped`, so use the four literal Verdict objects the design doc supplies. | T08, T14 | T19 |
| T19 | Interface | L | Every state in design doc section 10, wired to the copy deck in section 11. Build `src/lib/copy.js` first, then replace every inline string. Done when every row of the section 10 table is reachable and shows its exact string. | T15, T16, T17, T18 | T32 |
| T20 | Interface | S | Motion, design doc section 12. Done when every row of the section 12 table behaves and `prefers-reduced-motion` is honoured. | T15 | none |
| T21 | Resume | M | Install `pdfjs-dist`, wire the same-origin worker, extract text in the browser. | T07 | T23 |
| T22 | Resume | S | Accept pasted text and uploaded `.txt` and `.md`. | T07 | T23, T24 |
| T23 | Resume | L | The four failure modes: scanned PDF, locked PDF, over-long resume, not a resume. Each needs its own message. | T21, T22 | T33 |
| T24 | Resume | S | Privacy copy beside the file picker. | T22 | T33 |
| T25 | State | M | `setPosting`. Replace the T02 gate body with a real call to the function. Store brief and questions, handle the error paths. | T07, T09 | T26, T27, T31 |
| T26 | State | M | `setResume`. Store resume text, store fit match, re-aim roughly a third of the questions. | T09, T25 | T31 |
| T27 | State | S | `getBrief` and `startInterview`. | T25 | T28, T31 |
| T28 | State | M | `submitAnswer`. Score, store, advance the index, return the next question or the verdict. | T10, T27 | T29, T31 |
| T29 | State | S | `getVerdict`. Band from the average, then apply the coverage cap so a skipped session can never read as ready. | T28 | T30, T31 |
| T30 | State | M | Persist to `localStorage` and restore on load. | T29 | T32 |
| T31 | State | M | Register the remaining five tools with schemas, descriptions and annotations. `submit_answer` must state that the transcript is the user's spoken answer. **Verified API contract, which differs from every published example:** `executeTool` takes the RegisteredTool object, and its arguments as a **JSON string**, not an object. `getTools()` returns a Promise. `inputSchema` comes back as a string. `annotations.readOnlyHint` auto-populates as `false` when omitted, which is the side-effect signal we want. Details in `dev-diary/example-posting.md`. | T25, T26, T27, T28, T29 | T32 |
| T32 | Integration | L | Wire the interface to real state. Keep the fixture only as the function-down path. | T11, T19, T30, T31 | T33, T35 |
| T33 | Integration | M | Full run end to end in ChatGPT's in-app browser, using the judge path from the spec. **Three preconditions, every one of them silent when unmet:** ChatGPT must run **GPT-5.6 Sol or Terra**, because Luna has WebMCP disabled and simply shows no tools. Site tools are unavailable in **Enterprise and Edu** workspaces. Availability is also rollout-dependent. Cheaper pre-check: drive headless Chrome over the DevTools protocol, or `--headless --dump-dom`, to confirm registration before opening the app. **Done.** | T23, T24, T32 | T34 |
| T34 | Integration | S | Production deploy, then re-verify headers, the origin trial token and the gateway against the live URL. **Done.** Re-verified against `dryrun.nryn.dev` on 2026-09-02: the site returns 200 and serves a JS bundle byte-identical to a local build of the T35 commit, the `Origin-Trial` header is present, `Permissions-Policy` is `tools=(self)`, and `GET /api/analyze` answers 405 rather than 503, which proves `OPENAI_BASE_URL` is set on the deploy. Gateway quota was not spent to confirm a live model call. | T33 | none |
| T35 | State | M | Persist the CV and the CV-derived session locally, so a person never re-uploads. Today `persistentSnapshot()` returns null when `session.resume` is set, when `fitMatch` exists, or when any question has `targetsGap`, and `persistSession()` then deletes the record. So a CV session has **zero** persistence and a reload loses the posting, brief, questions, answers and scores, not just the CV. See the detail section below. **Done.** Round-2 review APPROVED with zero findings. The CV session persists under storage version 3 and the removal control, guarded on a CV, is verified live on production. | T32 | T36, T37 |
| T36 | Interface | S | A mode-neutral copy pass. Replace every visible string that requires speaking or promises a fixed inference time. Touches `src/lib/copy.js` and the section 11 copy deck in `dev-diary/design.md`, and nothing else. All thirteen replacements are verified character for character against the working tree. See the detail section below. **Done.** Round-1 review APPROVED with zero findings. The thirteen replacements match byte for byte, copy deck parity across 125 keys is 100%, and npm test passes 70/70. | T32, T35 | none |
| T37 | Interface | L | Give Dry Run a calm, hopeful SVG identity and a restrained motion pass. Add an accessible `Dry Run` wordmark with an inline Open Path mark, mounted once in the app shell, plus meaningful motion at each state change. The global reduced-motion block in `src/app.css` is not sufficient here. See the detail section below. **Done.** Accessible `Brand.svelte` Open Path mark mounts once in shell, per-screen wordmarks are removed, `PathPulse` indeterminate cue is active, static reduced-motion fallbacks are verified, and npm test passes 75/75. | T32, T35 | none |

---

## Gate

T03 to T06 block everything else. We have never seen an agent invoke a tool on
this page, and every task below T06 assumes it can.

The token in T05 is not optional and not conditional. Chrome exposes WebMCP
only to a page that either runs behind `chrome://flags/#enable-webmcp-testing`
or serves a valid origin trial token. No judge will set the flag. The trial
runs from Chrome 149 to Chrome 156, and Chrome 152 is installed here, so we
are inside the window.

T04 sits in front of T05 because the token binds to one origin. Changing the
domain afterwards invalidates it.

## The two that release everything

T07 fixes the data shapes and T08 writes the fixture. Four tracks build against
those shapes, so changing one later means editing the function, the state, the
interface and the fixture together.

T08 earns its place twice. It ships as the demo that survives the function
failing, and it lets the whole interface track build with no server at all.

## T35 in detail

The person uploads a CV, reloads, and everything is gone. Fix that locally. No
accounts, no server, no new storage service. This work stays valuable after
accounts arrive, because the local path remains the anonymous path.

### What to change, in `src/lib/session.svelte.js`

1. **`persistentSnapshot()`** currently returns `null` when `session.resume !== null`,
   when `session.fitMatch !== null`, or when any question has `targetsGap === true`.
   Delete that guard. Add `resume` to the returned object. `fitMatch` and
   `questions` already carry what they need.
2. **`validPersistedSession()`** requires exactly six keys and lists them. It
   becomes seven with `resume`. Validate it as a string or null, and reject
   anything longer than `MAX_RESUME_CHARS`.
3. **`restoreSession()`** calls `applyBriefProjection` with `resume: null`
   forced. Stop forcing it and restore the saved value.
4. **Bump `SESSION_STORAGE_VERSION`** from 2 to 3. The shape changes, so a
   record written by the old build must be discarded rather than misread. The
   existing version check already does that once the number moves.

### Copy, which is now wrong

`src/lib/copy.js` key `start.privacy` says "We never save it and there is no
account." Saving it makes the first half false. Rewrite it to say the CV stays
in this browser on this device, that it is sent only to build the questions,
and that nothing is stored on a server. Update the same string in the copy deck
in `dev-diary/design.md` section 11 so the two do not drift.

### Add a way to remove it

Telling someone their CV is kept, with no way to remove it, is worse than the
state we are leaving. Add a control that clears the stored CV and its derived
material. It needs a copy-deck string, so add one rather than writing it inline.

### What done looks like

- Upload a CV, get a plan, answer two questions, reload. The posting, brief,
  all eight questions, both answers, both scores and the CV all come back.
- Do the same with no CV. Nothing regresses.
- A record written by the old build is discarded rather than half-read.
- The clear control removes the CV and the derived fit material, and a reload
  after it lands on a clean Start.
- `npm test` stays green, with new tests covering the CV round trip, the
  version bump discarding an old record, and the clear control.

### Out of scope

Accounts, any server-side storage, and cross-device anything. Those come later
and are a separate decision.

## T36 in detail

Dry Run must welcome a person who types exactly as warmly as one who speaks.
This task changes words and nothing else. It touches `src/lib/copy.js` and the
section 11 copy deck in `dev-diary/design.md`. It creates no component, adds no
motion, and changes no layout.

T36 **supersedes the loading copy, ChatGPT-line copy and error copy in
`dev-diary/design.md` sections 11.1, 11.5, 11.8 and 11.9** where they conflict.
Every replacement below must land in both files, because the deck in the design
doc is the source of truth and `src/lib/copy.js` is its only implementation.

### The deck is the whole surface

No component in `src/lib` uses `aria-label`, `title=` or a `<title>` element.
Verified by grep across `src/lib`, `src/App.svelte` and `src/app.html`. So
`src/lib/copy.js` really is the only file holding user-facing words, and this
audit needs no component sweep. Keep it that way, because the deck rule in
design.md section 11 depends on it.

### Copy: both typing and speaking are welcome

Apply these exact changes. Preserve wording that is already clear and kind, and
do not rewrite merely for novelty.

| Key | Current message | Replace with | Why |
|---|---|---|---|
| `app.sub` | `Tell us what job you want. ChatGPT will ask you questions out loud and help you prepare.` | `Tell us about the job. Dry Run will help you prepare for the questions they may ask.` | The promise works whether a person types, speaks, or does both. |
| `step.2` | `Answer out loud` | `Practise your answers` | A visible step must not prescribe an input mode. |
| `practice.answer_placeholder` | `Type your answer here, or say it out loud in ChatGPT.` | `Write your answer here, or practise it in your own way.` | It invites typing without presenting voice as the primary path. |
| `practice.answer_placeholder_typing` | `Type your answer here. Write it how you would say it.` | `Write your answer here. Use the words that feel natural to you.` | This is equally useful to a person who does not want to speak. |
| `practice.hint` | `There is no time limit. Say it how you would say it in the room.` | `Take your time. Use the words that feel natural to you.` | It is calm, mode-neutral, and still gives useful reassurance. |
| `chat.none` | `You are typing your answers. That works just as well.` | `You can practise here in your own way.` | Do not name one interaction path as the fallback. |
| `chat.ready` | `Ready for ChatGPT. Ask it to start your practice, or type your answers here.` | `ChatGPT can help with your practice. You can also continue here in your own way.` | ChatGPT is an option, not a prerequisite. |
| `chat.active` | `ChatGPT is running your practice. This page updates while you talk.` | `ChatGPT is helping with your practice. This page updates as you go.` | Removes the assumption of speech while retaining the demo truth. |
| `busy.brief` | `Getting your questions ready.` | `Putting your practice together.` | Sounds warm and purposeful rather than mechanical. |
| `busy.brief_sub` | `This takes about ten seconds.` | `You can stay here while we get things ready.` | Never promise a duration that inference cannot guarantee. |
| `err.service_down` | `We cannot build new questions right now. Try again in a minute.` | `We cannot build new questions right now. Please try again later.` | Never promise a recovery window we do not control. |
| `err.unknown` | `Something went wrong. Try again in a minute.` | `Something went wrong. Please try again later.` | Same rule for unknown failures. |
| `err.answer_long` | `That answer is very long. Shorten it to the part you would actually say out loud.` | `That answer is very long. Keep the part that best shows what you did.` | Gives concrete editing advice without prescribing speech. |

Every `Current message` above was checked character for character against
`src/lib/copy.js` on the working tree. All thirteen match, so the replacements
apply mechanically.

### What stays, and why

`result.ready_line` keeps its current wording, `You answered every question and
your answers were strong. Go in and say them the same way.` It is the one
remaining visible string that mentions speaking, and it is deliberately kept.
It describes the real interview a person is about to walk into rather than
prescribing how they practise here. Do not change it, and do not raise it again
as an audit miss.

### The rest of the deck

Inspect all remaining response, result, error, warning, file, privacy, action
and empty-state messages. They should be short, direct, compassionate and
plain-language. A message may say what happened and what a person can do next.
It must not make claims about model speed, queue position, a service recovery
time, or a required input mode. Do not change data contracts, tool names, or
the technical distinction that a ChatGPT update reached the page.

### What done looks like

- The thirteen replacements appear in `src/lib/copy.js` and in the matching
  design-document copy deck, and the two files agree.
- No fixed-time or voice-required message remains in a visible string, with
  `result.ready_line` as the one documented exception above.
- A person can understand every screen without ChatGPT and can choose typing,
  speaking, or a mixture without the interface judging that choice.
- A test asserts the deck against the replacement table, following the source
  text pattern described in T37 rather than adding a test framework.
- `npm test` and `npm run build` both pass.

### Out of scope

No SVG, no wordmark component, no motion, no layout change, and no new screen.
Those are T37. No changes to inference, session data, WebMCP tools, scoring, or
deployment.

## T37 in detail

Dry Run is a safe rehearsal before something that matters. The interface must
look awake and cared for without feeling busy, scored, technical, or like a
test. This task adds a small visual language rather than a collection of
unrelated decorations.

T37 **supersedes the wordmark and motion details in `dev-diary/design.md`
sections 8.5, 9.1, 9.2, 11.1 and 12** where they conflict. The paper-white,
pine-green, Lexend, Source Sans 3, single-column, soft-card, and accessibility
decisions remain unchanged.

### The identity: an open path, not a test

Create `src/lib/Brand.svelte`. It contains one semantic text label, `Dry Run`,
plus a decorative inline SVG. Do not render the product name as an SVG path.
Text must remain selectable, translatable, and readable at browser zoom.

The SVG is the **Open Path mark**:

- 28 by 28 CSS pixels beside the wordmark, with `viewBox="0 0 28 28"`,
  `aria-hidden="true"` and `focusable="false"`.
- A single 2px, round-capped, round-joined pine-green line begins low and left,
  follows a gentle upward curve, and opens toward the upper right. It must not
  form an arrow, tick, road sign, stopwatch, microphone, terminal cursor, or
  a grade.
- A small calm round point sits just beyond the path. It is a destination or a
  morning light, not a success indicator. The open space between line and
  point is intentional, because preparation continues after the screen ends.
- `Dry` is Lexend 500 and `Run` is Lexend 600. Both are sentence case and
  `--strong`, with a 0.01em positive tracking only if the actual rendered
  pair needs it. There is no all-caps alternate, logo glow, gradient, or
  handwritten face.
- The mark uses `currentColor`, so it is one colour by default and remains
  legible in print and high-contrast settings. It never conveys status by
  colour alone and it is never used as the only label for a control.

### The mark mounts once, in the app shell

`src/App.svelte` swaps whole screens with `{#if session.phase === ...}`, so
every screen component unmounts when the phase changes. Each screen renders its
own wordmark today, which `src/lib/GettingReady.svelte` line 12 shows.

Put `Brand` in `src/App.svelte` above the `{#if}` block, so it mounts once per
session and draws once. Remove the per-screen wordmark from Start, Getting
ready, Your practice, Practice and Your tips. Move the screen-top padding to
the shell so the 24px spacing in design.md 9.1 to 9.5 still holds.

This resolves an ambiguity in the original brief and is a decision, not a
suggestion. A per-screen `Brand` would redraw on all five phase changes and
again on every `Try again` loop, which contradicts the short welcome the mark
is meant to be.

The draw itself is a one-time welcome. Draw the path once from left to right on
mount and fade the point in after it. Do not replay it on a reactive update. At
rest, the point may make one barely perceptible, slow brighten-and-settle cycle
while the Start screen is showing, and it must not pulse on the practice or
tips screens.

### SVG roles by screen

The same path language should make the product feel joined up. Create at most
three additional small, inline SVG components. Use CSS for simple circles,
rules, and bars. Do not add an icon library, image dependency, raster asset, or
decorative illustration that pushes the task below the fold on a 360px screen.

| Surface | Visual role | Behaviour |
|---|---|---|
| App shell | Open Path mark beside the wordmark, above every screen. | The one-time welcome draw described above. No animated hero illustration. |
| Getting ready | A 48px `PathPulse` made from the same curved line and point. | A small dot travels along the path and settles back at the beginning while work is pending. This is an indeterminate activity cue, never a progress estimate or a staged sequence. |
| Your practice | Keep the existing plain list markers and source-quote rule. Add no icon to the question cards. | The shell wordmark provides continuity. Reading the job detail stays more important than decoration. |
| Practice | Keep the eight progress segments and their text label. A tiny, decorative open-path cue may sit in the ChatGPT line only. | It draws once when an external page update arrives, alongside and not instead of the live status words. It must never imply that ChatGPT is required. |
| Feedback and tips | A small static path-to-point accent may sit beside the feedback or result title when space permits. | It fades in with the existing note or panel. It is not a tick, trophy, star, traffic light, or readiness grade. |

All SVGs use `currentColor`, have a viewBox and no fixed fill colours, do not
fetch external resources, do not use SMIL, and are decorative unless they carry
a stated status. Any SVG that carries status needs a text equivalent and an
accessible name. The preferred T37 design keeps them all decorative.

### Motion: a calm signal of change, never a countdown

Movement must explain a state change or offer gentle orientation. It must not
perform continuously merely to make the product seem active. Text itself does
not shimmer, type itself out, bounce, or continually fade. When a message
changes, its container or accompanying path mark may move very slightly while
the text stays readable and stable.

| Moment | Motion | Rules |
|---|---|---|
| App first loads | Open Path draws once in the shell. Wordmark is already visible. | A welcome, not a page transition. No delayed heading or blocked reading. Screen changes after this do not redraw it. |
| Questions are being built | `PathPulse` loops as an indeterminate cue, with the copy from T36. | No percentage, no numbered stages, no elapsed timer, no estimated duration, and no completion promise. Stop and remove the loop as soon as the request settles. |
| New question | Existing card cross-fade, with a 4px upward settle. | Keep it brief. Preserve focus and do not animate the answer text itself. |
| Answer feedback | Existing feedback note fade-in and 4px rise, with the optional path accent fading alongside it. | The accent is neutral, so a low feedback band never feels like failure. |
| ChatGPT page update | Existing wash flash plus a one-time path draw in the ChatGPT line. | Status words are the signal and motion is supplementary. Do not attach a hard-coded dwell time to the words or imply speaking. |
| Progress and result | Existing score-bar fill, with a single path accent settling into view with a result panel. | Never count up a number, animate a grade, or turn the result into a celebration or warning. |
| Button interaction | Keep the existing gentle press response. | No hover lift, spring, scale, or confetti. |

Do not use JavaScript timers merely to manage a decorative animation. Use CSS
animation events or component mount state where necessary. A status flash may
return to its resting state, but its message must never disappear before a
screen reader has a chance to announce it.

### Reduced motion needs a static fallback in every component

`src/app.css` line 209 already forces `animation-duration: 0.01ms !important`,
`animation-iteration-count: 1 !important` and the same treatment for
transitions. **That global block is not sufficient for this task.** Relying on
it alone produces the exact failure the criteria below forbid.

A path draw built on `stroke-dashoffset` starts hidden and ends visible. Under
the global rule the animation still runs and simply finishes in 0.01ms. If
`animation-fill-mode: forwards` is missing, the mark snaps back to its resting
state, which is the hidden one, and the path never appears at all. `PathPulse`
is worse, because it loops. `animation-iteration-count: 1` stops its dot
wherever a single pass leaves it rather than at rest.

Write each fallback as a plain static property inside the component's own
`@media (prefers-reduced-motion: reduce)` block. Set `stroke-dashoffset: 0`,
give the point its full opacity, and place the pulse dot at rest. Do not try to
correct this by adjusting the animation, because the global declarations carry
`!important` and cannot be overridden from a component.

With reduced motion enabled the result must be that every mark is complete,
`PathPulse` is a plain still path and point, feedback and question changes
appear instantly, and all status words remain available.

### Tests follow the harness that already exists

`npm test` runs `node --test` and nothing else. There is no Vitest, no Testing
Library and no Playwright in this project. **Do not add one.**

Two patterns already exist and together they cover what T37 needs. Most tests
read a `.svelte` file as text and assert against it with a regular expression,
as `test/resume-foundation.test.mjs` does from line 50, where it reads each
component with `readFileSync` and then matches against the text. That pattern suits the
`aria-hidden` checks, the absence of a duplicate accessible product name, and
the presence of the reduced-motion blocks. For anything needing a real layout,
`test/file-chooser-browser.test.mjs` starts Vite on a free port, spawns
headless Chrome, and drives it over the DevTools protocol through a small
hand-rolled WebSocket client. Copy that file as the starting point.

That browser harness is also the way to check 360px, 200% zoom and 900px. Set
the viewport over the protocol and assert that `scrollWidth` never exceeds
`clientWidth` on the document element.

### What done looks like

- Every screen shows the one accessible `Brand` component from the app shell,
  and the product name remains real text beside a decorative Open Path SVG.
- The mark draws once per session, not once per phase change.
- At 360px, 200% zoom, and 900px, the new mark never causes clipping,
  horizontal scrolling, reflow surprises, or a second visual hierarchy above
  the task.
- The loading state feels active without a number, a stage list, an estimated
  wait, or a false promise about inference completion.
- Motion is visibly present at the specified state changes, has a reason in
  each location, and is quiet enough that the question and feedback remain the
  focus.
- `prefers-reduced-motion: reduce` shows static, complete SVGs and instant
  state changes, with no frozen partial path and no stalled pulse dot.
- Keyboard focus, live-region announcements, print output, and all existing
  contrast and touch-target requirements still pass.
- Tests cover decorative SVG accessibility, the motion classes or state
  transitions, and the reduced-motion render, using the harnesses above and no
  new dependency.
- `npm test` and `npm run build` both pass.

### Out of scope

No new product mascot, illustration set, marketing redesign, icon library,
audio feature, input-mode detection, external SVG fetch, animated numeric
scores, fake progress, or model-timing instrumentation. No copy changes, which
are T36. No changes to inference, session data, WebMCP tools, scoring, or
deployment. T37 is a visual-language and interaction-polish task.

## What the sizes mean

Size is relative effort and uncertainty, not duration. It is driven by three
things: how many files the task touches, whether it needs a live model call to
verify, and how many distinct failure paths it has to handle.

- **S** One file or one surface. No live verification needed. Few or no failure paths.
- **M** Several files, or one file with several states. Usually needs a deploy to check.
- **L** A new subsystem, or many failure paths, or work that needs live iteration to get right.

An L is not necessarily longer than an M. It carries more ways to be wrong.

## T13 to T20 is one block

Those eight tasks are a single overnight unit for one agent, not eight separate
jobs. They share `src/app.css`, `src/App.svelte` and the copy deck, so splitting
them across agents means merge pain for no gain.

The full specification is `dev-diary/design.md`. Every task above cites the
section it implements. The agent should not invent a colour, a string, or a
dimension. If something is missing from the design doc, that is a bug in the
design doc and worth saying so rather than guessing.

Build order inside the block is T13, T14, T16, T17, T15, T18, T19, T20. That is
not numeric order. It front-loads the screens that prove the design works and
leaves states and motion last, so a short night still ends with something whole.

**Nothing in this block touches Netlify.** Every screen renders
`src/lib/example.json`, which is bundled, so `npm run dev` and `npm run build`
are enough. There is no function call and no gateway call.

Two traps to avoid. Do not run `netlify deploy --prod`, because production
deploys cost 15 credits while draft deploys are free. And if you do hit
`/api/analyze` from the dev server it returns 502 wrapping a free-tier 403, which
is expected and is not a bug in this block. Do not spend the night fixing it.

## What cannot run in parallel

- **T03 to T06.** A sequential gate.
- **T07 before everything downstream.** Four tracks read these shapes.
- **T09 to T12.** One file, `netlify/functions/analyze.mts`.
- **T25 to T30.** One file, `src/lib/session.svelte.js`. Logically independent,
  but they queue behind each other.
- **T13 before the rest of the interface.** Every component reads the tokens.
- **T35 before T36 and T37.** Not a logical dependency. T35 edits
  `src/lib/copy.js` and `src/lib/Plan.svelte`, T36 edits the copy deck, and
  T37 strips the wordmark out of `Plan.svelte`. Land T35 first so the working
  tree is clean, or the recovery path for a bad T36 or T37 run destroys T35
  along with it.

## What can run in parallel

Once T07 and T08 land, the four tracks are genuinely independent. The interface
builds against the fixture. Resume touches nothing else. Function and state
meet only at the HTTP boundary that T07 already fixed.

Inside a track, read the dependency column rather than assuming a queue. T21
and T22 are parallel. So are T09 and T10, and T13 and T16.

T36 and T37 are parallel once T35 lands. That is the reason they are two rows.
T36 touches `src/lib/copy.js` and the section 11 deck in `dev-diary/design.md`.
T37 touches `src/App.svelte`, the screen components, and new files under
`src/lib`. The two sets do not intersect. Do not split T37 further, because
the SVG markup, the draw behaviour and the reduced-motion fallbacks are one
problem and separating them means one agent reworks the other's paths.

## Critical path

```
T04 -> T05 -> T06 -> T07 -> T08 -> T15 -> T19 -> T32 -> T33 -> T34
```

T03 runs alongside T04 and T05 rather than on the line, because it only proves
the code locally.

T34 is the last item on the path that this plan covers. The submission itself, including the video and the Devpost entry, is out of scope for this file.
