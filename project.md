# Dry Run

**The interview before the interview.**

Paste the job posting. Optionally add your resume. Dry Run reads both, works out what this
role actually wants and where you are thin, and hands ChatGPT a set of grounded questions.
ChatGPT runs the interview out loud. Dry Run scores what you said.

Built for the OpenAI WebMCP Challenge (submissions close 3 September 2026, 13:00 PT).

---

## The job

Interview prep is generic in a way the interview never is. People rehearse against lists —
*tell me about yourself*, *your greatest weakness* — then walk into a room where the questions
are about **this** posting, at **this** company, for **this** role.

ChatGPT is already a good improvising interviewer. What it cannot do on its own is hold a
rubric and a running score across forty minutes without drifting, flattering you, or losing
which of eight questions you have already answered. It has no memory of the posting three
turns later.

Dry Run is the half ChatGPT is bad at. The page holds the ground truth — the posting, the
brief, the question set, the rubric, the scores. ChatGPT brings the conversation.

**The agent interviews. The page adjudicates.**

---

## Who, utility, output

| | |
|---|---|
| **Who** | Anyone with an interview booked in the next week and a posting in front of them. |
| **Utility** | Rehearse the questions you are actually going to be asked, and find out where you are weak while it still costs nothing. |
| **Output** | A brief (what the role owns, what to study, what they will push on), then a scored session: per question, your answer, what you missed, and a model answer. |
| **What they ship** | A verdict they can act on tonight. |

---

## How it works

1. Paste the job posting. Optionally upload or paste your resume.
2. Dry Run generates a **brief** — what the role actually owns, what to study, the angles
   they are likely to push on — plus **eight questions**, each carrying the line of the
   posting it came from.
3. With a resume, it also produces a **fit match**: what you have evidenced, what the posting
   asks for that you have not, ordered by the size of the gap. Roughly a third of the
   questions then aim at those gaps.
4. ChatGPT asks the questions out loud. You answer out loud.
5. Each answer is scored against a fixed rubric as it lands. The page updates while you talk.
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

We never pay for the conversation — the token-heavy, many-turn part runs on the user's own
ChatGPT. Our inference is a handful of fixed-prompt, structured-output calls. Our prompts are
static and testable; nothing on our side is conversational.

**The questions we return are the interview.** ChatGPT can only be as good as the set we hand
it, which makes brief-and-questions the quality-critical call — and it is one call per
session against eight scoring calls.

---

## WebMCP tools

Tools wrap code the page already has. A human and an agent must never be told different
things — both callers go through the same functions in `data.js`.

| Tool | What it does | Annotations |
|---|---|---|
| `set_posting` | Store the posting, generate brief + questions | `untrustedContentHint` |
| `set_resume` | Optional. Store resume text, generate fit match | `untrustedContentHint` |
| `get_brief` | What the role owns, what to study, angles they will push | `readOnlyHint` |
| `start_interview` | Begin the session, return Q1 | — |
| `submit_answer` | Score one answer, return the next question or the verdict | — |
| `get_verdict` | Band, per-question scores, missed points, model answers | `readOnlyHint` |

Folding the question advance into `submit_answer` keeps it to one tool call per exchange.
Eight rounds is eight calls, with the card advancing and the score moving each time.

Omitting `readOnlyHint` is the signal that a call has side effects, which is what prompts the
agent to confirm. It is absent on everything that costs inference or mutates the session.

`submit_answer`'s description must state that the transcript is **the user's spoken answer**.
An agent that answers its own interview questions is a broken demo.

---

## v1 (this contest)

**In**

- Paste-a-posting. Character cap, useful error above it.
- Resume: paste text, or upload `.txt` / `.md` / `.pdf`. All three on day one. Text is
  extracted in the browser; the file itself never leaves the machine.
- Brief, eight grounded questions, optional fit match.
- Live scoring per answer against a fixed rubric.
- Verdict with missed points and model answers.
- One pre-baked example posting shipped as static JSON, brief and questions already
  generated, so there is a working demo even if the function is down.
- Public repo, Apache-2.0 license, <3 min demo video.

**Out**

- Scraping the posting from a URL. CORS blocks it from the page, LinkedIn's anti-bot blocks
  it from a function, and it puts automated access on our infrastructure. Paste is the same
  job without any of that. *An agent in ChatGPT's browser can read the posting itself using
  the user's own session and hand us the text — documented as upside, never depended on,
  because a judge may not be logged in.*
- TTS and STT. ChatGPT is already a voice surface. The entire audio stack is unnecessary.
- Accounts, database, saved history. Session lives in the page and `localStorage`.

---

## Scoring

Fixed axes, 1–5 each: **specificity**, **evidence**, **structure**, **relevance to the
posting**. Plus the key points missed, derived from the brief.

Honest in one direction only. A session where most questions were skipped can never read as
ready, however well the few answers scored. If the content average is 1, it says 1.

Every question carries a `sourceQuote` from the posting, rendered under it. That is the proof
this is not a chatbot with a prompt, and it costs one field in the schema.

---

## Resume ingestion

Three inputs, all on day one: paste, `.txt` / `.md`, and `.pdf`.

PDF text is extracted **in the browser** with Mozilla pdf.js, vendored into `assets/vendor/`
rather than pulled from a CDN — it ships as ES modules, which fits a no-build project, and
vendoring keeps the site self-contained. `GlobalWorkerOptions.workerSrc` points at the
same-origin worker. Extraction is `getDocument().promise` → per page `getTextContent()` →
join `item.str`.

The failure modes are the whole job, and each needs its own message:

| Case | Behaviour |
|---|---|
| Scanned / image-only PDF | Near-zero extracted characters. Detect it and say so — "this looks like a scan; paste the text instead." Never send an empty resume to analysis. |
| Password-protected | Catch and ask for an unlocked copy. |
| Very long | Cap at 20,000 characters, keep the head, say what was dropped. |
| Not a resume at all | Analysis returns low confidence; say so rather than inventing a fit match. |

An agent cannot upload a file, so `set_resume` takes text. The file picker is a human-path
affordance that extracts text and calls the same function — same parity rule as everything
else.

---

## Inference

Netlify AI Gateway. No API keys anywhere — Netlify injects them into the function at runtime,
so the repo has no `.env` to fill in and a judge can deploy it as-is.

Model: `gpt-5.6-luna` ($0.20 in / $1.20 out per MTok). Structured outputs on every call; a
malformed response mid-interview breaks the session in front of a judge.

| | Tokens | Cost |
|---|---|---|
| Brief + questions (+ fit match) | ~2.3k in / 1.5k out | $0.0023 |
| 8 × scoring | ~10.8k in / 3.2k out | $0.0060 |
| **Per session** | | **~$0.008 → ~1.5 credits** |

~2,200 complete sessions in the 3,000 hackathon credits. Judging runs 4–21 September with no
ability to redeploy, so the guard that matters is the input cap, not rate limiting — a huge
pasted "posting" is the only way to burn real money per request.

If question quality disappoints in testing, upgrading the single brief-and-questions call is
cheap and does not touch the scoring budget.

---

## Stack

No build step. Three ES modules plus one function — the source is the documentation, and
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

`document.modelContext.registerTool(definition, { signal })` is the primary call — the
challenge rules specify that literal form. `?? navigator.modelContext` is the compatibility
fallback for older Chromium, never the other way round. Tools are registered before first
render; the page stays fully usable when `modelContext` is absent.

Tools that mutate dispatch a `CustomEvent` so the UI re-renders. The user watches the page
move while the agent works.

---

## Privacy

The resume is personal data and is treated as such. **The uploaded file never leaves the
machine** — pdf.js extracts the text in the browser, and only that text is sent to the
function as analysis input. It is held in `localStorage`, never stored server-side, never
logged. There is no account to attach it to and no table to leak.

Stated plainly on the page, next to the file picker, because a stranger's site asking for
your resume has to earn it.

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

WebMCP is only available in origin-isolated documents, so `Origin-Agent-Cluster: ?1` is
required. `Permissions-Policy: tools=(self)` is already the default; set explicitly.

AI Gateway needs at least one production deploy to activate — publish early, then iterate on
branch deploys, which are unmetered.

Working URL: `dryrun.nryn.dev` or a Netlify subdomain. Settle it before registering an origin
trial token, which would let the site work in ordinary Chrome without the flag.

---

## Name

**Dry Run.** A dry run is a full rehearsal under real conditions with nothing at stake, which
is exactly the product. Plain English, instantly apparent, no gloss needed.

The obvious names in this space are worked over: Abhyas, Samvad/Samwaad, HotSeat, Final
Round and Greenroom are all live AI interview-prep products. Dry Run is not.

Unrelated to `rehearsal.nryn.dev`, which is a different application — different interaction
model, no scraping, no audio stack, and the agent is the interviewer rather than a
synthesised voice. New name, new repo, new code.

---

## Contest notes

- Challenge: [webmcp.devpost.com](https://webmcp.devpost.com/)
- Submission closes 3 September 2026, 13:00 PT. Judging 4–21 September. Winners ~23 September.
- Need: live URL, public repo with a GitHub-detectable open source license, English
  description covering WebMCP fit, <3 min demo video with audio on YouTube.
- Repo must contain the literal `document.modelContext.registerTool({...})` call.
- Judges may score on the description and video alone without testing. The video carries
  disproportionate weight.
- Judged on: WebMCP Leverage, Execution, Potential Impact, Creativity & Ambition — equally
  weighted.
- After 3 September, 13:00 PT: do not touch the submission, the repo, or the live site.

**Demo path for judges:** paste a real posting → brief appears → "interview me" → ChatGPT
asks aloud while the card advances and the score moves → verdict. Second beat: add a resume,
watch the questions re-aim at the gaps.
