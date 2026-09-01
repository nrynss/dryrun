<script>
  // Score row — dev-diary/design.md 8.12. Four rows, one per axis in AXES
  // order, inside a per-question disclosure on the tips screen. The fill
  // colour is the band for THAT axis value (5.2): good → --strong,
  // mid → --almost, bad → --note.
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
</script>

<div class="rows">
  {#each rows as row (row.axis)}
    <div class="row">
      <span class="t-body name">{row.name}</span>
      <span class="bar" aria-hidden="true">
        <span class="fill {row.fill}" style="width: {row.pct}%"></span>
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
     colour for that axis value (5.2). */
  .fill {
    display: block;
    height: 100%;
  }
  .fill-good { background: var(--strong); }
  .fill-mid { background: var(--almost); }
  .fill-bad { background: var(--note); }

  /* value t-number --ink, width 28px, text-align right. */
  .value {
    color: var(--ink);
    width: 28px;
    flex: none;
    text-align: right;
  }
</style>
