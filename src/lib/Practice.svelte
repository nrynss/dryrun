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
  import { MAX_ANSWER_CHARS, session, submitAnswer, abandonScoring, startOver } from './session.svelte.js';

  let question = $derived(session.questions[session.current]);
  let connected = $derived(hasModelContext());
  let answerEmpty = $derived(!(question?.answer ?? '').trim());
  // Section 10 state 14: the cap from design 15.6. Raw length — the long
  // check counts every character, matching what a score call would send.
  let answerTooLong = $derived((question?.answer ?? '').length > MAX_ANSWER_CHARS);
  // 11.5: the placeholder depends on whether ChatGPT is connected.
  let placeholder = $derived(
    connected ? copy.practice.answer_placeholder : copy.practice.answer_placeholder_typing,
  );

  // Section 10 state 19: while ChatGPT is connected and the box is empty,
  // the hint says it is waiting for an answer.
  let hint = $derived(connected && answerEmpty ? copy.hint.waiting : copy.practice.hint);

  // Section 10 states 13/14: Next with an empty box, or with an answer over
  // 6,000 characters, blocks. blocked carries the reason so the right strip
  // shows; it is null when nothing is blocked, and the two strips can never
  // show together — next() picks the first cause and returns.
  let blocked = $state(null); // 'empty' | 'long' | null
  $effect(() => {
    // A block clears as soon as its cause is gone, by reason: text in the
    // box clears the empty block, a shortened answer clears the long block.
    // Validation itself still happens on the button press (design 4).
    if (blocked === 'empty' && !answerEmpty) blocked = null;
    else if (blocked === 'long' && !answerTooLong) blocked = null;
  });

  // Section 10 state 12: the scoring-failed strip clears when the answer
  // text changes — the failure described the text as submitted, and any edit
  // means the person is trying again (the answer stays until then, R1).
  // failedAnswer latches the text the failure applied to. submitAnswer sets
  // the flag itself, so the effect watches the answer text rather than the
  // flag. Otherwise it would clear the strip the instant it appears.
  let failedAnswer = $state(null);
  $effect(() => {
    if (session.scoreFailed) {
      if (failedAnswer === null) {
        failedAnswer = question?.answer ?? '';
      } else if ((question?.answer ?? '') !== failedAnswer) {
        session.scoreFailed = false;
      }
    } else {
      failedAnswer = null;
    }
  });

  // T32: go through the real capability. submitAnswer checks for an empty or
  // over-long answer before it touches the network, so a blocked answer
  // costs nothing. It then scores the transcript, stores the result on this
  // question, and advances the index or moves to 'done'. That is exactly
  // what an agent's submit_answer tool call does, and re-implementing it
  // here would be the drift the parity rule forbids.
  async function next() {
    // State 20: a score call in flight. The primary is busy and nothing
    // advances until it settles.
    if (session.scoring) return;
    const answer = question?.answer ?? '';
    // Section 10 state 12 does not block. The score already failed for this
    // exact text, so a second press means the person is choosing to move on.
    if (session.scoreFailed && failedAnswer === answer) {
      blocked = null;
      advance();
      return;
    }
    const result = await submitAnswer(answer);
    if (!result.ok) {
      // Section 10 states 13/14: submitAnswer's own validation returns the
      // exact copy string, so match on it rather than re-deriving the
      // reason locally. Any other failure (service down, a superseded
      // request) surfaces through session.scoreFailed instead (state 12).
      if (result.error === copy.err.empty_answer) blocked = 'empty';
      else if (result.error === copy.err.answer_long) blocked = 'long';
      return;
    }
    blocked = null;
  }

  // Skip never checks the box: it is the way past a blocked Next. No shared
  // capability skips a question. An agent always answers and never taps
  // Skip. So this stays a local, human-only transition. skipped is an
  // additive field on the question, like modelAnswer. Skipped questions stay
  // skipped (no back-navigation).
  function skip() {
    blocked = null;
    // A score call for this question may still be in flight. Retire it here
    // so session.scoring cannot outlive the question it describes.
    abandonScoring();
    const question = session.questions[session.current];
    // A question that already carries a score is not blocked, so it cannot be
    // the reason Skip was pressed. Marking it skipped would contradict the
    // stored score and make the session unsavable (T30's persisted-question
    // rule), so only an unscored question gets the flag.
    if (!question.scores) question.skipped = true;
    advance();
  }

  // 9.4: Finish and show my tips appears from question 3 onward.
  function finishEarly() {
    // A score call for the current question may still be in flight. Retire
    // it here so session.scoring cannot outlive the question it describes.
    abandonScoring();
    session.phase = 'done';
  }

  function endPractice() {
    startOver();
  }

  function advance() {
    session.scoreFailed = false; // state 12: never carry the failure forward
    if (session.current < TOTAL_QUESTIONS - 1) {
      session.current += 1;
    } else {
      session.phase = 'done';
    }
  }
</script>

<div class="page">
  <div class="column practice">
    <!-- 9.4 item 1: the ChatGPT line, 16px top padding. -->
    <ChatGPTLine />
    <!-- Section 10 state 8: the uploaded file did not read like a CV. The
         note strip sits at the top of the practice column, under the
         ChatGPT line; it never blocks — the questions still come from the
         advert. -->
    {#if session.fitMatch?.confidence === 'low'}
      <MessageStrip kind="note" role="status" message={copy.warn.not_cv} />
    {/if}

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
      <!-- Section 10 state 12: a score call failed after retries. The strip
           sits under the answer box, below the hint; it does not block Next
           and the answer stays (R1). It clears on any edit to the answer or
           on advance. -->
      {#if session.scoreFailed}
        <MessageStrip kind="almost" role="status" message={copy.err.score_failed} />
      {/if}
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
        <Button variant="quiet" style="width: 100%" onclick={endPractice}>
          {copy.btn.end_practice}
        </Button>
      </div>
      {#if blocked === 'empty'}
        <!-- Section 10 state 13: the block sits directly above the primary.
             role=alert takes focus when it appears (8.13). -->
        <MessageStrip kind="stop" role="alert" message={copy.err.empty_answer} />
      {:else if blocked === 'long'}
        <!-- Section 10 state 14: over 6,000 characters, blocked. Same spot,
             same focus behaviour; the two strips can never show together
             (next() picks the first cause). -->
        <MessageStrip kind="stop" role="alert" message={copy.err.answer_long} />
      {/if}
      <!-- On question 8 the primary becomes Show my tips (9.4). -->
      <!-- Section 10 state 20: while a score call is in flight, the primary
           shows its busy state: aria-busy, 20px spinner, busy label, width
           unchanged (8.2). submitAnswer drives session.scoring directly, for
           a human press and for an agent's submit_answer call alike. -->
      <Button busy={session.scoring} busyLabel={copy.busy.scoring} onclick={next}>
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
