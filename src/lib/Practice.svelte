<script>
  // Practice screen — dev-diary/design.md 9.4. The screen the demo lives on:
  // it must be readable from a few feet away by someone who is talking.
  // ChatGPT line (3.3), progress row (8.6), question card (8.7), answer box
  // (8.3) bound straight to session state (R1), the hint, the feedback note
  // (8.8), and the action bar (7.3). The empty-answer block and skip both
  // live here — T19 sweeps the full Section 10 state table, but the
  // practice-screen behaviours belong to this screen.
  import Button from './Button.svelte';
  import ChatGPTLine from './ChatGPTLine.svelte';
  import FeedbackNote from './FeedbackNote.svelte';
  import MessageStrip from './MessageStrip.svelte';
  import ProgressRow from './ProgressRow.svelte';
  import QuestionCard from './QuestionCard.svelte';
  import TextArea from './TextArea.svelte';
  import { copy } from './copy.js';
  import { TOTAL_QUESTIONS } from './shapes.js';
  import { hasModelContext } from './webmcp.js';
  import { session } from './session.svelte.js';

  let question = $derived(session.questions[session.current]);
  let connected = $derived(hasModelContext());
  let answerEmpty = $derived(!(question?.answer ?? '').trim());

  // 11.5: the placeholder depends on whether ChatGPT is connected.
  let placeholder = $derived(
    connected ? copy.practice.answer_placeholder : copy.practice.answer_placeholder_typing,
  );

  // Section 10 state 19: while ChatGPT is connected and the box is empty,
  // the hint says it is waiting for an answer.
  let hint = $derived(connected && answerEmpty ? copy.hint.waiting : copy.practice.hint);

  // Section 10 state 13: Next with an empty box blocks. The strip appears
  // only after an attempted block and clears once the box has text again.
  let blocked = $state(false);
  $effect(() => {
    if (!answerEmpty) blocked = false;
  });

  function next() {
    if (answerEmpty) {
      blocked = true; // nothing advances, the answer is not lost
      return;
    }
    blocked = false;
    advance();
  }

  // Skip never checks the box: it is the way past a blocked Next. skipped is
  // an additive field on the question, like modelAnswer — T25-T30 formalize
  // it into the session contract. Skipped questions stay skipped (no
  // back-navigation).
  function skip() {
    blocked = false;
    session.questions[session.current].skipped = true;
    advance();
  }

  // 9.4: Finish and show my tips appears from question 3 onward.
  function finishEarly() {
    session.phase = 'done';
  }

  function advance() {
    if (session.current < TOTAL_QUESTIONS - 1) {
      session.current += 1;
    } else {
      // The tips screen is T18; App.svelte renders the harness until then.
      session.phase = 'done';
    }
  }
</script>

<div class="page">
  <div class="column practice">
    <!-- 9.4 item 1: the ChatGPT line, 16px top padding. -->
    <ChatGPTLine />

    <!-- 9.4 item 2: progress row, 16px gap. -->
    <ProgressRow
      current={session.current}
      total={TOTAL_QUESTIONS}
      questions={session.questions}
    />

    <!-- 9.4 item 3: question card, 16px gap. -->
    <QuestionCard question={question?.prompt} sourceQuote={question?.sourceQuote} />

    <!-- 9.4 item 4: answer label + box, 24px gap (16px column gap + 8px here).
         R1: the box binds directly to session state — an agent write fills it. -->
    <div class="answer">
      <TextArea
        id="practice-answer"
        label={copy.practice.answer_label}
        placeholder={placeholder}
        minHeight={140}
        bind:value={session.questions[session.current].answer}
      />
      <!-- 9.4 item 5 / Section 10 state 19: the hint under the box. -->
      <p class="t-small hint">{hint}</p>
    </div>

    <!-- 9.4 item 6: feedback note, when the current answer has been scored. -->
    {#if question?.scores}
      <FeedbackNote score={question} />
    {/if}
  </div>

  <!-- 9.4 item 7: the action bar (7.3). The quiets sit above the primary:
       Skip this one, and Finish and show my tips below it from question 3
       onward (current >= 2). Two full-width quiet buttons stacked with an
       8px gap is the allowed limit. -->
  <div class="actionbar">
    <div class="actionbar-inner">
      <div class="quiets">
        <Button variant="quiet" style="width: 100%" onclick={skip}>{copy.btn.skip}</Button>
        {#if session.current >= 2}
          <Button variant="quiet" style="width: 100%" onclick={finishEarly}>
            {copy.btn.finish_early}
          </Button>
        {/if}
      </div>
      {#if blocked && answerEmpty}
        <!-- Section 10 state 13: the block sits directly above the primary.
             role=alert takes focus when it appears (8.13). -->
        <MessageStrip kind="stop" role="alert" message={copy.err.empty_answer} />
      {/if}
      <!-- On question 8 the primary becomes Show my tips (9.4). -->
      <Button onclick={next}>
        {session.current === TOTAL_QUESTIONS - 1 ? copy.btn.tips : copy.btn.next}
      </Button>
    </div>
  </div>
</div>

<style>
  /* 9.4 item 1: 16px top padding; 7.2: 32px bottom before the action bar. */
  .practice {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-block: 16px 32px;
  }

  /* 8.5 bakes in margin-top: 24px for the Start screen (9.1 item 5); on the
     practice screen the 16px gap comes from the column (9.4 items 1-2). */
  .practice :global(.chatline) {
    margin-top: 0;
  }

  /* 9.4 item 4: the answer block sits 24px below the question card (16px
     column gap + 8px here); item 5: the hint 8px under the box. */
  .answer {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }
  .hint {
    color: var(--ink-quiet);
    margin: 0;
  }

  /* The action bar is full-bleed below 768px (7.3 CSS); its contents cap at
     the 640px column and centre (matching Start's actionbar-inner). */
  .actionbar-inner {
    max-width: var(--column);
    margin-inline: auto;
  }

  /* 7.3: two full-width quiet buttons stacked with an 8px gap; the primary
     sits below. */
  .quiets {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 8px;
  }
  .actionbar-inner :global(.strip) {
    margin-bottom: 8px;
  }
</style>
