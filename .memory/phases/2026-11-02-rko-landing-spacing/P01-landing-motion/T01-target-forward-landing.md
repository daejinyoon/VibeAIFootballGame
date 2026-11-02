# Task: T01 Target Forward Landing

## Status: done

## Goal
Increase the space between the grounded RKO target and the face-up finisher after impact by moving the target forward during the slam and holding that offset through the grounded pose.

## Decision Summary
- Preserve the close kick and all pre-impact motion.
- Do not change the finisher's existing forward glide or face-up pose.
- Ease only the target forward during the slam, hold through the grounded pose, then blend back during recovery.

## Implementation

### I01. Target landing translation
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `getRkoPose` and `getGoalCelebrationPose` — modify target slam and held poses.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO choreography test — add timeline assertions.

#### Details
- Add a named constant `RKO_TARGET_LANDING_GLIDE = 1.2` in `goalCelebrationMotion.js`.
- In `getRkoPose(time, 'target')`, leave the target's existing poses before the slam unchanged.
- In the existing `1.25 <= time < 1.75` slam branch, calculate `slam = smoothstep((time - 1.25) / 0.5)` and add `rootGlide: RKO_TARGET_LANDING_GLIDE * slam` to the returned pose.
- In the existing `1.75 <= time < 2.1` grounded branch, return `rootGlide: RKO_TARGET_LANDING_GLIDE`.
- In the recovery pose passed to `blendToVictory`, set its starting `rootGlide` to `RKO_TARGET_LANDING_GLIDE`; the existing recovery blend returns it to zero.
- Do not modify the striker/finisher poses, participant positions, camera, or ceremony duration.

### I02. Motion regression coverage
- Related Files:
  - `game/src/game/goalCelebrationMotion.test.js` :: existing `RKO requires a close kick before the target folds and drives the target forward/down` test — modify.
- Assert target glide is zero at slam onset, positive and increasing during the slam, equals 1.2 while grounded, decreases during recovery, and returns to zero at the end. Keep existing contact, target-forward torso pitch, and finisher face-up assertions.

## Acceptance Criteria
- [x] The target does not translate forward before the slam begins.
- [x] The target moves forward during the slam and remains at the larger offset while grounded.
- [x] The target returns to the normal position during recovery.
- [x] The finisher's face-up landing, contact timing, and other ceremonies remain unchanged.

## Validation
- `cd game; node --test src/game/goalCelebrationMotion.test.js`
- `cd game; npm run build`

## Commit Message
```text
fix(game): widen RKO landing separation

Plan: 2026-11-02-rko-landing-spacing
Phase: P01-landing-motion
Task: T01-target-forward-landing

- Move the target forward during the RKO slam and grounded pose
- Verify the landing offset and recovery timeline
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`node --test src/game/goalCelebrationMotion.test.js`; `npm run build`)
- commit: pending
