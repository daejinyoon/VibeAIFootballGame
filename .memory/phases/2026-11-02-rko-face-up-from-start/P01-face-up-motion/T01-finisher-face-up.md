# Task: T01 Finisher Face-Up

## Status: done

## Goal
Keep the RKO finisher facing upward from the start of the approach through the grounded landing, removing the forward-pitched face-down phase.

## Decision Summary
- Set the finisher's `rootPitch` to `-Math.PI / 2` for the approach, leap/impact, and grounded poses.
- Keep existing root translation, arm/leg choreography, target motion, and timing.
- Use the existing recovery blend to return to the victory pose.

## Implementation

### I01. Face-up finisher pose
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `getRkoPose` — modify the finisher approach and slam pitch.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO choreography test — assert the finisher stays face-up from approach to landing.

#### Details
- In the finisher approach branch (`0.8 <= time < 1.25`), add `rootPitch: -Math.PI / 2` and `rootLift: 0.035`; preserve existing approach values for torso, limbs, root translation, and yaw.
- In the finisher slam branch (`1.25 <= time < 1.75`), replace the `forwardPitch` / `faceUp` interpolation with constant `rootPitch: -Math.PI / 2`; keep existing leap lift and all other fields unchanged.
- Keep grounded `rootPitch: -Math.PI / 2` and the current recovery blend.
- Update tests to assert `rootPitch === -Math.PI / 2` for approach, hook, launch, impact, and held samples; retain the test that recovery interpolates toward zero.
- Do not modify target/striker choreography, finisher forward glide, or non-RKO ceremony poses.

## Acceptance Criteria
- [x] The finisher does not pitch face-down during the RKO approach, leap, or impact.
- [x] The finisher remains face-up while grounded.
- [x] The finisher returns upright during the existing recovery interval.
- [x] Kick, target fold, forward landing, and other ceremonies remain unchanged.

## Validation
- `cd game; node --test src/game/goalCelebrationMotion.test.js`
- `cd game; npm run build`

## Commit Message
```text
fix(game): keep RKO finisher face-up from approach

Plan: 2026-11-02-rko-face-up-from-start
Phase: P01-face-up-motion
Task: T01-finisher-face-up

- Remove the face-down RKO launch pitch
- Keep the finisher supine through impact and landing
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`node --test src/game/goalCelebrationMotion.test.js`; `npm run build`)
- commit: pending
