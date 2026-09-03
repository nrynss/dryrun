// Copy deck — dev-diary/design.md Section 11 (11.1 to 11.10), verbatim.
// Every user-visible string lives here; no component inlines a string.
// Placeholders in braces stay literal in these strings ({n}, {missed},
// {answered}, {average}) — substitution happens at render time.
//
// One documented addition: btn.show_less. The deck in the design doc names
// `btn.show_all` (used by the collapsed source quote, 3.5) but not its
// counterpart. T14's QuestionCard already renders "Show less" inline, and the
// T14 remediation record carries that string forward; it belongs in the deck
// so the deck is the only source of words.

export const copy = {
  /* 11.1 Product and shared */
  app: {
    name: 'Dry Run',
    promise: 'Practise your job interview',
    sub: 'Tell us about the job. Dry Run will help you prepare for the questions they may ask.',
    sub_typing: 'Answer the questions this employer is likely to ask. Then get simple tips for next time.',
    trust: 'Works with ChatGPT',
  },
  step: {
    1: 'Tell us the job',
    2: 'Practise your answers',
    3: 'Get simple tips for next time',
  },

  /* 11.2 Buttons */
  btn: {
    start: 'Start practice',
    next: 'Next question',
    tips: 'Show my tips',
    again: 'Try again',
    skip: 'Skip this one',
    finish_early: 'Finish and show my tips',
    end_practice: 'End practice and start over',
    different_job: 'Practise a different job',
    print: 'Print or save these tips',
    choose_file: 'Choose a file',
    paste_cv: 'Or paste your CV as text',
    remove_file: 'Remove',
    see_example: 'See the example',
    see_add: 'See what to add',
    see_scores: 'See the scores',
    see_numbers: 'See the numbers',
    show_all: 'Show all',
    show_less: 'Show less', // addition: T14 remediation carry-forward, see header
    back: 'Back',
  },

  /* 11.3 Start screen */
  start: {
    choice_advert: 'I have a job advert',
    choice_advert_hint: 'Paste it and we will build your questions.',
    choice_type: 'Choose a job type',
    choice_type_hint: 'Pick the kind of work you are going for.',
    choice_none: 'I do not have an advert',
    choice_none_hint: 'Just tell us the job title and where you will work.',
    advert_label: 'Paste the job advert here.',
    advert_placeholder: 'Paste the job advert. The duties and the requirements are the useful parts.',
    cv_label: 'Add your CV if you have one. Optional.',
    cv_hint: 'You can practise without it.',
    cv_paste_label: 'Paste your CV here.',
    privacy: 'Your CV stays in this browser on this device. We read it only to build your questions. Nothing is stored on a server.',
    type_question: 'What kind of job are you applying for?',
    type_warehouse: 'Warehouse',
    type_restaurant: 'Restaurant or cafe',
    type_shop: 'Shop',
    type_driving: 'Delivery or driving',
    type_care: 'Care',
    type_trades: 'Technician or trades',
    type_office: 'Office',
    type_other: 'Something else',
    title_label: 'What is the job called?',
    title_placeholder: 'For example, warehouse picker',
    where_label: 'Where will you work?',
    where_placeholder: 'For example, a supermarket depot in Leeds',
    done_before_label: 'Have you done this kind of work before?',
    done_before_yes: 'Yes',
    done_before_some: 'A little',
    done_before_no: 'No',
    hint_paste_first: 'Paste the job advert to start.',
    hint_type_first: 'Tell us the job title to start.',
  },

  /* 11.4 Your practice screen */
  plan: {
    title: 'Your practice is ready',
    sub: 'We read the job advert. Here are 8 questions they are likely to ask.',
    owns: 'What this job is really about',
    study: 'Worth reading before you go',
    angles: 'They may go deeper on these',
    have: 'You already have this',
    may_ask: 'Things they may ask you about',
    questions: 'Your 8 questions',
    quote_label: 'From the job advert',
    start_over: 'Start over',
  },

  /* 11.5 Practice screen */
  practice: {
    progress: 'Question {n} of 8',
    answer_label: 'Your answer',
    answer_placeholder: 'Write your answer here, or practise it in your own way.',
    answer_placeholder_typing: 'Write your answer here. Use the words that feel natural to you.',
    hint: 'Take your time. Use the words that feel natural to you.',
  },
  hint: {
    waiting: 'Waiting for your answer.',
  },
  busy: {
    scoring: 'Reading your answer',
    brief: 'Putting your practice together.',
    brief_sub: 'You can stay here while we get things ready.',
  },

  /* 11.6 Feedback on one answer */
  feedback: {
    strong: 'Strong answer',
    almost: 'Almost there',
    add: 'Try adding one example',
    one_thing: 'One thing to add: {missed}',
    nothing_missing: 'Nothing missing. Keep that one.',
    what_to_add: 'What to add',
    good_answer: 'A good answer could say',
  },

  /* 11.7 Your tips screen */
  tips: {
    title: 'Your tips for next time',
    question_n: 'Question {n}',
    what_you_said: 'What you said',
    skipped: 'You skipped this one. Try it next time.',
  },
  result: {
    ready: 'You are ready',
    ready_line: 'You answered every question and your answers were strong. Go in and say them the same way.',
    nearly: 'Nearly ready',
    nearly_line: 'Your answers were good. Add one real example to each one and they will be strong.',
    notyet: 'Keep practising',
    notyet_line: 'There is more to add to your answers. Use the tips below and try again.',
    capped: 'Keep practising',
    capped_line: 'You answered {answered} of the 8 questions. Answer at least 6 and we can tell you how ready you are.',
    capped_kind: 'What you did answer was good. Keep going.',
    answered: 'You answered {answered} of 8 questions.',
    average: 'Your answers averaged {average} out of 5.',
  },
  axis: {
    specificity: 'Detail',
    evidence: 'Proof',
    structure: 'Clear order',
    relevance: 'Fits the job',
  },
  empty: {
    no_answers: 'You have not answered any questions yet.',
    no_answers_action: 'Start practice',
  },

  /* 11.8 ChatGPT line */
  chat: {
    none: 'You can practise here in your own way.',
    ready: 'ChatGPT can help with your practice. You can also continue here in your own way.',
    active: 'ChatGPT is helping with your practice. This page updates as you go.',
    flash: 'ChatGPT just updated this page.',
  },

  /* 11.9 Errors, warnings and notices */
  err: {
    empty_posting: 'Paste the job advert first.',
    over_limit: 'That is longer than we can read. Paste just the job title, the duties, and the requirements.',
    pdf_scan: 'We could not find any words in that file. It looks like a photo or a scan. Copy your CV text and paste it instead.',
    pdf_locked: 'That file is locked with a password. Upload a copy without the password, or paste the text instead.',
    file_type: 'We can read PDF, TXT and MD files. For anything else, copy the text and paste it.',
    service_down: 'We cannot build new questions right now. Please try again later.',
    service_down_action: 'Or look at a full worked example while you wait.',
    score_failed: 'We could not read that answer. Your answer is saved. Try again, or move on.',
    empty_answer: 'Type your answer first, or skip this question.',
    answer_long: 'That answer is very long. Keep the part that best shows what you did.',
    unknown: 'Something went wrong. Please try again later.',
  },
  warn: {
    near_limit: 'You are close to the limit. Keep the duties and the requirements, and cut the rest.',
    cv_long: 'Your CV was long, so we used the first part of it. That is usually enough.',
    not_cv: 'That file did not read like a CV, so we skipped that part. Your questions still come from the job advert.',
    thin_advert: 'The advert was short, so these questions are more general. They are still worth practising.',
  },
  notice: {
    example: 'This is a worked example for a technical writing job. It is here so you can see how Dry Run works.',
  },
};
