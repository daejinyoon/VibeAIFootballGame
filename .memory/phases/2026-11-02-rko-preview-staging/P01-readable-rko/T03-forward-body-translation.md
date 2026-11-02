# Task: T03 Forward Body Translation

## Status: done

## Goal
Make the RKO finisher's whole rendered body visibly travel forward over the target during the jump and slam, as shown in the supplied reference.

## Decision Summary
- Forward torso pitch alone is not enough; advance the rendered model root during the lunge and hold it over the target at impact.
- Preserve the local-only model transform, target's forward fall, five-second duration, and all other choreography.

## Implementation

### I01. Finisher lunge distance and trajectory regression
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: finisher branch of `getRkoPose` — modify.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO approach/lunge/impact/recovery root travel assertions — modify.
  - `game/src/components/MiiPlayerModel.jsx` :: ceremony `rootGlide` transform — read-only; it already applies forward translation to the rendered body rig.
  - `game/src/game/goalCelebrationPreview.js` :: RKO stage offsets — read-only; retain existing target-centered depth staging.
- Details
  - Keep the finisher approach value `rootGlide: 0.48` at the end of the initial head/neck hook phase.
  - During choreography time 1.25–1.75, compute `launch = clamp((time - 1.25) / 0.5, 0, 1)` and set `rootGlide: mix(0.48, 1.05, launch)`. This adds a visible forward root displacement during the airtime instead of holding near the target position.
  - At the impact hold from 1.75–2.1, keep `rootGlide: 1.05` so the finisher remains over the target. During recovery, blend that value back to zero with the existing `blendToVictory` path. Preserve the same positive forward translation for home and away via the model's local forward axis.
  - Do not change `player.x`, `player.y`, velocity, target positions, match step logic, camera framing, kick timing, or other ceremony motions.
  - Extend the RKO test: lunge `rootGlide` at choreography time 1.6 must be at least 0.3 greater than the end-of-approach value at 1.2; impact hold at 1.8 must equal 1.05; recovered finisher `rootGlide` at the five-second endpoint must return to zero. Keep assertions that target/finisher both pitch forward, not backward.

## Acceptance Criteria
- [x] The finisher's root moves forward noticeably during the airborne slam, then remains over the target at impact.
- [x] The forward travel is a rendered model transform and does not change game simulation/player coordinates.
- [x] Recovery returns the finisher to the assigned position; the kick-before-bend and forward/down target fall remain intact.
- [x] Other celebrations and five-second timing are unchanged.

## Validation
- `cd game; npm test -- src/game/goalCelebrationMotion.test.js` — RKO trajectory, contact, impact and recovery assertions pass.
- `cd game; npm run build` — shared preview and model code compile.

## Commit Message
```text
fix(game): drive the RKO finisher forward into impact

Plan: 2026-11-02-rko-preview-staging
Phase: P01-readable-rko
Task: T03-forward-body-translation

- Increase the finisher's forward body travel during the airborne slam
- Hold the model over the target and reset its transform during recovery
```

## Progress
- [x] Implementation complete
- [x] Validation passed (10 motion tests and production build; existing large-chunk advisory remains)
- commit: pending
