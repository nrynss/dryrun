<script>
  // Result panel — dev-diary/design.md 8.11 + 3.4 + 11.7. The verdict at the
  // top of the tips screen: a card in the band's wash, the title in the band
  // colour, the coverage/content line, and the "See the numbers" disclosure —
  // the only place a raw average appears.
  import { copy } from './copy.js';
  import { AXES } from './shapes.js';

  // verdict: { band: 'ready'|'nearly'|'not yet', average, answered, total,
  //            capped } from buildVerdict. axes: the per-axis session
  //            averages, keyed by AXES value.
  let { verdict, axes = {} } = $props();

  // 3.4: the band values are a data contract shared with shapes.js; the
  // display strings live here. When capped the title is still Keep
  // practising, and the line explains the coverage (11.7).
  const RESULT_TITLE = {
    ready: copy.result.ready,
    nearly: copy.result.nearly,
    'not yet': copy.result.notyet,
  };
  // 8.11: band → wash (background) and band colour (title text).
  const BAND_CLASS = { ready: 'strong', nearly: 'almost', 'not yet': 'note' };

  // 11.7: the average is shown to one decimal, without a trailing .0
  // ("Your answers averaged {average} out of 5.").
  function format1(n) {
    return n.toFixed(1).replace(/\.0$/, '');
  }

  let bandClass = $derived(BAND_CLASS[verdict.band]);
  let title = $derived(verdict.capped ? copy.result.capped : RESULT_TITLE[verdict.band]);
  let line = $derived(
    verdict.capped
      ? copy.result.capped_line.replace('{answered}', String(verdict.answered))
      : {
          ready: copy.result.ready_line,
          nearly: copy.result.nearly_line,
          'not yet': copy.result.notyet_line,
        }[verdict.band],
  );
  // 14.1: the capped case also triggers capped_kind when the average is 3+.
  let kind = $derived(verdict.capped && verdict.average >= 3);
  let answeredLine = $derived(
    copy.result.answered.replace('{answered}', String(verdict.answered)),
  );
  let averageLine = $derived(
    copy.result.average.replace('{average}', format1(verdict.average)),
  );
  let axisRows = $derived(
    AXES.map((axis) => ({ name: copy.axis[axis], value: format1(axes[axis] ?? 0) })),
  );
</script>

<div class="result-panel panel-{bandClass}">
  <div class="title-row">
    <h2 class="t-display title">{title}</h2>
    <!-- T37: small static path-to-point accent beside the title.
         Purely decorative (aria-hidden="true"). -->
    <svg
      class="accent-mark"
      viewBox="0 0 28 28"
      width="22"
      height="22"
      aria-hidden="true"
      focusable="false"
    >
      <path
        class="accent-path"
        d="M 4 20 C 8 20, 14 17, 18 9"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle class="accent-point" cx="22" cy="6" r="2" fill="currentColor" />
    </svg>
  </div>
  <p class="t-body line">{line}</p>
  {#if kind}
    <p class="t-body line">{copy.result.capped_kind}</p>
  {/if}

  <!-- 8.11: the disclosure carries the only raw numbers on the screen. -->
  <details>
    <summary class="t-micro">{copy.btn.see_numbers}</summary>
    <div class="numbers">
      <p class="t-body">{answeredLine}</p>
      <p class="t-body">{averageLine}</p>
      <ul class="axes">
        {#each axisRows as row (row.name)}
          <li class="t-body axis">
            <span>{row.name}</span>
            <span class="t-number value">{row.value}</span>
          </li>
        {/each}
      </ul>
    </div>
  </details>
</div>

<style>
  /* 8.11: a card with the band wash and 24px padding. */
  .result-panel {
    border: 1px solid var(--edge);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    padding: 24px;
  }
  .panel-strong { background: var(--strong-wash); }
  .panel-almost { background: var(--almost-wash); }
  .panel-note { background: var(--note-wash); }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .accent-mark {
    width: 22px;
    height: 22px;
    flex: none;
    display: block;
  }

  .accent-path {
    stroke-dashoffset: 0;
  }

  .accent-point {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .accent-path {
      stroke-dashoffset: 0;
      animation: none;
    }
    .accent-point {
      opacity: 1;
      animation: none;
    }
  }

  /* 8.11: title t-display in the band colour (text-wrap balance lives on
     the t-display class). */
  .title {
    margin: 0;
  }
  .panel-strong .title,
  .panel-strong .accent-mark { color: var(--strong); }
  .panel-almost .title,
  .panel-almost .accent-mark { color: var(--almost); }
  .panel-note .title,
  .panel-note .accent-mark { color: var(--note); }
  /* Below 260px the t-display title (text-wrap: balance) cannot wrap and
     overflows its content box; allow word breaks. */
  @media (max-width: 260px) {
    .result-panel .title {
      text-wrap: wrap;
      overflow-wrap: anywhere;
    }
  }

  /* 8.11: line t-body --ink, margin-top 8px. */
  .line {
    color: var(--ink);
    margin: 8px 0 0 0;
  }

  /* 13: every details summary is at least 44px high. */
  details {
    margin-top: 12px;
  }
  summary {
    display: flex;
    align-items: center;
    min-height: 44px;
    color: var(--strong);
    cursor: pointer;
  }
  .numbers {
    margin-top: 8px;
  }
  .numbers p {
    margin: 0;
  }
  .numbers p + p {
    margin-top: 8px;
  }

  /* The four axis names with their session averages (8.11). */
  .axes {
    list-style: none;
    margin: 16px 0 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .axis {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--ink);
    margin: 0;
  }
  .value {
    color: var(--ink);
  }
</style>
