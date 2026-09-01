# T16 remediation round 1

Date: 2026-09-02

**Closure: 0 P1, 0 P2, 0 P3.** Round-1 review filed one P2 (9.1 vertical
rhythm) and one P3 (flash re-trigger); both fixed and verified in a real
browser against the rebuilt `dist`.

## P2-1 — Start screen 9.1: ChatGPT line 24px gap missing, choice card 24px instead of 16px

- **What the review said**: the gap in 9.1 sits above each item ("The ChatGPT
  line. 24px gap." then "The start choice cards. 16px gap."). The implementer
  set 24px above the step strip (correct) but nothing above `.chatline`
  (measured 0px) and 24px above `.choice` (needs 16px). The line was visually
  glued to the last step row.
- **What changed**:
  - `src/lib/ChatGPTLine.svelte:55` — `.chatline` gains
    `margin-top: 24px; /* 9.1 item 5: 24px gap above the line */`. The
    48px min-height / 12px vertical padding contract is untouched — the
    margin is additive, so the line's own box is unchanged.
  - `src/lib/Start.svelte:172` — `.choice` margin changed
    `24px 0 0 0` → `16px 0 0 0` (`/* 9.1 item 6: 16px gap above the cards */`).
- **How verified**: headless Chromium against `npm run build` output served by
  `vite preview`, viewport 360×800:
  `steps → chatline` measured gap **24px**; `chatline → choice` measured gap
  **16px**; computed `margin-top` 24px / 16px; `min-height` 48px and
  `padding-block` 12px confirmed unchanged.

## P3-1 — The 4s flash fires only on the first tool call; later calls cannot re-trigger it

- **What the review said**: the flash `$effect` was keyed on
  `session.agentSeen`, a one-way latch. In Svelte 5 a `true → true` write is a
  reactive no-op, so a second tool call never re-runs the effect and
  `flashing` never re-arms. Design 3.3 state 18 requires "Flash, 4 seconds
  after any call" — every call.
- **What changed** (the review's specified signal, verbatim shape):
  - `src/lib/session.svelte.js:23-24` — new additive per-call field on
    `session`: `lastCallAt: null` with the comment
    `/** @type {number|null} Millis of the most recent tool call. Drives the ChatGPT-line flash (design 3.3). T25-T30 formalize. */`.
  - `src/lib/webmcp.js:41` — `set_posting`'s `execute` sets
    `session.lastCallAt = Date.now();` alongside the existing
    `session.agentSeen = true;`.
  - `src/lib/ChatGPTLine.svelte:13-26` — the flash `$effect` now reads
    `session.lastCallAt` (null → resting, no flash; a change → `flashing =
    true`, previous timer cleared, 4000ms revert timer, teardown clears the
    timer on unmount — the existing pattern kept). `:28-41` — a `called`
    derived (`session.lastCallAt != null`) replaces `agentSeen` in the text
    derivation; `:45` — the dot's `--strong` state also keys off `called`, so
    the whole line speaks with one per-call signal. Resting logic preserved
    exactly: no context → `chat.none`; context + no call → `chat.ready`;
    call seen → `chat.active`; within 4s of a call → `chat.flash` (flash text
    + `--strong-wash` background). Copy and styling otherwise untouched.
- **How verified**: headless Chromium against the rebuilt `dist` at 360px,
  driving `window.session` from the console:
  - First-ever call path (`agentSeen` false→true with `lastCallAt` set):
    flash text "ChatGPT just updated this page." + `--strong-wash` background
    + `--strong` dot; reverted to `chat.active` on transparent background at
    +4.3s.
  - Re-trigger: `session.lastCallAt = Date.now()` twice ~1s apart — each
    assignment produced the flash; the second assignment while the 4s window
    was open re-armed the timer (still flashing at +500ms) and reverted to
    `chat.active` at +4.2s from the second assignment.
  - Resting states re-checked with a simulated `document.modelContext`
    (init script, as the round-1 review did): context + no call →
    `chat.ready`; first call with context → flash → `chat.active` at +4.1s.

## Why `lastCallAt` on `session` (vs alternatives)

- **A per-call monotone timestamp, not a counter**: `lastCallAt = Date.now()`
  is additive (a new write always differs, so Svelte 5 reactivity fires), is
  set where the call actually lands (`set_posting`'s `execute`), and encodes
  "a call just happened" without state-machine bookkeeping. A monotone
  counter (`callCount++`) would work identically for the flash but carries no
  timing information; a boolean per-call toggle would need a reset location
  and is easier to get wrong. The timestamp also lets later work (T20's fade,
  or "call N seconds ago" copy) read time directly.
- **On `session`, not module-local**: the line's effect lives in a component
  and must observe the write; `session` is the deep `$state` proxy the whole
  app already renders through, so the write re-renders with zero new wiring.
  Module-local state would need an explicit subscription channel.
- **Why `agentSeen` stays**: it remains the one-way latch ("an agent has
  called") used by the dot/status semantics and by the T16-era demo; the
  review's fix keeps setting it alongside `lastCallAt`. The flash is now
  driven solely by the per-call signal, so the latch's no-op-write limitation
  no longer gates it.

## Carry-forwards

- T25–T30 (the remaining WebMCP tools: `set_resume`, `get_brief`,
  `start_interview`, `submit_answer`, `get_verdict`) must each set
  `session.lastCallAt = Date.now()` in their `execute`, alongside
  `session.agentSeen = true`, so every call flashes per design 3.3 — the
  `session.svelte.js` field comment already says "T25-T30 formalize".
- T20's 1200ms fade (design Section 12) can read `session.lastCallAt` for the
  "when did the call land" timing.
