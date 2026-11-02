# Task: T01 Stage and Animate RKO

## Status: done

## Goal
Make the RKO preview and in-match celebration show an understandable three-person sequence: abdominal strike, target bend, finisher approach and head/neck hook, then a synchronized backward fall.

## Decision Summary
- Stage striker front-left, target center, finisher back-right and use a three-quarter front preview camera.
- Extend the existing five-second shared pose data with local horizontal root movement so the finisher closes the gap and falls with the target.

## Implementation

### I01. Depth-separated preview formation and view
- Related Files:
  - `game/src/components/Customization3DPreview.jsx` :: `PREVIEW_PLAYER_POSITIONS`, RKO camera selection — modify.
  - `game/src/game/goalCelebrationPreview.js` :: stable preview role IDs, positions, and RKO camera frame — new.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO motion and staging regression checks — modify.
- Details
  - Move the existing preview role IDs, `RKO_ROLES`, position sets, and RKO camera frame into the pure JavaScript module `goalCelebrationPreview.js`. Keep target=center, striker=left ID, finisher=right ID.
  - Replace the `rko` positions with depth-staggered coordinates: striker `[-0.9, 0, 0.52]`, target `[0, 0, 0]`, finisher `[0.9, 0, -0.62]`. This puts the striker nearer the front camera and the finisher behind the target; all three must fit the canvas.
  - For RKO only, set the camera to `[2.9, 2.5, 5.9]`, target `[0, 0.78, 0]`, and vertical FOV `30`; retain the current camera for the kit and non-RKO ceremony preview.
  - Add regression checks in `goalCelebrationMotion.test.js` importing the pure preview constants: assert all role IDs are distinct, target is centered, striker depth is in front, and finisher depth is behind. Keep the layout in presentation-only component state.

### I02. Connected role choreography and shared root translation
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `neutralPose`, `getRkoPose`, `getGoalCelebrationPose` — modify.
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel` ceremony pose root transform — modify.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO phase assertions and complete finite pose checks — modify.
- Details
  - Add `rootShiftX: 0` to `neutralPose()` so every ceremony still returns the full pose schema. Keep all existing fields and make all non-RKO ceremonies stay at `rootShiftX === 0`.
  - In the ceremony branch of `MiiPlayerModel`, apply the horizontal shift as `body.current.position.set(ceremonyPose.rootShiftX ?? 0, ceremonyPose.rootLift, ceremonyPose.rootGlide)`. This moves only the rendered model rig; do not mutate player coordinates or simulation state.
  - Use choreography time in the existing 0–3 second domain (mapped from the five-second celebration clock):
    1. 0–0.2: all roles prepare; striker stays front-left.
    2. 0.2–0.45: striker drives the right arm into the target's abdomen; target flinches and brings elbows toward the stomach.
    3. 0.35–0.8: target folds forward with head down and arms braced at the abdomen; striker retracts after contact.
    4. 0.65–1.1: finisher approaches the target using `rootShiftX` toward center and positive `rootGlide` toward the camera; both arms rise into a clear head/neck hook. Do not rotate the finisher a full 180 degrees away from the camera.
    5. 1.1–1.65: target and finisher enter the backward fall together; both use a negative `rootPitch`, with the finisher maintaining hook arms and the target's torso/head rotating back. They hold the completed drop until choreography time 2.1.
    6. 2.1–3.0: target and finisher recover together and then join the group victory pose. Striker celebrates after the strike.
  - Keep every returned numeric field finite at boundary times, preserve the safe group fallback when RKO role is missing, and preserve five-second looping.
  - Update tests to assert abdominal strike precedes the fold, finisher translation approaches center, both target and finisher fall in the same time window, held poses remain down, recovery returns root translations to zero, and other ceremonies have zero horizontal shift.

## Acceptance Criteria
- [x] Preview roles are visibly staggered in depth, with the target centered and full bodies in frame from a three-quarter front view.
- [x] The RKO reads in order as gut strike, forward bend, finisher approach/head hook, paired backward fall, hold, and recovery.
- [x] The match and preview use the same role poses; only rendered model transforms move, with no simulation position changes.
- [x] SIUUU, Take the L, Slickback, ceremony duration, audio, and random-selection behavior remain unchanged.

## Validation
- `cd game; npm test -- src/game/goalCelebrationMotion.test.js` — RKO choreography ordering, finite pose schema, recovery, and non-RKO compatibility pass.
- `cd game; npm run build` — preview and shared model integration compile.

## Commit Message
```text
fix(game): stage a readable three-player RKO

Plan: 2026-11-02-rko-preview-staging
Phase: P01-readable-rko
Task: T01-stage-and-animate-rko

- Separate RKO roles into a depth-staggered preview formation
- Connect the finisher approach and fall to the target's motion
```

## Progress
- [x] Implementation complete
- [x] Validation passed (10 motion tests and production build; existing large-chunk advisory remains)
- commit: pending
