<script>
  // List block — dev-diary/design.md 8.9. Used for owns, study, angles (and
  // missed on the tips screen, T18). A t-h3 heading over a dot-marked <ul>.
  // The heading is the section heading, so it is an h2 (one h1 per screen).
  let { heading, items = [] } = $props();
</script>

<h2 class="t-h3 heading">{heading}</h2>
<ul class="list">
  {#each items as item, i (i)}
    <li class="t-body item">
      <span class="dot" aria-hidden="true"></span>
      {item}
    </li>
  {/each}
</ul>

<style>
  /* 8.9: heading t-h3, --ink, margin-bottom 8px. */
  .heading {
    color: var(--ink);
    margin: 0 0 8px 0;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  /* 8.9: item t-body, --ink, padding-left 22px, position relative,
     margin-bottom 10px; a 6px round dot in --strong at left 4px, top 0.7em. */
  .item {
    position: relative;
    color: var(--ink);
    padding-left: 22px;
    margin: 0 0 10px 0;
  }
  .dot {
    position: absolute;
    left: 4px;
    top: 0.7em;
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--strong);
  }
</style>
