<script>
  // Progress row — dev-diary/design.md 8.6. Shown only on the practice screen.
  // The label above carries the meaning for assistive technology; the segment
  // row is aria-hidden (R3). Segments are not buttons — there is no
  // navigation back through questions.
  import { copy } from './copy.js';

  let { current = 0, total = 8, questions = [] } = $props();

  let label = $derived(copy.practice.progress.replace('{n}', String(current + 1)));

  // Per-question segment colour: skipped → --edge-firm (takes precedence),
  // answered (index < current) → --strong, current → --ink, not reached → --edge.
  function segmentClass(i) {
    if (questions[i]?.skipped) return 'skipped';
    if (i < current) return 'answered';
    if (i === current) return 'current';
    return 'ahead';
  }
</script>

<p class="t-micro label">{label}</p>
<div class="segments" aria-hidden="true">
  {#each Array.from({ length: total }, (_, i) => i) as i (i)}
    <span class="seg {segmentClass(i)}"></span>
  {/each}
</div>

<style>
  /* 8.6: label t-micro, --ink-quiet; segments flex:1, 6px high, 3px radius,
     4px gap. */
  .label {
    color: var(--ink-quiet);
    margin: 0 0 8px 0;
  }
  .segments {
    display: flex;
    gap: 4px;
  }
  .seg {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--edge);
  }
  .seg.answered {
    background: var(--strong);
  }
  .seg.current {
    background: var(--ink);
  }
  .seg.skipped {
    background: var(--edge-firm);
  }
</style>
