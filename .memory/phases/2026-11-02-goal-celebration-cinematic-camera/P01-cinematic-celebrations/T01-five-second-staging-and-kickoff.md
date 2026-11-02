# Task: T01 Five-Second Staging and Kickoff

## Status: done

## Goal
Stage every goal ceremony for five seconds with visible participant spacing, while ensuring players cannot cross the halfway line before a kickoff is played.

## Decision Summary
- Use one shared five-second ceremony duration for `goalCelebration.durationSeconds`, `phaseSeconds`, choreography, and camera follow; continue advancing the match clock and let supplied audio clips end naturally.
- Spread non-RKO participants across the future front-camera frame in a shallow arc; keep the RKO target centered and place striker/finisher on opposite screen sides.
- While `kickoffLocked`, keep every non-kicker in their own half and preserve the existing circle restriction; remove both restrictions when the kickoff ball moves clear.

## Implementation

### I01. Share the five-second ceremony duration and stretch choreography

- Related Files:
  - `game/src/game/goalCelebrations.js` :: ceremony constants — add the shared duration constant.
  - `game/src/game/stepGame.js` :: `beginGoalCelebration` — set both `durationSeconds` and `phaseSeconds` from the shared constant.
  - `game/src/game/goalCelebrationMotion.js` :: `DURATION_SECONDS`, `getGoalCelebrationPose` — map the five-second elapsed clock onto the existing three-second choreography curves.
  - `game/src/game/goalCelebrationMotion.test.js` :: five-second boundary and final-pose assertions — modify.
  - `game/src/game/stepGame.test.js` :: celebration timing and clock assertions — modify.

#### Details
- **Signatures & Types**:
  ```js
  export const GOAL_CELEBRATION_DURATION_SECONDS = 5;
  export function getGoalCelebrationPose(ceremonyId, elapsedSeconds, role = null)
    -> Pose | null;
  ```
- **Data & Schema Fields**:
  - `goalCelebration.durationSeconds`: number, exactly `GOAL_CELEBRATION_DURATION_SECONDS`.
  - `goalCelebration.elapsedSeconds`: number from `0` through `5`.
  - `phaseSeconds`: number initialized to `5`; kickoff remains pending until it reaches zero.
- **Execution Flow / Logic**:
  1. Export the five-second duration from `goalCelebrations.js` and import that same constant in simulation and motion code; avoid separate numeric duration literals.
  2. Keep the existing choreography keyframe functions authored on a three-second timeline. In `getGoalCelebrationPose`, clamp elapsed time to `0..5`, then compute `choreographyTime = elapsedSeconds * 3 / 5` and pass that value to the existing SIUUU, Moonwalk, Take the L, Slickback, and RKO pose logic.
  3. Set `phaseSeconds` and `goalCelebration.durationSeconds` to `5` when the celebration starts. Preserve the existing clock decrement before the goal-pause return so match time continues to flow.
  4. Keep the kickoff event and `beginKickoff` transition at the end of the five-second goal pause. Do not extend, trim, or replay audio clips; their current playback duration remains independent.
  5. Update tests so each ceremony timeline returns finite poses from time `0` through `5`, clamps after `5`, and reaches its choreography's final recovery pose at `5`. Update goal-pause tests to assert no kickoff before five seconds, one kickoff at five seconds, and a decreasing match clock.

### I02. Stage participants in a camera-readable arc

- Related Files:
  - `game/src/game/stepGame.js` :: `beginGoalCelebration` — replace the current narrow X-axis lineup with camera-frame slots.
  - `game/src/game/stepGame.test.js` :: participant positioning assertions — modify.
  - `game/src/game/constants.js` :: `PLAYER_BODY_WIDTH` — read-only spacing reference.

#### Details
- **Formation schema**:
  - Use `PLAYER_BODY_WIDTH * 2` (48 field units) as the minimum lateral center-to-center slot spacing.
  - For non-RKO ceremonies, distribute one to three selected participants symmetrically across field `y`, which maps to screen-left/right for the front camera looking along field `x`.
  - For three participants, offset the two outer participants by `PLAYER_BODY_WIDTH / 2` away from the scoring team's attack direction along field `x`, creating a shallow arc while leaving the center participant forward.
  - For RKO, map the target to the center slot and striker/finisher to opposite lateral slots. Preserve role IDs, hit order, and random assignment.
- **Execution Flow / Logic**:
  1. Keep participant selection limited to the scoring team's first three active non-goalkeepers, as it is today.
  2. Compute the slot layout around the existing participant centroid, clamping the lateral arc as one group so it stays inside field bounds.
  3. Zero participant velocity and keep their current attack-facing direction as in the current staging.
  4. Add tests for one-, two-, and three-player non-RKO groups, RKO role-to-slot mapping, minimum lateral spacing, and field-boundary clamping.

### I03. Enforce each team's half during kickoff lock

- Related Files:
  - `game/src/game/stepGame.js` :: `enforceKickoffCircle`, `releaseKickoffLockIfBallCleared` — add halfway enforcement without changing the release condition.
  - `game/src/game/stepGame.test.js` :: kickoff-lock movement tests — modify.

#### Details
- **Rule**:
  - Field halfway coordinate is `FIELD.width / 2`.
  - While `state.kickoffLocked` is true, the `kickoffTakerId` may occupy the center mark. Every other active player must remain wholly in their own half: home player `x <= FIELD.width / 2 - PLAYER_BODY_WIDTH / 2`; away player `x >= FIELD.width / 2 + PLAYER_BODY_WIDTH / 2`.
- **Execution Flow / Logic**:
  1. Apply the half-line clamp to non-kickers inside the existing kickoff-lock enforcement path after player movement in both local and controlled-team/PvP update paths.
  2. Keep the existing center-circle enforcement and kickoff taker exception.
  3. Preserve `releaseKickoffLockIfBallCleared`: once the kickoff ball has moved clear and `kickoffLocked` becomes false, players may cross the halfway line normally.
  4. Add tests that set home and away players beyond the halfway line while kickoff is locked, advance a frame, and assert their full body bounds remain in their half. Assert the kickoff taker remains allowed at center, and assert crossing becomes possible after the ball clears.

## Acceptance Criteria
- [x] Every ceremony lasts five seconds; the clock continues and kickoff starts only after the five-second phase.
- [x] All five ceremony pose timelines remain finite through their final frame and recover to their end pose.
- [x] Non-RKO players form a wide, shallow arc; RKO roles remain target-center with striker and finisher on opposite sides.
- [x] During kickoff lock, no non-kicker's body crosses the halfway line; normal crossing resumes after the ball is played.

## Validation
- From `game/`: `npm test -- src/game/goalCelebrationMotion.test.js src/game/stepGame.test.js` — timing, pose, staging, and kickoff tests pass.
- From `game/`: `npm run build` — production Vite build succeeds.

T01-specific tests passed (12 passed), and `npm run build` succeeded. The full two-file test command reported 119 passed and two unrelated failures: `Eulryongta switches control to the nearest eligible field player in either possession state` and `knockdown freezes direct input and AI movement until the one-second recovery completes`; both use test states with kickoff lock disabled. Vite reported its existing large-chunk advisory.

## Commit Message
```text
feat(game): stage five-second goal celebrations

Plan: 2026-11-02-goal-celebration-cinematic-camera
Phase: P01-cinematic-celebrations
Task: T01-five-second-staging-and-kickoff

- Extend goal celebrations to five seconds and preserve existing pose choreography.
- Stage participants in a visible formation and keep kickoff players in their own half.
```

## Progress
- [x] Implementation complete
- [x] T01-focused validation passed; the full two-file suite has two unrelated existing failures documented below.
- commit: pending
