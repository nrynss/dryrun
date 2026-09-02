<script>
  // Your practice screen — dev-diary/design.md 9.3. List blocks 8.9,
  // fit items 8.10, question cards 8.7, action bar 7.3. Every string comes
  // from the copy deck (11.4).
  import Button from './Button.svelte';
  import FitList from './FitList.svelte';
  import ListBlock from './ListBlock.svelte';
  import MessageStrip from './MessageStrip.svelte';
  import QuestionCard from './QuestionCard.svelte';
  import { copy } from './copy.js';
  import { session, startInterview } from './session.svelte.js';

  // 8.10: show at most the top 3 gap items, then a quiet Show all.
  const GAP_PREVIEW = 3;

  let showAllGaps = $state(false);

  // 9.3 item 7: the fit sections render only when fitMatch exists and its
  // confidence is high.
  let fitHigh = $derived(!!session.fitMatch && session.fitMatch.confidence === 'high');

  let gaps = $derived(fitHigh ? session.fitMatch.gaps ?? [] : []);
  let gapPreview = $derived(showAllGaps ? gaps : gaps.slice(0, GAP_PREVIEW));
  let hasMoreGaps = $derived(gaps.length > GAP_PREVIEW);

  function startPractice() {
    // Both callers share this door. startInterview starts a pristine plan,
    // the worked example, and a rolled-back plan that already carries
    // answers, so the screen's one primary always works.
    startInterview();
  }
</script>

<div class="page">
  <div class="column plan">
    <!-- Section 10 state 11: the worked-example notice sits at the very top
         of the screen, above the wordmark. -->
    {#if session.isExample}
      <div class="example-notice">
        <MessageStrip kind="note" role="status" message={copy.notice.example} />
      </div>
    {/if}
    <p class="t-h2 wordmark">{copy.app.name}</p>
    <h1 class="t-h1 title">{copy.plan.title}</h1>
    <p class="t-body sub">{copy.plan.sub}</p>

    <!-- 9.3: when the advert was thin (brief.confidence low), a --note strip
         sits directly under the sub-line. The fixture is 'high', so absent. -->
    {#if session.brief?.confidence === 'low'}
      <div class="thin-strip">
        <MessageStrip kind="note" role="status" message={copy.warn.thin_advert} />
      </div>
    {/if}

    <div class="sections">
      <section>
        <ListBlock heading={copy.plan.owns} items={session.brief?.owns ?? []} />
      </section>

      <section>
        <ListBlock heading={copy.plan.study} items={session.brief?.study ?? []} />
      </section>

      <section>
        <ListBlock heading={copy.plan.angles} items={session.brief?.angles ?? []} />
      </section>

      {#if fitHigh}
        <section>
          <h2 class="t-h3 section-heading">{copy.plan.have}</h2>
          <FitList kind="evidenced" items={session.fitMatch.evidenced ?? []} />
        </section>

        <section class="may-ask">
          <h2 class="t-h3 section-heading">{copy.plan.may_ask}</h2>
          <FitList kind="gaps" items={gapPreview} />
          {#if hasMoreGaps}
            <Button variant="quiet" onclick={() => (showAllGaps = !showAllGaps)}>
              {showAllGaps ? copy.btn.show_less : copy.btn.show_all}
            </Button>
          {/if}
        </section>
      {/if}

      <section>
        <h2 class="t-h3 section-heading">{copy.plan.questions}</h2>
        <div class="cards">
          {#each session.questions as q (q.id)}
            <QuestionCard question={q.prompt} sourceQuote={q.sourceQuote} />
          {/each}
        </div>
      </section>
    </div>
  </div>

  <!-- 9.3 item 9: the action bar (7.3). -->
  <div class="actionbar">
    <div class="actionbar-inner">
      <Button onclick={startPractice}>{copy.btn.start}</Button>
    </div>
  </div>
</div>

<style>
  /* 9.3: 24px top padding; 7.2: 32px bottom before the action bar. */
  .plan {
    padding-block: 24px 32px;
  }

  /* Wordmark, matching the Start screen treatment (9.1). */
  .wordmark {
    color: var(--strong);
    margin: 0;
  }

  /* One h1 per screen (13). 12px to the sub-line. */
  .title {
    color: var(--ink);
    margin: 12px 0 0 0;
  }

  .sub {
    color: var(--ink);
    margin: 12px 0 0 0;
  }

  .thin-strip {
    margin-top: 12px;
  }
  .example-notice {
    margin-bottom: 12px;
  }

  /* 9.3: sections are separated by 32px. */
  .sections {
    display: flex;
    flex-direction: column;
    gap: 32px;
    margin-top: 32px;
  }

  /* 7.2: heading to its first child is 12px. */
  .section-heading {
    color: var(--ink);
    margin: 0 0 12px 0;
  }

  /* 8.10: Show all sits quietly under the gap panel. */
  .may-ask :global(.btn-quiet) {
    margin-top: 8px;
  }

  /* 8.7: 12px between question cards. */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* The action bar is full-bleed below 768px (7.3); its contents cap at the
     640px column and centre, matching the Start screen. */
  .actionbar-inner {
    max-width: var(--column);
    margin-inline: auto;
  }
</style>
