<script>
  // Feedback note — dev-diary/design.md 8.8. Appears under the answer box
  // after an answer is scored. Band per 5.2: scoreBand(answerAverage(score))
  // → good / mid / bad, mapped to --strong / --almost / --note with the
  // matching wash and title. The weakest band is blue, never red (5.2).
  import ListBlock from './ListBlock.svelte';
  import { cubicOut } from 'svelte/easing';
  import { copy } from './copy.js';
  import { answerAverage, scoreBand } from './shapes.js';

  // score is the question object: { scores, missed, modelAnswer }.
  let { score } = $props();

  let band = $derived(scoreBand(answerAverage(score)));

  // 5.2: the word shown per band.
  const BAND_TITLE = {
    good: copy.feedback.strong,
    mid: copy.feedback.almost,
    bad: copy.feedback.add,
  };

  let title = $derived(BAND_TITLE[band]);

  // 8.8 item 2: one sentence from the first missed entry; the nothing-missing
  // string when missed is empty.
  let oneThing = $derived(
    score.missed?.length
      ? copy.feedback.one_thing.replace('{missed}', score.missed[0])
      : copy.feedback.nothing_missing,
  );

  // Section 12: the note fades in and rises 4px over 200ms ease-out when it
  // appears under the answer box. Svelte transitions are JS-driven (Web
  // Animations API) and ignore the global reduced-motion CSS block in
  // app.css, so the media query is checked here and the appear is instant
  // under reduced motion. `in:` only — the note leaves instantly when the
  // question advances (the design specifies the appear, nothing else).
  function fadeRise(node, { duration = 200 } = {}) {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return { duration: 0 };
    }
    return {
      duration,
      easing: cubicOut,
      css: (t) => `opacity: ${t}; transform: translateY(${(1 - t) * 4}px);`,
    };
  }
</script>

<div class="note note-{band}" in:fadeRise>
  <h2 class="t-h2 title">{title}</h2>
  <p class="t-body line">{oneThing}</p>

  <!-- 8.8 item 3: the disclosure, summary t-micro at 44px (13). Inside, the
       full missed list (8.9) and the model answer (9.5 spacing pattern). -->
  <details>
    <summary class="t-micro">{copy.btn.see_add}</summary>
    <div class="body">
      <ListBlock heading={copy.feedback.what_to_add} items={score.missed ?? []} />
      <h3 class="t-h3 good">{copy.feedback.good_answer}</h3>
      <p class="t-body model">{score.modelAnswer}</p>
    </div>
  </details>
</div>

<style>
  /* 8.8: the wash for the band, border-left 4px solid the band colour,
     8px radius, 14px 16px padding. */
  .note {
    border-left: 4px solid;
    border-radius: 8px;
    padding: 14px 16px;
  }
  .note-good {
    background: var(--strong-wash);
    border-left-color: var(--strong);
  }
  .note-mid {
    background: var(--almost-wash);
    border-left-color: var(--almost);
  }
  .note-bad {
    background: var(--note-wash);
    border-left-color: var(--note);
  }
  .note-good .title {
    color: var(--strong);
  }
  .note-mid .title {
    color: var(--almost);
  }
  .note-bad .title {
    color: var(--note);
  }

  .title {
    margin: 0 0 8px 0;
  }
  .line {
    color: var(--ink);
    margin: 0;
  }

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
  .body {
    margin-top: 8px;
  }
  .good {
    margin: 16px 0 0 0;
  }
  .model {
    color: var(--ink);
    margin: 8px 0 0 0; /* 9.5 pattern: the paragraph 8px under its heading */
  }
</style>
