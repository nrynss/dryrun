# Dry Run

**The interview before the interview.**

Paste the job posting. Dry Run reads it, works out what the role actually wants,
and hands ChatGPT eight grounded questions. ChatGPT runs the interview out loud.
Dry Run scores what you said.

Built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com/).

## The split

| | Runs where | Does what |
|---|---|---|
| The interview | The user's ChatGPT | Asks, listens, improvises, transcribes |
| The analysis | A Netlify function | Posting → brief, questions, fit match. Answer → score |
| The state | The page | Session, current question, running scores, the rubric |

The agent interviews. The page adjudicates.

## Running it

```
npm install
npm run dev
```

`@netlify/vite-plugin` serves the function and AI Gateway inside `vite dev`, so
there is no separate process. AI Gateway needs one production deploy on the
linked Netlify project before it will answer.

No API keys. Netlify injects credentials into the function at runtime, so there
is no `.env` to fill in.

See `project.md` for the full specification.

## License

Apache-2.0. See `LICENSE`.
