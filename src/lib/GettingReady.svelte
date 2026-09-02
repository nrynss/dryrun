<script>
  // Getting ready screen — dev-diary/design.md 9.2 (T37: Brand mounts in shell).
  // The loading block per 8.14 (PathPulse cue), centred. No other content, and no
  // cancel button: the call is bounded at two attempts with a 10-second
  // timeout (9.2). Section 10 state 21.
  import LoadingBlock from './LoadingBlock.svelte';
</script>

<div class="page">
  <div class="column ready">
    <LoadingBlock />
  </div>
</div>

<style>
  /* 9.2: 24px screen-top padding moved to shell (T37). */
  .ready {
    padding-block: 0 32px;
  }
</style>
