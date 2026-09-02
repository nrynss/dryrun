<script>
  // Loading block — dev-diary/design.md 8.14 superseded by T37.
  // The 48px PathPulse indeterminate activity cue, the loading sentence,
  // and the reassurance sentence, wrapped in role="status" so a screen reader
  // announces the change. No progress bar, no timers, and no stage names (8.14, T37).
  import PathPulse from './PathPulse.svelte';
  import { copy } from './copy.js';
</script>

<div class="loading" role="status" aria-live="polite">
  <PathPulse />
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

  /* 8.14: 16px below the cue, t-body --ink. */
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
</style>
