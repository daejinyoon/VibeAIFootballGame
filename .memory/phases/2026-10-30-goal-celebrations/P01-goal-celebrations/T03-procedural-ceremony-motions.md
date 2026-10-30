# Task: T03 Procedural Ceremony Motions

## Status: done

## Goal
Render synchronized, recognizable motions on the scoring team's three field players from the active simulation timeline.

## Decision Summary
- Use the existing procedural Mii rig; do not add captured/imported dance animations.
- All participants read state.goalCelebration.elapsedSeconds for one shared three-second clock.

## Implementation

### I01. Pure pose timeline
- Related Files:
  - game/src/game/goalCelebrationMotion.js :: getGoalCelebrationPose — new
  - game/src/game/goalCelebrationMotion.test.js :: timeline tests — new
  - game/src/game/goalCelebrations.js :: ceremony IDs — read-only

#### Details
- Signatures & Types:
  ```typescript
  type GoalCelebrationRole = 'target' | 'striker' | 'finisher' | null;
  type GoalCelebrationPose = {
    torsoPitch: number; torsoRoll: number; headPitch: number;
    leftArmPitch: number; rightArmPitch: number;
    leftArmRoll: number; rightArmRoll: number;
    leftLegPitch: number; rightLegPitch: number;
    rootLift: number; rootGlide: number; rootYaw: number;
  };
  export function getGoalCelebrationPose(
    ceremonyId: GoalCelebrationId, elapsedSeconds: number,
    role?: GoalCelebrationRole
  ): GoalCelebrationPose | null;
  ```
- Data & Schema Fields:
  - Clamp finite time to [0,3]. Angles are radians; root values use Mii units. Unknown ID/non-finite time returns null.
- Execution Flow / Logic:
  1. Use smoothstep x*x*(3-2*x) at keyframe boundaries.
  2. SIUUU: use rootLift = 0.38 * sin(pi * t / 0.55) for 0–0.55s; sweep both arm rolls from 0 to opposite ±1.1 radians, then hold a wide victory pose through 3s.
  3. Moonwalk: leftLegPitch = 0.22*sin(2*pi*2.5*t), rightLegPitch is its negative; relaxed arms, upright torso, and rootGlide = -0.42*t/3 units.
  4. Take the L: left arm roll = -1.15 radians beside forehead, right arm roll = 0.25 radians angled down; leg pitches alternate ±0.28*sin(2*pi*2*t), with rootLift = 0.04*abs(sin(2*pi*2*t)).
  5. Slickback: leg pitches alternate ±0.2*sin(2*pi*3*t), torsoPitch = -0.12 radians, and rootGlide = 0.24*sin(2*pi*t) units.
  6. RKO: 0–0.55s striker's abdomen strike and target folds 0.75 radians/head lowers 0.45; 0.55–1.35s finisher hooks and target falls sideways up to 1.15 radians/body lowers 0.22; 1.35–2s target holds while finisher follows through; 2–3s target recovers and others hold victory poses. Non-role player uses striker reaction; null roles use safe group pose.
  7. Tests cover every ID, key boundaries, non-finite input, finite outputs, clamping, and distinct target/striker/finisher poses.

### I02. Bind pose to MiiPlayerModel
- Related Files:
  - game/src/components/MiiPlayerModel.jsx :: MiiPlayerModel useFrame and bone refs — modify
  - game/src/components/FootballPlayer3D.jsx :: gameStateRef pass-through — read-only unless additional prop needed
  - game/src/game/goalCelebrationMotion.js :: getGoalCelebrationPose — read-only

#### Details
- Signatures & Types:
  ```typescript
  MiiPlayerModel({ player, gameStateRef, pose='field', scale=1,
    paused=false, kit, logoId='dex', isKeeper=false }): JSX.Element;
  ```
- Data & Schema Fields:
  - Animate only IDs in active goalCelebration.participantIds.
  - Resolve role by matching targetId, strikerId, or finisherId.
- Execution Flow / Logic:
  1. Preserve paused guard and live-player lookup.
  2. Reset all touched arm/leg/head/torso/body transforms to existing neutral values before applying the next pose.
  3. Map pose fields to existing bone refs. Use body y for lift/fall and body z for local glide; simulation remains authoritative for actor x/y.
  4. While celebrating, bypass run, ball, ordinary action, keeper, and cut-in pose writes. Opponents and keepers retain their normal motion.
  5. When celebration state clears, resume existing animation immediately.

## Acceptance Criteria
- [x] Five motions are distinct and follow the simulation's three-second interval.
- [x] Only three scoring-side field players participate.
- [x] RKO order visibly shows hit, bend, RKO, fall, recovery.
- [x] No pose persists after state clears.

## Validation
- Set-Location game; npm test -- src/game/goalCelebrationMotion.test.js — timeline cases pass.
- Set-Location game; npm run build — 3D integration compiles.

## Commit Message
```text
feat(3d): animate synchronized goal celebrations

Plan: 2026-10-30-goal-celebrations
Phase: P01-goal-celebrations
Task: T03-procedural-ceremony-motions

- Add procedural poses for all five ceremonies
- Animate coordinated RKO from simulation time
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending

