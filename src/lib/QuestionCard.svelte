<script>
  // Question card — dev-diary/design.md 8.7. A card holding only the question
  // and its source quote (3.5). Nothing else lives on this card.
  import Card from './Card.svelte';
  import Button from './Button.svelte';
  import { onMount } from 'svelte';
  import { cubicOut } from 'svelte/easing';
  import { copy } from './copy.js';
  let { question, sourceQuote } = $props();

  let expanded = $state(false);

  // A new question starts collapsed, so expanding one never leaks into the next.
  $effect(() => {
    question;
    expanded = false;
  });

  // Section 12: card content cross-fades 160ms ease-out on question change.
  // Svelte transitions are JS-driven (Web Animations API) and ignore the
  // global reduced-motion CSS block in app.css, so the media query is checked
  // here and the swap is instant under reduced motion. The first mount is not
  // a question change — screen entry stays instant (no page transition) — so
  // the intro is skipped until the card has been on screen.
  let mounted = $state(false);
  onMount(() => (mounted = true));

  function reduceMotion() {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  function fadeIn(node, { duration = 160 } = {}) {
    if (reduceMotion()) return { duration: 0 };
    return {
      duration,
      easing: cubicOut,
      css: (t) => `opacity: ${t}`,
    };
  }

  // The out-transition overlays the outgoing block on the incoming one: out
  // of flow, anchored to the stage top, so the stage height is the new
  // content's height throughout — no layout jump, a true cross-fade. (Svelte
  // keeps the outro-ing element of a keyed block in normal flow otherwise,
  // so the two cards stack and the card height balloons.)
  function fadeOut(node, { duration = 160 } = {}) {
    if (reduceMotion()) return { duration: 0 };
    node.style.position = 'absolute';
    node.style.left = '0';
    node.style.right = '0';
    node.style.top = '0';
    return {
      duration,
      easing: cubicOut,
      css: (t) => `opacity: ${t}`,
    };
  }
</script>

<Card>
  <div class="stage">
    {#key question}
      <div
        in:fadeIn={{ duration: mounted ? 160 : 0 }}
        out:fadeOut={{ duration: mounted ? 160 : 0 }}
      >
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
      </div>
    {/key}
  </div>
</Card>

<style>
  /* The cross-fade stage: relative, so the outro-ing block can be absolutely
     positioned against it and fade out over the incoming content (12). */
  .stage {
    position: relative;
  }

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
