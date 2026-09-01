<script>
  import GettingReady from './lib/GettingReady.svelte';
  import Plan from './lib/Plan.svelte';
  import Practice from './lib/Practice.svelte';
  import Start from './lib/Start.svelte';
  import Tips from './lib/Tips.svelte';
  import { session } from './lib/session.svelte.js';

  // Section 12: no page transition between screens — the screen changes and
  // the document scrolls to the top. Instant scroll (no smooth behaviour);
  // the global reduced-motion block in app.css also kills scroll-behavior.
  $effect(() => {
    session.phase;
    window.scrollTo(0, 0);
  });
</script>

{#if session.phase === 'idle'}
  <!-- 1. Start (9.1). -->
  <Start />
{:else if session.phase === 'analysing'}
  <!-- 2. Getting ready (9.2), Section 10 state 21. -->
  <GettingReady />
{:else if session.phase === 'ready'}
  <!-- 3. Your practice (9.3). -->
  <Plan />
{:else if session.phase === 'interviewing'}
  <!-- 4. Practice (9.4). -->
  <Practice />
{:else if session.phase === 'done'}
  <!-- 5. Your tips (9.5). -->
  <Tips />
{/if}


