<script>
  // Question card — dev-diary/design.md 8.7. A card holding only the question
  // and its source quote (3.5). Nothing else lives on this card.
  import Card from './Card.svelte';
  import Button from './Button.svelte';
  import { copy } from './copy.js';
  let { question, sourceQuote } = $props();

  let expanded = $state(false);

  // A new question starts collapsed, so expanding one never leaks into the next.
  $effect(() => {
    question;
    expanded = false;
  });
</script>

<Card>
  <p class="t-question question">{question}</p>

  {#if sourceQuote}
    <div class="quote">
      <p class="t-micro label">{copy.plan.quote_label}</p>
      <p class="t-small text" class:clamped={!expanded}>"{sourceQuote}"</p>
    </div>

    <div class="quote-toggle">
      {#if !expanded}
        <Button variant="quiet" onclick={() => (expanded = true)}>{copy.btn.show_all}</Button>
      {:else}
        <Button variant="quiet" onclick={() => (expanded = false)}>{copy.btn.show_less}</Button>
      {/if}
    </div>
  {/if}
</Card>

<style>
  .question {
    color: var(--ink);
    margin: 0 0 16px 0;
    /* Section 13: at 200% zoom on a 360px screen a single long word is
       wider than the card content box; allow a mid-word break so the page
       never pans horizontally (same treatment as FileChooser's .name). */
    overflow-wrap: anywhere;
  }

  /* 3.5: 3px left rule in --edge-firm, 12px padding to the left of the text. */
  .quote {
    border-left: 3px solid var(--edge-firm);
    padding-left: 12px;
    margin-top: 0;
  }
  .label {
    color: var(--ink-quiet);
    margin: 0 0 4px 0;
  }
  .text {
    color: var(--ink-quiet);
    margin: 0;
  }

  /* Below 480px the quote clamps to 3 lines until expanded (3.5). */
  .clamped {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    overflow: hidden;
  }
  .quote-toggle {
    margin-top: 8px;
  }

  @media (min-width: 480px) {
    /* At 480px and above the quote renders in full: no clamp, no toggle. */
    .clamped {
      display: block;
      -webkit-line-clamp: unset;
      overflow: visible;
    }
    .quote-toggle {
      display: none;
    }
  }
</style>
