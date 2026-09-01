# T16 review — round 2

Date: 2 September 2026 (design.md Revision 2, after round-1 remediation)
Reviewer: ReviewT16R2 (adversarial, read-only)
Scope: verify the round-1 remediation — P2-1 (9.1 vertical rhythm) and P3-1
(flash re-trigger) — in `src/lib/ChatGPTLine.svelte`, `src/lib/Start.svelte`,
`src/lib/session.svelte.js`, `src/lib/webmcp.js`; re-run the round-1 passing
checks for regressions; confirm scope; `npm run build` + browser verification
at 360px and 900px against `vite preview`.

**Verdict: APPROVE — 0 P1, 0 P2, 0 P3.**

Both round-1 findings are fixed correctly, completely, and with no regressions.
51 browser checks (28 core + 23 regression) pass against the rebuilt `dist`,
with zero page errors; `npm run build` passes with the same expected pdfjs
chunk-size warning as round 1. The two tracked remediation diffs are exactly
as described (2 additive lines in `session.svelte.js`, 1 in `webmcp.js`).

## Findings by severity

None.

## Check 1 — P2 fix (9.1 vertical rhythm) — PASS

- `src/lib/ChatGPTLine.svelte:55` — `.chatline` has `margin-top: 24px;` with
  the `/* 9.1 item 5 */` comment; `min-height: 48px` (line 54) and
  `padding: 12px 0` (line 56) are untouched — the margin is additive.
- `src/lib/Start.svelte:172` — `.choice` margin is `16px 0 0 0` with the
  `/* 9.1 item 6 */` comment; `.steps` margin stays `24px 0 0 0` (line 141).
- Measured at 360×800 (headless Chrome for Testing 151.0.7922.34 against the
  rebuilt `dist`): `steps → chatline` gap **24px**; `chatline → choice` gap
  **16px**; computed `margin-top` 24px / 16px; `min-height` 48px;
  `padding-block` 12px/12px. Re-measured at 900×1200: gaps 24/16 again, the
  640px column centred in its page box (colLeft 123 = pageLeft 8 +
  (869−640)/2), actionbar `position: static` above 768px.

## Check 2 — P3 fix (per-call flash) — PASS

- `src/lib/session.svelte.js:23-24` — additive `lastCallAt: null` field with
  the review's comment verbatim (`T25-T30 formalize`).
- `src/lib/webmcp.js:41` — `set_posting`'s `execute` sets
  `session.lastCallAt = Date.now()` directly after `session.agentSeen = true;`
  (line 40). **Invariant confirmed**: a grep of `src/` shows these two lines
  are the *only* writers of either field; no path sets one without the other,
  so the dot's `--strong` keyed on `called` is behaviorally identical to the
  old `agentSeen` key.
- `src/lib/ChatGPTLine.svelte:13-26` — the flash `$effect` reads
  `session.lastCallAt`: `null` → resting (`flashing = false`, no timer); a
  change → `flashing = true`, previous timer cleared, 4000ms revert timer,
  teardown `clearTimeout` on unmount. Because `Date.now()` always differs, a
  second call re-fires — the `true→true` reactive no-op that P3-1 described is
  gone. `:32-41` derives `called = session.lastCallAt != null` and the text
  from it; `:45` keys the dot on `called`. Resting logic preserved exactly:
  no context → `chat.none`; context + no call → `chat.ready`; call seen →
  `chat.active`; within 4s → `chat.flash` (flash text + `--strong-wash`).
- Browser-verified at 360px:
  - **Real execute path**: with a `document.modelContext` stub (init script),
    the genuinely registered `set_posting.execute` was invoked — it sets
    `agentSeen` + `lastCallAt` (both, one number), stores the posting, and
    flips `phase` to `ready` (Start unmounts; expected flow, see Observations).
  - **First call** (the exact two writes `execute` makes, `agentSeen`
    false→true and `lastCallAt` null→ts): flash text "ChatGPT just updated
    this page.", `--strong-wash` background, `--strong` dot; at ~4.2s reverts
    to `chat.active` on a transparent background, dot stays `--strong`.
  - **Second call ~1s later**: re-flashes (the fix's point), reverts ~4s after
    the second write.
  - **Re-arm mid-window**: second write 1s after the first keeps the flash
    running; reverts ~4s after the second write.
  - **Unmount during an active flash**: no page errors — teardown clean.
  - **No modelContext**: `chat.none`, dot `--edge-firm`, no flash class.
    With context and no call: `chat.ready`, dot `--edge-firm`.
- 28/28 core checks pass.

## Check 3 — No regressions (round-1 passing checks) — PASS

- **Display parity (R1)**: typing in the advert box fills `session.posting`;
  `session.posting = …` from the console fills the box; same both directions
  for `session.resume` via the CV paste box.
- **3.6 states**: empty → primary `aria-disabled="true"` but not natively
  disabled (still focusable, 8.2) + exactly one `err.empty_posting` sentence;
  19,500 → exactly one quiet near line ("You are close to the limit…", no
  numbers) in the `--almost` colour, button enabled; exactly 20,000 → still
  near + enabled; 20,001 → `--stop` strip `role="alert"`, near line gone,
  button disabled.
- **MessageStrip focus contract (8.13)**: the over-limit strip receives focus
  on appearance and keeps it across re-renders of the same mount;
  `border-left` is `--stop`.
- **File chooser (8.4)**: accept list exactly
  `.pdf,.txt,.md,text/plain,text/markdown,application/pdf`; a `.txt` upload
  fills `session.resume`; file-name row with tick shown; `Remove` clears.
- **Deck**: `copy.js` is untouched by the remediation; all four `chat.*`
  strings (11.8) verbatim; no new visible copy introduced anywhere (the
  ChatGPTLine/Start changes are CSS/logic/comment only). Banned-copy status
  unchanged from round 1 (clean except spec-verbatim `see_scores`, which T16
  does not render).
- **Build**: `npm run build` passes — 136 modules, `index-*.js` 502.60 kB min
  (156.85 kB gzip), `pdf.worker.min-*.mjs` 1.27 MB emitted separately
  same-origin; the >500 kB chunk warning is the round-1-adjudicated pdfjs
  static import, unchanged.

## Check 4 — Scope — PASS

`git status` is exactly: the four remediated T16 files (`session.svelte.js` +
`webmcp.js` modified — diffs 2 lines and 1 line respectively;
`ChatGPTLine.svelte` + `Start.svelte` untracked new), the two record files,
T16's original uncommitted work (`App.svelte`, `main.js`, `copy.js`,
`fixture.js`, `TextArea.svelte`, `MessageStrip.svelte`, `FileChooser.svelte`),
and the parallel session's files (`netlify/functions/analyze.mts`,
`dev-diary/project.md`, `test/analyze-contract.test.mjs` — modified by that
session throughout this review; `src/lib/shapes.js` also appeared mid-review
from the same session). Nothing in the T16 diff touches the three off-limits
files, and this review wrote nothing into the repo except this record.

## Observations (recorded, not findings)

- **`agentSeen` is now write-only**: after the dot/text were keyed on
  `called`, nothing in `src/` reads `agentSeen`. The remediation record
  documents keeping it as the one-way latch for later tasks ("T25-T30
  formalize"), and the field comment instructs future tools to write both
  fields together. Deliberate, documented, zero behavior impact today — noted,
  not filed.
- **Flash visibility on Start**: a *successful* real `set_posting` call flips
  `phase` to `ready` in the same tick, so Start (the flash element's home)
  unmounts before the flash can render. The flash shows on Start for calls
  that don't flip phase (the console-driven demo writes — the round-1
  verification method — or the execute error path), and for later calls once a
  later screen renders the ChatGPT line. This is the pre-existing app flow
  (`setPosting` always flipped phase), not introduced by the remediation.
- **Test-method note**: the browser ran as a hub-managed daemon because the
  tool sandbox's seccomp kills newly spawned Chrome (crashpad `setsockopt` /
  sandbox-host `shutdown` EPERM → SIGTRAP); the binary is the same Chrome for
  Testing 151.0.7922.34 round 1 used. `npm run dev` was not used (Netlify
  deno-emulator crash — known environment noise).

## Could not verify

- The 1200ms flash fade-out — intentionally absent, T20 TODO, unchanged.
- The PDF upload path (worker extraction, `err.pdf_locked` on
  `PasswordException`) — round-1 verified and FileChooser is untouched by the
  remediation; only the `.txt` path was re-exercised this round. The
  `pdf.worker.min-*.mjs` asset is still emitted same-origin in the build.
- A real ChatGPT desktop agent invoking the tool — simulated with the
  `modelContext` stub; the registered `execute` itself was invoked for real.
