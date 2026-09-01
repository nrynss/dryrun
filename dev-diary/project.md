# Dry Run

**The interview before the interview.**

Paste the job posting. Optionally add your resume. Dry Run reads both and works out what
this role wants. It also finds where you are thin. Then it hands ChatGPT a set of grounded
questions. ChatGPT runs the interview out loud. Dry Run scores what you said.

Built for the OpenAI WebMCP Challenge (submissions close 3 September 2026, 13:00 PT).

---

## The job

Interview prep is generic in a way the interview never is. People rehearse against lists of
stock questions. *Tell me about yourself.* *Your greatest weakness.* Then they walk into a
room where the questions are about **this** posting, at **this** company, for **this** role.

ChatGPT is already a good improvising interviewer. On its own it cannot hold a rubric and a
running score across forty minutes. It drifts, it flatters you, and it loses track of which
of eight questions you have answered. Three turns later it no longer remembers the posting.

Dry Run is the half ChatGPT is bad at. The page holds the ground truth. That means the
posting, the brief, the question set, the rubric and the scores. ChatGPT brings the
conversation.

**The agent interviews. The page adjudicates.**

---

## Who, utility, output

| | |
|---|---|
| **Who** | Anyone with an interview booked in the next week and a posting in front of them. |
| **Utility** | Rehearse the questions you will actually face. Find out where you are weak while it still costs nothing. |
| **Output** | A brief covering what the role owns, what to study and what they will push on. Then a scored session giving your answer, what you missed and a model answer for each question. |
| **What they ship** | A verdict they can act on tonight. |

---

## How it works

1. Paste the job posting. Optionally upload or paste your resume.
2. Dry Run generates a **brief**. It covers what the role owns, what to study and the angles
   they will push on. It also generates **eight questions**, each carrying the line of the
   posting it came from.
3. With a resume, it also produces a **fit match**. This lists what you have evidenced and
   what the posting asks for that you have not. It orders them by the size of the gap.
   Roughly a third of the questions then aim at those gaps.
4. ChatGPT asks the questions out loud. You answer out loud.
5. The page scores each answer against a fixed rubric as it lands, and updates while you talk.
6. A verdict: band, per-question scores, missed points, model answers.

Every step is also a button. A human with no agent gets the same product by tapping.

---

## The split

This is the whole architecture, and it is the reason the project fits WebMCP.

| | Runs where | Does what |
|---|---|---|
| **The interview** | The user's ChatGPT | Asks, listens, improvises follow-ups, transcribes |
| **The analysis** | Our Netlify function | Posting → brief, questions, fit match. Answer → score |
| **The state** | The page | Session, which question, running scores, the rubric |

We never pay for the conversation. The token-heavy, many-turn part runs on the user's own
ChatGPT. Our inference is a handful of fixed-prompt, structured-output calls. Our prompts
stay static and testable. Nothing on our side is conversational.

**The questions we return are the interview.** ChatGPT can only be as good as the set we
hand it. That makes brief-and-questions the quality-critical call. It runs once per session
against eight scoring calls.

---

## WebMCP tools

Tools wrap code the page already has. The page must never tell a human and an agent
different things. Both callers go through the same functions in `data.js`.

| Tool | What it does | Annotations |
|---|---|---|
| `set_posting` | Store the posting, generate brief + questions | `untrustedContentHint` |
| `set_resume` | Optional. Store resume text, generate fit match | `untrustedContentHint` |
| `get_brief` | What the role owns, what to study, angles they will push | `readOnlyHint` |
| `start_interview` | Begin the session, return Q1 | None |
| `submit_answer` | Score one answer, return the next question or the verdict | None |
| `get_verdict` | Band, per-question scores, missed points, model answers | `readOnlyHint` |

Folding the question advance into `submit_answer` keeps it to one tool call per exchange.
Eight rounds is eight calls, with the card advancing and the score moving each time.

Omitting `readOnlyHint` signals that a call has side effects, which prompts the agent to
confirm. We omit it on everything that costs inference or mutates the session.

`submit_answer`'s description must state that the transcript is **the user's spoken answer**.
An agent that answers its own interview questions is a broken demo.

---

## v1 (this contest)

**In**

- Paste-a-posting. Character cap, useful error above it.
- Resume: paste text, or upload `.txt` / `.md` / `.pdf`. All three on day one. The browser
  extracts the text, and the file itself never leaves the machine.
- Brief, eight grounded questions, optional fit match.
- Live scoring per answer against a fixed rubric.
- Verdict with missed points and model answers.
- One pre-baked example posting ships as static JSON, with its brief and questions already
  generated. The demo still works even if the function is down.
- Public repo, Apache-2.0 license, <3 min demo video.

**Out**

- Scraping the posting from a URL. CORS blocks it from the page. LinkedIn's anti-bot blocks
  it from a function. It also puts automated access on our infrastructure. Paste does the
  same job without any of that. *An agent in ChatGPT's browser can read the posting itself
  using the user's own session and hand us the text. We document that as upside and never
  depend on it, because a judge may not be logged in.*
- TTS and STT. ChatGPT is already a voice surface. The entire audio stack is unnecessary.
- Accounts, database, saved history. Session lives in the page and `localStorage`.

---

## Scoring

Fixed axes, 1–5 each: **specificity**, **evidence**, **structure**, **relevance to the
posting**. Plus the key points missed, which we derive from the brief.

Honest in one direction only. A session where most questions were skipped can never read as
ready, however well the few answers scored. If the content average is 1, it says 1.

Every question carries a `sourceQuote` from the posting, and the page renders it underneath.
That quote proves this is not a chatbot with a prompt, and it costs one field in the schema.

---

## Resume ingestion

Three inputs, all on day one: paste, `.txt` / `.md`, and `.pdf`.

Mozilla pdf.js extracts PDF text **in the browser**. We vendor it into `assets/vendor/`
rather than pull it from a CDN. It ships as ES modules, which fits a no-build project, and
vendoring keeps the site self-contained. `GlobalWorkerOptions.workerSrc` points at the
same-origin worker. Extraction runs `getDocument().promise`, then `getTextContent()` per
page, then joins `item.str`.

The failure modes are the whole job, and each needs its own message:

| Case | Behaviour |
|---|---|
| Scanned / image-only PDF | Near-zero extracted characters. Detect it and say so: "this looks like a scan, so paste the text instead." Never send an empty resume to analysis. |
| Password-protected | Catch it and ask for an unlocked copy. |
| Very long | Cap at 20,000 characters, keep the head, say what was dropped. |
| Not a resume at all | Analysis returns low confidence. Say so rather than inventing a fit match. |

An agent cannot upload a file, so `set_resume` takes text. The file picker is a human-path
affordance that extracts text and calls the same function. That is the same parity rule as
everything else.

---

## Inference

Netlify AI Gateway. No API keys anywhere. Netlify injects them into the function at runtime.
So the repo has no `.env` to fill in, and a judge can deploy it as-is.

Model: `gpt-5.6-luna` ($0.20 in / $1.20 out per MTok). Structured outputs on every call. A
malformed response mid-interview breaks the session in front of a judge. The
numbers below are planning estimates, not T12 evidence; the bounded-preview
record is [t12-measurement-template.md](t12-measurement-template.md).

| | Tokens | Cost |
|---|---|---|
| Brief + questions (+ fit match) | ~2.3k in / 1.5k out | $0.0023 |
| 8 × scoring | ~10.8k in / 3.2k out | $0.0060 |
| **Per session** | | **~$0.008 → ~1.5 credits** |

The input contract is exact: a brief accepts a posting up to 20,000 characters
and an optional resume up to 20,000 characters independently; a score accepts
at most 12,000 characters across its answer, question, and brief context. Each
score request accepts the complete saved `Question` returned by a brief
(`id`, `prompt`, `sourceQuote`, and boolean `targetsGap`) and rejects unknown
question fields. The provider receives only the question prompt and verbatim
source quote needed to ground scoring; session metadata such as its ID and
gap-target flag never affects the model prompt. Each
brief provider attempt is capped at 1,800 output tokens and each score attempt
at 450, with no more than two explicit attempts and a 10-second attempt timeout.
After JSON parsing, the function independently enforces the same strict schema:
exact object keys, required nested structure, string and array bounds, score
integers, and the source-quote/resume invariants. Invalid provider output is
retried once and then returns a fixed safe error. The resulting output ceiling
and the live-cost evidence format are recorded in
[t12-measurement-template.md](t12-measurement-template.md); its bounded brief
uses the exact documented worked-example posting. Judging runs
4–21 September and we cannot redeploy, so these limits—not rate limiting—are
the request-level spend guard.

If question quality disappoints in testing, upgrading the single brief-and-questions call is
cheap and does not touch the scoring budget.

---

## Stack

No build step. Three ES modules plus one function. The source is the documentation, and
judges read repos.

```
index.html
assets/webmcp.js   tool declarations and registration
assets/data.js     the capabilities. Both the UI and the tools call these.
assets/ui.js       rendering
assets/resume.js   file → text. Wraps vendored pdf.js.
assets/vendor/     pdf.mjs + pdf.worker.mjs, vendored not CDN'd.
netlify/functions/analyze.mts   the only server code. Proxies AI Gateway.
```

`document.modelContext.registerTool(definition, { signal })` is the primary call, because the
challenge rules specify that literal form. `?? navigator.modelContext` is the compatibility
fallback for older Chromium, never the other way round. We register tools before first
render. The page stays fully usable when `modelContext` is absent.

Tools that mutate dispatch a `CustomEvent` so the UI re-renders. The user watches the page
move while the agent works.

---

## Privacy

The resume is personal data, and we treat it that way. **The uploaded file never leaves the
machine.** pdf.js extracts the text in the browser, and only that text reaches the function
as analysis input. The page holds it in `localStorage` and never stores or logs it
server-side. There is no account to attach it to and no table to leak.

The page says so plainly, next to the file picker, because a stranger's site asking for your
resume has to earn it.

---

## Hosting

Netlify. Two response headers, both verified against a working WebMCP site:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Origin-Agent-Cluster = "?1"
    Permissions-Policy = "tools=(self)"
```

Chrome exposes WebMCP only in origin-isolated documents, so the site must send
`Origin-Agent-Cluster: ?1`. `Permissions-Policy: tools=(self)` already defaults to this
value, and we set it explicitly.

AI Gateway needs at least one production deploy to activate. Publish early, then iterate on
branch deploys, which Netlify does not meter.

Working URL: `dryrun.nryn.dev` or a Netlify subdomain. Settle it before registering an origin
trial token, which would let the site work in ordinary Chrome without the flag.

---

## Name

**Dry Run.** A dry run is a full rehearsal under real conditions with nothing at stake, which
is exactly the product. Plain English, instantly apparent, no gloss needed.

Other names in this space are worked over. Abhyas, Samvad/Samwaad, HotSeat, Final Round and
Greenroom are all live AI interview-prep products. Dry Run is not.

This is unrelated to `rehearsal.nryn.dev`, which is a different application. It has a
different interaction model, no scraping and no audio stack. Here the agent interviews you
rather than a synthesised voice. New name, new repo, new code.

---

## Contest notes

- Challenge: [webmcp.devpost.com](https://webmcp.devpost.com/)
- Submission closes 3 September 2026, 13:00 PT. Judging 4–21 September. Winners ~23 September.
- Need: live URL, public repo with a GitHub-detectable open source license, English
  description covering WebMCP fit, <3 min demo video with audio on YouTube.
- Repo must contain the literal `document.modelContext.registerTool({...})` call.
- Judges may score on the description and video alone without testing. The video carries
  disproportionate weight.
- Judged on four equally weighted criteria: WebMCP Leverage, Execution, Potential Impact,
  and Creativity & Ambition.
- After 3 September, 13:00 PT: do not touch the submission, the repo, or the live site.

**Demo path for judges:** paste a real posting → brief appears → "interview me" → ChatGPT
asks aloud while the card advances and the score moves → verdict. Second beat: add a resume,
watch the questions re-aim at the gaps.
