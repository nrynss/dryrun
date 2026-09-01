<script>
  // Loading block — dev-diary/design.md 8.14. A 32px spinner, the loading
  // sentence, and the reassurance sentence, wrapped in role="status" so a
  // screen reader announces the change. No progress bar and no stage names:
  // we cannot know the progress, and a fake one is a lie (8.14).
  import { copy } from './copy.js';
</script>

<div class="loading" role="status" aria-live="polite">
  <!-- 8.14: 32px circle, 3px --edge border with a --strong top border,
       rotating once every 1.2s. Section 12: under reduced motion the arc
       becomes a plain 32px circle with a 3px --edge-firm border — replaced,
       never frozen (mirrors Button.svelte). -->
  <div class="spinner" aria-hidden="true"></div>
  <p class="t-body text">{copy.busy.brief}</p>
  <p class="t-small sub">{copy.busy.brief_sub}</p>
</div>

<style>
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-block: 48px; /* 8.14: 48px vertical padding, centred */
  }

  .spinner {
    width: 32px;
    height: 32px;
    flex: none;
    border-radius: 999px;
    border: 3px solid var(--edge);
    border-top-color: var(--strong);
    animation: spin 1.2s linear infinite; /* one turn every 1.2s */
  }

  /* 8.14: 16px below the spinner, t-body --ink. */
  .text {
    color: var(--ink);
    margin: 16px 0 0 0;
    text-align: center;
  }

  /* 8.14: 8px below the sentence, t-small --ink-quiet. */
  .sub {
    color: var(--ink-quiet);
    margin: 8px 0 0 0;
    text-align: center;
  }

  /* Section 12: reduced motion replaces the arc, it does not freeze it. */
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
