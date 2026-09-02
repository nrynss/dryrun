<!-- PathPulse — dev-diary/task.md T37.
     48px indeterminate activity cue for Getting ready screen.
     Made from the same curved line and point as Brand. A small dot travels
     along the path and settles back at the beginning while work is pending.
     Purely decorative: aria-hidden="true", focusable="false". -->
<svg
  class="path-pulse"
  viewBox="0 0 28 28"
  width="48"
  height="48"
  aria-hidden="true"
  focusable="false"
>
  <path
    class="pulse-track"
    d="M 4 20 C 8 20, 14 17, 18 9"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    pathLength="100"
  />
  <circle
    class="pulse-destination"
    cx="22"
    cy="6"
    r="2"
    fill="currentColor"
  />
  <circle
    class="pulse-traveler"
    r="1.8"
    fill="currentColor"
  />
</svg>

<style>
  .path-pulse {
    width: 48px;
    height: 48px;
    flex: none;
    display: block;
    color: var(--strong);
  }

  .pulse-track {
    stroke-dashoffset: 0;
    opacity: 0.35;
  }

  .pulse-destination {
    opacity: 0.75;
  }

  /* Dot travels along the path and settles back at the beginning while work is pending */
  .pulse-traveler {
    offset-path: path('M 4 20 C 8 20, 14 17, 18 9');
    offset-distance: 0%;
    animation: travel-loop 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  @keyframes travel-loop {
    0% {
      offset-distance: 0%;
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    85% {
      offset-distance: 100%;
      opacity: 1;
    }
    100% {
      offset-distance: 100%;
      opacity: 0;
    }
  }

  /* T37: reduced-motion static fallback inside component styles.
     Set stroke-dashoffset: 0, full point opacity, place pulse dot at rest.
     No frozen partial paths, no stalled pulse dots. Result is a plain still path and point. */
  @media (prefers-reduced-motion: reduce) {
    .pulse-track {
      stroke-dashoffset: 0;
      opacity: 1;
    }
    .pulse-destination {
      opacity: 1;
    }
    .pulse-traveler {
      offset-distance: 0%;
      animation: none;
      opacity: 0;
    }
  }
</style>
