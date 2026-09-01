# T09–T12 remediation, round 3

This record remediates every locally actionable P2/P3 in
[t09-t12-review-round-3.md](t09-t12-review-round-3.md). No deployment,
preview-visibility change, production promotion, Netlify/provider/API call, or
fabricated T12 usage evidence was made during this work.

| Round-3 finding | Local change | Local validation |
|---|---|---|
| P2: score rejected the canonical returned `Question` because it included `targetsGap` | Score input now requires the exact saved Question shape: `id`, `prompt`, `sourceQuote`, and boolean `targetsGap`; unknown, missing, and wrongly typed fields still fail validation. The score model input deliberately projects that validated object to only `prompt` and verbatim `sourceQuote`, so non-scoring session metadata cannot influence grounding. | An injected-client two-call regression obtains `questions[0]` from a mocked successful brief, forwards that exact returned object to score, receives HTTP 200, and proves the score provider call occurred. It also asserts the provider sees only prompt/source-quote context. Invalid question/brief shapes return HTTP 400 / `invalid_request` with zero provider calls. |
| P2: T12 has no observed usage/cost | This remains an external access/authority condition, not a local code defect. The measurement procedure now explicitly tells the authorised operator to forward returned `q1` intact, including `targetsGap`, so its documented two-call scope matches the repaired contract. The procedure still preserves Visitor Access and forbids a production substitution. | No live request was made and all observed-cost fields remain `PENDING`. An authenticated Netlify-team draft-preview session is still required to collect the two redacted `meta.usage` records and contemporaneous pricing. |
| P3: public boundary error branches and successful score mapping lacked executable coverage | Added deterministic injected-handler coverage for gateway unavailable, non-POST, invalid JSON, non-retryable upstream failure, and successful score result/usage mapping. All public errors continue to be fixed messages/codes without provider diagnostics. | The new tests assert HTTP status, public code, required `Allow: POST` header, redaction, and zero provider calls for every invalid pre-provider boundary. Existing retry/refusal/malformed-output tests remain in place. |
| Documentation/scope mismatch | The inference contract now names the full score Question object and states that only prompt/source quote are sent to the provider. The T12 procedure uses the same full-object forwarding rule. | The full-question regression asserts both sides of that documented boundary: full-object acceptance at the API and narrow provider grounding payload. |

## Local gates

- `npm test` — 21 passed, 0 failed; injected clients only.
- `npm run build` — passed.
- TypeScript no-emit check of `netlify/functions/analyze.mts` — passed.
- `npx netlify build --offline` — passed and bundled `analyze.mts`; no deploy.
- `git diff --check` — passed.

## Remaining external condition

T12 is not complete until a Netlify-team-authorised operator, using an
authenticated session that can reach the bounded draft deploy (or equivalent
bounded draft), records the two successful redacted usage objects, current
pricing, calculation, and budget comparison. This remediation neither weakens
Visitor Access nor authorises production/T34.
