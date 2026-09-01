# T09–T12 adversarial review, round 3

**Verdict: REMEDIATE — 0 P1, 2 P2, 1 P3.**

Round 2 closes the prior local schema, fixture-authenticity, and output-cost
documentation findings. T09–T11 are locally sound in the paths inspected, but
the score-request boundary does not accept the shared `Question` object it
produces. In addition, T12 remains incomplete because no successful, authorised
draft-preview measurement has been observed. The latter is an access/authority
blocker, not an implementation defect and not a reason to weaken Visitor Access
or use the production origin.

## Scope and non-actions

Reviewed the current uncommitted T09–T12 diff, all four prior review/remediation
records, the task and inference documentation, the T12 fixture/template, and
the Node contract tests. This review changed only this diary record. It did not
edit application code, deploy, invoke Netlify or a provider/model, change
preview Visitor Access, or promote production.

The known external fact remains precise: draft deploy
`6a96f5627eede63f6a674a86` returns Netlify team-login HTTP 401 before the
function. It therefore has no model invocation, `meta.usage`, price, or cost
evidence. Production promotion and weakening preview access are intentionally
out of scope; production is still T34.

## Findings

### P2 — The score endpoint rejects the returned `Question` contract

**Evidence.** A brief response's shared `Question` has required
`id`, `prompt`, `sourceQuote`, and `targetsGap` fields
(`src/lib/shapes.js:34-39`; strict response schema at
`netlify/functions/analyze.mts:35-37`). The T12 procedure explicitly requires
one score request using the returned `q1` and brief
(`dev-diary/t12-measurement-template.md:30-36`). But score input allows only
`id`, `prompt`, and `sourceQuote` (`netlify/functions/analyze.mts:79-82`), and
the exact-key check rejects `targetsGap` (`:93-98`).

I made a local injected-client request with an otherwise valid score body whose
`question` was a returned-question shape, including `targetsGap: false`. It
returned HTTP 400 / `invalid_request` and made zero provider calls. This is the
ordinary shape a future T28 session will have stored, so it is not merely a
malicious-input edge case.

**Impact.** T10's score function cannot consume the data contract that T09
returns. In particular, an authorised T12 operator following the written
two-call procedure will fail before the representative score measurement, and
future session code that forwards its saved question will fail too.

**Remediation.** Make the score request accept the canonical saved `Question`
shape (including a validated boolean `targetsGap`), or explicitly define and
use a documented projection everywhere. Prefer the former to avoid an
unnecessary future-session transform. Add a non-networked regression that sends
an actual returned full question to score, asserts a provider call, and covers
the resulting response. Re-run the two-call T12 procedure only after this local
fix.

### P2 — T12 still lacks observed usage and cost (external blocker, not code defect)

**Evidence.** All evidence fields in
`dev-diary/t12-measurement-template.md:48-62` are `PENDING`. The round-2 record
correctly records the 401 as a blocked attempt, not evidence
(`dev-diary/t09-t12-remediation-round-2.md:11-12`). The template's corrected
fixture is authentic: the regression test proves decoded posting equality with
`dev-diary/example-posting.md` (`test/analyze-contract.test.mjs:43-48`), and
this review independently confirmed its source is 3,020 bytes with SHA-256
`0f7263eaebdde2bc4416903daa091540dd05c7ccf6fb83a1101716d9a9ac1fd6`.

**Impact.** T12's explicit acceptance criterion — measure real token cost
against the example posting and check it against the credit budget
(`dev-diary/task.md:36`) — is unfulfilled. Mocked usage proves only payload
mapping, not gateway metering or price.

**Authority needed.** After the P2 request-contract correction, a
Netlify-team-authorised operator needs an authenticated browser/session able to
reach draft deploy `6a96f5627eede63f6a674a86`, or an equivalent bounded draft
deploy. They must preserve Visitor Access and not use production. They should
make exactly the corrected brief request and one representative score request,
then record two successful redacted `meta.usage` objects, deploy identity, UTC
times, contemporaneous gateway pricing (including cached-input treatment), the
calculation, and the budget comparison in the template. No new code authority
is needed for the access block itself.

### P3 — Not every public error branch has a deterministic regression test

**Evidence.** The 17-test suite covers malformed JSON *provider output*,
schema retry/exhaustion, refusal, retryable connection/timeout/503, and one
redacted retry exhaustion (`test/analyze-contract.test.mjs:143-214`). It does
not directly exercise the handler's gateway-unavailable, non-POST,
invalid-request-JSON, or non-retryable/unknown upstream `analysis_failed`
branches (`netlify/functions/analyze.mts:151-165`). Nor is there a direct
successful-score mapping test; the only direct success mapping is brief
(`test/analyze-contract.test.mjs:128-143`).

**Impact.** Static inspection finds those branches return fixed public messages
and codes, with no provider details interpolated. Thus this is a regression-gap,
not a demonstrated unsafe response. It nevertheless leaves the claim that all
T11 error paths are guarded without a local executable gate.

**Remediation.** Add small injected-handler tests for the four public boundary
branches and a successful score response/usage mapping. Assert status, code,
and absence of raw provider text. This can be done entirely locally.

## Locally clean after round 2

- **Post-parse strictness and retry:** `validateBriefResponse` and
  `validateScoreResponse` now enforce exact object keys, required structure,
  array/string bounds, integer scores, fixed question IDs/order, fit-match
  shapes, quote grounding, and resume invariants
  (`src/lib/shapes.js:120-228`). `runModel` treats any validator problem as
  malformed, retries once, then emits only `invalid_provider_output`
  (`netlify/functions/analyze.mts:121-147, 161-165`). Direct and injected-model
  tests cover strict-schema retry and exhaustion (`test/analyze-contract.test.mjs:75-105, 153-172`).
- **Retry and safe errors:** each provider attempt has `maxRetries: 0`, a
  10-second timeout, one explicit retry, and 100 ms backoff
  (`netlify/functions/analyze.mts:12-18, 103-105, 118-145`). Refusal is a fixed
  422; malformed output is fixed 502; retryable upstream faults are fixed 503;
  other faults are a fixed 502. No inspected branch returns raw exception text.
- **Fixture authenticity:** the T12 posting now equals the documented worked
  example byte-for-byte, and the public synthetic resume is declared
  (`dev-diary/t12-bounded-preview-fixture.json:2-9`; equality regression cited
  above). The round-2 fixture finding is closed.
- **Cost documentation math:** the template correctly distinguishes a 450-token
  score *attempt* from aggregate score totals. Its normal session output ceiling
  is `1,800 + 8 × 450 = 5,400`; the two-attempt worst case is `10,800`.
  `10,800 / 1,000,000 × $1.20 = $0.01296`, explicitly identified as an
  output-only ceiling before input charges
  (`dev-diary/t12-measurement-template.md:10-24`). The planning table is marked
  estimate rather than observed T12 cost (`dev-diary/project.md:173-182`).

## Local validations run in this review

- `npm test` — 17 passed, 0 failed.
- `npm run build` — passed.
- `npx tsc --noEmit --allowJs false --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck netlify/functions/analyze.mts` — passed.
- `npx netlify build --offline` — passed and bundled `analyze.mts`; no deploy.
- `git diff --check` — passed.
- Local injected-client full-`Question` score probe — HTTP 400 /
  `invalid_request`, zero provider calls; no network request.
- Independently checked the source fixture byte count and SHA-256 noted above.

## Approval condition

Do **not** approve T09–T12 yet. Approval requires zero P1/P2/P3: locally fix
and regress the score-request/shared-question boundary and the remaining error
coverage, then have the authorised authenticated draft-preview operator record
the two successful real usage/cost measurements. The existing 401 is neither a
code failure nor a cost result, and it does not authorise a preview-access
change or production deployment.
