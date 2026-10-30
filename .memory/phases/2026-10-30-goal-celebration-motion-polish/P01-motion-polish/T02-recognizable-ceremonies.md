# Task: T02 Recognizable Ceremony Choreography

## Status: pending

## Goal
Replace the current generic dance loops with five timed, readable ceremony sequences while keeping the existing three-second match-time clock and one shared sample for all participants.

## Decision Summary
- Preserve ceremony IDs and participant selection. Change only presentation poses and their pure timeline tests.
- Make each ceremony recognizable by its silhouette and sequence at the existing match camera distance.

## Implementation

### I01. Stage the five timelines
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `victoryPose`, `getRkoPose`, `getGoalCelebrationPose` — replace generic movement curves with keyframed ceremony choreography; modify.
  - `game/src/components/MiiPlayerModel.jsx` :: celebration pose application — bind the new elbow, foot, and root-pitch fields from T01; modify.

#### Details
- **Signatures & Types**:
  ```typescript
  export function getGoalCelebrationPose(
    ceremonyId: GoalCelebrationId,
    elapsedSeconds: number,
    role?: 'target' | 'striker' | 'finisher' | null
  ): GoalCelebrationPose | null;
  ```
- **Data & Schema Fields**:
  - Clamp valid elapsed time to `[0, 3]`; return `null` for unknown IDs or non-finite time.
  - Use radians for rotations and Mii local units for root lift/glide.
  - Every pose writes the complete T01 pose schema.
- **Execution Flow / Logic**:
  1. Use eased transitions at choreography boundaries; no instantaneous jumps between poses.
  2. `siuuu`: anticipation at `0.0–0.3s`; jump and half-turn at `0.3–0.9s`; land with both arms swept wide by `1.1s`; hold the landing pose through `3s`. End with a yaw equivalent to the same facing direction as the landing pose.
  3. `moonwalk`: maintain upright upper body and relaxed arms; translate smoothly backward for the full timeline while alternating low heel/toe leg and foot articulation. Avoid a normal running-in-place silhouette.
  4. `takeTheL`: raise one arm beside/above the head with a bent forearm to form a clear L silhouette; counterpose the other arm; add a steady knee bounce and alternating foot taps.
  5. `slickback`: use alternating lifted feet and ankle angles over a smooth backward glide; add torso/arm counter-sway so the motion reads as light, continuous footwork rather than a symmetric run cycle.
  6. `rko` role order: during `0.0–0.35s`, striker B drives a visible abdominal punch; target A reacts after contact, clutches the stomach, folds forward and lowers the head by `0.7s`; finisher C reaches/hook poses from `0.65–1.1s`; target falls backward toward a grounded pose from `1.0–1.55s`; hold briefly to `2.1s`; target recovers while B and C finish in a victory stance by `3s`.
  7. For `rko`, animate body `rootPitch` backward rather than using sideways `torsoRoll` as the primary fall. Keep target fall and finisher hook visually distinct from the abdominal strike.
  8. For missing RKO role data, preserve the safe shared victory fallback. All non-RKO ceremonies ignore role input.

### I02. Assert recognizable keyframes
- Related Files:
  - `game/src/game/goalCelebrationMotion.test.js` :: ceremony timeline and RKO choreography assertions — modify.
- **Execution Flow / Logic**:
  1. Preserve tests for finite values, clamping, unknown input, and unique ceremony signatures.
  2. Add keyframe assertions for SIUU anticipation/jump/turn/landing, Take the L raised elbow, Moonwalk and Slickback distinct foot/glide patterns, and the ordered RKO contact/bend/hook/back-fall/hold/recovery states.
  3. Assert all RKO role poses remain distinct at the strike, bend, hook, and recovery samples.

## Acceptance Criteria
- [ ] Each of the five ceremonies has a distinct silhouette and timed motion rather than a generic alternating leg loop.
- [ ] SIUU visibly anticipates, jumps, turns, lands, and holds an arms-wide pose.
- [ ] Moonwalk and Slickback have visibly different gliding footwork.
- [ ] Take the L places a bent arm beside/above the head and includes a bouncing step.
- [ ] RKO visibly executes abdominal strike, stomach clutch/bend, finisher hook, backward fall, hold, and recovery in that order.
- [ ] All participants remain synchronized to the existing three-second clock; celebration motion clears when the simulation state clears.

## Validation
- `Set-Location game; npm test -- src/game/goalCelebrationMotion.test.js` — choreography keyframes and complete finite poses pass.
- `Set-Location game; npm run build` — all articulated poses integrate with the 3D model.

## Commit Message
```text
feat(3d): stage recognizable goal celebrations

Plan: 2026-10-30-goal-celebration-motion-polish
Phase: P01-motion-polish
Task: T02-recognizable-ceremonies

- Stage distinct dance and SIUU keyframes
- Sequence the coordinated abdominal-hit RKO
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
