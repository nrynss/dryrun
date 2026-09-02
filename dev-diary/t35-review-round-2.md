# T35 review, round 2

Date: 2026-09-02
Reviewer: ReviewT35
Target: the round-1 remediation of T35 (Dry Run, branch main, HEAD
159e2b2 with the T35 work uncommitted in the working tree). Two files
changed against the reviewed round-1 state: `src/lib/Plan.svelte` and
`dev-diary/design.md`. The parallel `analyze.mts` and
`test/analyze-contract.test.mjs` changes were committed separately and were
excluded from this review. Binding documents: `dev-diary/task.md` row T35
and its "T35 in detail" section, `dev-diary/design.md` Revision 2, and the
parity rules in `dev-diary/project.md`. Prior documents:
`dev-diary/t32-review-round-3.md`, `dev-diary/t35-review-round-1.md`,
`dev-diary/t35-remediation-round-1.md`.

## Verdict

**APPROVED. P1 x 0, P2 x 0, P3 x 0.**

All three round-1 findings are closed. The P2-1 restructure puts the quiet
secondary above the primary in the Practice quiets idiom. Live geometry on
the rebuilt production site covers both viewports and both Plan variants.
The quiet sits above the primary. Both buttons span the full inner width.
The gap is exactly 8px. Overflow is zero in all four measurements.
The 9.3 item now names the rendered structure. The P3-1 closure quote is
verbatim from the round-1 review, and the code and copy are unchanged as the
ruling required. The Plan-touching round-1 passes were re-driven and all
held. npm test: 65 tests, 65 pass, 0 fail.

## Findings by severity

None. Every closure verified below.

## Round-1 closure verification, driven live

`npm run build` produced `dist/`. A reviewer-only static server on loopback
served it. Headless Chrome was driven over the DevTools protocol.
`/api/analyze` was answered by a body-level replay from the real
`createAnalyzeHandler` in `netlify/functions/analyze.mts` with a fake model
client. `window.fetch` was not patched. Plans were built through the real UI
(paste boxes and buttons), and the clear control was driven by a real press.

| Round-1 finding | Status | Evidence |
|---|---|---|
| **P2-1** clear control below the primary, 0px gap, natural width | **CLOSED** | `Plan.svelte:102-111` renders `div.quiets` above the primary inside `.actionbar-inner`, and `Plan.svelte:177-183` adds `.quiets` as a flex column with `gap: 8px` and `margin-bottom: 8px`, the exact idiom at `Practice.svelte:265-270`. Measured on the live build. FitMatch present: 360x800 quiet 297x48 at y680, primary 297x52 at y736, gap 8, both equal to the 297px inner, overflow 0. 1280x900 quiet 640x48, primary 640x52, gap 8, both equal to the 640px inner, overflow 0. FitMatch absent: identical numbers at both viewports, gap 8, overflow 0. DOM order inside `.actionbar-inner` is `div.quiets` then the primary button in all four measurements. |
| **P3-1** unconditional control names a CV that does not exist | **CLOSED** | Closed by the round-1 ruling with no code change and no copy change, exactly as the ruling required. The remediation quotes the ruling and the quote is verbatim (whitespace-normalised byte match against `t35-review-round-1.md`). Live re-check: the button still renders unconditionally with the deck string in both Plan variants. It still calls `startOver()`. Both variants still clear everything and land on Start. |
| **P3-2** design 9.3 item 9 stale | **CLOSED** | `design.md:858-859` now reads "Action bar. Primary `Start practice`. Above it, a quiet secondary `Remove my CV and start over`, stacked with an 8px gap per 7.3." That names exactly what the build renders: one full-width quiet above a full-width primary with an 8px gap. Minimal edit, the 11.4 deck row and the surrounding items untouched. |

### Section 13 zoom gate, re-run on the restructured bar

| Screen state | 180 x 600 | 360 x 800 |
|---|---|---|
| Plan, fitMatch absent | 165 / 165, rightmost 157, overflow 0 | 345 / 345, rightmost 337, overflow 0 |
| Plan, fitMatch present | 165 / 165, rightmost 157, overflow 0 | 345 / 345, rightmost 337, overflow 0 |

Four measurements, zero overflow. The absolute client widths differ from the
remediation table by the 15px scrollbar its harness hid. The gate result is
the same either way.

## Round-1 passes touching Plan, re-verified

| Round-1 pass | Status | Evidence |
|---|---|---|
| CV plan persists under version 3 | HELD | Storage record: version 3, seven keys, resume byte-identical at 135 characters, fitMatch present, three gap questions. |
| Restore lands on Plan complete | HELD | After reload: phase ready, resume byte-identical, fitMatch confidence high, fit sections rendered (`You already have this`, `Things they may ask you about`). |
| Mid-interview reload with a CV | HELD | Scored Q1, reloaded: phase interviewing, current 1, answer restored, scores 4 across all four axes. |
| Clear control on a CV plan | HELD | Press: phase idle, storage record removed. Fresh reload: idle, no record, clean Start. |
| Clear control on a no-CV plan | HELD | Press: phase idle, storage record removed. |

## House prose

The two new comment sentences in the changed hunks are within limits. The
action bar comment reads 6 then 17 words. The CSS comment reads 12 words.
Zero semicolons and zero em or en dashes in prose. Code blocks excluded, as
in round 1.

## Tests

`npm test`: 65 tests, 65 pass, 0 fail, run against the remediated tree. The
four T35 tests still pass unchanged. The SSR assertion of the deck string at
`test/session-capabilities.test.mjs:1280` holds against the new markup, since
the string renders inside `.quiets` in the same body. No test was added, and
that is right. The restructure broke no untested observable. The geometry is
pinned by this review's live measurements.
