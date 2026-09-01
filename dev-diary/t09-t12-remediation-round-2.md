# T09–T12 remediation, round 2

This record remediates every locally actionable finding in
[t09-t12-review-round-2.md](t09-t12-review-round-2.md). No deployment, preview
access change, production promotion, Netlify/provider/API call, or fabricated
usage evidence was made in this remediation.

| Round-2 finding | Local change | Local validation |
|---|---|---|
| P2: T11 accepted schema-invalid parsed output | `validateBriefResponse` and `validateScoreResponse` now enforce the complete strict output schemas after JSON parsing: exact allowed/required object keys at every level, array minimum/maximum counts, every string bound, fixed question order/IDs, score integer range, fit-match structure, and existing grounding/resume invariants. `runModel` already treats any reported problem as malformed output, so it retries once and then returns the fixed `invalid_provider_output` error. | Added direct-boundary regressions and injected-provider handler cases. A schema-invalid brief (extra key and seven `owns` entries) retries and only returns 200 when attempt two is valid. A schema-invalid score (extra nested key and seven `missed` entries) makes two attempts and returns HTTP 502 / `invalid_provider_output`, never HTTP 200. |
| P2: T12 fixture did not use the required worked example | `t12-bounded-preview-fixture.json` now contains the exact UTF-8 body of `example-posting.md`, the documented source of the shipped example. It records 3,020 bytes and SHA-256 `0f7263eaebdde2bc4416903daa091540dd05c7ccf6fb83a1101716d9a9ac1fd6`; the public synthetic resume remains explicitly declared. The measurement procedure and project inference documentation name that scope. | Added a regression test which reads `example-posting.md`, asserts byte-for-byte fixture equality, confirms the byte count, and checks the SHA-256. |
| P2: no real T12 usage/cost evidence | Retained the evidence table as **PENDING EXTERNAL PREVIEW MEASUREMENT**. It now states the lawful access path precisely: a Netlify-team-authorised operator must use an authenticated session that can access draft deploy `6a96f5627eede63f6a674a86` (or an equivalent bounded draft deploy), preserve Visitor Access, and not substitute production/T34. | No external call was made, so no usage, price, or credit figure has been claimed. The 401 remains a blocked attempt rather than measurement evidence. |
| P3: T12 table called aggregate score totals per-attempt limits | Replaced the ambiguous columns with calls in scope, per-provider-attempt limit, normal request-class aggregate, and retry-worst-case aggregate. The corrected table identifies 450 as the score attempt limit, 3,600 as eight normal score calls, 7,200 as eight retried score calls, and 10,800 as the all-retry session total. | Reviewed the table against `BRIEF_MAX_OUTPUT_TOKENS` (1,800), `SCORE_MAX_OUTPUT_TOKENS` (450), and the two-attempt retry policy; the arithmetic is explicit in the current T12 record. |

## Remaining external condition

T12 is not complete. Only the authorised, authenticated bounded draft-preview
measurement may replace the pending fields with two successful redacted
`meta.usage` objects, contemporaneous pricing, calculation, and a budget
comparison. It must not weaken preview protection or deploy/promote production.

## Local gates

The following commands were run after the changes: `npm test`, `npm run build`,
a TypeScript no-emit check of `netlify/functions/analyze.mts`, and `git diff
--check`.
