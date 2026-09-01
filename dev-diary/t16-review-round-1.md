# T16 review — round 1

Date: 2 September 2026 (design.md Revision 2)
Reviewer: ReviewT16 (adversarial, read-only)
Scope: `src/lib/copy.js`, `src/lib/fixture.js`, `src/lib/TextArea.svelte`,
`src/lib/ChatGPTLine.svelte`, `src/lib/MessageStrip.svelte`,
`src/lib/FileChooser.svelte`, `src/lib/Start.svelte` (new), `src/App.svelte`,
`src/main.js` (modified) — Start screen 9.1 (advert route only), copy deck
Section 11, Text box 8.3, File chooser 8.4, ChatGPT line 8.5 + 3.3, message
strip 8.13, fixture loader, phase switch.

**Verdict: REMEDIATE — 0 P1, 1 P2, 1 P3.**

The T16 surface is faithful to the spec and the judge view works end to end:
R1 parity both directions, all three 3.6 states (with correct boundary math
at 19,000 / 20,000 / 20,001), the ChatGPT line's four states and the 4s
flash, the message-strip focus contract, and the full file flow (txt, PDF
via the same-origin worker, scan, too-long, remove) all verified in a real
browser at 360px and 900px. Two findings: one P2 spacing deviation in the
9.1 vertical rhythm (the ChatGPT line sits flush against the step strip),
and one P3 flash re-trigger limitation. `npm run build` passes with the
expected pdfjs chunk-size warning. No commits made; nothing outside the
listed files touched.

## Findings by severity

### P2-1 — Start screen 9.1: the ChatGPT line has no 24px top gap, and the choice card sits 24px (not 16px) below it

- **File**: `src/lib/ChatGPTLine.svelte:47-55` (`.chatline` — `padding: 12px 0`, no top margin) and `src/lib/Start.svelte:172` (`.choice { … margin: 24px 0 0 0; … }`).
- **Spec vs code**: design 9.1 item 5 — "The ChatGPT line. 24px gap." (the gap above the line, matching the pattern of items 2–4, where each stated gap sits above that item); item 6 — "The start choice cards. 16px gap." The implementer set `margin: 24px 0 0 0` on `.steps` (the gap above the strip, correct), then nothing above `.chatline` (needs 24px) and 24px above `.choice` (needs 16px).
- **Measured** (headless Chromium 151 against `vite preview`, 360px): `steps → chatline` gap = 0px; `chatline → choice` gap = 24px. Design requires 24px and 16px respectively. The ChatGPT line — the demo's status element per 3.3 — is visually glued to the last step row.
- **Why it matters**: 9.1 is the pixel-exact binding spec ("Every component below is specified to the pixel"), and the review acceptance calls out "ChatGPTLine 24px gap" explicitly. The whole point of the line is to be seen when it flashes; crowding it against the step strip reads as an oversight on the screen a judge sees first.
- **Concrete fix**: give the line its 24px top gap and the card its 16px:

```css
/* ChatGPTLine.svelte — .chatline */
margin-top: 24px;   /* 9.1 item 5: 24px gap above the line */
```

```css
/* Start.svelte — .choice */
margin: 16px 0 0 0; /* 9.1 item 6: 16px gap above the cards */
```

### P3-1 — The 4s flash fires only on the first tool call; later calls cannot re-trigger it

- **File**: `src/lib/ChatGPTLine.svelte:13-24` (the `$effect` keyed on `session.agentSeen`).
- **Spec vs code**: 3.3 state 18 — "Flash, 4 seconds after any call." `session.agentSeen` (pre-existing in `session.svelte.js`) is a one-way latch; once it is `true`, a later `session.agentSeen = true` write is reactively a no-op in Svelte 5, so the effect never re-runs and `flashing` never re-arms. Today only `set_posting` exists (fires once from `idle`), so the demo path flashes correctly — verified. The defect surfaces as soon as a second tool call arrives: a corrected re-send of `set_posting`, or `submit_answer` in T30 — each should flash per the spec's "any call".
- **Why it matters**: the flash is what a judge watches ("The flash is what a judge sees"). T30 wires eight more calls; with this trigger each subsequent call silently stops producing the demo signal.
- **Concrete fix**: drive the flash off a per-call signal instead of the latch, e.g. add `session.lastCallAt = Date.now()` in each tool's `execute` (starting with `set_posting` in `src/lib/webmcp.js`) and key the effect on `session.lastCallAt`, clearing the previous timer on each change (the existing teardown pattern already handles that).

## Checklist

### 1. copy.js deck — PASS

Every string in 11.1–11.9 present verbatim, spot-checked across all key
groups (`app`, `step`, `btn`, `start`, `plan`, `practice`, `hint`, `busy`,
`feedback`, `tips`, `result`, `axis`, `empty`, `chat`, `err`, `warn`,
`notice`). Placeholders (`{n}`, `{missed}`, `{answered}`, `{average}`) stay
literal. `btn.show_less: 'Show less'` present with the documented T14
carry-forward header comment — sanctioned. `notice.example` grouped under
`notice` — acceptable, as noted in the brief. Banned-word scan (3.2) over
every visible string: clean except `btn.see_scores` ("See the scores"),
which is verbatim from the spec's own deck (11.2, and 9.5's disclosure
label); see Observations. No component inlines a string.

### 2. Display parity (R1) — PASS

Advert box binds `session.posting` directly (no local draft), CV paste box
binds `session.resume`, file extraction writes `session.resume` (verified:
uploading a .txt fills the paste box, and `Remove` clears it). Both
directions verified in the browser: typing fills `session.posting`, and
`session.posting = 'From console'` from the console fills the box; same for
`session.resume`. **Adjudication — `window.session` in `src/main.js`:
acceptable.** It is commented as a dev/judge affordance, and the T14
"done when" criterion requires console-set parity to be checkable against
the production build (the judge verifies via `npm run build` + `vite
preview`, which is a prod build — gating on `import.meta.env.DEV` would
break the acceptance check). The dynamic-import alternative adds code for
no user benefit. Mild smell (a global named `session`), worth revisiting
when the judge's need ends; not a finding.

### 3. 3.6 character-limit states — PASS

All three states and both boundaries verified in the browser:
- Empty → primary disabled with `aria-disabled="true"` but no native
  `disabled` (still focusable, 8.2) + `err.empty_posting` sentence above
  the button.
- 19,000–20,000 → exactly one quiet `--almost` line under the box
  (`warn.near_limit`), button enabled; verified at 19,500 and at exactly
  20,000; at 18,999 and below nothing renders.
- Over 20,000 → button disabled, `err.over_limit` `--stop` strip directly
  above the button, `role="alert"`, focus moves to the strip on
  appearance; the near line disappears.
- No numbers in any of the three messages (verified verbatim).
- Derived math correct: trim length, `NEAR_LIMIT_CHARS = 20_000 − 1_000`,
  `canStart = !empty && !overLimit`.
- `session.error` never rendered on this screen — correct.

### 4. ChatGPTLine (8.5 + 3.3) — PASS (P3-1 filed)

48px min-height, 12px vertical padding, flex gap 10px, `t-small`,
`--ink-quiet`; 10px dot `aria-hidden`, `--edge-firm` → `--strong` once
`agentSeen`; `<p role="status" aria-live="polite">`; all four states
selected by `hasModelContext()` and `agentSeen` (verified: no context →
`chat.none`; context → `chat.ready` + `app.sub`; `agentSeen` → flash text,
`--strong-wash` background, `--strong` dot; after 4.3s reverts to
`chat.active`, background transparent). Timers cleaned up on unmount via
the effect teardown. T20 TODO comment for the 1200ms fade present —
sanctioned. See P3-1 for the re-trigger limitation. Dot decorative only
(R3) — words carry the meaning.

### 5. MessageStrip (8.13) — PASS

Kinds `stop`/`almost`/`note` with wash background, 4px kind-colour
border-left, 8px radius, `12px 14px` padding, `t-body`; leading word in
the kind colour, rest `--ink`; `role` prop `alert`/`status`; alert strips
take focus on appearance with the focused-once guard (verified: the
over-limit strip receives focus and keeps it across re-renders of the same
mount).

### 6. TextArea (8.3) — PASS

`--card` bg, 1px `--edge-firm`, `--radius-input`, `12px 14px` padding,
`t-body`, `--ink`, min-height 160 (advert/CV) / 140 via prop (answer),
`resize: vertical`, `width: 100%`; focus = 2px `--strong` border replacing
the 1px (verified computed) + the global 5.3 ring; placeholder
`--ink-quiet`; real `<label>` above (8px gap, `t-h3`, `for`/`id` wired —
verified); CV label carries the word "Optional" (in the deck copy), no
asterisk anywhere; binds session state straight through (R1).

### 7. FileChooser (8.4) — PASS

Styled-label `Choose a file` with visually hidden input — keyboard access
verified: the input is focusable and Enter opens the picker (filechooser
event fired); the focus ring lands on the label via the sibling rule.
Accept list exactly `.pdf,.txt,.md,text/plain,text/markdown,application/pdf`.
Privacy note always visible in a `--band` panel, 12px padding, 8px radius,
`t-small` `--ink-quiet`, 12px below the control — verified, and it stays
visible after a successful read. After read: `t-small` `--ink` file-name
row, `aria-hidden` green tick (`--strong`), quiet `Remove` at 48px,
row `min-height: 48px`. Extracted text goes straight into `session.resume`
(R1). `.txt`/`.md` via `file.text()`. PDF via `pdfjs-dist` with the
same-origin worker: `new URL('pdfjs-dist/build/pdf.worker.min.mjs',
import.meta.url)` — verified in the built bundle (hashed asset
`assets/pdf.worker.min-*.mjs` emitted separately, referenced same-origin)
and exercised at runtime: a generated one-page PDF was extracted and its
words landed in `session.resume` with no worker errors. <40 trimmed chars →
`err.pdf_scan` `--stop` strip (verified for both .txt and .pdf).
`PasswordException` → `err.pdf_locked` — code-verified only (no encrypted
fixture available; see Could not verify). >20,000 → first 20,000 kept +
`warn.cv_long` `--almost` strip (verified, resume length exactly 20,000).
T23 TODO for the four-mode matrix present — sanctioned.

### 8. Start screen 9.1 — FAIL (P2-1)

Order verified at 360px in DOM and computed positions: wordmark (24px top
padding, `t-h2` `--strong`) → promise (16px, `t-display`) → sub (12px,
`t-body` `--ink-quiet`; `app.sub` with modelContext, `app.sub_typing`
without — verified both ways) → three-step strip (24px, 28px circles
`t-micro` `--on-fill` on `--strong`, step names `t-body` `--ink`, 12px row
gaps) → ChatGPT line → choice card (`<button>`, full width, `text-align:
left`, min-height 76px, `t-body-b` title + `t-small` hint, own panel
default-expanded, `aria-expanded` toggles; panel hides/shows correctly) →
panel (advert TextArea with label + placeholder; 24px to the CV block —
`t-h3` label, hint, FileChooser, quiet `Or paste your CV as text`
revealing a TextArea bound to `session.resume`) → `Works with ChatGPT`
(`t-micro`, `--ink-quiet`, 32px, centred) → actionbar with primary `Start
practice`. Desktop 900px: single column, 640px cap centred (left = 130px
at 900px), actionbar `position: static`; below 768px it is `sticky`.
One `<h1>` per screen. The FAIL is the vertical rhythm in P2-1: the
ChatGPT line's 24px gap is missing and the card's gap is 24px instead of
16px.

### 9. Start practice behaviour — PASS

Calls `loadExample()` (function-down path, T25/T32 comments present). No
fake delay, no loading screen. Verified: empty button click does nothing
(disabled guard holds, phase stays `idle`); with an advert typed, the
click sets `phase: 'ready'`, `questions` (8), `current: 0`, `error: null`,
`brief`, `fitMatch`, and attaches `modelAnswer` per question, and the T14
harness replaces Start. No netlify/api calls anywhere in the path.

### 10. App.svelte — PASS

Renders Start when `phase === 'idle' || phase === 'analysing'`, the T14
eight-question harness otherwise; the comment now says T17 replaces it.
No dead imports (example, QuestionCard, Start, session all used).

### 11. Scope — PASS

`git status` is exactly the 7 new `src/lib` files + `src/App.svelte` +
`src/main.js` modified + the pre-existing dirty
`netlify/functions/analyze.mts` (glanced at: server-side token/timeout
tuning, unrelated to T16, left untouched). No `package.json` /
`package-lock.json` changes; `pdfjs-dist ^6.3.289` was already declared.

### 12. Build + judge view — PASS (adjudications recorded)

`npm run build` passes (136 modules, 442ms). Output: main chunk
`index-*.js` 502.54 kB min (156.83 kB gzip), worker asset
`pdf.worker.min-*.mjs` 1.27 MB emitted separately. Chunk-size warning
expected and adjudicated: **acceptable.** The static `pdfjs-dist` import
puts ~500 kB in the entry chunk (the start screen is the landing screen and
the demo path necessarily opens the file chooser, so deferral saves little
for the judge; the 1.27 MB worker loads lazily only when a PDF is opened,
same-origin, verified). A dynamic `import()` of pdfjs on first file
selection is a legitimate optional P3 optimization for a later task — not
required here. Browser: full flow verified at 360px and 900px via headless
Chromium 151 against `vite preview` (see Findings for the one FAIL; the
five other red checks in the run were test-harness artifacts — trim
comparison, sticky-bar geometry vs DOM order, string-vs-boolean comparison
— all re-checked and passing). `npm run dev` was not used (it crashes on
the Netlify deno emulator — known environment noise).

## Observations (recorded, not findings)

- **"See the scores" contains the 3.2-banned word "score"**, but it is
  verbatim from the spec's own deck (11.2) and 9.5's disclosure label, and
  the spec asserts "Nothing in the copy deck in Section 11 breaks this
  list". The implementer correctly copied the deck verbatim; the string is
  not rendered by any T16 screen (it belongs to T18's tips screen). This is
  a spec-internal contradiction for a future design decision, not a code
  defect.
- **9.1 prose vs Section 10**: 9.1's empty-state prose ("Paste the job
  advert to start." = `hint_paste_first`) differs from Section 10's table
  (`err.empty_posting`). The implementer used `err.empty_posting` per
  Section 10 and this review's checklist — correct; spec prose drifts.
- **`window.session`** — adjudicated acceptable (see Check 2).
- **pdfjs chunk size** — adjudicated acceptable (see Check 12).
- **favicon 404** — the preview console logs one 404 for `/favicon.ico`;
  `index.html` (untouched by T16) has no icon link. Pre-existing, benign,
  not a finding.
- **Flash re-trigger** — see P3-1; only `set_posting` exists in T16 so the
  demo path is unaffected today.

## Could not verify

- `PasswordException` → `err.pdf_locked` (needs an encrypted PDF; the
  branch is code-verified: `err?.name === 'PasswordException'`).
- The 1200ms flash fade-out — intentionally absent, documented as a T20
  TODO; the 4s revert is instant as scoped.
- A real ChatGPT desktop `modelContext` — simulated with an init script
  (desktop-only platform, not available here); `hasModelContext()` itself
  is pre-existing and unchanged.
- A real second tool call re-flash — only `set_posting` exists; the
  limitation is proven by code analysis (P3-1).
