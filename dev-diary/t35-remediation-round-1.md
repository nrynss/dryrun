# T35 remediation, round 1

Date: 2026-09-02
Source: `dev-diary/t35-review-round-1.md` (round-1 verdict: NOT APPROVED, P2 x 1,
P3 x 2)
Scope: `src/lib/Plan.svelte` and one item of `dev-diary/design.md` section 9.3.
No test file needed a change. P3-1 closed with no code change and no copy
change, per the reviewer's ruling. No commit was made.

## P2-1 The Plan clear control now sits above the primary per 7.3

- **Review said**: the patch appended the quiet button after the primary inside
  a plain block `div`, so it rendered below the primary at natural width with a
  0px gap. Measured on the production build at 360x800 and 1280x900, both Plan
  variants. Design 7.3 allows a secondary above the primary, or two full-width
  buttons stacked with an 8px gap. `Practice.svelte:195-205` implements 7.3
  correctly with a `.quiets` column, and the review directed the button into
  that exact pattern.
- **Changed**: `src/lib/Plan.svelte`. The action bar now mirrors Practice's
  structure, a `.quiets` flex column holding the quiet button above the
  primary:

  ```svelte
    <div class="actionbar">
      <div class="actionbar-inner">
        <div class="quiets">
          <Button variant="quiet" style="width: 100%" onclick={removeCv}>{copy.plan.remove_cv}</Button>
        </div>
        <Button onclick={startPractice}>{copy.btn.start}</Button>
      </div>
    </div>
  ```

  ```css
    /* 7.3: the secondary sits above the primary, stacked with an 8px gap. */
    .quiets {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
  ```

  The `.quiets` rule copies Practice's idiom including its `margin-bottom:
  8px`, which is what sets the 8px between the quiet column and the primary.
  The binding decision stands: one unconditional button calling `startOver()`
  with the deck string `copy.plan.remove_cv`, "Remove my CV and start over".
  No conditional rendering and no rewording were made.
- **Verified live**: `npm run build` produced `dist/`. A static server on
  loopback served it. Headless Chrome was driven over the DevTools protocol.
  The Plan screen was reached by writing a schema-valid version-3 record into
  localStorage and reloading, so the app's own `restoreSession` restored it.
  Both variants were driven, fitMatch present and absent.

  | Screen state | 360 x 800 | 1280 x 900 |
  |---|---|---|
  | Plan, fitMatch present | quiet above primary, 312px and 312px, gap 8px, overflow 0 | quiet above primary, 640px and 640px, gap 8px, overflow 0 |
  | Plan, fitMatch absent | quiet above primary, 312px and 312px, gap 8px, overflow 0 | quiet above primary, 640px and 640px, gap 8px, overflow 0 |

  Detail at 360x800 with fitMatch present: the quiet is 312x48 ending at y728
  and the primary is 312x52 starting at y736. At 1280x900 both are 640 wide
  under a 640px inner. The DOM order inside `.actionbar-inner` is `div.quiets`
  then the primary button at every size, and both buttons equal the inner
  width, so both are full width. `documentElement.scrollWidth` equals
  `clientWidth` at every measured size.

  Section 13 zoom gate on the Plan screen, both variants:

  | Screen state | 180 x 600 | 360 x 800 |
  |---|---|---|
  | Plan, fitMatch absent | 180 / 180, rightmost 172, overflow 0 | 360 / 360, rightmost 352, overflow 0 |
  | Plan, fitMatch present | 180 / 180, rightmost 172, overflow 0 | 360 / 360, rightmost 352, overflow 0 |

  Four gate measurements, zero overflow. The review's absolute values sit 15px
  lower at the same sizes, consistent with a 15px scrollbar reserved in its
  viewport. The gate result is the same either way.

## P3-1 The unconditional clear control on a no-CV plan stays as decided

- **Review said**: the button renders unconditionally, so a plan built without
  a CV offers "Remove my CV and start over" although there is no CV to remove.
  The ruling: "this is a copy coherence note, not a defect against the binding
  decision. The decision fixes one unconditional button implemented as a call
  to startOver(), and the acceptance names the exact deck string, so no
  conditional rendering and no rewording are authorised inside this task." The
  reviewer recorded it for a future copy pass to weigh a state-neutral string.
- **Changed**: nothing. No code change and no copy change was made. The button
  stays one unconditional control calling `startOver()` with the exact deck
  string, in both Plan variants.
- **Verified**: the ruling itself is the closure, quoted above. Its live
  evidence stands as recorded in the review: the action stays truthful in both
  states, because `startOver()` clears everything and lands on Start either
  way.

## P3-2 design 9.3 item 9 now names the quiet secondary

- **Review said**: section 9.3 item 9 still read "Action bar with `Start
  practice`" after the deck row landed in section 11.4. The design doc
  promises that an implementer never needs to invent a placement, and the
  stale line was what let the P2-1 arrangement through. The review directed a
  minimal edit naming the quiet secondary above the primary per 7.3.
- **Changed**: `dev-diary/design.md` 9.3 item 9 now reads:

  > 9. Action bar. Primary `Start practice`. Above it, a quiet secondary
  >    `Remove my CV and start over`, stacked with an 8px gap per 7.3.

  Minimal edit. The surrounding items, the desktop paragraph and the 11.4 deck
  row are untouched. The Start screen's 9.1 item 9 keeps its one-button
  wording, because that screen has no secondary.
- **Verified**: the item now names the one arrangement 7.3 allows for this
  screen, which is the structure `Plan.svelte` renders and the live
  measurements under P2-1 confirm at both viewports and both variants.

## Testing

- `npm test`: 65 tests, 65 pass, 0 fail, run after the restructure. No
  existing test asserts action-bar DOM order or geometry. The only Plan
  action-bar assertion in the suite is the deck string at
  `test/session-capabilities.test.mjs:1280`, which passes unchanged against
  the new markup. No test was added, because the restructure broke no
  untested observable.
- `npm run build`: passed, with the pre-existing chunk-size advisory only
  (541.12 kB).

## Disputed findings

None. All three findings were accepted as measured.

## Copy deck

No new user-visible string. `copy.js` is untouched. `copy.plan.remove_cv`
keeps "Remove my CV and start over", already byte exact in design 11.4 per the
review.
