# Task: T01 Articulated Mii Rig

## Status: done

## Goal
Give the existing low-poly player model independent forearm, foot, and body-pitch transforms so celebration poses can form readable hand gestures, footwork, and backward falls without replacing the procedural model.

## Decision Summary
- Keep the current player silhouette, materials, scale, neutral running animation, keeper animation, and cut-in behavior.
- Add only reusable procedural joint controls needed by the five ceremony timelines.

## Implementation

### I01. Extend the complete pose contract and bind the new joints
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `neutralPose`, `getGoalCelebrationPose` — add finite zero defaults for the new transform fields; modify.
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel`, arm and leg JSX groups — add forearm refs, foot refs, and root pitch; modify.
  - `game/src/game/goalCelebrationMotion.test.js` :: `POSE_FIELDS`, all-pose completeness cases — include new fields; modify.

#### Details
- **Signatures & Types**:
  ```typescript
  type GoalCelebrationPose = {
    torsoPitch: number; torsoRoll: number; headPitch: number;
    leftArmPitch: number; rightArmPitch: number;
    leftArmRoll: number; rightArmRoll: number;
    leftElbowPitch: number; rightElbowPitch: number;
    leftLegPitch: number; rightLegPitch: number;
    leftFootPitch: number; rightFootPitch: number;
    rootLift: number; rootGlide: number; rootYaw: number; rootPitch: number;
  };
  ```
- **Data & Schema Fields**:
  - Every pose returned for a valid ceremony includes all listed scalar fields; neutral values are `0` radians/units.
  - Arm group refs remain shoulder pivots. Add a child forearm group under each upper arm; elbow pitch rotates only that forearm and hand.
  - Leg refs remain hip pivots. Add a child foot group under each leg; foot pitch rotates the boot at the ankle.
  - `rootPitch` rotates the complete body group around its local X axis; existing `rootYaw` and `torsoRoll` keep their current meaning.
- **Execution Flow / Logic**:
  1. Keep the upper arm and leg proportions visually consistent with the current model; place forearm pivots at the lower end of the upper-arm capsule and foot pivots at each boot attachment.
  2. In the celebration branch, set every shoulder, elbow, hip, foot, torso, head, and body transform every frame, including all new transforms. Do not allow the running pose to leak through.
  3. In the normal branch, reset elbows and feet to zero along with existing neutral transforms before applying run, keeper, and cut-in poses.
  4. Preserve the early paused return, celebration participant check, keeper exclusion, and immediate restoration when celebration state clears.
  5. Keep all geometry and materials mounted once in JSX; do not allocate Three.js objects per frame.

### I02. Validate pose compatibility
- Related Files:
  - `game/src/game/goalCelebrationMotion.test.js` :: complete finite pose tests — modify.
- **Execution Flow / Logic**:
  1. Assert every ceremony returns the full expanded field set at all existing timeline samples.
  2. Assert all new fields are finite for every ceremony and neutral defaults remain zero before choreography is updated in T02.

## Acceptance Criteria
- [x] All five ceremony poses expose finite elbow, foot, and root-pitch fields.
- [x] The new child joints move independently without changing character scale or limb geometry placement at neutral pose.
- [x] Existing running, keeper, and cut-in animation paths restore neutral elbow/foot transforms after a ceremony.
- [x] No per-frame geometry/material allocation is introduced.

## Validation
- `Set-Location game; npm test -- src/game/goalCelebrationMotion.test.js` — pose contract tests pass.
- `Set-Location game; npm run build` — Mii rig compiles.

## Commit Message
```text
feat(3d): add articulated celebration joints

Plan: 2026-10-30-goal-celebration-motion-polish
Phase: P01-motion-polish
Task: T01-articulated-mii-rig

- Add independent forearm and foot pivots
- Bind root pitch for grounded celebration falls
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — motion tests 6/6; production build succeeds.
- commit: feat(3d): add articulated celebration joints
