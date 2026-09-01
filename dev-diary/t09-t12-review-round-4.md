# T09–T12 adversarial review, round 4

**Verdict: APPROVE for local T09–T11 — 0 P1, 0 P2, 0 P3.**

T12's code and measurement procedure are ready, but **T12 is not complete**:
there is still no successful gateway response, observed `meta.usage`, price
evidence, calculation, or credit-budget comparison. That is an external
access/evidence condition, not a local implementation finding. It does not
change the T09–T11 approval count.

## Scope and non-actions

This review examined the entire current T09–T12 diff: the function, shared
shapes, package script, contract tests, inference documentation, T12 fixture
and template, and all round-1 through round-3 review/remediation records. It
made no application-code edit, deploy, preview-access change, Netlify/API/
gateway/model call, or production promotion.

The known external state remains unchanged: draft deploy
`6a96f5627eede63f6a674a86` returned Netlify team-login HTTP 401 before the
function. It is neither a model invocation nor cost evidence.

## Round-3 contract closure

The returned brief `Question` and score request now agree exactly. A question
has the complete saved shape `id`, `prompt`, `sourceQuote`, and boolean
`targetsGap`. Score accepts that exact shape and rejects missing, mistyped, or
unknown question fields before a provider call. Once it is validated, score
deliberately projects only `prompt` and `sourceQuote` into the provider input;
`id` and `targetsGap` remain session metadata and cannot affect grounding or
scoring.

The local two-call injected-client regression obtains `questions[0]` from a
successful mocked brief response, forwards that unmodified returned object to
score with the returned brief, receives HTTP 200, and asserts that the score
provider receives only the narrow question context. This closes the round-3
P2 and aligns both the future T28 handoff and the documented T12 procedure.

The prior local findings also remain closed: bounded strict output schemas and
post-parse validation/retry, resume/fit invariants, fixed public error paths,
bounded SDK timeout/retry behavior, independent input limits, fixture equality,
and T12 bound-table arithmetic. No new P1/P2/P3 was found in this pass.

## Independent local validation

- `npm test` — 21 passed, 0 failed. This includes the full returned-Question
  brief-to-score regression, strict boundary rejections, success mapping, and
  deterministic retry/error branches using injected clients only.
- `npm run build` — passed.
- `npx tsc --noEmit --allowJs false --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck netlify/functions/analyze.mts` — passed.
- `npx netlify build --offline` — passed and bundled `analyze.mts`; no deploy.
- `git diff --check` — passed.
- The T12 fixture equality test passed for the exact 3,020-byte worked-example
  posting and SHA-256 `0f7263eaebdde2bc4416903daa091540dd05c7ccf6fb83a1101716d9a9ac1fd6`.

## T12 completion boundary

The sanctioned next action is for a **Netlify-team-authorised operator** to use
an **authenticated Netlify draft-preview session** that can reach deploy
`6a96f5627eede63f6a674a86` (or an equivalent bounded draft deploy). They must
make exactly the template's bounded calls: one fixture `brief`, then one
`score` using the returned `q1` object intact, including `targetsGap`, plus the
returned brief and fixture answer. They must record the two successful redacted
`meta.usage` objects, deploy identity, UTC times, contemporaneous pricing
(including cached-input treatment), calculation, and credit-budget comparison
in `t12-measurement-template.md`.

Do not weaken preview Visitor Access and do not substitute the production
origin: production sequencing remains T34. Until that authorised authenticated
draft-preview measurement succeeds, T12 remains **externally incomplete**, not
a code defect and not a completed cost claim.
