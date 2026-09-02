import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { copy } from '../src/lib/copy.js';

const copySource = readFileSync(new URL('../src/lib/copy.js', import.meta.url), 'utf8');
const designSource = readFileSync(new URL('../dev-diary/design.md', import.meta.url), 'utf8');

const REPLACEMENTS = {
  'app.sub': 'Tell us about the job. Dry Run will help you prepare for the questions they may ask.',
  'step.2': 'Practise your answers',
  'practice.answer_placeholder': 'Write your answer here, or practise it in your own way.',
  'practice.answer_placeholder_typing': 'Write your answer here. Use the words that feel natural to you.',
  'practice.hint': 'Take your time. Use the words that feel natural to you.',
  'chat.none': 'You can practise here in your own way.',
  'chat.ready': 'ChatGPT can help with your practice. You can also continue here in your own way.',
  'chat.active': 'ChatGPT is helping with your practice. This page updates as you go.',
  'busy.brief': 'Putting your practice together.',
  'busy.brief_sub': 'You can stay here while we get things ready.',
  'err.service_down': 'We cannot build new questions right now. Please try again later.',
  'err.unknown': 'Something went wrong. Please try again later.',
  'err.answer_long': 'That answer is very long. Keep the part that best shows what you did.',
};

const OLD_STRINGS = [
  'Tell us what job you want. ChatGPT will ask you questions out loud and help you prepare.',
  'Answer out loud',
  'Type your answer here, or say it out loud in ChatGPT.',
  'Type your answer here. Write it how you would say it.',
  'There is no time limit. Say it how you would say it in the room.',
  'You are typing your answers. That works just as well.',
  'Ready for ChatGPT. Ask it to start your practice, or type your answers here.',
  'ChatGPT is running your practice. This page updates while you talk.',
  'Getting your questions ready.',
  'This takes about ten seconds.',
  'We cannot build new questions right now. Try again in a minute.',
  'Something went wrong. Try again in a minute.',
  'That answer is very long. Shorten it to the part you would actually say out loud.',
];

function flatten(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') {
      Object.assign(result, flatten(value, path));
    } else {
      result[path] = value;
    }
  }
  return result;
}

function extractDesignDeck(markdown) {
  const s11 = markdown.slice(
    markdown.indexOf('## 11. Copy deck'),
    markdown.indexOf('## 12. Motion'),
  );
  const tableRegex = /\|\s*`([^`]+)`\s*\|\s*([^|\r\n]+?)\s*\|/g;
  const deck = {};
  let match;
  while ((match = tableRegex.exec(s11)) !== null) {
    deck[match[1].trim()] = match[2].trim();
  }
  return deck;
}

test('the thirteen T36 replacements are present in src/lib/copy.js and match their keys', () => {
  const flattenedCopy = flatten(copy);
  for (const [key, replacement] of Object.entries(REPLACEMENTS)) {
    assert.equal(flattenedCopy[key], replacement, `Key ${key} should match the replacement`);
    assert.ok(copySource.includes(replacement), `src/lib/copy.js should contain "${replacement}"`);
  }
});

test('the old thirteen strings are absent from src/lib/copy.js and design.md Section 11', () => {
  const flattenedCopy = flatten(copy);
  const s11 = designSource.slice(
    designSource.indexOf('## 11. Copy deck'),
    designSource.indexOf('## 12. Motion'),
  );
  const copyValues = Object.values(flattenedCopy);

  for (const oldString of OLD_STRINGS) {
    assert.equal(copySource.includes(oldString), false, `src/lib/copy.js must not contain: "${oldString}"`);
    assert.equal(copyValues.includes(oldString), false, `copy values must not include: "${oldString}"`);
    assert.equal(s11.includes(oldString), false, `design.md Section 11 must not contain: "${oldString}"`);
  }
});

test('the copy deck in src/lib/copy.js matches the Markdown table deck in dev-diary/design.md Section 11', () => {
  const designDeck = extractDesignDeck(designSource);
  const flattenedCopy = flatten(copy);

  assert.equal(Object.keys(flattenedCopy).length, Object.keys(designDeck).length);
  assert.deepEqual(flattenedCopy, designDeck);
});

test('result.ready_line is preserved verbatim', () => {
  const readyLine = 'You answered every question and your answers were strong. Go in and say them the same way.';
  assert.equal(copy.result.ready_line, readyLine);
  assert.ok(copySource.includes(readyLine));

  const designDeck = extractDesignDeck(designSource);
  assert.equal(designDeck['result.ready_line'], readyLine);
});

test('no visible string promises fixed durations, fixed recovery windows, or enforces speech (with result.ready_line exception)', () => {
  const flattenedCopy = flatten(copy);
  for (const [key, value] of Object.entries(flattenedCopy)) {
    if (key === 'result.ready_line') continue;

    // No promises of fixed durations or recovery windows
    assert.doesNotMatch(value, /\b(minute|minutes|second|seconds|hour|hours)\b/i, `${key} must not promise fixed durations/recovery windows`);
    // No claims about speed or queue
    assert.doesNotMatch(value, /\b(queue position|model speed)\b/i, `${key} must not make claims about queue or speed`);
    // No speech enforcement
    assert.doesNotMatch(value, /\b(out loud|say it|say them)\b/i, `${key} must not enforce speech`);
  }
});
