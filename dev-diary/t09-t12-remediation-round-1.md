# T09–T12 remediation, round 1

This record remediates every actionable P1/P2/P3 finding in
[t09-t12-review-round-1.md](t09-t12-review-round-1.md). No deployment,
Netlify API, AI Gateway, or model call was made during this local remediation.

## Finding map

| Review finding | Remediation | Local validation |
|---|---|---|
| P1: unbounded model-completion cost | `analyze.mts` now sends `max_output_tokens: 1800` for briefs and `450` for scores, including reasoning tokens. Strict schemas bound every visible string/array and preserve exactly eight questions. The SDK has no implicit retry and exactly two explicit attempts, so a full all-retry session has an output ceiling of 10,800 tokens. | Mocked brief and score calls assert exact caps, strict schema, question count, and string limits. |
| P2: no T12 cost evidence | Success metadata now carries model, attempts, total/input/output tokens, cached and cache-write input tokens, and reasoning tokens. `t12-measurement-template.md` defines the two-call bounded preview, required deploy/price/usage evidence, calculation, and non-completion status. The round-2 fixture correction makes `t12-bounded-preview-fixture.json` carry the exact documented worked-example posting plus public synthetic resume data. | Mocked success response asserts the complete additive usage shape. The template is deliberately marked `PENDING`; no live claim is made. |
| P2: no-resume response can invent fit/gaps | `validateBriefResponse` now enforces both directions: a resume requires a fit match; no resume requires `fitMatch === null` and every `targetsGap === false`. The server passes exact resume presence to this validator. | Validator negative cases cover invented quote, fit, and gap. A mocked malformed no-resume provider response retries and only returns a conforming result. |
| P2: connection/timeout bypass bounded retry | The OpenAI client has a 10,000 ms per-attempt timeout and no SDK retry. Connection and timeout errors (`APIConnectionError` family), plus 408/409/429/5xx, use the same bounded second attempt with a 100 ms backoff. | Safe mocks cover connection error, SDK timeout, 503, successful second attempt, exhausted retry redaction, and fixed final response. |
| P3: hidden aggregate brief cap contradicts shared field caps | Brief validation imports the shared 20,000-character posting and resume limits and checks each field independently. Score uses its own exported, documented 12,000-character aggregate (`MAX_SCORE_INPUT_CHARS`). | A 20,000-character posting plus 20,000-character resume is accepted; each 20,001-character field and an oversized score are rejected. |
| P3: provider/error paths untested | `createAnalyzeHandler` accepts an injected client factory. This keeps production wiring unchanged while allowing deterministic, non-networked tests of request formation, successful mapping, usage, refusal, malformed JSON/schema, connection, timeout, 5xx, retry exhaustion, and redaction. | `npm test`: 13 passing tests. |

## T12 handoff boundary

The remaining action is external by design: after the orchestrator confirms the
local gates, run exactly the two bounded preview calls specified in
`t12-measurement-template.md`, fill its evidence table with observed metadata
and contemporaneous pricing, and only then allow T12 to be recorded as
measured. The absence of that live evidence is disclosed, not treated as a
completed measurement.

## Local validation

- `npm test` — 13 passed, 0 failed.
- `npm run build` — passed.
- `npx tsc --noEmit --allowJs false --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck netlify/functions/analyze.mts` — passed.
- `git diff --check` — passed.

No commit or deployment was created.
