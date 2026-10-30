# Task: T01 Use Actual Movement for the Run Animation

## Status: done

## Goal
Make a field player's 3D running motion stop when the simulation clamps that player against a pitch boundary and their position does not change, while keeping velocity-based game decisions unchanged.

## Decision Summary
- Compute presentation speed from the player's actual coordinate displacement during each simulation frame; use that speed only to animate the 3D model.
- Preserve `vx` and `vy` as intended simulation velocity because player orientation and pass-receiver leading already depend on them.

## Implementation

### I01. Compute and publish per-frame presentation speed

- Related Files:
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D` - capture pre-step player coordinates and publish actual movement speed after each local or host simulation step; modify

#### Details
- **Signatures & Types**:
  - Keep the existing `GameLoop3D` component signature unchanged.
  - Add no new module exports or public function signatures.
- **Data & Schema Fields**:
  - Add one transient player-state field: `renderMovementSpeed: number`, measured in simulation units per second.
  - It is a finite non-negative number; set it to `0` when the simulation delta is zero or the player's position did not change.
  - This is presentation data only. Do not change `vx`, `vy`, their defaults, player persistence, or the database/profile schema.
- **Execution Flow / Logic**:
  1. Before invoking `stepGame` in `simulationMode === 'local'` or `'host'`, capture each player's current `{ x, y }` keyed by player id.
  2. After `stepGame` returns, for every player with a captured position and finite coordinates, compute `Math.hypot(player.x - previous.x, player.y - previous.y) / simulationDelta`; assign the finite result to `player.renderMovementSpeed`.
  3. If `simulationDelta <= 0`, either coordinate is non-finite, or the computed result is non-finite, assign `0`.
  4. Do not recalculate this field in `simulationMode === 'remote'`: remote clients use the host's serialized snapshot value, which remains stable between snapshots.
  5. Do not alter `stepGame`, velocity assignments, snapshots, input, or player coordinates as part of this change. The extra finite numeric field may travel with existing structured-cloned snapshots.

### I02. Drive the 3D running motion from presentation speed

- Related Files:
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel` - decide whether the field model is actually moving before playing its run animation; modify

#### Details
- **Signatures & Types**:
  - Keep the existing `MiiPlayerModel` component signature unchanged.
  - In the `useFrame` callback, treat `livePlayer.renderMovementSpeed` as the field-model movement speed when it is finite; treat a missing or invalid value as `0`.
  - Preserve the existing velocity-derived speed for `pose === 'cutIn'`, because cut-in models do not receive the per-frame field simulation value.
- **Data & Schema Fields**:
  - Read `renderMovementSpeed: number` from the live player object for field poses; do not add a persisted model or API field.
- **Execution Flow / Logic**:
  1. Find the current live player using the existing `gameStateRef` lookup and fallback to the `player` prop.
  2. For the normal field pose, compute movement speed from finite `livePlayer.renderMovementSpeed`; default to zero if absent or invalid. For a cut-in pose, keep the existing `Math.hypot(livePlayer.vx ?? 0, livePlayer.vy ?? 0)` calculation.
  3. Keep the current `motionAction` gate (`run` or `tackle`) and the existing speed threshold of `3`; change only the speed source used by that gate.
  4. Keep all running cadence, limb swing, dribble-touch, action pose, and recovery logic unchanged. This makes a player stop running in place at a boundary while resuming the run motion as soon as coordinates change again.

## Acceptance Criteria
- [ ] Holding a movement direction into each pitch boundary stops the field player's run animation after the player reaches the edge and their coordinates stop changing.
- [ ] Reversing direction from an edge resumes the run animation on the first simulation frame in which the player's coordinates change.
- [ ] Diagonal movement along an edge remains animated while the player continues moving along the unblocked axis.
- [ ] `vx` and `vy` remain the intended simulation velocities, so player facing and pass-receiver lead behavior are unchanged.
- [ ] Cut-in character animation and remote PvP snapshot presentation continue to work.

## Validation
- `npm test` (run from `game/`) - 237 passed, 3 failed. The failures match the three baseline failures recorded before this task: the opening clock in `src/game/stepGame.test.js:94`, Eulryongta control handoff in `src/game/stepGame.test.js:2014`, and knockdown recovery in `src/game/stepGame.test.js:2097`. They are unrelated to the modified 3D presentation files and were not changed.
- `npm run build` (run from `game/`) - passed; Vite emitted the existing large-chunk size warning.

## Commit Message
```text
fix(match): stop run animation at pitch boundaries

Plan: 2026-10-30-field-boundary-running-animation
Phase: P01-boundary-aware-running-motion
Task: T01-use-actual-movement-for-run-animation

- Derive presentation speed from per-frame position changes
- Keep velocity-based gameplay decisions unchanged
```

## Progress
- [x] Implementation complete
- [x] Validation reviewed (build passed; the full test suite retains the three recorded baseline failures)
- commit: pending
