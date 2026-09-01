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

| ID | Track | Task | Needs | Blocks |
|---|---|---|---|---|
| T01 | Submission | Source the real job posting that ships as the worked example. **Done.** Walmart Connect, Manager Technical Writing, saved to `dev-diary/example-posting.md`. | none | T08 |
| T02 | Gate | Give `set_posting` a real `execute` handler. Store the posting, flip `session.phase`, render the change. No inference. **Done.** | none | T03 |
| T03 | Gate | Confirm the tool registers and invokes. **Done.** Verified on the live origin in Chrome 152 with NO flag, driven over the DevTools protocol. `getTools()` returns our tool and `executeTool` ran the handler, flipping the page to `phase: ready`. | T02 | T06 |
| T04 | Gate | Settle the production origin. **Done.** `dryrun.nryn.dev`, wired as a grey-cloud CNAME in Cloudflare, certificate issued, serving 200. | none | T05 |
| T05 | Gate | Register the WebMCP origin trial token and serve it. **Done.** Two tokens, one per origin, both expiring 17 Nov 2026, delivered comma-separated in a single `Origin-Trial` header and verified live on both hosts. | T04 | T06 |
| T06 | Gate | Confirm on the deployed origin inside ChatGPT's in-app browser. **Done.** ChatGPT listed the site tools, called `set_posting`, and the page flipped to `Agent connected` with `phase: ready` untouched by hand. Gate closed. | T03, T05 | T07, T35 |
| T07 | Shapes | Fix the JSON shapes in one module: `Brief`, `Question`, `FitMatch`, `AnswerScore`, `Verdict`. `Question` must carry `sourceQuote`. | T06 | T08, T09, T10, T13, T21, T22, T25 |
| T08 | Shapes | Hand-write the example fixture. **Done.** `src/lib/example.json`, validated against `shapes.js`. Eight questions with verbatim quotes, fit match ordered by gap size, three scored answers demonstrating the coverage cap. | T01, T07 | T12, T15, T17, T18 |
| T09 | Function | Brief task. Fixed prompt plus structured output schema. Posting and optional resume produce brief, eight questions, fit match. | T07 | T11, T12, T25, T26 |
| T10 | Function | Score task. Fixed prompt plus structured output schema. One answer produces four axis scores, missed points, model answer. | T07 | T11, T12, T28 |
| T11 | Function | Handle a malformed or refused response without breaking the session. | T09, T10 | T32 |
| T12 | Function | Measure real token cost against the example posting and check it against the credit budget. | T08, T09, T10 | none |
| T13 | Interface | `app.css`. Tokens, `color-scheme: dark`, the three faces, hard borders, zero radius. | T07 | T14, T16 |
| T14 | Interface | Question card, including the source quote treatment. | T13 | T15, T17, T18 |
| T15 | Interface | Adjudication screen. Answer log, agent status strip, rubric quadrants, running average. | T08, T14 | T19, T20 |
| T16 | Interface | Console screen. Posting input, character counter, resume input, privacy copy. **Must render `session.posting` itself, not a local draft.** The T02 screen bound the textarea to a local variable, so an agent-set posting left the box looking empty while the page reported 166 chars. A judge reads that as broken. | T13 | T19 |
| T17 | Interface | Briefing screen. Brief, question list, fit match. | T08, T14 | T19 |
| T18 | Interface | Report screen. Verdict band, per-question answer, missed points, model answer. | T08, T14 | T19 |
| T19 | Interface | The nine states from the design reference, with their exact copy. | T15, T16, T17, T18 | T32 |
| T20 | Interface | Motion. Score count-up, quadrant flash, and `prefers-reduced-motion`. | T15 | none |
| T21 | Resume | Install `pdfjs-dist`, wire the same-origin worker, extract text in the browser. | T07 | T23 |
| T22 | Resume | Accept pasted text and uploaded `.txt` and `.md`. | T07 | T23, T24 |
| T23 | Resume | The four failure modes: scanned PDF, locked PDF, over-long resume, not a resume. Each needs its own message. | T21, T22 | T33 |
| T24 | Resume | Privacy copy beside the file picker. | T22 | T33 |
| T25 | State | `setPosting`. Replace the T02 gate body with a real call to the function. Store brief and questions, handle the error paths. | T07, T09 | T26, T27, T31 |
| T26 | State | `setResume`. Store resume text, store fit match, re-aim roughly a third of the questions. | T09, T25 | T31 |
| T27 | State | `getBrief` and `startInterview`. | T25 | T28, T31 |
| T28 | State | `submitAnswer`. Score, store, advance the index, return the next question or the verdict. | T10, T27 | T29, T31 |
| T29 | State | `getVerdict`. Band from the average, then apply the coverage cap so a skipped session can never read as ready. | T28 | T30, T31 |
| T30 | State | Persist to `localStorage` and restore on load. | T29 | T32 |
| T31 | State | Register the remaining five tools with schemas, descriptions and annotations. `submit_answer` must state that the transcript is the user's spoken answer. **Verified API contract, which differs from every published example:** `executeTool` takes the RegisteredTool object, and its arguments as a **JSON string**, not an object. `getTools()` returns a Promise. `inputSchema` comes back as a string. `annotations.readOnlyHint` auto-populates as `false` when omitted, which is the side-effect signal we want. Details in `dev-diary/example-posting.md`. | T25, T26, T27, T28, T29 | T32 |
| T32 | Integration | Wire the interface to real state. Keep the fixture only as the function-down path. | T11, T19, T30, T31 | T33, T36, T37 |
| T33 | Integration | Full run end to end in ChatGPT's in-app browser, using the judge path from the spec. **Three preconditions, every one of them silent when unmet:** ChatGPT must run **GPT-5.6 Sol or Terra**, because Luna has WebMCP disabled and simply shows no tools. Site tools are unavailable in **Enterprise and Edu** workspaces. Availability is also rollout-dependent. Cheaper pre-check: drive headless Chrome over the DevTools protocol, or `--headless --dump-dom`, to confirm registration before opening the app. | T23, T24, T32 | T34, T38 |
| T34 | Integration | Production deploy, then re-verify headers, the origin trial token and the gateway against the live URL. | T33 | none |
| T35 | Submission | Write the English description covering WebMCP fit. | T06 | T39 |
| T36 | Submission | Reconcile the stale `Stack` and `Resume ingestion` sections of `project.md` with what we actually built. | T32 | none |
| T37 | Submission | Write the demo video script against the judge path. | T32 | T38 |
| T38 | Submission | Record and upload the video. Under three minutes, with audio. **Set ChatGPT to Sol or Terra before recording.** On Luna the tools vanish from the capture with nothing on screen to explain why. | T33, T37 | T39 |
| T39 | Submission | Submit on Devpost. | T35, T38 | none |

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

## What cannot run in parallel

- **T03 to T06.** A sequential gate.
- **T07 before everything downstream.** Four tracks read these shapes.
- **T09 to T12.** One file, `netlify/functions/analyze.mts`.
- **T25 to T30.** One file, `src/lib/session.svelte.js`. Logically independent,
  but they queue behind each other.
- **T13 before the rest of the interface.** Every component reads the tokens.
- **T38.** It needs a working app, so it sits at the tail with T39 behind it.

## What can run in parallel

Once T07 and T08 land, the four tracks are genuinely independent. The interface
builds against the fixture. Resume touches nothing else. Function and state
meet only at the HTTP boundary that T07 already fixed.

Inside a track, read the dependency column rather than assuming a queue. T21
and T22 are parallel. So are T09 and T10, and T13 and T16.

## Critical path

```
T04 -> T05 -> T06 -> T07 -> T08 -> T15 -> T19 -> T32 -> T33 -> T37 -> T38 -> T39
```

T03 runs alongside T04 and T05 rather than on the line, because it only proves
the code locally. T04 and T38 are the two items on the path that need you.
