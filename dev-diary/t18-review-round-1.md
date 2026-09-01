# T18 review — round 1

Date: 2 September 2026 (design.md Revision 2)
Reviewer: ReviewT18 (adversarial, read-only)
Scope: `src/lib/Tips.svelte`, `src/lib/ResultPanel.svelte`, `src/lib/ScoreRow.svelte`
(new, untracked), `src/App.svelte` (modified), `src/app.css` (print block
appended only) — the Your tips screen 9.5, result panel 8.11 + 3.4 + 11.7,
score row 8.12, question blocks (missed list 8.9, source quote 3.5), action
bar 7.3, print stylesheet 9.5. Binding spec: design.md Revision 2. The user's
four parallel files (`dev-diary/project.md`, `netlify/functions/analyze.mts`,
`src/lib/shapes.js`, `test/analyze-contract.test.mjs`) were read but not
touched. No commits made; the only file written is this diary.

**Verdict: REMEDIATE — 0 P1, 2 P2, 0 P3.** (Approval requires zero findings.)

Two patch-introduced defects, both verified in a real browser:

- **P2-1** `Tips.svelte:87` — an answered-but-unscored question renders as a
  prompt-only card; the user's answer silently disappears from the tips
  screen.
- **P2-2** `App.svelte:22-31` — the unexpected-phase safety fallback still
  iterates `example.questions` after this patch removed the `example` import;
  any unknown phase value throws `ReferenceError: example is not defined`.

Everything else in the change list passed: the capped fixture verdict renders
correctly end to end (title/line/kind/wash), all four 14.1 cases reachable via
console session manipulation render correctly, the print media rules compute
as specified (white ground, hidden bar, no shadows, justified `!important`),
and the build is clean.

## Findings by severity

### P2-1 — Answered-but-unscored questions render as unanswered, dropping the answer

- **File / lines**: `src/lib/Tips.svelte:87-89` (the `{:else if q.answer && q.scores}` branch; the `{:else}` at 112-120).
- **Spec vs code**: 9.5's block spec renders `What you said` / `{answer}` as
  the second element of every answered question block; the score-dependent
  parts (`What to add`, model answer, `See the scores`) are what require
  scores. The code makes the *entire block* conditional on both `answer` and
  `scores`, so a question with an answer but no scores falls into the
  prompt-only else branch — the branch comment claims it only handles
  "no answer and no scores", which is not the actual condition.
- **Why it is a defect**: the state is reachable through the current UI. The
  practice screen binds the answer box straight to
  `session.questions[current].answer` (R1), so typing an answer into Q4-Q8 and
  finishing (or completing all eight) puts answered-but-unscored questions on
  the tips screen; the verdict then reads "You answered 3 of the 8 questions"
  while the typed answers are nowhere on the screen. The product itself
  sanctions this state — `err.score_failed` is "We could not read that answer.
  Your answer is saved." (11.9) — so a saved, unscored answer must not render
  as if it never happened. R2 ("a person tapping on a phone completes the
  whole product") is the exact path that trips it. Verified in the browser:
  with `q5.answer = 'My typed answer for Q5.'` and `scores: null` in the done
  phase, card 5 shows only the prompt — no `What you said`, no answer text.
- **Fix**: branch on `q.answer` and gate the scored sections on `q.scores`,
  mirroring the existing partial-state pattern (Practice gates FeedbackNote on
  `question?.scores`):

```svelte
          {:else if q.answer}
            <h2 class="t-h3 section">{copy.tips.what_you_said}</h2>
            <p class="t-body text">{q.answer}</p>

            {#if q.scores}
              <div class="section">
                <ListBlock heading={copy.feedback.what_to_add} items={q.missed ?? []} />
              </div>

              <h2 class="t-h3 section">{copy.feedback.good_answer}</h2>
              <p class="t-body text">{q.modelAnswer}</p>

              <!-- 8.12 + 3.5: the disclosure carries the axis rows, then the
                   quote inside the per-question detail (9.5). -->
              <details>
                <summary class="t-micro">{copy.btn.see_scores}</summary>
                <div class="scores">
                  <ScoreRow scores={q.scores} />
                  {#if q.sourceQuote}
                    <div class="quote">
                      <p class="t-micro quote-label">{copy.plan.quote_label}</p>
                      <p class="t-small quote-text">"{q.sourceQuote}"</p>
                    </div>
                  {/if}
                </div>
              </details>
            {/if}
```

- **Priority**: 2. **Confidence**: 0.85.

### P2-2 — Unexpected-phase fallback throws `ReferenceError: example is not defined`

- **File / lines**: `src/App.svelte:22-31` (fallback `{:else}` branch; the
  import it needs was removed at line 2 in this patch).
- **Spec vs code**: none — this is a regression inside the patch. The T18
  diff replaced `import example from './lib/example.json'` with
  `import Tips from './lib/Tips.svelte'` but kept the fallback branch, which
  still renders `{#each example.questions ...}`.
- **Why it is a defect**: the branch exists precisely as a safety net for an
  unexpected `session.phase` value (its comment says so), and it is the one
  branch that cannot work: any unknown phase (a typo in console session
  manipulation during a demo, or a future phase value from T25 wiring) throws
  `Uncaught ReferenceError: example is not defined` during render. Verified in
  the browser: setting `session.phase = 'bogus'` fires the error (captured via
  a `window` error listener) and leaves the UI stuck on the stale previous
  screen — the fallback never appears. A broken safety net is worse than no
  branch.
- **Fix**: restore the import (one line; T19 removes the whole branch anyway):

```js
  import example from './lib/example.json';
```

- **Priority**: 2. **Confidence**: 0.9.

## Rulings recorded

### Ruling (a): unanswered blocks render prompt-only — ACCEPTED (with the answered-unscored caveat)

Q4-Q8 in the fixture (no answer, no scores, not skipped) render as a card
holding `Question {n}` and the prompt, nothing else. 9.5 specifies a strip
only for skipped questions and there is no deck string for "you did not answer
this"; inventing copy is forbidden, and the code comment flags the missing
deck string as a T19 gap. The prompt-only card is the honest render for a
genuinely unanswered question. **Accepted** — but note that this is the same
`{:else}` that also swallows answered-but-unscored questions, which *is* a
defect (P2-1): the two states must not share a render.

### Ruling (b): 14.1 arithmetic slip — CODE CORRECT, DOC HAS THE SLIP

The doc's fourth literal verdict object says `average: 3.75` with the claim
"This is what the fixture gives". The fixture's three scored answers average
(4.25 + 3.0 + 3.75) / 3 = 3.6667 → 3.7 — the doc's 3.75 is actually Q3's own
average. The implementation follows `buildVerdict` (the sanctioned contract in
the user's parallel shapes.js work) and renders `Your answers averaged 3.7 out
of 5.` (verified). `capped_kind` still fires (3.667 ≥ 3) per 11.7. **Recorded
for the design doc to correct 14.1's fourth case to 3.67.** Also noted:
`capped_kind`'s `average >= 3` guard is redundant by construction —
`buildVerdict` only sets `capped` when the band was `ready`/`nearly`, which
already implies an average ≥ 3 — but it mirrors 11.7's wording verbatim and is
harmless; leave it.

### Ruling (c): no source-quote clamp on the tips screen — ACCEPTED

3.5's 3-line clamp with `Show all` governs quotes on the surface (QuestionCard,
T14). On the tips screen the quote lives inside the per-question `<details>`
disclosure (9.5's block spec lists it with no clamp), and the disclosure is
the progressive-disclosure mechanism — equivalent to "show all" being already
expanded. The tips screen renders the quote in full inside the disclosure.
**Accepted**, consistent with the T14/T15 treatment.

## Checklist

**1. 9.5 order — PASS.** DOM order = visual order (measured in the browser):
wordmark `t-h2` `--strong` rgb(27,94,74), 24px top padding → `t-h1` "Your tips
for next time" (12px below; exactly one h1 on the screen) → result panel 16px
below the title → 32px to the blocks, 16px between the eight cards (all eight
in fixture order, "Question 1".."Question 8") → action bar with the two quiet
buttons above the primary. No horizontal scroll at 360px or 900px.

**2. ResultPanel (8.11 + 3.4 + 11.7) — PASS.** Verdict derived from
`buildVerdict` over the scored questions wrapped as `{ scores: q.scores }`
(the sanctioned AnswerScore shape). Bands verified in the browser for all four
cases: ready → `panel-strong`/`--strong-wash`/"You are ready"/`ready_line`;
nearly → `panel-almost`/`--almost-wash`/"Nearly ready"/`nearly_line`; not yet
(content) → `panel-note`/`--note-wash`/"Keep practising"/`notyet_line`;
capped → title still "Keep practising", `capped_line` with `{answered}` = 3
substituted and no other code-injected numbers, plus `capped_kind` (fixture
average 3.67 ≥ 3). Title `t-display` in the band colour (text-wrap balance on
the class), line `t-body --ink` margin-top 8px, 24px padding. `See the
numbers` summary `t-micro` 44px, revealing "You answered 3 of 8 questions.",
"Your answers averaged 3.7 out of 5." (one decimal, no trailing .0), and the
four axis names with session means (Detail 4, Proof 3, Clear order 3.3, Fits
the job 4.3 — all computed from the actual fixture scores). Only place a raw
average appears.

**3. ScoreRow (8.12) — PASS.** Four rows in AXES order; names Detail/Proof/
Clear order/Fits the job (`copy.axis`), `t-body --ink`, width 120px, flex
none; bar flex 1, height 8px, radius 4px, `--edge` background, 1px
`--edge-firm` border, overflow hidden; fill height 100%, width (value/5*100)%
inline, per-axis band colour via `scoreBand` (good→`--strong`, mid→`--almost`,
bad→`--note` per 5.2; q1 verified: 5→100% `--strong`, 4→80% `--strong`); value
`t-number --ink`, width 28px, right-aligned. Row min-height 32px, gap 12px.

**4. Question blocks — PASS with P2-1.** `Question {n}` `t-micro --ink-quiet`;
prompt `t-body-b --ink` 4px under the label. Skipped (Q4 flagged skipped in
the browser): the `tips.skipped` strip (`strip-note`, `role="status"`) after
the prompt and nothing else (verified — no headings, no answer, no details).
Answered (Q1-Q3): `What you said` `t-h3` 16px + answer `t-body --ink` 8px;
`What to add` `t-h3` + missed ListBlock (8.9 dot markers, 2 items for Q1);
`A good answer could say` `t-h3` + modelAnswer `t-body` 8px; `See the scores`
`t-micro` 44px summary containing the four ScoreRows, then `From the job
advert` `t-micro --ink-quiet` 16px + the quoted sourceQuote `t-small
--ink-quiet` with the 3px `--edge-firm` left rule and 12px padding, inside the
disclosure, no clamp (ruling c). **FAIL sub-case (P2-1)**: a question with an
answer but no scores renders as prompt-only and the answer vanishes.

**5. Unanswered blocks — PASS (ruling a).** Q4-Q8 untouched render prompt-only
cards with the T19 gap comment; accepted. The answered-unscored conflation is
P2-1.

**6. 14.1 arithmetic — PASS (ruling b).** Implementation computes the real
mean 3.667 → "3.7"; the doc's 3.75 is a slip, recorded for correction.
`capped_kind` fires for the fixture; verified absent for an average below 3
(where `buildVerdict` correctly returns the not-yet band with no cap).

**7. Action bar — PASS.** Order verified: quiet `Practise a different job`,
quiet `Print or save these tips` (both 48px, stacked 8px apart), primary `Try
again` (52px). `Try again` → `current = 0`, `phase = 'interviewing'` (verified;
retains answers/scores — reasonable interim semantics, T25-T30 define the real
ones; sanctioned). `Practise a different job` → full reset verified field by
field: posting, resume, brief, fitMatch, questions (length 0, array), current,
error, agentSeen, lastCallAt, phase → `idle`; lands on the Start screen
(verified — "Practise your job interview" h1 renders). Nothing a fresh Start
screen needs is missed. Print → opens every `<details>` (4/4 on the capped
view) then calls `window.print()` (verified with a stubbed print).

**8. Print stylesheet — PASS.** Verified under `Emulation.setEmulatedMedia
{media: 'print'}`: computed `background` is rgb(255,255,255) on `:root`,
`html`, `body` and `.page`; `.actionbar` `display: none`; `.card` and
`.result-panel` `box-shadow: none`; on the practice screen `.chatline`,
`.segments` and `p.t-micro.label` all `display: none`. Screen media unchanged
(`--paper` ground, shadows present). `!important` usage is justified, not
lazy: the display/box-shadow rules compete with Svelte-scoped rules at higher
specificity (`ChatGPTLine`'s `.chatline { display: flex }`, `Card`'s scoped
`box-shadow`, `ResultPanel`'s scoped `box-shadow`); the background rule needs
no `!important` because `.page`'s background and index.html's `:root`
declaration are both unscoped author rules at equal specificity with the
later-linked app.css winning — verified computed white. The `p.t-micro.label`
selector matches ProgressRow's actual markup. The JS-open-details-before-print
approach is the correct mechanism (CSS cannot open `<details>`), matching
9.5's "opens every `<details>`" intent.

**9. Banned copy (3.2) — PASS with two recorded doc notes.** All new visible
strings are sanctioned deck keys (`tips.*`, `result.*`, `axis.*`, `btn.again`,
`btn.different_job`, `btn.print`, `btn.see_scores`, `btn.see_numbers`,
`feedback.what_to_add`, `feedback.good_answer`, `plan.quote_label`,
`app.name`); the three new components contain no inline string literals
(grepped). Surface scan found only `score` (inside the 9.5-mandated
`See the scores` summary) and `axes` (inside Q1's fixture modelAnswer "triage
on two axes", pre-existing example data in a disclosure — ordinary English,
not product copy). Doc note (i): 3.2's blanket word ban is contradicted by the
deck's own `btn.see_scores` = "See the scores", which 9.5's block spec
mandates — the implementation is correct to follow the screen spec; design.md
should reconcile. Doc note (ii): 3.2's "axis/axes" ban vs. fixture content —
fixture data is not product copy.

**10. Scope — PASS.** `git status`: exactly the three new files plus
`src/App.svelte` and `src/app.css` beyond the user's four parallel files
(untouched). The `app.css` diff is a single append hunk (`@@ -214,3 +214,37
@@`, additions only) — T13's sections byte-identical. `App.svelte` diff: the
import swap (which is P2-2's root cause), the `done` branch, and the fallback
comment.

**11. Build + judge view — PASS (except the fallback, P2-2).** `npm run build`
passes (chunk-size warning is environmental, pre-existing). Browser: the full
UI-click path works — Start → `Start practice` → Plan → `Start practice` →
Practice → Next ×2 (fixture answers present) → `Finish and show my tips` →
done → tips screen with the capped "Keep practising" verdict. All four 14.1
cases reachable via console session manipulation render with the correct
title/line/wash (F1-F4). Skipped vs unanswered vs full blocks all verified.
One h1 per screen; no horizontal scroll at 360/900. The unexpected-phase
fallback crashes (P2-2).

## Verification environment and unverified items

Verified in headless Chromium (google-chrome-stable, `--headless=new`, CDP)
against `npm run build` + `npx vite preview` at 4173, at 360px and 900px.
Screenshots: `/tmp/t18verify/shots/done-capped-900.png`,
`done-skipped-900.png`, `done-360.png`, `F1-ready.png`, `F2-nearly.png`,
`F3-notyet.png`, `ui-path-done-capped.png`, `practice-after-tryagain-900.png`,
`fallback-bogus-phase.png`; full check log: `/tmp/t18verify/results.json` (48
PASS / 1 FAIL — the FAIL is P2-1; the P2-2 crash was confirmed by a separate
window-error-listener probe because page text cannot see console errors).
Driver: `/tmp/t18verify/drive.mjs` (read-only on the repo).

Unverified: an actual printed PDF (verified the print-media computed styles
and the open-details handler instead — the stylesheet's contract is the media
query, and that is measured); page-break behaviour/pagination (the stylesheet
adds none and 9.5 asks for none); the action bar's sticky-vs-inline behaviour
at <768px on the tips screen (unchanged T13 rule, identical markup pattern to
the other screens — visual spot-check at 900px only).
