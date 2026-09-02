<script>
  // Start screen — dev-diary/design.md 9.1, `I have a job advert` route only
  // (15.2: never ship a visible choice that does nothing, so the other two
  // routes are cut). Text box 8.3, file chooser 8.4, ChatGPT line 8.5,
  // message strip 8.13. Character-limit behaviour per 3.6: no numbers in any
  // message. session.error is never rendered here — it carries T25-era copy;
  // this screen does its own 3.6 validation.
  import Button from './Button.svelte';
  import TextArea from './TextArea.svelte';
  import FileChooser from './FileChooser.svelte';
  import ChatGPTLine from './ChatGPTLine.svelte';
  import MessageStrip from './MessageStrip.svelte';
  import { copy } from './copy.js';
  import { hasModelContext } from './webmcp.js';
  import { session, MAX_POSTING_CHARS, MAX_RESUME_CHARS, setPosting } from './session.svelte.js';
  import { loadExample } from './fixture.js';

  // 3.6: the near-limit band is 19,000 to 20,000 characters.
  const NEAR_LIMIT_CHARS = MAX_POSTING_CHARS - 1000;

  // The single start choice toggles its own panel; it starts expanded.
  let expanded = $state(true);
  let pasteCv = $state(false);
  // Section 10 state 7 on the paste route. FileChooser warns while the file
  // is read. Warn while the CV is pasted, for the same reason. A flag set
  // on the way out is never seen, because setPosting leaves this screen in
  // the same flush.
  let cvWarning = $derived(
    (session.resume ?? '').length > MAX_RESUME_CHARS ? copy.warn.cv_long : null,
  );

  let sub = $derived(hasModelContext() ? copy.app.sub : copy.app.sub_typing);
  let postingLen = $derived((session.posting ?? '').trim().length);
  let empty = $derived(postingLen === 0);
  let nearLimit = $derived(postingLen >= NEAR_LIMIT_CHARS && postingLen <= MAX_POSTING_CHARS);
  let overLimit = $derived(postingLen > MAX_POSTING_CHARS);
  let canStart = $derived(!empty && !overLimit);

  function startPractice() {
    // T32: the real write path. A fresh start is never the worked example.
    session.isExample = false;
    // Section 10 state 7 never blocks the whole product (the note under the
    // table). cvWarning above is derived, so the strip already shows while
    // the person is on this screen. Truncate here so the request stays
    // inside the server's limit.
    if ((session.resume ?? '').length > MAX_RESUME_CHARS) {
      session.resume = session.resume.slice(0, MAX_RESUME_CHARS);
    }
    // setPosting stores the posting and CV, calls the analyse function, and
    // moves the phase itself. App.svelte renders Getting ready meanwhile.
    setPosting(session.posting);
  }

  // Section 10 state 10/11: the demo insurance. When the service is down the
  // example button must be prominent, not hidden. It loads example.json and
  // marks the session as the worked example, so the plan screen shows
  // notice.example. This is the only caller of loadExample.
  function seeExample() {
    loadExample();
    session.isExample = true;
    session.serviceDown = false;
  }
</script>

<div class="page">
  <div class="column start">
    <p class="t-h2 wordmark">{copy.app.name}</p>
    <h1 class="t-display promise">{copy.app.promise}</h1>
    <p class="t-body sub">{sub}</p>

    <ol class="steps">
      {#each [1, 2, 3] as n (n)}
        <li class="step">
          <span class="circle t-micro">{n}</span>
          <span class="t-body step-name">{copy.step[n]}</span>
        </li>
      {/each}
    </ol>

    <ChatGPTLine />

    <!-- 9.1 item 6: one start choice card (15.2). Card chrome per 8.1, but
         the element must be a <button>, so the chrome lives here. -->
    <button
      class="choice"
      type="button"
      aria-expanded={expanded}
      onclick={() => (expanded = !expanded)}
    >
      <span class="t-body-b choice-title">{copy.start.choice_advert}</span>
      <span class="t-small choice-hint">{copy.start.choice_advert_hint}</span>
    </button>

    {#if expanded}
      <div class="panel">
        <div class="advert">
          <TextArea
            label={copy.start.advert_label}
            placeholder={copy.start.advert_placeholder}
            bind:value={session.posting}
          />
          <!-- 3.6 state 2: one quiet line under the box, no numbers. -->
          {#if nearLimit}
            <p class="t-small near">{copy.warn.near_limit}</p>
          {/if}
        </div>

        <div class="cv">
          <h2 class="t-h3 cv-label">{copy.start.cv_label}</h2>
          <p class="t-small cv-hint">{copy.start.cv_hint}</p>
          <FileChooser />
          <Button variant="quiet" onclick={() => (pasteCv = !pasteCv)}>
            {copy.btn.paste_cv}
          </Button>
          {#if pasteCv}
            <TextArea label={copy.start.cv_paste_label} bind:value={session.resume} />
          {/if}
          {#if cvWarning}
            <MessageStrip kind="almost" role="status" message={cvWarning} />
          {/if}
        </div>
      </div>
    {/if}

    <p class="t-micro trust">{copy.app.trust}</p>
    <!-- State 10: the service-down strip sits above the action bar, the
         last thing in the column. role=alert takes focus when it appears
         (8.13). -->
    {#if session.serviceDown}
      <div class="service-strip">
        <MessageStrip kind="stop" role="alert" message={copy.err.service_down} />
      </div>
    {/if}
  </div>

  <!-- 9.1 item 9: the action bar (7.3). Error copy sits above the button:
       state 1 as a quiet sentence, state 3 as a blocking strip that takes
       focus. -->
  <div class="actionbar">
    <div class="actionbar-inner">
      {#if empty}
        <p class="t-body empty-sentence">{copy.err.empty_posting}</p>
      {/if}
      {#if overLimit}
        <MessageStrip kind="stop" role="alert" message={copy.err.over_limit} />
      {/if}
      {#if session.serviceDown}
        <!-- State 10: the example button must be prominent, not hidden
             (Section 10 note). Primary fill, full width, above Start
             practice. -->
        <div class="example-action">
          <Button onclick={seeExample}>{copy.btn.see_example}</Button>
        </div>
      {/if}
      <Button disabled={!canStart} onclick={startPractice}>{copy.btn.start}</Button>
    </div>
  </div>
</div>

<style>
  .start {
    padding-block: 24px 32px; /* 9.1: 24px top padding, 32px to the bottom */
  }

  .wordmark {
    color: var(--strong);
    margin: 0;
  }

  .promise {
    color: var(--ink);
    margin: 16px 0 0 0;
  }

  .sub {
    color: var(--ink-quiet);
    margin: 12px 0 0 0;
  }

  /* 9.1 item 4: three rows, 12px apart, each a 28px circle on --strong. */
  .steps {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin: 24px 0 0 0;
    padding: 0;
  }
  .step {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .circle {
    width: 28px;
    height: 28px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    background: var(--strong);
    color: var(--on-fill);
  }
  .step-name {
    color: var(--ink);
  }

  /* 9.1 item 6: Card chrome (8.1) on a full-width, left-aligned button. */
  .choice {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    min-height: 76px;
    margin: 16px 0 0 0; /* 9.1 item 6: 16px gap above the cards */
    padding: 16px;
    background: var(--card);
    border: 1px solid var(--edge);
    border-radius: var(--radius-card);
    box-shadow: var(--shadow-card);
    text-align: left;
    cursor: pointer;
    font: inherit;
  }
  .choice:hover {
    background: var(--band);
  }
  .choice-title {
    color: var(--ink);
  }
  .choice-hint {
    color: var(--ink-quiet);
  }

  .panel {
    margin-top: 16px;
  }

  .advert {
    display: flex;
    flex-direction: column;
  }

  /* 3.6 state 2: the near-limit line sits under the box. */
  .near {
    color: var(--almost);
    margin: 8px 0 0 0;
  }

  /* 9.1 item 7, CV block: 24px below the advert box. */
  .cv {
    margin-top: 24px;
  }
  .cv-label {
    color: var(--ink);
    margin: 0;
  }
  .cv-hint {
    color: var(--ink-quiet);
    margin: 8px 0 16px 0;
  }
  .cv :global(.btn-quiet) {
    margin-top: 16px;
  }
  .cv :global(.field) {
    margin-top: 12px;
  }
  .cv :global(.strip) {
    margin-top: 12px;
  }

  /* 9.1 item 8: Works with ChatGPT, t-micro, centred, 32px above. */
  .trust {
    color: var(--ink-quiet);
    text-align: center;
    margin: 32px 0 0 0;
  }
  /* State 10: the service-down strip sits 12px below the trust line, above
     the action bar (7.2). */
  .service-strip {
    margin-top: 12px;
  }
  /* State 10: the example button is the prominent way out of a downed
     service; 8px above the primary (7.3). */
  .actionbar-inner :global(.example-action) {
    margin-bottom: 8px;
  }

  /* The action bar is full-bleed below 768px (7.3 CSS); its contents cap at
     the 640px column and centre, so the button lines up with the content on
     desktop too (9.1: the column caps at 640px and centres). */
  .actionbar-inner {
    max-width: var(--column);
    margin-inline: auto;
  }

  /* State 1: the sentence above the disabled button (8.2). */
  .empty-sentence {
    color: var(--stop);
    margin: 0 0 8px 0;
  }
  .actionbar-inner :global(.strip) {
    margin-bottom: 8px;
  }
</style>
