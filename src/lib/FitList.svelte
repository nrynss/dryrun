<script>
  // Fit item — dev-diary/design.md 8.10. Two shapes, both from FitMatch:
  //   kind="evidenced"  requirement + evidence, on --strong-wash.
  //   kind="gaps"       requirement + why, on --note-wash.
  // `size` is never shown (it only orders the list) and the word "gap"
  // never appears in copy — the section heading comes from the caller.
  // The top-3 + Show all behaviour lives in Plan.svelte; this component
  // renders whatever items it is given.
  let { kind = 'evidenced', items = [] } = $props();
</script>

<div class="panel panel-{kind}">
  {#each items as item, i (i)}
    <div class="row">
      <p class="t-body-b requirement">{item.requirement}</p>
      {#if kind === 'evidenced'}
        <p class="t-small note">{item.evidence}</p>
      {:else}
        <p class="t-small note">{item.why}</p>
      {/if}
    </div>
  {/each}
</div>

<style>
  /* 8.10: a panel, 12px padding, 8px radius, 8px gap between rows. */
  .panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-radius: 8px;
  }
  .panel-evidenced {
    background: var(--strong-wash);
  }
  .panel-gaps {
    background: var(--note-wash);
  }

  /* 8.10: requirement t-body-b, --ink; evidence/why t-small, --ink-quiet,
     margin-top 4px. */
  .requirement {
    color: var(--ink);
    margin: 0;
  }
  .note {
    color: var(--ink-quiet);
    margin: 4px 0 0 0;
  }
</style>
