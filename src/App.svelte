<script>
  import Tips from './lib/Tips.svelte';
  // The unexpected-phase fallback below still renders example.questions, so
  // this import exists only for that harness; T19 removes the branch and
  // this import together.
  import example from './lib/example.json';
  import Plan from './lib/Plan.svelte';
  import Practice from './lib/Practice.svelte';
  import QuestionCard from './lib/QuestionCard.svelte';
  import Start from './lib/Start.svelte';
  import { session } from './lib/session.svelte.js';
</script>

{#if session.phase === 'idle' || session.phase === 'analysing'}
  <!-- Start (9.1). The getting-ready screen for 'analysing' is T19. -->
  <Start />
{:else if session.phase === 'ready'}
  <!-- Your practice (9.3). -->
  <Plan />
{:else if session.phase === 'interviewing'}
  <!-- Practice (9.4). -->
  <Practice />
{:else if session.phase === 'done'}
  <!-- Your tips (9.5). -->
  <Tips />
{:else}
  <!-- Safety fallback for an unexpected phase value. T19 removes this
       entirely — all five phases have real screens by then. -->
  <div class="page">
    <div class="column cards">
      {#each example.questions as q (q.id)}
        <QuestionCard question={q.prompt} sourceQuote={q.sourceQuote} />
      {/each}
    </div>
  </div>
{/if}

<style>
  /* 7.2: 12px between cards in a list; 24px screen top, 32px bottom. */
  .cards {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding-block: 24px 32px;
  }
</style>
