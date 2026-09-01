<script>
  // Score row — dev-diary/design.md 8.12. Four rows, one per axis in AXES
  // order, inside a per-question disclosure on the tips screen. The fill
  // colour is the band for THAT axis value (5.2): good → --strong,
  // mid → --almost, bad → --note.
  import { onMount, flushSync } from 'svelte';
  import { copy } from './copy.js';
  import { AXES, scoreBand } from './shapes.js';

  // scores is the question's scores object: { specificity, evidence, ... }.
  let { scores = {} } = $props();

  // The scoring contract (validateScoreResponse) guarantees every axis is a
  // 1-5 number. A missing value renders as 0 with a 0-width fill — it never
  // shows a made-up number, and the bar's --edge-firm outline still marks
  // the full extent (8.12).
  let rows = $derived(
    AXES.map((axis) => {
      const value = typeof scores[axis] === 'number' ? scores[axis] : 0;
      return {
        axis,
        name: copy.axis[axis],
        value,
        pct: (value / 5) * 100,
        fill: `fill-${scoreBand(value)}`,
      };
    }),
  );

  // Section 12: the fill grows 0 → (value/5*100)% over 300ms ease-out. The
  // rows live inside a closed <details> (Tips 9.5), so mounting happens while
  // the content is hidden — the grow waits for the parent disclosure's toggle
  // event instead, so the fill visibly grows when the disclosure opens. Two
  // animation frames give the browser a committed 0-width state to transition
  // from (the open and the width change would otherwise land in the same
  // frame and no transition would play). Reduced motion: the global app.css
  let filled = $state(false);
  // Close commits the width to 0 without a transition (the shrink would
  // otherwise freeze mid-flight when the details hides the content); the
  // class is dropped on the reopen rAF so every open grows from a clean 0.
  let noAnim = $state(false);
  let root;

  onMount(() => {
    // printTips opens every <details> and dispatches this synchronously
    // before window.print(): commit the fills at their final width (no
    // transition) so the print render sees full bars, not 0-width starts.
    // flushSync forces the width change into the DOM now — Svelte batches
    // state flushes to the microtask, which would land after window.print().
    const onPreparePrint = () => {
      flushSync(() => {
        noAnim = true;
        filled = true;
      });
    };
    document.addEventListener('dryrun:prepare-print', onPreparePrint);

    const details = root?.closest('details');
    if (!details) {
      // No disclosure ancestor: grow after mount (double rAF, same reason).
      requestAnimationFrame(() => requestAnimationFrame(() => (filled = true)));
      return () => document.removeEventListener('dryrun:prepare-print', onPreparePrint);
    }
    // A details already open at mount (print prepared it): fill is final.
    if (details.open) filled = true;
    const onToggle = () => {
      if (details.open) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            noAnim = false;
            filled = true;
          }),
        );
      } else {
        filled = false;
        noAnim = true;
      }
    };
    details.addEventListener('toggle', onToggle);
    return () => {
      details.removeEventListener('toggle', onToggle);
      document.removeEventListener('dryrun:prepare-print', onPreparePrint);
    };
  });
</script>

<div class="rows" class:no-anim={noAnim} bind:this={root}>
  {#each rows as row (row.axis)}
    <div class="row">
      <span class="t-body name">{row.name}</span>
      <span class="bar" aria-hidden="true">
        <span class="fill {row.fill}" style="width: {filled ? row.pct : 0}%"></span>
      </span>
      <span class="t-number value">{row.value}</span>
    </div>
  {/each}
</div>

<style>
  /* 8.12: row display flex, align center, gap 12px, min-height 32px. */
  .rows {
    display: flex;
    flex-direction: column;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 32px;
  }

  /* name t-body --ink, width 120px, flex none. */
  .name {
    color: var(--ink);
    width: 120px;
    flex: none;
    margin: 0;
  }
  /* Below 260px the fixed 120px name cannot fit beside the bar and the
     28px value; let it shrink and wrap (8.12 holds at normal widths). */
  @media (max-width: 260px) {
    .row .name {
      width: auto;
      min-width: 0;
      flex: 0 1 auto;
      overflow-wrap: anywhere;
    }
  }

  /* bar flex 1, height 8px, radius 4px, background --edge,
     border 1px solid --edge-firm, overflow hidden. */
  .bar {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: var(--edge);
    border: 1px solid var(--edge-firm);
    overflow: hidden;
  }

  /* fill height 100%, width (value/5*100)% set inline, background the band
     colour for that axis value (5.2). Section 12: the width transition makes
     the fill grow over 300ms ease-out when the disclosure opens. */
  .fill {
    display: block;
    height: 100%;
    transition: width 300ms ease-out;
  }
  .fill-good { background: var(--strong); }
  .fill-mid { background: var(--almost); }
  .fill-bad { background: var(--note); }
  /* Close (and print-prepare) commit the width instantly: no frozen
     mid-shrink timeline, so every open grows from a clean 0. */
  .no-anim .fill {
    transition: none;
  }

  /* value t-number --ink, width 28px, text-align right. */
  .value {
    color: var(--ink);
    width: 28px;
    flex: none;
    text-align: right;
  }
</style>
