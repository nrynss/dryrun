<script>
  // Button — dev-diary/design.md 8.2.
  // Variants: primary, secondary, quiet. `disabled` forces the Disabled row
  // of the 8.2 table: aria-disabled="true" and still focusable, so a screen
  // reader can find it and read why. `busy` swaps the label for busyLabel
  // and puts a 20px spinner 8px to the left of it; the button keeps its width.
  let {
    variant = 'primary',
    disabled = false,
    busy = false,
    busyLabel = '',
    onclick,
    children,
    ...rest
  } = $props();
</script>

<button
  type="button"
  class="btn btn-{variant} t-button"
  aria-disabled={disabled}
  aria-busy={busy}
  onclick={(event) => {
    if (disabled) return;
    onclick?.(event);
  }}
  {...rest}
>
  {#if busy}
    <span class="spinner" aria-hidden="true"></span>
    {busyLabel}
  {:else}
    {@render children()}
  {/if}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px; /* spinner sits 8px left of the label */
    border-radius: 10px;
    padding-inline: 20px;
    cursor: pointer;
    text-align: center;
    /* Section 12: the press moves the button down 1px; 80ms so it reads as a
       press, not a nudge. The transform lives on .btn-primary:active; one
       transition on .btn covers every variant. Reduced motion: 'None' — the
       global app.css block makes it instant anyway. */
    transition: transform 80ms;
  }

  .btn-primary {
    background: var(--strong);
    color: var(--on-fill);
    border: 0;
    height: 52px;
    width: 100%;
  }
  .btn-primary:hover {
    background: var(--strong-deep);
  }
  .btn-primary:active {
    background: var(--strong-deep);
    transform: translateY(1px);
  }

  .btn-secondary {
    background: var(--card);
    color: var(--ink);
    border: 1px solid var(--edge-firm);
    height: 48px;
    width: 100%;
  }
  .btn-secondary:hover {
    background: var(--band);
  }

  .btn-quiet {
    background: transparent;
    color: var(--strong);
    border: 0;
    height: 48px;
    width: auto;
    min-width: 48px;
  }
  .btn-quiet:hover {
    text-decoration: underline;
  }

  /* Disabled row of the 8.2 table. Last so it beats the variant rules on
     hover and active, which share its specificity. */
  .btn[aria-disabled='true'] {
    background: var(--disabled);
    color: var(--on-fill);
    border: 0;
    height: 52px;
    width: 100%;
    cursor: not-allowed;
    text-decoration: none;
    transform: none;
  }

  /* 20px spinner. On filled buttons the ring is the text colour with a gap;
     on light buttons it is --strong with a gap. Section 12: under reduced
     motion a static circle, no arc, no rotation. */
  .spinner {
    width: 20px;
    height: 20px;
    flex: none;
    border-radius: 999px;
    border: 3px solid var(--on-fill);
    border-top-color: transparent;
    animation: spin 1.2s linear infinite;
  }
  .btn-secondary .spinner,
  .btn-quiet .spinner {
    border-color: var(--strong);
    border-top-color: transparent;
  }
  @media (prefers-reduced-motion: reduce) {
    .spinner {
      border-color: var(--edge-firm);
      animation: none;
    }
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
