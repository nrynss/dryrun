# T09–T12 adversarial review, round 1

**Verdict: REMEDIATE.** This round found **1 P1, 3 P2, and 2 P3** findings.
It is not eligible for APPROVE until every finding is closed and a new review
round returns zero P1/P2/P3 findings.

## Scope and baseline

Reviewed the uncommitted implementation of T09 through T12 in
`netlify/functions/analyze.mts`, `src/lib/shapes.js`, `package.json`, and
`test/analyze-contract.test.mjs`, against `dev-diary/project.md` lines 31–36
and the current shared shape contracts. The reviewed implementation change set
consists of those three modified files and the new `test/` directory.

The OpenAI SDK and Netlify AI Gateway wiring itself is compatible: the SDK
reads `OPENAI_API_KEY` and `OPENAI_BASE_URL`, and Netlify documents injecting
that pair for Functions. The Responses API supports `text.format` with a
strict JSON Schema. The endpoint correctly uses that API form, checks a
refusal before parsing `output_text`, validates source quotes against the
posting, and returns fixed public error messages rather than serialising
provider errors.

## Findings

### P1 — Model completions have no output-cost ceiling

**Evidence.** `netlify/functions/analyze.mts:17-31` permits unbounded strings
and arrays in both response schemas. The request at
`netlify/functions/analyze.mts:107-110` sets neither `max_output_tokens` nor
schema `maxLength`/`maxItems` limits. `netlify/functions/analyze.mts:100-127`
may spend on a second attempt after malformed output. The configured model has
a 128,000-token maximum completion, while the project budget assumes roughly
1,500 output tokens for the brief and 3,200 across eight scores.

**Impact.** The 20,000-character input cap does not cap spend. A valid
structured response can contain very long list entries or arbitrarily many
list items, and a malformed overlong response can be charged before its retry.
One request can therefore exceed the stated per-session estimate by orders of
magnitude and exhaust contest credits.

**Remediation.** Set a deliberate, per-task `max_output_tokens` limit that
includes any reasoning budget. Add schema limits for every user-visible string
and list, including `brief` lists, `fitMatch` lists, `missed`, and
`modelAnswer`; preserve eight questions exactly. Derive the limits from a T12
measurement, include retries in the worst-case calculation, and add tests that
assert the exact request caps.

**Validation performed.** Static inspection of the call and schemas. The
installed SDK type definitions document that `max_output_tokens` caps visible
and reasoning tokens. No provider request was made.

### P2 — T12 has not measured or recorded real cost

**Evidence.** T12 requires a real token-cost measurement against the example
posting at `dev-diary/project.md:36`. There is no T12 measurement record or
test fixture result in the tree. The success metadata at
`netlify/functions/analyze.mts:95-99` exposes only total input, output, and
total tokens. It omits `input_tokens_details.cached_tokens` and
`output_tokens_details.reasoning_tokens`, which the installed SDK exposes and
which affect an accurate cost reconciliation.

**Impact.** The project cannot show that its claimed credit budget is true for
the actual production gateway, selected model, response schemas, or retry
policy. The current metadata is useful telemetry but is not evidence that T12
was performed, and it cannot on its own calculate cached-input pricing.

**Remediation.** After closing P1, make the explicitly bounded production
gateway calls for the example brief and representative score path. Record the
deploy identity, timestamp, model returned by the gateway, request class,
attempt count, complete usage breakdown, current prices, calculated credit
cost, and budget comparison in a durable dev-diary record. Keep the client
response metadata additive, but include the usage details necessary for that
calculation or retain the measurement server-side in the record.

**Validation performed.** Repository-wide documentation and test inspection;
the only five tests are local contract/pre-provider tests. No deployment,
gateway, or model call was made during this review.

### P2 — No-resume results can contain fabricated fit analysis and gap targets

**Evidence.** The shared contract says fit analysis is meaningful only with a
resume and should remain null otherwise at `src/lib/shapes.js:149-150`.
`validateBriefResponse` only requires a fit match when `requireFitMatch` is
true (`src/lib/shapes.js:152`) and never rejects a non-null fit match or a
`targetsGap: true` question when it is false. The server relies on that
validator at `netlify/functions/analyze.mts:116`. A local boundary check
confirmed that both a non-null fixture fit match and `targetsGap: true` pass
with `{ requireFitMatch: false }`.

**Impact.** A prompt-injected or otherwise nonconforming model response can
claim resume gaps when no resume was supplied. That violates the public shape
contract and can direct a candidate to remediate invented weaknesses.

**Remediation.** Replace the one-way `requireFitMatch` check with an explicit
resume-presence invariant: without a resume, require `fitMatch === null` and
all eight `targetsGap` values false; with a resume, require a valid fit match.
Add both negative cases to the shared validator tests and an endpoint-level
mocked-provider test.

**Validation performed.** Non-networked `node --input-type=module` execution
against the current validator returned `[]` for each invalid no-resume case.

### P2 — Connection failures and long hangs bypass the bounded retry/error path

**Evidence.** The client is constructed with only `maxRetries: 0` at
`netlify/functions/analyze.mts:102`; it therefore uses the SDK's 10-minute
default timeout. The explicit retry classifier at line 94 accepts only
status-bearing 408, 409, 429, and 5xx errors. A connection failure or SDK
timeout has no such status, so line 124 exits without the second bounded
attempt. The function can also remain outstanding beyond its hosting timeout,
where it cannot return the fixed JSON error at lines 141–144.

**Impact.** T11's protection is inconsistent for a common upstream failure
class: transient network/gateway failures get an immediate generic 502, while
a hung request may terminate at the platform boundary rather than returning a
safe application response. Neither behavior is covered by the tests.

**Remediation.** Set an explicit per-attempt SDK timeout safely below the
function deadline, use a request cancellation signal if available, and classify
the SDK connection and timeout errors as retryable within the existing
two-attempt budget. Use bounded backoff that also fits the function deadline.
Add mocked tests for a connection error, a timeout, a retryable HTTP failure,
and the final public response; assert no raw provider message is exposed.

**Validation performed.** Static control-flow inspection, plus installed SDK
source inspection showing its default 10-minute timeout. No upstream request
was made.

### P3 — The aggregate input cap contradicts the shared per-field limits

**Evidence.** The current shared contracts export independent 20,000-character
limits for posting and resume at `src/lib/shapes.js:13-14`. The function counts
every text field together and rejects totals over 20,000 at
`netlify/functions/analyze.mts:73-79`. Thus, a 20,000-character valid posting
plus any non-empty valid resume receives 413, even though each field satisfies
its contract.

**Impact.** T09 fails valid optional-resume requests at the documented posting
boundary. It also makes the browser and API contracts diverge once T25/T26
wire the client to this function.

**Remediation.** Import and enforce the shared posting and resume maxima per
field. If a lower aggregate inference budget is required, name it as a third,
documented contract and calibrate it in T12 rather than silently replacing the
two existing limits. Apply an analogous explicit limit for a score request.

**Validation performed.** Static boundary analysis of the validators and
shared exports.

### P3 — Tests do not exercise successful provider calls or T11 failure behavior

**Evidence.** `test/analyze-contract.test.mjs:6-42` has five tests: fixture
validity, one source-quote rejection, fractional score rejection, invalid score
input, and an oversized posting. The endpoint constructs `OpenAI` internally
at `netlify/functions/analyze.mts:100-102`, with no injectable client or fetch,
so tests do not assert the structured-output request, successful response
mapping, usage metadata, refusal, malformed JSON/schema retry, malformed
output exhaustion, retryable upstream error, timeout, or public-error
redaction.

**Impact.** The build and current tests can pass while the behavior T09–T11
exists to guarantee regresses. In particular, the safety and cost paths in the
P1/P2 findings have no regression gate.

**Remediation.** Extract the client/call boundary behind an injected factory or
test-only fetch. Add deterministic mocked-response tests for both tasks and
every retry/error branch, then retain the existing validator tests as unit
coverage. Include exact input/output token and attempt assertions for success.

**Validation performed.** `npm test` passed all five existing tests. The gap
above is coverage, not a failing current test.

## Validation summary

- `git diff --check` passed.
- `npm test` passed: 5 tests, 0 failures.
- `npm run build` passed.
- `netlify build --offline` passed and packaged `netlify/functions/analyze.mts`.
- Non-networked validator mutation checks confirmed the P2 no-resume contract
  holes.
- No model, AI Gateway, Netlify API, or deployment calls were made.

## Notes for remediation

The source-quote containment check, fixed public error messages, explicit
response-status check, `maxRetries: 0`, strict JSON-schema request format, and
current SDK/Gateway environment-variable integration are sound starting points.
They do not close the findings above. Re-review after remediation must include
the bounded real T12 measurement record and must not report APPROVE while any
P1/P2/P3 remains.
