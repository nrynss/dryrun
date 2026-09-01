<script>
  // Text box — dev-diary/design.md 8.3. Used for the job advert, the CV and
  // the answer. R1: the value is bound straight through to session state by
  // the parent (`bind:value={session.posting}`) — never a local draft here.
  // minHeight: 160px for the advert and CV, 140px for the answer.
  let {
    id = `ta-${Math.random().toString(36).slice(2)}`,
    label,
    placeholder = '',
    minHeight = 160,
    value = $bindable(),
    ...rest
  } = $props();
</script>

<div class="field">
  <label class="t-h3" for={id}>{label}</label>
  <textarea
    {id}
    {placeholder}
    class="t-body box"
    style:min-height="{minHeight}px"
    bind:value
    {...rest}
  ></textarea>
</div>

<style>
  .field {
    width: 100%;
  }

  /* 8.3: a real label above the box, 8px gap, t-h3. Optional boxes carry the
     word "Optional" in the label text — never an asterisk. */
  label {
    display: block;
    color: var(--ink);
    margin: 0 0 8px 0;
  }

  .box {
    display: block;
    width: 100%;
    background: var(--card);
    border: 1px solid var(--edge-firm);
    border-radius: var(--radius-input);
    padding: 12px 14px;
    color: var(--ink);
    resize: vertical;
  }

  /* 8.3 focus: the 2px border replaces the 1px so the box does not shift;
     the Section 5.3 ring is the global :focus-visible rule. */
  .box:focus {
    border-color: var(--strong);
    border-width: 2px;
  }

  .box::placeholder {
    color: var(--ink-quiet);
  }
</style>
