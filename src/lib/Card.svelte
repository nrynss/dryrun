<script>
  // Card — dev-diary/design.md 8.1. The container for almost everything.
  let { children } = $props();
</script>

<div class="card">
  {@render children()}
</div>

<style>
  .card {
    background: var(--card);
    border: 1px solid var(--edge);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 16px;
  }
  @media (min-width: 480px) {
    .card {
      padding: 20px;
    }
  }

  /* A card never nests inside another card (8.1). If one does, strip the
     card look so the mistake is visible instead of rendered as a card. */
  .card :global(.card) {
    background: transparent;
    border: 0;
    box-shadow: none;
    padding: 0;
  }
</style>
