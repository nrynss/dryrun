<script>
  // Getting ready screen — dev-diary/design.md 9.2. The loading block per
  // 8.14, centred, with the wordmark above it. No other content, and no
  // cancel button: the call is bounded at two attempts with a 10-second
  // timeout (9.2). Section 10 state 21.
  import LoadingBlock from './LoadingBlock.svelte';
  import { copy } from './copy.js';
</script>

<div class="page">
  <div class="column ready">
    <p class="t-h2 wordmark">{copy.app.name}</p>
    <LoadingBlock />
  </div>
</div>

<style>
  /* 9.2: wordmark at the top, 24px screen-top padding (matching 9.1/9.3). */
  .ready {
    padding-block: 24px 32px;
  }

  .wordmark {
    color: var(--strong);
    margin: 0;
  }
</style>
