<script>
  // Brand — dev-diary/task.md T37.
  // Mounted once in the App shell. Contains semantic text 'Dry Run' beside the
  // decorative Open Path mark. Real text, selectable, translatable, and readable
  // at browser zoom; not an SVG path.
  import { session } from './session.svelte.js';

  // T37: at rest, the point makes one barely perceptible slow brighten-and-settle
  // cycle while the Start screen is active; does not pulse on practice or tips.
  let isStartScreen = $derived(session.phase === 'idle');
</script>

<div class="brand">
  <!-- Open Path mark: 28x28 CSS px, viewBox 0 0 28 28, aria-hidden, focusable false.
       Single 2px round-capped, round-joined line beginning low/left, gentle upward
       curve opening toward upper right. Small calm round point just beyond path. -->
  <svg
    class="mark"
    viewBox="0 0 28 28"
    width="28"
    height="28"
    aria-hidden="true"
    focusable="false"
  >
    <path
      class="path"
      d="M 4 20 C 8 20, 14 17, 18 9"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      pathLength="100"
    />
    <circle
      class="point"
      class:idle-breathe={isStartScreen}
      cx="22"
      cy="6"
      r="2"
      fill="currentColor"
    />
  </svg>

  <span class="wordmark">
    <span class="dry">Dry</span> <span class="run">Run</span>
  </span>
</div>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--strong);
    user-select: text;
  }

  .mark {
    width: 28px;
    height: 28px;
    flex: none;
    display: block;
  }

  /* Dry in Lexend 500, Run in Lexend 600, both sentence case, --strong,
     0.01em positive tracking. Matches Section 6 type tokens. */
  .wordmark {
    font-family: var(--font-ui);
    font-size: 19px;
    line-height: 1.30;
    letter-spacing: 0.01em;
    color: var(--strong);
  }

  .dry {
    font-weight: 500;
  }

  .run {
    font-weight: 600;
  }

  /* One-time welcome draw on mount (path draws left to right, point fades in).
     Does not replay on reactive updates. */
  .path {
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: brand-draw 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .point {
    opacity: 1;
    animation: brand-point-fade 800ms ease-out forwards;
  }

  /* At rest, point makes one barely perceptible slow brighten-and-settle cycle
     while Start screen is active; does not pulse on practice or tips. */
  .point.idle-breathe {
    animation: brand-point-idle 3200ms ease-in-out forwards;
  }

  @keyframes brand-draw {
    to {
      stroke-dashoffset: 0;
    }
  }

  @keyframes brand-point-fade {
    0%, 55% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  @keyframes brand-point-idle {
    0%, 14% {
      opacity: 0;
    }
    25% {
      opacity: 1;
    }
    50% {
      opacity: 0.68;
    }
    75%, 100% {
      opacity: 1;
    }
  }

  /* T37: reduced-motion fallback inside component styles. Set stroke-dashoffset: 0,
     give point full opacity, instant resting state. */
  @media (prefers-reduced-motion: reduce) {
    .path {
      stroke-dashoffset: 0;
      animation: none;
    }
    .point,
    .point.idle-breathe {
      opacity: 1;
      animation: none;
    }
  }
</style>
