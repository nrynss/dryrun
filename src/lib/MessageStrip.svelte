<script>
  // Message strip — dev-diary/design.md 8.13. Every error, warning and notice.
  //   kind: 'stop' (blocked) | 'almost' (warning that let the action through)
  //         | 'note' (neutral notice)
  //   role: 'alert' for blocking (takes focus when it appears),
  //         'status' for non-blocking
  // The strip never decides its own placement — the caller puts a blocking
  // strip directly above the button it blocks.
  let { kind = 'note', role = 'status', message = '' } = $props();

  let el;
  let focused = $state(false);

  // Focus on appearance only, never on later re-renders of the same mount.
  $effect(() => {
    if (role === 'alert' && el && !focused) {
      focused = true;
      el.focus();
    }
  });

  // The kind colour leads: the first word of the sentence is in the kind
  // colour, the rest of the sentence in --ink (R3: colour never the only
  // signal — the words carry the meaning).
  let parts = $derived(message.split(' '));
  let lead = $derived(parts[0]);
  let rest = $derived(parts.slice(1).join(' '));
</script>

<div bind:this={el} class="strip strip-{kind} t-body" {role} tabindex="-1">
  <span class="lead">{lead}</span> {rest}
</div>

<style>
  .strip {
    border-left: 4px solid;
    border-radius: 8px;
    padding: 12px 14px;
    color: var(--ink);
  }

  .strip-stop {
    background: var(--stop-wash);
    border-left-color: var(--stop);
  }
  .strip-stop .lead {
    color: var(--stop);
  }

  .strip-almost {
    background: var(--almost-wash);
    border-left-color: var(--almost);
  }
  .strip-almost .lead {
    color: var(--almost);
  }

  .strip-note {
    background: var(--note-wash);
    border-left-color: var(--note);
  }
  .strip-note .lead {
    color: var(--note);
  }
</style>
