<script>
  // Your tips screen — dev-diary/design.md 9.5. Result panel 8.11, one card
  // per question (missed list 8.9, score disclosure 8.12, source quote 3.5),
  // then the action bar (7.3).
  import Button from './Button.svelte';
  import Card from './Card.svelte';
  import ListBlock from './ListBlock.svelte';
  import MessageStrip from './MessageStrip.svelte';
  import ResultPanel from './ResultPanel.svelte';
  import ScoreRow from './ScoreRow.svelte';
  import { copy } from './copy.js';
  import { AXES } from './shapes.js';
  import { session, getVerdict, startOver } from './session.svelte.js';

  // T32: the top-level verdict comes from the same capability an agent's
  // get_verdict tool call returns. A human never reads a different band,
  // average or coverage than ChatGPT would report for this session.
  let verdict = $derived(getVerdict());
  // Section 10 state 22: zero scored answers — no result panel, the empty
  // block instead. Reachable by skipping every question.
  let anyScored = $derived(verdict.answered > 0);

  // Per-axis session averages, over the same complete, validator-approved
  // answers getVerdict() itself counts (unscored, skipped, or malformed
  // residue must not shift these numbers either).
  let axes = $derived(
    Object.fromEntries(
      AXES.map((axis) => {
        const values = session.questions
          .filter((q) => q.skipped !== true && q.scores && typeof q.scores[axis] === 'number')
          .map((q) => q.scores[axis]);
        return [axis, values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0];
      }),
    ),
  );

  function tryAgain() {
    // Re-enters the practice screen with the existing answers and scores in
    // place, at question 1. This skips startInterview, so it works even
    // though that capability's pristine guard would refuse a scored plan.
    session.current = 0;
    session.phase = 'interviewing';
  }

  function differentJob() {
    startOver();
  }

  function printTips() {
    // CSS cannot open <details>; the standard approach is to open them from
    // JS before printing — the print stylesheet then keeps the paper clean.
    // Opening alone is not enough: the fills grow over 300ms, so ScoreRow
    // commits them at their final width synchronously on dryrun:prepare-print,
    // dispatched here before window.print() — the print render then sees
    // full bars, not 0-width starts.
    document.querySelectorAll('details').forEach((d) => (d.open = true));
    document.dispatchEvent(new CustomEvent('dryrun:prepare-print'));
    window.print();
  }
</script>

<div class="page">
  <div class="column tips">
    <p class="t-h2 wordmark">{copy.app.name}</p>
    <h1 class="t-h1 title">{copy.tips.title}</h1>

    <!-- 9.5 item 3 / Section 10 state 22: with at least one scored answer
         the result panel shows; with none, the empty block replaces it — no
         result panel at all. Reachable by skipping every question. -->
    {#if anyScored}
      <div class="result">
        <ResultPanel {verdict} {axes} />
      </div>
    {:else}
      <div class="empty-block">
        <p class="t-body empty-text">{copy.empty.no_answers}</p>
        <Button onclick={tryAgain}>{copy.empty.no_answers_action}</Button>
      </div>
    {/if}

    <!-- 9.5 item 4: one card per question, 16px between cards. -->
    <div class="blocks">
      {#each session.questions as q, i (q.id ?? i)}
        <Card>
          <p class="t-micro qnum">{copy.tips.question_n.replace('{n}', String(i + 1))}</p>
          <p class="t-body-b prompt">{q.prompt}</p>

          {#if q.skipped}
            <!-- 9.5: a skipped question shows the prompt, then the strip and
                 nothing else. -->
            <div class="skipped">
              <MessageStrip kind="note" role="status" message={copy.tips.skipped} />
            </div>
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
          {:else}
            <!-- Unanswered (no answer, not skipped — Q4-Q8 in
                 the fixture): the prompt alone. Design 9.5 specifies a strip
                 only for skipped; there is no deck string for "you did not
                 answer this". Design-doc gap flagged for T19, which owns the
                 Section 10 state table — a judge can reach this state by
                 finishing with questions untouched, and it needs honest copy.
                 No invented string here. -->
          {/if}
        </Card>
      {/each}
    </div>
  </div>

  <!-- 9.5 item 5: the action bar (7.3). The quiets sit above the primary:
       Practise a different job and Print or save these tips, stacked with an
       8px gap (the two-full-width-quiets limit). -->
  <div class="actionbar">
    <div class="actionbar-inner">
      <div class="quiets">
        <Button variant="quiet" style="width: 100%" onclick={differentJob}>
          {copy.btn.different_job}
        </Button>
        <Button variant="quiet" style="width: 100%" onclick={printTips}>
          {copy.btn.print}
        </Button>
      </div>
      <Button onclick={tryAgain}>{copy.btn.again}</Button>
    </div>
  </div>
</div>

<style>
  /* 9.5: 24px top padding; 7.2: 32px bottom before the action bar. */
  .tips {
    padding-block: 24px 32px;
  }

  /* Wordmark, matching the other screens (9.1/9.3). */
  .wordmark {
    color: var(--strong);
    margin: 0;
  }

  /* One h1 per screen (13). 12px to the first child. */
  .title {
    color: var(--ink);
    margin: 12px 0 0 0;
  }

  /* 9.5 item 3: the result panel sits 16px below the title. */
  .result {
    margin-top: 16px;
  }

  /* State 22: the empty block sits where the result panel would, 16px below
     the title, 12px between the sentence and the restart button (7.2). */
  .empty-block {
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .empty-text {
    color: var(--ink);
    margin: 0;
  }

  /* 9.5 item 4: 32px to the blocks, 16px between them. */
  .blocks {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 32px;
  }

  /* Question {n}: t-micro, --ink-quiet. */
  .qnum {
    color: var(--ink-quiet);
    margin: 0;
  }

  /* prompt t-body-b --ink, 4px under the label. */
  .prompt {
    color: var(--ink);
    margin: 4px 0 0 0;
  }

  /* The skipped strip sits 16px below the prompt. */
  .skipped {
    margin-top: 16px;
  }

  /* 9.5: sections at 16px, text 8px under its heading. */
  .section {
    margin: 16px 0 0 0;
  }
  .text {
    color: var(--ink);
    margin: 8px 0 0 0;
  }

  /* 13: every details summary is at least 44px high. */
  details {
    margin-top: 16px;
  }
  summary {
    display: flex;
    align-items: center;
    min-height: 44px;
    color: var(--strong);
    cursor: pointer;
  }
  .scores {
    margin-top: 8px;
  }

  /* 3.5: label t-micro --ink-quiet; quote t-small --ink-quiet, straight
     quotation marks, 3px --edge-firm left rule, 12px padding, below the
     score row. */
  .quote {
    border-left: 3px solid var(--edge-firm);
    padding-left: 12px;
    margin-top: 16px;
  }
  .quote-label {
    color: var(--ink-quiet);
    margin: 0 0 4px 0;
  }
  .quote-text {
    color: var(--ink-quiet);
    margin: 0;
  }

  /* Section 13: at 200% zoom on a 360px screen the quote's unbreakable run
     (e.g. "Swagger/OpenAPI,") outgrows the 165px layout width and pans the
     page; allow a mid-word break below 260px (same treatment as ScoreRow's
     .name and ResultPanel's .title). */
  @media (max-width: 260px) {
    .quote-text {
      overflow-wrap: anywhere;
    }
  }

  /* The action bar is full-bleed below 768px (7.3); its contents cap at the
     640px column and centre, matching the other screens. */
  .actionbar-inner {
    max-width: var(--column);
    margin-inline: auto;
  }

  /* 7.3: two full-width quiet buttons stacked with an 8px gap; the primary
     sits below. */
  .quiets {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }
</style>
