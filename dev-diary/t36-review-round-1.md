# T36 review, round 1

Date: 2026-09-02
Reviewer: ReviewT36
Target: the uncommitted T36 implementation (Dry Run, branch main, HEAD 7e1ed16). Five files changed against HEAD (four modified, one untracked): `dev-diary/design.md`, `src/lib/copy.js`, `test/copy-deck.test.mjs`, `test/file-chooser-browser.test.mjs`, `test/session-capabilities.test.mjs`.
Binding documents: `dev-diary/task.md` row T36 and "T36 in detail" (lines 139-219), `dev-diary/design.md` Section 11 (Copy deck), and the parity and product rules in `dev-diary/project.md`. Prior documents: `dev-diary/t35-review-round-1.md`, `dev-diary/t35-review-round-2.md`.

## Verdict

**APPROVED. P1 x 0, P2 x 0, P3 x 0.**

The T36 implementation is complete, correct, and verified live. All thirteen replacements from `dev-diary/task.md` match character for character across both `src/lib/copy.js` and `dev-diary/design.md` Section 11. The single documented exception, `result.ready_line`, is preserved verbatim. Parity across the entire 125-key copy deck is total: every key in `src/lib/copy.js` matches its corresponding row in `dev-diary/design.md` Section 11 byte for byte, including `btn.end_practice` and `btn.show_less`. No remaining visible string makes claims about model speed, queue position, recovery windows, fixed durations, or enforces a speaking mode over typing. Component inspection confirms that no file in `src/` inlines user-facing copy or bypasses the deck. The new unit test in `test/copy-deck.test.mjs` and the updated assertions in `test/file-chooser-browser.test.mjs` and `test/session-capabilities.test.mjs` follow repository testing idioms without adding dependencies. `npm test` passes all 70 tests cleanly, and `npm run build` succeeds without errors. All prose rules on reading level, sentence length, and punctuation are satisfied.

## Findings by severity

None. (P1 x 0, P2 x 0, P3 x 0.)

## Detailed audit verification

### 1. Character-for-character verification of the thirteen replacements

All thirteen replacement targets specified in `dev-diary/task.md` (lines 164-178) were verified character for character against `src/lib/copy.js` and `dev-diary/design.md` Section 11. Zero discrepancies were detected.

| Key | Specified replacement string | `src/lib/copy.js` | `dev-diary/design.md` Section 11 | Status |
|---|---|---|---|---|
| `app.sub` | Tell us about the job. Dry Run will help you prepare for the questions they may ask. | Line 17 | Line 989 | PASS |
| `step.2` | Practise your answers | Line 23 | Line 993 | PASS |
| `practice.answer_placeholder` | Write your answer here, or practise it in your own way. | Line 103 | Line 1080 | PASS |
| `practice.answer_placeholder_typing` | Write your answer here. Use the words that feel natural to you. | Line 104 | Line 1081 | PASS |
| `practice.hint` | Take your time. Use the words that feel natural to you. | Line 105 | Line 1082 | PASS |
| `chat.none` | You can practise here in your own way. | Line 160 | Line 1137 | PASS |
| `chat.ready` | ChatGPT can help with your practice. You can also continue here in your own way. | Line 161 | Line 1138 | PASS |
| `chat.active` | ChatGPT is helping with your practice. This page updates as you go. | Line 162 | Line 1139 | PASS |
| `busy.brief` | Putting your practice together. | Line 112 | Line 1085 | PASS |
| `busy.brief_sub` | You can stay here while we get things ready. | Line 113 | Line 1086 | PASS |
| `err.service_down` | We cannot build new questions right now. Please try again later. | Line 173 | Line 1155 | PASS |
| `err.unknown` | Something went wrong. Please try again later. | Line 178 | Line 1161 | PASS |
| `err.answer_long` | That answer is very long. Keep the part that best shows what you did. | Line 177 | Line 1160 | PASS |

### 2. Single documented exception: `result.ready_line`

`dev-diary/task.md` (lines 184-192) explicitly establishes `result.ready_line` as the single documented exception that retains speech-referencing phrasing ("Go in and say them the same way"), because it describes the upcoming interview rather than prescribing how the candidate practises.

- Target text: `You answered every question and your answers were strong. Go in and say them the same way.`
- `src/lib/copy.js:136`: matches target verbatim.
- `dev-diary/design.md:1112`: matches target verbatim.
- Status: PASS.

### 3. Complete parity between `src/lib/copy.js` and `dev-diary/design.md` Section 11

The copy deck was extracted from markdown tables in Section 11 of `dev-diary/design.md` and compared against the flattened object structure of `src/lib/copy.js`.

- Total keys in `src/lib/copy.js`: 125.
- Total keys in `dev-diary/design.md` Section 11: 125.
- Keys present in code but missing from design: 0.
- Keys present in design but missing from code: 0.
- Key value differences: 0.
- Notable sync items: `btn.end_practice` ("End practice and start over") and `btn.show_less` ("Show less"), previously present in code but omitted from design tables, are now documented in Section 11.2, restoring 100% mutual consistency.
- Status: PASS.

### 4. Absence of duration promises, recovery windows, speed claims, and voice enforcement

Every string in `src/lib/copy.js` was audited against the task prohibitions:

- Model speed and queue claims: zero strings make claims regarding model speed, processing rate, or queue position.
- Fixed recovery windows: the phrase "in a minute" was eliminated from `err.service_down` and `err.unknown` in favour of "Please try again later."
- Fixed duration promises: the phrase "about ten seconds" was eliminated from `busy.brief_sub` in favour of "You can stay here while we get things ready."
- Voice requirements and speech enforcement: mode-prescriptive phrases such as "Answer out loud", "say it out loud", "Say it how you would say it in the room", "while you talk", and "Shorten it to the part you would actually say out loud" were replaced with mode-neutral alternatives inviting typing or speaking equally. The only speech reference remaining across the entire deck is the documented exception `result.ready_line`.
- Status: PASS.

### 5. Component sweep and deck boundary enforcement

A codebase sweep was conducted across `src/lib/*.svelte`, `src/App.svelte`, and `index.html`.

- `aria-label` search: zero occurrences found in `src/`.
- `title=` attribute search: zero occurrences found in `src/`.
- `<title>` element search: zero occurrences found inside components.
- Raw text in templates: all visible text is rendered via imports from `src/lib/copy.js`. Template text outside of tags consists only of decorative icons (such as the checkmark glyph in `FileChooser.svelte`) and HTML comments.
- Status: PASS.

### 6. Test suite inspection

The changes to the automated test suite were inspected:

- `test/copy-deck.test.mjs` (121 lines, new):
  - Uses native `node:test` and `node:assert/strict`.
  - Uses native `node:fs` `readFileSync` to parse source text.
  - Adds zero dependencies to `package.json`.
  - Verifies the presence of all 13 replacements, the total absence of the 13 retired strings from both files, full bidirectional equality between code and design deck, verbatim preservation of `result.ready_line`, and structural absence of duration or speech constraints.
- `test/file-chooser-browser.test.mjs`:
  - Line 450 updated to assert `Something went wrong. Please try again later.` on unhandled file failure.
- `test/session-capabilities.test.mjs`:
  - Line 742 updated to assert `That answer is very long. Keep the part that best shows what you did.` on oversized answer submission.
- Status: PASS.

### 7. Live execution of tests and build

Both the test suite and production build were executed live:

- Test execution: `npm test`
  - Output: 70 passing tests across 6 test suites, 0 failures, 0 errors.
  - Duration: ~9.1 seconds.
- Build execution: `npm run build`
  - Output: Vite production build succeeded in 509ms.
  - Assets emitted: `dist/index.html` (1.20 kB), `dist/assets/index-DaxcVnEW.css` (17.11 kB), `dist/assets/index-nBhHVC2K.js` (541.18 kB), `dist/assets/pdf.worker.min-Dswkl-cV.mjs` (1265.41 kB).
- Status: PASS.

### 8. House prose verification

Prose added and altered in the patch was evaluated against the project writing standards:

- Reading level: all thirteen replacements sit at or below the Grade 6 reading ceiling (Flesch-Kincaid Grade Levels range from 0.5 to 5.2). Words are simple and conversational.
- Sentence length: the longest sentence among the new strings is 12 words ("Dry Run will help you prepare for the questions they may ask" and "Keep the part that best shows what you did"), well below the 24-word maximum established in Section 11.10.
- Punctuation rules: zero semicolons appear in the copy deck or new code comments. Zero em dashes or en dashes appear in the copy deck or new code comments.
- Status: PASS.

### 9. Scope and historical documentation note

In `dev-diary/design.md` Section 3.3 (lines 139-141), an earlier narrative table contains the pre-T36 strings for the ChatGPT line resting states. Row T36 in `dev-diary/task.md` explicitly defines the scope of this task: "Touches `src/lib/copy.js` and the section 11 copy deck in `dev-diary/design.md`, and nothing else." Furthermore, `dev-diary/task.md` (lines 146-150) specifies: "T36 supersedes the loading copy, ChatGPT-line copy and error copy in `dev-diary/design.md` sections 11.1, 11.5, 11.8 and 11.9 where they conflict." Because the task boundary strictly restricted edits to Section 11 and established Section 11 as the sole authoritative copy deck, leaving Section 3.3 untouched conforms strictly to the task contract. Section 3.3 can be updated during future documentation passes without impacting product code.
