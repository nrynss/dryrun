# T09–T12 closing evidence review

**Verdict: APPROVE — 0 P1, 0 P2, 0 P3.**

This is a read-only closing review of the current T09–T12 worktree, the
current T12 measurement record, and the prior round-4 record. No application
code, deploy, Netlify setting, gateway/model, or access control was changed.

## T12 completion evidence

Round 4 correctly recorded the then-pending state: deploy
`6a96f5627eede63f6a674a86` stopped at Netlify Visitor Access before a model
call. The current record supersedes that operational condition with one bounded
measurement against draft `6a96fe3d3c15f05d6dfe3a47`, at commit `baa91de`:

- exactly one synthetic fixture `brief` request and one synthetic
  representative `score` request are recorded;
- both list one provider attempt, so neither consumed a retry;
- the brief uses the exact 3,020-byte worked-example posting, with the checked
  SHA-256 `0f7263eaebdde2bc4416903daa091540dd05c7ccf6fb83a1101716d9a9ac1fd6`;
- the score procedure preserves the full returned `q1` object, including
  `targetsGap`, while the handler sends only its prompt and source quote to the
  provider; and
- the worktree contains no temporary draft runner or additional measurement
  artifact. The record's statement that the temporary runner was removed is
  consistent with the current repository state.

The record contains the required redacted successful `meta.usage` fields for
both calls: model, attempts, input/output/total tokens, cached and cache-write
input tokens, and reasoning tokens. Its model and field names match the
handler's public usage mapping.

## Pricing and budget reconciliation

The documented price inputs are $0.20 / MTok input, $1.20 / MTok output, and
$0.25 / MTok cache-write input (1.25x input). The stated charges reproduce:

- Brief: `(1,187 × $0.25 + 3 × $0.20 + 1,083 × $1.20) / 1,000,000`
  = `$0.00159695` = `0.287451` credits at 180 credits/USD.
- Score: `(471 × $0.20 + 414 × $1.20) / 1,000,000`
  = `$0.00059100` = `0.106380` credits.
- Combined: `$0.00218795` = `0.393831` credits.

The one-brief/eight-like-scores projection is `0.287451 + (8 × 0.106380)` =
`1.138491` credits, appropriately rounded to about `1.14`; this is below the
project's 1.5-credit planning estimate. The observed 1,083 brief output tokens
and 414 score output tokens are also below their normal request ceilings of
1,800 and 450 respectively. The all-retry session ceiling remains correctly
documented as 10,800 output tokens / `$0.01296` before input cost.

## Current implementation and local evidence

The round-4 local closures remain intact: strict structured-output and
post-parse validation, bounded retries and timeout, fixed public errors,
independent input caps, and full saved-Question validation at the scoring
boundary. Current local checks passed:

- `npm test` and direct test execution: 21 passed, 0 failed.
- `npm run build`.
- TypeScript no-emit check for `netlify/functions/analyze.mts`.
- `npx netlify build --offline`, including function packaging.
- `git diff --check`.

## Operational access note

The user changed Netlify Visitor Access to public to enable the completed
draft measurement. This is an operational configuration change, not a code
defect, and this review did not alter it. Restoring the desired previews-gated
policy requires the user's direction.
