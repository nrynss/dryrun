# T09–T12 adversarial review, round 2

**Verdict: REMEDIATE — 0 P1, 3 P2, 1 P3.**

T09–T11's first-round local findings are substantially remediated: both
request classes have explicit output ceilings, the resume invariant and
independent brief-field caps are in place, and the retry path has a bounded
timeout and deterministic tests. This is nevertheless not eligible for
**APPROVE**. T11 still accepts schema-invalid model output, and T12 has neither
the required input nor actual token/cost evidence.

## Scope and evidence boundary

Reviewed the current uncommitted T09–T12 change set in
`netlify/functions/analyze.mts`, `src/lib/shapes.js`, `test/`,
`dev-diary/project.md`, and the three round-1/T12 records. This review did not
edit application code, deploy, invoke Netlify, change Visitor Access, or make a
model/API request.

The only concrete external T12 event supplied to this review is a draft deploy
`6a96f5627eede63f6a674a86`. Its documented synthetic brief request stopped at
Netlify team-login protection with HTTP 401. Consequently it did not enter the
function, make a model request, return `meta.usage`, or create billable usage
evidence. An authenticated browser session is not available. This is a blocked
attempt, **not** a completed measurement. Preview protection remains in place;
production is reserved for T34 after integration.

## Findings

### P2 — T11 post-parse validation accepts schema-invalid output

**Evidence.** The provider request specifies strict, bounded schemas at
`netlify/functions/analyze.mts:29-54` and feeds the parsed response through the
shared validators at lines 137-138. But
`validateBriefResponse` checks neither response-object keys nor the schema's
array/string limits (`src/lib/shapes.js:120-181`); the score validator has the
same omission (`:185-195`). A local injected-client probe returned a completed
brief containing 99 `brief.owns` entries and an unexpected top-level key. The
handler returned HTTP 200 on attempt 1 and passed both values through. The
probe made no network call.

**Impact.** A gateway/model response that is malformed despite the requested
strict schema is exactly T11's failure class. Instead of retrying or returning
the fixed unusable-result error, the endpoint exports a payload outside its
shared contract. The output-token ceiling prevents a spend escape, but it does
not protect the future state/UI from unexpected fields, overlarge lists, or
overlong strings.

**Remediation (local).** Make the post-parse validators enforce the complete
schema contract: allowed keys, exact/maximum list counts, and every string
length, for both brief and score data. Add injected-provider tests that supply
over-limit and extra-key objects and assert a retry followed by either a valid
response or `invalid_provider_output` after two attempts.

### P2 — The prescribed T12 fixture cannot satisfy T12's required input

**Evidence.** T12 explicitly requires measurement “against the example
posting” (`dev-diary/task.md:36`). The actual worked example is
`dev-diary/example-posting.md` (3,020 characters), whereas the sole permitted
T12 fixture posting is a different synthetic 141-character role description
(`dev-diary/t12-bounded-preview-fixture.json:2-6`).
`t12-measurement-template.md:20-22` requires using that fixture, so even a
successful execution would not measure the input named by T12.

**Impact.** The short synthetic prompt materially understates prompt/input
token usage versus the worked example. It cannot substantiate the documented
per-session budget or close T12.

**Remediation (local).** Change the bounded procedure to submit the exact
canonical worked posting (with a recorded character count and checksum or a
test proving fixture equality). A public synthetic resume may remain if the
fit-match path is to be measured, but it must be declared. Keep the resulting
two-call procedure bounded. This documentation/fixture correction must happen
before the authorised measurement below.

### P2 — T12 still has no real model usage or cost evidence

**Evidence.** Every evidence field in
`dev-diary/t12-measurement-template.md:29-43` remains `PENDING`. The lone draft
deploy attempt described above received an edge 401, not a function response;
there are no observed model, attempt count, token breakdown, price source, or
calculated credits. The schema and mocked `meta.usage` assertions are useful
local checks, not a measurement.

**Impact.** T12's acceptance condition—actual cost against the credit
budget—has not occurred. A claim that the external issue is fixed would be
false.

**Remediation / authority path (external).** After the local fixture correction
and local gates, a Netlify-team-authorised operator must use an authenticated
browser/session that can reach draft deploy `6a96f5627eede63f6a674a86` (or an
equivalent bounded draft deploy) and make exactly the corrected brief call plus
one representative score call. They must record the two redacted successful
`meta.usage` objects, gateway-returned model, deploy identity, UTC timestamps,
contemporaneous pricing, calculation, and budget comparison in the template.
They must not weaken preview Visitor Access or substitute the production origin;
production deployment remains T34.

### P3 — The T12 bound table mislabels aggregate score totals as per-attempt limits

**Evidence.** In `dev-diary/t12-measurement-template.md:10-17`, the header
calls its third column “`max_output_tokens` per attempt,” but the eight-score
row places the aggregate values 3,600 and 7,200 in that column. The actual
per-score-attempt limit is 450; 3,600 is eight normal score calls and 7,200 is
eight calls each retried. The final 10,800 total is arithmetically correct.

**Impact.** The bound can be misread during the external measurement or later
cost review, even though the implementation cap itself is correct.

**Remediation (local).** Relabel the table as per-call limit, normal
request-class total, and retry worst-case total (or split the eight-score row
into its own aggregate table). Preserve the values 450, 3,600, 7,200, and
10,800 with their correct units.

## Validations performed

- `git diff --check` passed.
- `npm test` passed: 13 tests, 0 failures.
- `npm run build` passed.
- TypeScript check of `netlify/functions/analyze.mts` passed.
- Local injected-provider mutation reproduced the T11 finding: schema-invalid
  brief output received HTTP 200, one attempt, 99 `owns` values, and an
  unexpected top-level field.
- Compared the T12 fixture and worked-example source: 141 versus 3,020
  characters; they are not equal.
- No external request was made by this review.

## Approval condition

Only re-review after all four findings are closed: the validator and T12 table
are corrected locally, the T12 procedure uses the worked example, and the
authorised draft-preview measurement records real successful usage and cost.
Until then the status is **REMEDIATE**, not APPROVE.
