<script>
  import { session } from './lib/session.svelte.js';
</script>

<main>
  <h1>Dry Run</h1>
  <p class="tagline">The interview before the interview.</p>
  <p class="phase">phase: {session.phase}</p>
</main>

<style>
  main {
    max-width: 44rem;
    margin: 4rem auto;
    padding: 0 1.5rem;
    font-family: system-ui, sans-serif;
  }
  .tagline {
    font-size: 1.25rem;
    opacity: 0.75;
  }
  .phase {
    font-family: ui-monospace, monospace;
    opacity: 0.5;
  }
</style>
