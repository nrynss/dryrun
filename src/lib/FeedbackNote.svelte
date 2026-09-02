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
  <div class="title-row">
    <h2 class="t-h2 title">{title}</h2>
    <!-- T37: small static path accent beside the title. Fades in with note.
         Purely decorative (aria-hidden="true"). -->
    <svg
      class="accent-mark"
      viewBox="0 0 28 28"
      width="18"
      height="18"
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
  .note-good .title,
  .note-good .accent-mark {
    color: var(--strong);
  }
  .note-mid .title,
  .note-mid .accent-mark {
    color: var(--almost);
  }
  .note-bad .title,
  .note-bad .accent-mark {
    color: var(--note);
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .title {
    margin: 0;
  }

  .accent-mark {
    width: 18px;
    height: 18px;
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
