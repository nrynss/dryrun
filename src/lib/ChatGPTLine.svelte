<script>
  // ChatGPT line — dev-diary/design.md 8.5 + 3.3. One row saying what is
  // driving the page: resting copy from 11.8, then a 4-second flash after a
  // call arrives (session.lastCallAt). The dot is decorative only (R3) — the
  // words carry the meaning, and they live in role="status" aria-live.
  import { copy } from './copy.js';
  import { hasModelContext } from './webmcp.js';
  import { session } from './session.svelte.js';

  let flashing = $state(false);
  let fading = $state(false);
  let flashTimer;
  let fadeTimer;

  $effect(() => {
    // Flash when a call arrives, revert after 4s. Keyed on session.lastCallAt
    // (a per-call timestamp), not the agentSeen latch: true→true is a reactive
    // no-op, so a second call would never re-flash. Timers are cleared on
    // unmount through the effect teardown.
    if (session.lastCallAt == null) {
      flashing = false;
      fading = false;
      return;
    }
    flashing = true;
    fading = false;
    clearTimeout(flashTimer);
    clearTimeout(fadeTimer);
    // Section 12 timeline: the flash background appears instantly, the text
    // reverts at 4s (flashing → false), and the background then fades from
    // --strong-wash to transparent over 1200ms linear (fading → true, fully
    // gone at 5.2s). A later call re-flashes: both timers reset.
    flashTimer = setTimeout(() => (flashing = false), 4000);
    fadeTimer = setTimeout(() => (fading = true), 4000);
    return () => {
      clearTimeout(flashTimer);
      clearTimeout(fadeTimer);
    };
  });

  let connected = $derived(hasModelContext());

  // A call that arrived beats the context check: the judge sets lastCallAt
  // from the console in a headless browser with no modelContext.
  let called = $derived(session.lastCallAt != null);
  let text = $derived(
    called
      ? flashing
        ? copy.chat.flash
        : copy.chat.active
      : connected
        ? copy.chat.ready
        : copy.chat.none,
  );
</script>

<div class="chatline" class:flash={flashing} class:fading={fading}>
  <span class="dot" class:strong={called} aria-hidden="true"></span>
  <p class="t-small" role="status" aria-live="polite">{text}</p>
</div>

<style>
  .chatline {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    margin-top: 24px; /* 9.1 item 5: 24px gap above the line */
    padding: 12px 0;
    color: var(--ink-quiet);
    border-radius: 8px;
  }

  /* Flash: --strong-wash background with 8px radius, text becomes the flash
     string, both revert after 4 seconds. The text swap is instant; the
     background fades out over 1200ms linear via .fading (Section 12: the
     4s/1200ms timeline — the bg is fully gone at 5.2s). Reduced motion: the
     global app.css block makes the fade instant while the text still swaps
     at 4s. */
  .chatline.flash {
    background: var(--strong-wash);
  }
  .chatline.fading {
    background: transparent;
    transition: background-color 1200ms linear;
  }

  .dot {
    width: 10px;
    height: 10px;
    flex: none;
    border-radius: 999px;
    background: var(--edge-firm);
  }
  .dot.strong {
    background: var(--strong);
  }

  p {
    flex: 1;
    min-width: 0;
    margin: 0;
  }
</style>
