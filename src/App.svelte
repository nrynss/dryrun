<script>
  import { session, setPosting, MAX_POSTING_CHARS } from './lib/session.svelte.js';
  import { hasModelContext } from './lib/webmcp.js';

  // T02 gate screen. Deliberately crude. Track C replaces it.
  let draft = $state('');
  const agentAvailable = hasModelContext();
</script>

<main>
  <h1>Dry Run</h1>
  <p class="tagline">The interview before the interview.</p>

  <p class="status">
    <span class="dot" class:on={session.agentSeen}></span>
    {#if session.agentSeen}
      Agent connected. A tool call reached this page.
    {:else if agentAvailable}
      WebMCP available. No tool call yet.
    {:else}
      No agent. Type below instead.
    {/if}
  </p>

  <p class="phase">phase: {session.phase} &middot; posting: {session.posting?.length ?? 0} chars</p>

  {#if session.error}
    <p class="error">{session.error}</p>
  {/if}

  <label for="posting">Paste the job posting</label>
  <textarea id="posting" bind:value={draft} rows="10" placeholder="Paste the posting here."
  ></textarea>
  <p class="count">{draft.length.toLocaleString()} / {MAX_POSTING_CHARS.toLocaleString()}</p>

  <button onclick={() => setPosting(draft)}>Analyse</button>

  {#if session.posting}
    <p class="ok">Stored. The agent and the button both reach the same function.</p>
  {/if}
</main>

<style>
  :global(body) { background: #0A0A0C; color: #E0E0E6; }
  main {
    max-width: 44rem;
    margin: 3rem auto;
    padding: 0 1.5rem;
    font-family: system-ui, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: flex-start;
  }
  h1 { margin: 0; text-transform: uppercase; letter-spacing: 0.04em; }
  .tagline { margin: 0; opacity: 0.75; }
  .status, .phase, .count { font-family: ui-monospace, monospace; font-size: 0.8rem; margin: 0; }
  .phase, .count { opacity: 0.55; }
  .dot {
    display: inline-block; width: 8px; height: 8px;
    background: #6B6D76; margin-right: 0.4rem;
  }
  .dot.on { background: #00FF41; }
  .error { color: #FF3366; font-size: 0.9rem; margin: 0; }
  .ok { color: #00FF41; font-size: 0.9rem; margin: 0; }
  label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.7; }
  textarea {
    width: 100%; background: #121217; color: #E0E0E6;
    border: 1px solid #2A2A35; border-radius: 0; padding: 0.75rem;
    font-family: ui-monospace, monospace; font-size: 0.85rem;
  }
  textarea:focus { outline: none; border-color: #00FF41; }
  button {
    background: #00FF41; color: #0A0A0C; border: 0; border-radius: 0;
    padding: 0.6rem 1.4rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; cursor: pointer;
  }
  button:focus-visible { outline: 2px solid #E0E0E6; outline-offset: 2px; }
</style>
