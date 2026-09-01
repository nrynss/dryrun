<script>
  import example from './lib/example.json';
  import QuestionCard from './lib/QuestionCard.svelte';
</script>

<!-- T14 verification harness: all eight fixture questions on one screen.
     Temporary — T15 (practice screen) and T16 (start screen) replace this.
     targetsGap is deliberately ignored here. -->
<div class="page">
  <div class="column cards">
    {#each example.questions as q (q.id)}
      <QuestionCard question={q.prompt} sourceQuote={q.sourceQuote} />
    {/each}
  </div>
</div>

<style>
  /* 7.2: 12px between cards in a list; 24px screen top, 32px bottom. */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-block: 24px 32px;
  }
</style>
