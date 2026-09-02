# Dry Run interface design

Build reference for T13 to T20. Revision 2, 1 September 2026.

This document supersedes every visual and copy decision currently in
`src/App.svelte`. It also supersedes the wording of T13, T15 and T16 in
`dev-diary/task.md`, which still describe the old aesthetic. Where this
document and `task.md` disagree, follow this document and note the
disagreement in Section 15.

**If you are implementing this, you should never need to invent a colour, a
size, or a word.** Everything is written down. If you find a gap, treat it as
a bug in this document and say so rather than guessing.

---

## Contents

1. Design position
2. What changed, and why
3. The six decisions
4. Rules that cannot be broken
5. Colour tokens
6. Typography
7. Layout system
8. Components
9. Screens
10. Every state
11. Copy deck
12. Motion
13. Accessibility checklist
14. Implementation order for T13 to T20
15. Problems in the spec, stated honestly

---

## 1. Design position

Dry Run looks like a well-made practice book. Paper, ink, generous type, one
question on the screen at a time. It does not look like software the reader has
never used.

The reader is anxious about something that matters to them tomorrow. They may
be standing up. They may be on a five-year-old phone. English may be their
second language. They may never have interviewed for an office job. So the
interface does three things and nothing else. It shows one thing at a time. It
uses words a person actually says out loud. It never makes the reader feel
measured.

**The specific choice.** The ground is warm paper white and the accent is a
deep pine green. The build we are replacing used acid green on near black. We
keep the hue and throw away the voltage. A dark, low-saturation green reads as
calm and encouraging rather than technical, and it survives a cheap screen in
daylight, a screenshot, and a printout. Corners are soft, borders are quiet,
and nothing glows.

**The type.** Lexend carries the interface. Its designers built and tested it
to reduce visual stress and raise reading speed, which describes this reader
exactly. Source Sans 3 carries long passages and has wide accented coverage for
people whose first language is not English.

---

## 2. What changed, and why

The product moved from senior professionals to everyone. The old surface was
built for the old audience and every part of it now works against us.

| Was | Now | Why |
|---|---|---|
| Near black ground, `#00FF41` accent | Paper white ground, `#1B5E4A` accent | A command centre is hostile to a nervous person |
| Monospace labels, tracked uppercase | Sentence case, no monospace anywhere | Uppercase tracking slows reading and reads as machine output |
| Zero radius, hard 1px borders | 10px radius, quiet borders, one soft shadow | Soft edges read as approachable |
| `ANALYSE` button | `Start practice` | The spec names the verb |
| `0 / 20,000` shown always | Nothing until the limit is near | A counter is not the task |
| `phase: idle · posting: 0 chars` | Removed | Debug output is not product copy |
| `Agent connected. A tool call reached this page.` | `ChatGPT is running your practice.` | Banned vocabulary, real underlying need |
| `READY` / `NEARLY` / `NOT YET` | `You are ready` / `Nearly ready` / `Keep practising` | A verdict shouted in capitals lands as a judgement |
| Source quote as proof, `project.md` "Scoring" | Rendered, quiet, below the question | `project.md` now calls it secondary detail. A judge still needs it |
| Density and authority | One thing per screen | Legibility beats information per pixel |
| Dark only | Light only | See Section 5 |

---

## 3. The six decisions

These are the places where the old build and the new spec disagree. Each one is
decided here. Do not reopen them.

### 3.1 Visual identity

Replaced entirely. New palette in Section 5, new type in Section 6, new spacing
and shapes in Section 7. Nothing from the old aesthetic survives. No monospace,
no uppercase tracking, no zero radius, no glow, no dark ground.

### 3.2 Banned copy

The spec forbids "Analyse", "agent", "tool call", "WebMCP", implementation
phase names, and character counters as primary product copy.

**Word ban, enforced.** These strings must not appear anywhere a user can read
them. Not in a button, a label, a heading, a tooltip, an error, a placeholder,
an `aria-label`, or a `<title>`.

```
analyse    analyze    agent      tool call    tool-call    WebMCP    MCP
phase      adjudicate            rubric       axis         axes
score      verdict    band       gap          deficiency
candidate  assessment            character count
```

Two clarifications, because these words have ordinary uses too.

- The phase values `idle`, `analysing`, `ready`, `interviewing` and `done` are
  banned **as status labels**. Plain English uses of the same words are fine.
  `Your practice is ready` is good copy. `phase: ready` is not.
- `score`, `verdict`, `band`, `rubric` and `phase` stay in the code as variable
  names. They never reach the screen.

Nothing in the copy deck in Section 11 breaks this list. If you write a string
that is not in Section 11, check it against this list first.

**Replacements.** `Start practice`, `Next question`, `Show my tips`,
`Try again`. The full list is Section 11.

`Works with ChatGPT` is allowed once, as a small line on the start screen. It
is never the task the user is asked to complete.

### 3.3 The line that shows ChatGPT is driving

The old copy is banned. The need is real, because a page moving on its own is
the entire demo. Solve it in plain language and keep it honest.

One component, the **ChatGPT line**. It sits at the top of the practice screen
and at the top of the start screen. It has three resting states and one flash.

| Condition | Copy |
|---|---|
| `document.modelContext` absent | You are typing your answers. That works just as well. |
| Present, no call yet | Ready for ChatGPT. Ask it to start your practice, or type your answers here. |
| A call has arrived | ChatGPT is running your practice. This page updates while you talk. |
| Flash, 4 seconds after any call | ChatGPT just updated this page. |

The flash is what a judge sees. It says a machine changed the page without a
click, in words a warehouse worker also understands. After 4 seconds the line
returns to its resting copy.

The dot beside the line is decorative and never the only signal. The words
carry the meaning.

### 3.4 Verdict names

`buildVerdict()` returns `'ready'`, `'nearly'` and `'not yet'`.

**Do not change `src/lib/shapes.js`.** Those values are a data contract shared
by the function, the state, the fixture and the tests. Map them to display
strings in the interface only.

```js
const RESULT_TITLE = {
  ready:     'You are ready',
  nearly:    'Nearly ready',
  'not yet': 'Keep practising',
};
```

When `capped` is true the title is still `Keep practising`, and the line
underneath explains the coverage rather than the content. Exact copy in
Section 11.7.

### 3.5 sourceQuote

Keep it rendered. Make it quiet and subordinate. It proves the questions come
from this advert, which a judge needs and a user does not.

Concrete rules.

- It appears **below** the question, never above.
- Label is `From the job advert`, 13px, weight 600, `--ink-quiet`.
- Quote is 15px `--font-text`, `--ink-quiet`, in straight quotation marks.
- Left rule 3px `--edge-firm`, 12px padding to the left of the text.
- It is never `--strong`, never bold, never larger than the question.
- Below 480px it clamps to 3 lines with a `Show all` text button, 44px high.
- At 480px and above it renders in full with no clamp.
- On the tips screen it lives inside the per-question detail, not on the
  surface.

If `sourceQuote` is missing or empty, render nothing. Never render an empty
rule or a label with no quote.

### 3.6 The character limit

The cap is real at 20,000 characters. It never leads the interface.

| Length of the job advert | What the screen shows |
|---|---|
| 0 to 18,999 | Nothing. No counter, no bar, no hint |
| 19,000 to 20,000 | One quiet line under the box, `--almost` |
| Over 20,000 | Blocked on submit, one message, `--stop` |

**No numbers in either message.** A count is meaningless to someone who has
never counted characters, and it turns a limit into a chore. The copy tells
them what to cut instead. Exact strings in Section 11.9.

The current message in `src/lib/session.svelte.js` reports the exact figure.
Replace it with the string in Section 11.9 when T25 rewrites that function.

The same rule applies to the answer box, with a cap of 6,000 characters. See
Section 15.6 for why that number exists.

---

## 4. Rules that cannot be broken

**R1. Display parity.** Every input renders session state directly. Never a
local draft variable. This caused a real bug: the agent set the posting, the
textarea still showed its placeholder, and the page reported 166 characters
stored. A judge reads that as broken.

```svelte
<!-- WRONG. A local draft desynchronises from an agent write. -->
let draft = $state('');
<textarea bind:value={draft}></textarea>

<!-- RIGHT. One source of truth, written by both callers. -->
<textarea bind:value={session.posting}></textarea>
```

Validation happens when the button is pressed, not on every keystroke. The
same applies to the CV box, which binds to `session.resume`, and the answer
box, which binds to `session.questions[session.current].answer`.

**R2. Nothing is reachable only by ChatGPT.** Every step has a button. A person
tapping on a phone completes the whole product. The typed path is not a
fallback and the copy never calls it one.

**R3. Colour is never the only signal.** Every coloured state carries a word.
Every score bar carries a number. Every dot carries text beside it.

**R4. Honest in one direction only.** A session with fewer than
`COVERAGE_FLOOR` answers can never read as ready. The interface says why in
plain words and does not apologise for it.

**R5. No number is ever a headline.** Averages, counts and axis scores live
below a sentence that says what they mean. The largest text on the tips screen
is words.

**R6. Grade 6 reading level in primary copy.** Short sentences. Common words.
Active voice. Say `We could not read that file`, not `File parsing was
unsuccessful`.

**R7. Every interactive element is at least 48px on its shorter side**, with at
least 8px between neighbours.

---

## 5. Colour tokens

**One theme, light.** Set `color-scheme: light` on `:root` and define no dark
block. This is a deliberate commitment, not a missing feature. Two themes built
in one night is two themes built badly, and the reader most likely to be helped
here is on a default phone in a bright room. Every value below is checked, not
asserted.

```css
:root {
  color-scheme: light;

  /* surfaces */
  --paper:        #FBFAF8;  /* page ground */
  --card:         #FFFFFF;  /* every card, panel and input */
  --band:         #F1EFEA;  /* quiet secondary panel */

  /* text */
  --ink:          #1B1D21;  /* everything a person must read */
  --ink-quiet:    #55595F;  /* hints, quotes, secondary lines */
  --on-fill:      #FFFFFF;  /* text on any filled button */

  /* edges */
  --edge:         #DDDCD8;  /* decorative hairline, never carries meaning */
  --edge-firm:    #84817A;  /* input borders and meaningful boundaries */

  /* feedback: strong answer */
  --strong:       #1B5E4A;
  --strong-deep:  #0F3F31;  /* hover and active on filled buttons */
  --strong-wash:  #EAF3EF;

  /* feedback: almost there */
  --almost:       #8A5300;
  --almost-wash:  #FCF3E3;

  /* feedback: try adding one example */
  --note:         #1F4E8C;
  --note-wash:    #E9F0F9;

  /* something is actually broken */
  --stop:         #8E3038;
  --stop-wash:    #FCEBEC;

  /* disabled */
  --disabled:     #6E6B65;
}
```

### 5.1 Contrast, measured

Every pair used for text. Ratios computed with the WCAG 2.1 relative luminance
formula. AA needs 4.5:1 for text under 18.66px, 3:1 for larger or bold text,
and 3:1 for interface boundaries.

| Foreground | Background | Ratio | Use | Passes |
|---|---|---|---|---|
| `#1B1D21` | `#FBFAF8` | 16.18 | body on page | AAA |
| `#1B1D21` | `#FFFFFF` | 16.88 | body on card | AAA |
| `#1B1D21` | `#F1EFEA` | 14.69 | body on quiet panel | AAA |
| `#55595F` | `#FBFAF8` | 6.75 | hints on page | AAA |
| `#55595F` | `#FFFFFF` | 7.05 | hints on card | AAA |
| `#55595F` | `#EAF3EF` | 6.23 | hints on strong wash | AAA |
| `#55595F` | `#FCF3E3` | 6.40 | hints on almost wash | AAA |
| `#55595F` | `#E9F0F9` | 6.14 | hints on note wash | AAA |
| `#55595F` | `#FCEBEC` | 6.12 | hints on stop wash | AAA |
| `#FFFFFF` | `#1B5E4A` | 7.65 | primary button | AAA |
| `#FFFFFF` | `#0F3F31` | 11.83 | primary button, hover | AAA |
| `#1B5E4A` | `#FFFFFF` | 7.65 | link, strong label on card | AAA |
| `#1B5E4A` | `#FBFAF8` | 7.33 | link on page | AAA |
| `#1B5E4A` | `#EAF3EF` | 6.76 | strong label on its wash | AAA |
| `#8A5300` | `#FFFFFF` | 6.33 | almost label on card | AAA |
| `#8A5300` | `#FCF3E3` | 5.75 | almost label on its wash | AAA |
| `#1F4E8C` | `#FFFFFF` | 8.31 | note label on card | AAA |
| `#1F4E8C` | `#E9F0F9` | 7.24 | note label on its wash | AAA |
| `#8E3038` | `#FFFFFF` | 7.98 | error text on card | AAA |
| `#8E3038` | `#FCEBEC` | 6.93 | error text on its wash | AAA |
| `#FFFFFF` | `#6E6B65` | 5.31 | disabled button text | AA |
| `#84817A` | `#FFFFFF` | 3.89 | input border | AA (non-text) |
| `#84817A` | `#FBFAF8` | 3.73 | input border on page | AA (non-text) |
| `#84817A` | `#F1EFEA` | 3.38 | border on quiet panel | AA (non-text) |

`--edge` at `#DDDCD8` measures 1.32:1 on paper. It is decorative only. It may
separate rows in a list. It must never be the only thing marking an input, a
button, or a control boundary. Use `--edge-firm` for those.

### 5.2 Score colours

`scoreBand()` in `shapes.js` returns `good`, `mid` and `bad`. Map them:

| `scoreBand()` | Token | Word shown |
|---|---|---|
| `good` | `--strong` | Strong answer |
| `mid` | `--almost` | Almost there |
| `bad` | `--note` | Try adding one example |

The weakest band is blue, not red. Red belongs to things that are broken, not
to a person who is practising. A nervous reader who sees red concludes they
failed, and that is the opposite of the product's job.

### 5.3 Focus

One focus treatment everywhere.

```css
:where(a, button, input, textarea, select, summary, [tabindex]):focus-visible {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
  border-radius: 6px;
}
/* On any filled button, add a white gap so the ring stays visible. */
.btn-primary:focus-visible { box-shadow: 0 0 0 2px var(--card); }
```

`--ink` on `--paper` is 16.18:1, so the ring is visible on every surface in
the product. Never remove an outline without replacing it.

### 5.4 Shadow and radius

```css
--radius-card:  10px;
--radius-input: 8px;
--radius-pill:  999px;
--shadow-card:  0 1px 2px rgba(27,29,33,.06), 0 2px 8px rgba(27,29,33,.05);
```

One shadow, on cards only. Never on buttons, inputs, or text.

---

## 6. Typography

Two faces. The split is a rule, not a preference.

- **`--font-ui` (Lexend)**. Anything the product says. Headings, buttons,
  labels, the question itself, progress, feedback titles.
- **`--font-text` (Source Sans 3)**. Anything a person reads at length or
  wrote themselves. Paragraphs, list items, answers, tips, model answers,
  source quotes.

Add to `index.html`, inside `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600&family=Source+Sans+3:wght@400;600&display=swap">
```

```css
--font-ui:   'Lexend', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
--font-text: 'Source Sans 3', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
```

`display=swap` means the page renders in the fallback if the fonts do not
load. Both fallbacks are humanist sans faces, so nothing breaks.

### 6.1 Scale

Mobile value first. Desktop value applies at 640px and above where they differ.

| Name | Face | Size | Weight | Line height | Tracking | Used for |
|---|---|---|---|---|---|---|
| `t-display` | ui | 30px → 36px | 600 | 1.20 | -0.01em | Start screen promise, result title |
| `t-h1` | ui | 24px → 28px | 600 | 1.25 | -0.005em | Screen titles |
| `t-h2` | ui | 19px | 600 | 1.30 | 0 | Section headings |
| `t-h3` | ui | 15px | 600 | 1.40 | 0 | Small labels above a list |
| `t-question` | ui | 22px → 26px | 500 | 1.35 | 0 | The question on the practice card |
| `t-body` | text | 17px | 400 | 1.60 | 0 | All prose, list items, answers |
| `t-body-b` | text | 17px | 600 | 1.60 | 0 | One emphasised sentence |
| `t-small` | text | 15px | 400 | 1.55 | 0 | Hints, source quotes, privacy line |
| `t-micro` | ui | 13px | 600 | 1.50 | 0.01em | Chips, progress label, quote label |
| `t-button` | ui | 17px | 600 | 1.00 | 0 | Every button |
| `t-number` | ui | 17px | 600 | 1.00 | 0 | Axis scores, tabular |

Rules.

- Nothing on the screen is smaller than 13px, and 13px is only used where the
  same information also appears elsewhere in words.
- No uppercase transforms anywhere. Sentence case throughout.
- `t-number` sets `font-variant-numeric: tabular-nums`.
- Body measure caps at 68 characters. On the 640px column at 17px that is
  automatic, so no `max-width` is needed inside the column.
- `text-wrap: balance` on `t-display`, `t-h1` and `t-question`. Nothing else.
- Never justify. Never hyphenate.

---

## 7. Layout system

Mobile first. Design at 360px and let it grow. The desktop target is 720px to
900px of viewport, because the page sits beside a ChatGPT window.

### 7.1 The page frame

```css
--gutter: 16px;            /* below 480px */
--gutter-wide: 24px;       /* 480px and above */
--column: 640px;           /* content never exceeds this */
```

One centred column, `max-width: 640px`, at every width. There are no
multi-column layouts anywhere in this product. That is deliberate. A single
column removes an entire class of decisions, reads the same on a phone and
beside ChatGPT, and keeps the line length under 68 characters.

```css
.page { background: var(--paper); min-height: 100dvh; }
.column { max-width: var(--column); margin-inline: auto; padding-inline: var(--gutter); }
@media (min-width: 480px) { .column { padding-inline: var(--gutter-wide); } }
```

### 7.2 Spacing scale

Every gap and pad is one of these. No other values.

```
4px   8px   12px   16px   24px   32px   48px   64px
```

Use flex or grid `gap`. Do not use margins for layout except the standard
`margin-block` between stacked prose blocks.

Standard vertical rhythm inside a screen:

- Between a heading and its first child: 12px
- Between sibling paragraphs: 16px
- Between cards in a list: 12px
- Between sections: 32px
- Screen top padding: 24px, bottom padding 32px plus the action bar height

### 7.3 The action bar

The primary action of every screen sits in a bar pinned to the bottom of the
viewport below 768px, and inline at the end of the content at 768px and above.

```css
.actionbar {
  position: sticky; bottom: 0;
  background: var(--paper);
  border-top: 1px solid var(--edge);
  padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom));
}
@media (min-width: 768px) {
  .actionbar { position: static; border-top: 0; padding-inline: 0; padding-bottom: 0; }
}
```

The bar holds one primary button at full width. A secondary action sits above
it as a text button, never beside it. Two full-width buttons stacked with an
8px gap is allowed. Three is not.

### 7.4 Breakpoints

Only two, and both only adjust size.

| Width | What changes |
|---|---|
| `< 480px` | 16px gutters, source quote clamps to 3 lines |
| `>= 480px` | 24px gutters, source quote unclamped |
| `>= 640px` | Display and h1 step up, question steps up |
| `>= 768px` | Action bar unpins and sits inline |

Nothing reflows. Nothing becomes a grid. The order of elements in the DOM is
the order on the screen at every width.

---

## 8. Components

Every component below is specified to the pixel. Where a value is not given,
it is 0.

### 8.1 Card

The container for almost everything.

```
background     var(--card)
border         1px solid var(--edge)
border-radius  var(--radius-card)   /* 10px */
box-shadow     var(--shadow-card)
padding        16px  (20px at >=480px)
```

A card never nests inside another card.

### 8.2 Button

| Variant | Fill | Text | Border | Height | Width |
|---|---|---|---|---|---|
| Primary | `--strong` | `--on-fill` | none | 52px | 100% |
| Secondary | `--card` | `--ink` | 1px `--edge-firm` | 48px | 100% |
| Quiet | transparent | `--strong` | none | 48px | auto, min 48px |
| Disabled | `--disabled` | `--on-fill` | none | 52px | 100% |

Shared: `border-radius: 10px`, `font: t-button`, `padding-inline: 20px`,
`cursor: pointer`, `text-align: center`.

States.

- Hover on primary: fill `--strong-deep`. No lift, no shadow, no scale.
- Active on primary: fill `--strong-deep`, `transform: translateY(1px)`.
- Hover on secondary: background `--band`.
- Hover on quiet: underline the label.
- Focus: the ring from Section 5.3.
- Disabled: `--disabled` fill, `cursor: not-allowed`, `aria-disabled="true"`.
  Keep it focusable so a screen reader can find it and read why.

**A disabled primary button always has a sentence above it saying what to do.**
Never a dead button with no explanation.

Busy state: the label changes to the busy string from Section 11, the button
gets `aria-busy="true"`, and a 20px spinner sits 8px to the left of the label.
The button stays the same width. It does not shrink to an icon.

### 8.3 Text box

Used for the job advert, the CV, and the answer.

```
background     var(--card)
border         1px solid var(--edge-firm)
border-radius  var(--radius-input)   /* 8px */
padding        12px 14px
font           t-body
color          var(--ink)
min-height     160px  (job advert and CV)
min-height     140px  (answer)
resize         vertical
width          100%
```

- Focus: border `--strong` at 2px, plus the focus ring. The 2px border replaces
  the 1px so the box does not shift.
- Placeholder: `--ink-quiet`. Placeholders are hints, never labels.
- Every box has a real `<label>` above it, 8px gap, `t-h3`.
- Optional boxes carry the word `Optional` in the label, not an asterisk
  anywhere.
- **Binds to session state directly.** See R1.

### 8.4 File chooser

A secondary button labelled `Choose a file`, with a real `<input type="file">`
visually hidden behind it and wired with a label. Accepts
`.pdf,.txt,.md,text/plain,text/markdown,application/pdf`.

Below it, at 12px gap, the privacy note. `t-small`, `--ink-quiet`, in a
`--band` panel with 12px padding and 8px radius. The privacy note is always
visible. It is never behind a link and never in a footer.

After a successful file read, the button is replaced by a row showing the file
name in `t-small` `--ink`, a green tick glyph, and a quiet `Remove` button at
48px. The extracted text appears in the CV box, because of R1.

### 8.5 ChatGPT line

A single row. 48px min height, 12px vertical padding.

```
display   flex
gap       10px
align     center
font      t-small
color     var(--ink-quiet)
```

A 10px round dot on the left. Dot colour: `--edge-firm` when there is no
ChatGPT, `--strong` when a call has arrived. The dot is decorative,
`aria-hidden="true"`.

The text sits in `<p role="status" aria-live="polite">` so a screen reader
announces the change when ChatGPT updates the page.

Flash behaviour: when a call arrives, the row background becomes
`--strong-wash` with a 8px radius, the text becomes the flash string, and both
revert after 4 seconds. The background fades out over 1200ms.

### 8.6 Progress row

Shown only on the practice screen.

- A label above: `Question 3 of 8`, `t-micro`, `--ink-quiet`.
- Below it, eight segments in a row. Each segment is `flex: 1`, 6px high, 3px
  radius, 4px gap.
- Answered: `--strong`. Current: `--ink`. Not reached: `--edge`.
- Skipped: `--edge-firm`.
- The whole row is `aria-hidden="true"`. The label above carries the meaning
  for assistive technology, which satisfies R3.
- Segments are not buttons. There is no navigation back through questions.

### 8.7 Question card

A card, per 8.1.

```
question text      t-question, --ink, margin-bottom 16px
source quote       per 3.5, margin-top 0
```

Nothing else lives on this card. No number badge, no timer, no chip.

### 8.8 Feedback note

Appears under the answer box after an answer is scored.

```
background     the wash for the band
border-left    4px solid the band colour
border-radius  8px
padding        14px 16px
```

Contents, in order.

1. Title. `t-h2`, in the band colour. One of the three strings from 5.2.
2. One sentence. `t-body`, `--ink`. Built from the first entry of `missed`:
   `One thing to add: {missed[0]}`. When `missed` is empty, use
   `Nothing missing. Keep that one.`
3. A `<details>` disclosure, summary `See what to add`, `t-micro`, 44px high.
   Inside: the full `missed` list and the model answer, per Section 11.6.

### 8.9 List block

Used for `owns`, `study`, `angles`, and `missed`.

```
heading    t-h3, --ink, margin-bottom 8px
list       <ul>, list-style none, padding 0
item       t-body, --ink, padding-left 22px, position relative, margin-bottom 10px
marker     a 6px round dot in --strong at left 4px, top 0.7em
```

### 8.10 Fit item

Two shapes, both from `FitMatch`.

**Already have it** (`evidenced`). A row in a `--strong-wash` panel, 12px
padding, 8px radius, 8px gap between rows.

```
requirement   t-body-b, --ink
evidence      t-small, --ink-quiet, margin-top 4px
```

**They may ask about it** (`gaps`). A row in a `--note-wash` panel, same
metrics.

```
requirement   t-body-b, --ink
why           t-small, --ink-quiet, margin-top 4px
```

`size` is never shown. It orders the list and nothing else. The word "gap"
never appears. Show at most the top 3 gap items, then a quiet `Show all`
button if there are more.

### 8.11 Result panel

The verdict, at the top of the tips screen. A card with `--strong-wash`,
`--almost-wash` or `--note-wash` background, matching the band.

```
title       t-display, band colour, text-wrap balance
line        t-body, --ink, margin-top 8px
detail      a <details> disclosure, summary "See the numbers"
padding     24px
```

`See the numbers` reveals: `You answered {answered} of 8 questions.` and
`Your answers averaged {average} out of 5.` and the four axis names with their
session averages. This is the only place a raw average appears.

### 8.12 Score row

Inside a per-question disclosure on the tips screen. Four rows, one per axis.

```
row        display flex, align center, gap 12px, min-height 32px
name       t-body, --ink, width 120px, flex none
bar        flex 1, height 8px, radius 4px, background --edge,
           border 1px solid --edge-firm, overflow hidden
fill       height 100%, width (value/5*100)%, background the band colour
value      t-number, --ink, width 28px, text-align right
```

Axis display names, fixed. These are the only strings allowed for them.

| `AXES` value | Shown as |
|---|---|
| `specificity` | Detail |
| `evidence` | Proof |
| `structure` | Clear order |
| `relevance` | Fits the job |

The 1px `--edge-firm` outline on the bar gives its full extent a 3.89:1
boundary, so the empty portion is perceivable.

### 8.13 Message strip

For every error, warning and notice.

```
background     the wash for its kind
border-left    4px solid the kind colour
border-radius  8px
padding        12px 14px
font           t-body
colour         --ink for the sentence, kind colour for the leading word
role           "alert" for blocking, "status" for non-blocking
```

Kinds: `--stop` for blocked, `--almost` for a warning that let the action
through, `--note` for a neutral notice.

A strip that blocks an action sits directly above the button that was pressed
and receives focus when it appears.

### 8.14 Loading block

Centred in the content column. 48px vertical padding.

- A 32px circle, 3px border, `--edge`, with a `--strong` top border, rotating
  once every 1.2s.
- Below it, 16px gap, `t-body` `--ink`, the loading sentence.
- Below that, 8px gap, `t-small` `--ink-quiet`, the reassurance sentence.
- Wrapped in `<div role="status" aria-live="polite">`.
- No progress bar. We cannot know the progress and a fake one is a lie.
- No stage names. Those are implementation details and they are banned.

---

## 9. Screens

Five screens. They map to `session.phase` exactly.

| `session.phase` | Screen |
|---|---|
| `idle` | 1. Start |
| `analysing` | 2. Getting ready |
| `ready` | 3. Your practice |
| `interviewing` | 4. Practice |
| `done` | 5. Your tips |

### 9.1 Start

**Mobile, 360px.** Single column, in this order.

1. Wordmark `Dry Run`, `t-h2`, `--strong`. 24px top padding.
2. The promise, `t-display`. 16px gap.
3. The sub-line, `t-body`, `--ink-quiet`. 12px gap.
4. The three-step strip. 24px gap. Three rows, each with a 28px circle holding
   the number in `t-micro` `--on-fill` on `--strong`, and the step name in
   `t-body` `--ink` beside it. 12px gap between rows.
5. The ChatGPT line. 24px gap.
6. The start choice cards. 16px gap. Three cards, per 8.1, each a `<button>`
   at full width, `text-align: left`, min-height 76px, 12px gap between them.
   Each holds a title in `t-body-b` `--ink` and a hint in `t-small`
   `--ink-quiet`. Selecting one expands its panel below and collapses the
   others.
7. The expanded panel for the chosen route. See below.
8. `Works with ChatGPT`, `t-micro`, `--ink-quiet`, 32px gap, centred.
9. Action bar with `Start practice`.

**Panel for `I have a job advert`.** A text box per 8.3 labelled
`Paste the job advert here.` Then a 24px gap, then the CV block: `t-h3` label
`Add your CV if you have one. Optional.`, the file chooser per 8.4, a quiet
button `Or paste your CV as text` that reveals a second text box.

**Panel for `Choose a job type`.** Eight choice chips in a wrapping row, 8px
gap, each 48px high, `--card` fill, 1px `--edge-firm`, 999px radius,
`t-body`. Selected chip: `--strong` fill, `--on-fill` text. Below the chips,
three short fields. See Section 11.3.

**Panel for `I do not have an advert`.** Two single-line inputs, per 8.3 but
`min-height: 52px` and no resize.

**Desktop, 720px to 900px.** Identical. The column caps at 640px and centres.
The action bar unpins at 768px and sits after the content. Type steps up per
Section 6.1.

**Empty and error.** When the job advert box is empty, the primary button is
disabled and the sentence above it reads `Paste the job advert to start.`

### 9.2 Getting ready

The loading block per 8.14, centred, with the wordmark above it. No other
content. No cancel button, because the call is bounded at two attempts with a
10-second timeout. If it fails, the screen becomes Start with a message strip.

### 9.3 Your practice

1. Wordmark. 24px top padding.
2. `t-h1` title.
3. `t-body` sub-line naming the number of questions.
4. Section `What this job is really about`, a list block from `brief.owns`.
5. Section `Worth reading before you go`, a list block from `brief.study`.
6. Section `They may go deeper on these`, a list block from `brief.angles`.
7. If `fitMatch` exists and `confidence` is `high`:
   - Section `You already have this`, fit items from `evidenced`.
   - Section `Things they may ask you about`, fit items from `gaps`, top 3.
8. Section `Your 8 questions`, eight question cards per 8.7, 12px gap.
9. Action bar. Primary `Start practice`. Above it, when the session
   carries a CV, a quiet secondary `Remove my CV and start over`, stacked
   with an 8px gap per 7.3.

32px between sections. If `brief.confidence` is `low`, a `--note` message
strip sits directly under the sub-line.

Desktop is identical, one column, wider type.

### 9.4 Practice

The screen the demo lives on. It must be readable from a few feet away by
someone who is talking.

1. ChatGPT line. 16px top padding.
2. Progress row per 8.6. 16px gap.
3. Question card per 8.7. 16px gap.
4. Answer label `Your answer`, then the answer text box per 8.3. 24px gap.
5. Hint under the box, `t-small`, `--ink-quiet`, 8px gap.
6. Feedback note per 8.8, when the current answer has been scored.
7. Action bar. Primary `Next question`. Above it, a quiet button
   `Skip this one`. On question 8 the primary becomes `Show my tips`.

There is no list of previous answers on this screen. One question at a time is
the whole point. Previous answers are all on the tips screen.

When ChatGPT is driving, the answer box fills itself as `submit_answer`
arrives, because of R1. That is the moment a judge is watching. Do not hide
the box while ChatGPT is connected.

A quiet button `Finish and show my tips` appears below `Skip this one` from
question 3 onward, so a person can stop early. Tapping it moves to the tips
screen, where the coverage line explains the result honestly.

### 9.5 Your tips

1. Wordmark. 24px top padding.
2. `t-h1` `Your tips for next time`.
3. Result panel per 8.11. 16px gap.
4. 32px gap. Then one block per question, 16px gap between blocks.

Each question block is a card containing:

```
Question {n}                          t-micro, --ink-quiet
{prompt}                              t-body-b, --ink, margin-top 4px
What you said                         t-h3, margin-top 16px
{answer}                              t-body, --ink, margin-top 8px
What to add                           t-h3, margin-top 16px
{missed as a list block}
A good answer could say               t-h3, margin-top 16px
{modelAnswer}                         t-body, --ink, margin-top 8px
<details> See the scores              t-micro, 44px summary
  {score row per axis, per 8.12}
  From the job advert                 t-micro, --ink-quiet, margin-top 16px
  {sourceQuote}                       t-small, --ink-quiet
</details>
```

A skipped question shows the prompt, then the strip
`You skipped this one. Try it next time.` and nothing else.

5. Action bar. Primary `Try again`. Above it, quiet buttons
`Practise a different job` and `Print or save these tips`.

`Print or save these tips` calls `window.print()`. Add a print stylesheet that
hides the action bar, the ChatGPT line and the progress row, opens every
`<details>`, and sets the ground to white.

---

## 10. Every state

Every state the interface can be in, with what shows and what the person can do
next. Copy strings are in Section 11 and referenced by key.

| # | State | Trigger | Treatment | Copy key | Blocks? |
|---|---|---|---|---|---|
| 1 | Nothing pasted | Start screen, empty box | Primary disabled, sentence above | `err.empty_posting` | Yes |
| 2 | Near the limit | Job advert 19,000 to 20,000 | `--almost` strip under the box | `warn.near_limit` | No |
| 3 | Over the limit | Job advert over 20,000 | `--stop` strip above the button, focus moves to it | `err.over_limit` | Yes |
| 4 | Scanned PDF | Extraction returns under 40 characters | `--stop` strip under the file chooser | `err.pdf_scan` | Yes, for the file |
| 5 | Locked PDF | pdf.js throws `PasswordException` | `--stop` strip under the file chooser | `err.pdf_locked` | Yes, for the file |
| 6 | Wrong file type | Extension not accepted | `--stop` strip under the file chooser | `err.file_type` | Yes, for the file |
| 7 | CV too long | Extracted text over 20,000 | `--almost` strip, first 20,000 kept | `warn.cv_long` | No |
| 8 | Not a CV | `fitMatch.confidence` is `low` | `--note` strip on the practice screen | `warn.not_cv` | No |
| 9 | Thin advert | `brief.confidence` is `low` | `--note` strip under the sub-line | `warn.thin_advert` | No |
| 10 | Service unreachable | Brief call fails after retries | Stay on Start, `--stop` strip, plus the example button | `err.service_down` | Yes |
| 11 | Worked example | `See the example` pressed | Load `example.json`, go to Your practice, `--note` strip at the top | `notice.example` | No |
| 12 | Scoring failed | Score call fails after retries | `--almost` strip under the answer box, answer kept | `err.score_failed` | No |
| 13 | Empty answer | `Next question` with an empty box | `--stop` strip above the button | `err.empty_answer` | Yes |
| 14 | Answer too long | Answer over 6,000 characters | `--stop` strip above the button | `err.answer_long` | Yes |
| 15 | No ChatGPT | `document.modelContext` absent | ChatGPT line, resting | `chat.none` | No |
| 16 | ChatGPT ready | Present, no call yet | ChatGPT line, resting | `chat.ready` | No |
| 17 | ChatGPT driving | A call has arrived | ChatGPT line, resting | `chat.active` | No |
| 18 | ChatGPT just acted | Within 4s of a call | ChatGPT line, flash | `chat.flash` | No |
| 19 | Waiting for an answer | Practice, no answer yet, ChatGPT connected | `t-small` hint under the box | `hint.waiting` | No |
| 20 | Reading the answer | Score call in flight | Primary button busy, spinner | `busy.scoring` | Yes, briefly |
| 21 | Building questions | Brief call in flight | Screen 2 | `busy.brief` | Yes |
| 22 | Nothing answered | Tips screen with zero scores | Empty block, no result panel | `empty.no_answers` | No |
| 23 | Result held back | `verdict.capped` is true | Result panel, coverage line | `result.capped` | No |

Notes on the failure paths.

- **State 10 is the demo insurance.** When the service is down, the example
  button must be prominent, not hidden. The worked example in `example.json` is
  fully explorable. State 11 makes clear it is an example so nobody mistakes it
  for their own result.
- **States 4, 5, 6 and 7 never block the whole product.** The CV is optional.
  A failed CV leaves the person exactly where they were, with the job advert
  still ready to submit. The copy says so.
- **State 12 keeps the answer.** Losing what somebody typed is the worst thing
  this product can do.
- **State 15 is not an error.** No warning colour, no icon, no apology.

---

## 11. Copy deck

Every user-visible string. Build this as one exported object,
`src/lib/copy.js`, and import it everywhere. No string is written inline in a
component.

Placeholders in braces are substituted at render time.

### 11.1 Product and shared

| Key | String |
|---|---|
| `app.name` | Dry Run |
| `app.promise` | Practise your job interview |
| `app.sub` | Tell us what job you want. ChatGPT will ask you questions out loud and help you prepare. |
| `app.sub_typing` | Answer the questions this employer is likely to ask. Then get simple tips for next time. |
| `app.trust` | Works with ChatGPT |
| `step.1` | Tell us the job |
| `step.2` | Answer out loud |
| `step.3` | Get simple tips for next time |

Use `app.sub` when `document.modelContext` exists. Use `app.sub_typing`
otherwise. See Section 15.3 for why.

### 11.2 Buttons

| Key | String |
|---|---|
| `btn.start` | Start practice |
| `btn.next` | Next question |
| `btn.tips` | Show my tips |
| `btn.again` | Try again |
| `btn.skip` | Skip this one |
| `btn.finish_early` | Finish and show my tips |
| `btn.different_job` | Practise a different job |
| `btn.print` | Print or save these tips |
| `btn.choose_file` | Choose a file |
| `btn.paste_cv` | Or paste your CV as text |
| `btn.remove_file` | Remove |
| `btn.see_example` | See the example |
| `btn.see_add` | See what to add |
| `btn.see_scores` | See the scores |
| `btn.see_numbers` | See the numbers |
| `btn.show_all` | Show all |
| `btn.back` | Back |

### 11.3 Start screen

| Key | String |
|---|---|
| `start.choice_advert` | I have a job advert |
| `start.choice_advert_hint` | Paste it and we will build your questions. |
| `start.choice_type` | Choose a job type |
| `start.choice_type_hint` | Pick the kind of work you are going for. |
| `start.choice_none` | I do not have an advert |
| `start.choice_none_hint` | Just tell us the job title and where you will work. |
| `start.advert_label` | Paste the job advert here. |
| `start.advert_placeholder` | Paste the job advert. The duties and the requirements are the useful parts. |
| `start.cv_label` | Add your CV if you have one. Optional. |
| `start.cv_hint` | You can practise without it. |
| `start.cv_paste_label` | Paste your CV here. |
| `start.privacy` | Your CV stays in this browser on this device. We read it only to build your questions. Nothing is stored on a server. |
| `start.type_question` | What kind of job are you applying for? |
| `start.type_warehouse` | Warehouse |
| `start.type_restaurant` | Restaurant or cafe |
| `start.type_shop` | Shop |
| `start.type_driving` | Delivery or driving |
| `start.type_care` | Care |
| `start.type_trades` | Technician or trades |
| `start.type_office` | Office |
| `start.type_other` | Something else |
| `start.title_label` | What is the job called? |
| `start.title_placeholder` | For example, warehouse picker |
| `start.where_label` | Where will you work? |
| `start.where_placeholder` | For example, a supermarket depot in Leeds |
| `start.done_before_label` | Have you done this kind of work before? |
| `start.done_before_yes` | Yes |
| `start.done_before_some` | A little |
| `start.done_before_no` | No |
| `start.hint_paste_first` | Paste the job advert to start. |
| `start.hint_type_first` | Tell us the job title to start. |

### 11.4 Your practice screen

| Key | String |
|---|---|
| `plan.title` | Your practice is ready |
| `plan.sub` | We read the job advert. Here are 8 questions they are likely to ask. |
| `plan.owns` | What this job is really about |
| `plan.study` | Worth reading before you go |
| `plan.angles` | They may go deeper on these |
| `plan.have` | You already have this |
| `plan.may_ask` | Things they may ask you about |
| `plan.questions` | Your 8 questions |
| `plan.quote_label` | From the job advert |
| `plan.remove_cv` | Remove my CV and start over |

### 11.5 Practice screen

| Key | String |
|---|---|
| `practice.progress` | Question {n} of 8 |
| `practice.answer_label` | Your answer |
| `practice.answer_placeholder` | Type your answer here, or say it out loud in ChatGPT. |
| `practice.answer_placeholder_typing` | Type your answer here. Write it how you would say it. |
| `practice.hint` | There is no time limit. Say it how you would say it in the room. |
| `hint.waiting` | Waiting for your answer. |
| `busy.scoring` | Reading your answer |
| `busy.brief` | Getting your questions ready. |
| `busy.brief_sub` | This takes about ten seconds. |

Use `practice.answer_placeholder` when `document.modelContext` exists. Use
`practice.answer_placeholder_typing` otherwise.

### 11.6 Feedback on one answer

| Key | String |
|---|---|
| `feedback.strong` | Strong answer |
| `feedback.almost` | Almost there |
| `feedback.add` | Try adding one example |
| `feedback.one_thing` | One thing to add: {missed} |
| `feedback.nothing_missing` | Nothing missing. Keep that one. |
| `feedback.what_to_add` | What to add |
| `feedback.good_answer` | A good answer could say |

### 11.7 Your tips screen

| Key | String |
|---|---|
| `tips.title` | Your tips for next time |
| `tips.question_n` | Question {n} |
| `tips.what_you_said` | What you said |
| `tips.skipped` | You skipped this one. Try it next time. |
| `result.ready` | You are ready |
| `result.ready_line` | You answered every question and your answers were strong. Go in and say them the same way. |
| `result.nearly` | Nearly ready |
| `result.nearly_line` | Your answers were good. Add one real example to each one and they will be strong. |
| `result.notyet` | Keep practising |
| `result.notyet_line` | There is more to add to your answers. Use the tips below and try again. |
| `result.capped` | Keep practising |
| `result.capped_line` | You answered {answered} of the 8 questions. Answer at least 6 and we can tell you how ready you are. |
| `result.capped_kind` | What you did answer was good. Keep going. |
| `result.answered` | You answered {answered} of 8 questions. |
| `result.average` | Your answers averaged {average} out of 5. |
| `axis.specificity` | Detail |
| `axis.evidence` | Proof |
| `axis.structure` | Clear order |
| `axis.relevance` | Fits the job |
| `empty.no_answers` | You have not answered any questions yet. |
| `empty.no_answers_action` | Start practice |

`result.capped_kind` shows only when `capped` is true and the average is 3 or
more. It keeps a capped result from reading as a failure when the content was
fine.

### 11.8 ChatGPT line

| Key | String |
|---|---|
| `chat.none` | You are typing your answers. That works just as well. |
| `chat.ready` | Ready for ChatGPT. Ask it to start your practice, or type your answers here. |
| `chat.active` | ChatGPT is running your practice. This page updates while you talk. |
| `chat.flash` | ChatGPT just updated this page. |

### 11.9 Errors, warnings and notices

| Key | String |
|---|---|
| `err.empty_posting` | Paste the job advert first. |
| `warn.near_limit` | You are close to the limit. Keep the duties and the requirements, and cut the rest. |
| `err.over_limit` | That is longer than we can read. Paste just the job title, the duties, and the requirements. |
| `err.pdf_scan` | We could not find any words in that file. It looks like a photo or a scan. Copy your CV text and paste it instead. |
| `err.pdf_locked` | That file is locked with a password. Upload a copy without the password, or paste the text instead. |
| `err.file_type` | We can read PDF, TXT and MD files. For anything else, copy the text and paste it. |
| `warn.cv_long` | Your CV was long, so we used the first part of it. That is usually enough. |
| `warn.not_cv` | That file did not read like a CV, so we skipped that part. Your questions still come from the job advert. |
| `warn.thin_advert` | The advert was short, so these questions are more general. They are still worth practising. |
| `err.service_down` | We cannot build new questions right now. Try again in a minute. |
| `err.service_down_action` | Or look at a full worked example while you wait. |
| `notice.example` | This is a worked example for a technical writing job. It is here so you can see how Dry Run works. |
| `err.score_failed` | We could not read that answer. Your answer is saved. Try again, or move on. |
| `err.empty_answer` | Type your answer first, or skip this question. |
| `err.answer_long` | That answer is very long. Shorten it to the part you would actually say out loud. |
| `err.unknown` | Something went wrong. Try again in a minute. |

Every one of these is a complete sentence in plain words. None of them names a
file format in lower case with a dot, a status code, a function, or a limit
figure. `err.file_type` names formats in capitals because that is how a file
picker shows them.

### 11.10 Reading level

Checked against the primary strings. `app.promise`, `app.sub_typing`,
`step.1` to `step.3`, `btn.*`, `chat.*` and `result.*` all sit at or below
grade 6. The longest sentence in the deck is 24 words. No sentence uses a
semicolon or a dash.

Three strings sit slightly higher because they name a real thing that has no
simpler name: `start.privacy` mentions a browser, `notice.example` mentions a
technical writing job, and `err.pdf_locked` mentions a password. All three are
unavoidable and all three are still short and active.

---

## 12. Motion

Motion is minimal and it earns its place in exactly three moments. Everything
else is instant.

| Moment | Motion | Duration | Reduced motion |
|---|---|---|---|
| Question changes | Card content cross-fades | 160ms ease-out | Instant swap |
| Feedback note appears | Fade in and rise 4px | 200ms ease-out | Instant appear |
| ChatGPT flash | Row background fades from `--strong-wash` to transparent | 1200ms linear | No fade. Text changes and reverts at 4s |
| Score bar fills | Width transition | 300ms ease-out | Instant width |
| Loading spinner | Rotate 360deg | 1.2s linear, infinite | Static circle, text only |
| Button press | `translateY(1px)` | 80ms | None |

There is no count-up on any number. Numbers are secondary detail now, and
animating them draws the eye to the wrong thing.

There is no page transition between screens. The screen changes and the
document scrolls to the top.

Global reduced-motion block, required:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

The spinner needs its own handling, because killing the animation leaves a
frozen arc that looks broken. Under reduced motion, render a plain 32px circle
with a 3px `--edge-firm` border and no `--strong` arc.

---

## 13. Accessibility checklist

Run this before calling T19 done.

- [ ] Every text pair on the screen appears in the table in Section 5.1.
- [ ] Every interactive element measures at least 48px on its shorter side.
- [ ] At least 8px separates adjacent interactive elements.
- [ ] Every control shows the focus ring from Section 5.3 on keyboard focus.
- [ ] Tab order matches visual order on every screen.
- [ ] Every text box has a real `<label>`, connected by `for` and `id`.
- [ ] No placeholder is the only label.
- [ ] The ChatGPT line is `role="status" aria-live="polite"`.
- [ ] Blocking messages are `role="alert"` and take focus when they appear.
- [ ] The progress row is `aria-hidden` and its label carries the meaning.
- [ ] No information is carried by colour alone.
- [ ] Page zooms to 200% at 360px with no horizontal scroll.
- [ ] `prefers-reduced-motion: reduce` stops every animation, and the spinner
      is replaced rather than frozen.
- [ ] `<html lang="en">` is set.
- [ ] The document has one `<h1>` per screen.
- [ ] Every `<details>` summary is at least 44px high.
- [ ] The disabled primary button has a sentence above it saying what to do.

---

## 14. Implementation order for T13 to T20

Build in this order. Each step is finished and looks right before the next
starts. Every step renders against `src/lib/example.json`, so none of them need
the server.

| Order | Task | Build | Done when |
|---|---|---|---|
| 1 | **T13** | `src/app.css`. Section 5 tokens, `color-scheme: light`, the two font links, the Section 6 scale as classes, the Section 7 frame and spacing, the focus rule, the reduced-motion block. | A blank page renders paper white with ink text in Lexend and Source Sans 3 |
| 2 | **T14** | Question card, 8.7, and the source quote, 3.5. Plus card, 8.1, and button, 8.2. | All 8 fixture questions render with their quotes at 360px and 900px |
| 3 | **T16** | Start screen, 9.1. Text box 8.3, file chooser 8.4, ChatGPT line 8.5, message strip 8.13. `I have a job advert` route only. | Typing in the box writes `session.posting`, and setting `session.posting` from the console fills the box |
| 4 | **T17** | Your practice screen, 9.3. List block 8.9, fit item 8.10. | The whole fixture renders with no placeholder text left |
| 5 | **T15** | Practice screen, 9.4. Progress row 8.6, feedback note 8.8. | Q1 to Q8 advance, the three scored fixture answers show their feedback |
| 6 | **T18** | Your tips screen, 9.5. Result panel 8.11, score row 8.12, print stylesheet. | All four result cases in 14.1 render correctly |
| 7 | **T19** | Every state in Section 10, wired to the copy deck in Section 11. Build `src/lib/copy.js` first and replace every inline string. | Every row of the Section 10 table is reachable and shows its exact string |
| 8 | **T20** | Motion, Section 12. | Every row of the Section 12 table behaves, and reduced motion is honoured |

**Cut first if the night runs short.** The `Choose a job type` and
`I do not have an advert` routes on the start screen. Ship the advert route and
`See the example`. See Section 15.2.

### 14.1 Test data the fixture does not give you

`example.json` has 3 scored answers, so `buildVerdict()` always returns
`{ band: 'not yet', capped: true }` against it. The other three results are
never reachable from the fixture. Use these literal objects to check the
result panel.

```js
// Renders "You are ready"
{ band: 'ready',    average: 4.3, answered: 8, total: 8, capped: false }
// Renders "Nearly ready"
{ band: 'nearly',   average: 3.4, answered: 8, total: 8, capped: false }
// Renders "Keep practising", content reason
{ band: 'not yet',  average: 2.1, answered: 8, total: 8, capped: false }
// Renders "Keep practising", coverage reason. This is what the fixture gives.
{ band: 'not yet',  average: 3.75, answered: 3, total: 8, capped: true }
```

The fourth case also triggers `result.capped_kind`, because the average is 3
or more.

---

## 15. Problems in the spec, stated honestly

### 15.1 `task.md` contradicts `project.md`

Three task descriptions still specify the old product.

- **T13** says "`color-scheme: dark`, the three faces, hard borders, zero
  radius". All four are now wrong. This document replaces them.
- **T15** says "answer log, agent status strip, rubric quadrants, running
  average". The answer log and the running average are cut, because the
  practice screen shows one question at a time. The status strip survives with
  new copy, per 3.3. The quadrants move to the tips screen as the score row.
- **T16** says "character counter". Cut, per 3.6.

`task.md` should be updated to match. Nothing in the dependency graph changes.

### 15.2 Two of the three start routes cannot ship for free

The spec names three start choices. Only `I have a job advert` is wired to
anything today. The other two are buildable without touching
`netlify/functions/analyze.mts`, by composing a short posting text on the
client from what the person picks and typing, then calling the same
`setPosting`. That keeps the `sourceQuote` invariant intact, because the
quotes will be verbatim in the text we composed.

It is real extra scope. My recommendation is to ship the advert route plus the
worked example for the contest, and to add the other two after 3 September. If
they are cut, remove the two choice cards entirely. Never ship a visible
choice that does nothing.

### 15.3 The opening promise is not true on a phone

The spec's promise is "ChatGPT will ask you questions out loud and help you
prepare." WebMCP site tools exist only in the ChatGPT desktop app. Not web, not
mobile. So on the device the spec most wants to reach, that sentence is false.

I will not paper over it. The interface shows `app.sub` only when
`document.modelContext` exists, and `app.sub_typing` otherwise. The typed path
is a complete product: the same eight questions, the same feedback, the same
tips. It is never called a fallback and it never carries a warning colour.

**What we cannot honestly claim by 3 September:** the spoken, ChatGPT-driven
experience on a phone. Nobody can, because the platform does not offer it. The
demo video should show the desktop path, and the description should say plainly
that the typed path works everywhere.

### 15.4 `sourceQuote` blocks the no-advert route

`validateBriefResponse` requires a non-empty `sourceQuote` on all eight
questions, and the server checks it appears verbatim in the posting. On the
`I do not have an advert` route there is no posting. The client-side composer
in 15.2 solves it, but only because it fabricates a posting text. If that route
is ever built server-side instead, `shapes.js` will need `sourceQuote` to
accept an empty string, and the interface will need to render nothing when it
is empty. The interface already handles the empty case, per 3.5.

### 15.5 The fixture can only ever show one result

Covered in 14.1. Not a spec bug, but it will read as one to an implementer who
never sees `You are ready` and assumes they broke it.

### 15.6 There is no constant for the answer length

`MAX_SCORE_INPUT_CHARS` is 12,000 across the answer, the question and the
brief context. The brief can reach roughly 4,300 characters at its schema
bounds, the question 360, and the quote 600. That leaves about 6,700 for the
answer. `shapes.js` has no constant for it, so the interface has no number to
enforce.

This document sets a UI cap of **6,000 characters** on the answer box, which
sits safely inside the budget. Someone should add
`export const MAX_ANSWER_CHARS = 6_000;` to `shapes.js` so the function and the
interface agree. I have not added it, because `shapes.js` is a shared contract
and changing it belongs with T07, not with a design pass.

### 15.7 What I did not change

**I did not edit `src/lib/shapes.js`.** The band values `ready`, `nearly` and
`not yet` stay exactly as they are. The kind names live in a display map in the
interface, per 3.4. Changing the contract to get nicer words would force edits
in the function, the state, the fixture and the tests, for a string the user
never sees anyway.
