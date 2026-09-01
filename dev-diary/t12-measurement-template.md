# T12 bounded gateway measurement record

**Status: COMPLETE — bounded draft-preview measurement recorded 2026-09-01.**
The two calls below were made only after local remediation passed its gates.

## Bound checked before the preview

Each provider call has one initial attempt and, at most, one explicit retry:

| Request class | Calls in the measurement/session | Output limit per provider attempt | Normal request-class output total | Retry worst-case output total |
|---|---:|---:|---:|---:|
| Brief + eight questions (+ optional fit) | 1 | 1,800 | 1,800 | 3,600 |
| One answer score | 1 | 450 | 450 | 900 |
| Eight answer scores | 8 | 450 | 3,600 | 7,200 |
| One complete session | 1 brief + 8 scores | class-specific | 5,400 | 10,800 |

`max_output_tokens` includes visible and reasoning tokens. The SDK has no
implicit retries, each provider attempt has a 10,000 ms timeout, and the only
backoff is 100 ms before attempt two. The hard output-cost upper bound at the
documented $1.20 / MTok output price is $0.01296 for a pathological
all-retry session (10,800 / 1,000,000 x $1.20), before any input charge.
This is a ceiling, not a claimed observed cost.

## Required bounded preview procedure

1. Record the deployed URL, deploy ID/commit, UTC time, gateway/model returned,
   and the price source and effective input/output/cached-input prices.
2. Send exactly one `brief` request using `t12-bounded-preview-fixture.json`'s
   `briefRequest`. Its posting is the exact 3,020-byte worked example from
   `example-posting.md`, verified by the fixture-equality regression test and
   the recorded SHA-256; its resume is public synthetic test data. Do not use
   arbitrary user content.
3. Send exactly one `score` request using the returned `q1` object intact
   (including `targetsGap`) and brief plus the fixture's
   `representativeAnswer`. Do not run the remaining seven score calls. The
   score boundary validates the full saved object but sends only its prompt and
   verbatim source quote to the provider as scoring context.
4. Save the two successful JSON `meta.usage` objects verbatim below. They must
   include `model`, `attempts`, `inputTokens`, `outputTokens`, `totalTokens`,
   `inputTokensDetails.cachedTokens`, `inputTokensDetails.cacheWriteTokens`,
   and `outputTokensDetails.reasoningTokens`.
5. Calculate each request's charge from the contemporaneous price source,
   handling cached input separately if the gateway price sheet does. Compare
   the observed values with the normal and retry ceilings above. Redact posting,
   resume, answer, provider request IDs, and credentials.

## Evidence to fill after the two calls

| Field | Brief | Representative score |
|---|---|---|
| UTC timestamp | 2026-09-01T16:34:18Z | 2026-09-01T16:34:18Z |
| Deploy URL / deploy ID / commit | `https://6a96fe3d3c15f05d6dfe3a47--dryrun-963.netlify.app` / `6a96fe3d3c15f05d6dfe3a47` / `baa91de` | Same draft / commit |
| Gateway-returned model | `gpt-5.6-luna` | `gpt-5.6-luna` |
| Attempt count | 1 | 1 |
| Input tokens | 1,190 | 471 |
| Cached input tokens | 0 | 0 |
| Cache-write input tokens | 1,187 | 0 |
| Output tokens | 1,083 | 414 |
| Reasoning tokens | 209 | 138 |
| Total tokens | 2,273 | 885 |
| Current price source and date | OpenAI model documentation, 2026-09-01: input $0.20 / MTok, output $1.20 / MTok; cache writes are 1.25x input | Same |
| Calculated charge / credits | $0.00159695 / 0.287451 credits | $0.00059100 / 0.106380 credits |
| Budget comparison | Combined observed two-call run: $0.00218795 / 0.393831 credits. A simple one-brief/eight-like-scores projection is ~1.14 credits, below the 1.5-credit planning estimate. Both calls stayed below their normal output ceilings. | Same combined result |

## Redacted observed usage metadata

```json
{
  "brief": {
    "model": "gpt-5.6-luna",
    "attempts": 1,
    "inputTokens": 1190,
    "outputTokens": 1083,
    "totalTokens": 2273,
    "inputTokensDetails": { "cachedTokens": 0, "cacheWriteTokens": 1187 },
    "outputTokensDetails": { "reasoningTokens": 209 }
  },
  "score": {
    "model": "gpt-5.6-luna",
    "attempts": 1,
    "inputTokens": 471,
    "outputTokens": 414,
    "totalTokens": 885,
    "inputTokensDetails": { "cachedTokens": 0, "cacheWriteTokens": 0 },
    "outputTokensDetails": { "reasoningTokens": 138 }
  }
}
```

The brief calculation treats its 1,187 cache-write tokens at $0.25 / MTok
(1.25 × the $0.20 input price), the remaining three input tokens at $0.20 /
MTok, and output at $1.20 / MTok. The score uses ordinary input and output
prices. Netlify bills at 180 credits per US dollar.

The calls used the exact public worked posting and synthetic resume/answer from
the fixture. No user resume, posting, provider request ID, cookie, or credential
was recorded. The temporary draft runner was removed from the worktree after
this measurement. Production deployment remains T34.
