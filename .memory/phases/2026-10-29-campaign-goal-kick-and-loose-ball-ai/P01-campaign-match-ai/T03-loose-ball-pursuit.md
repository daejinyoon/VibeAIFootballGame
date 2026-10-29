# Task: T03 Loose-Ball Pursuit

## Status: done

## Goal
During campaign play, visibly send the nearest eligible AI player from each team to an unowned recoverable ball while teammates keep their normal movement and the manually controlled home player remains under user control.

## Decision Summary
- Contest ordinary loose ground balls and recoverable aerial balls; aerial contestants target the predicted landing point. Leave targeted passes and skill shots on existing behavior.
- Preserve user control. When the controlled home player is closest, select the nearest eligible AI teammate instead.
- A goalkeeper is eligible only when the ball target is within 180 x-units of their own goal line. Do not enable this behavior in PvP.

## Implementation

### I01. Classify eligible balls and calculate their contest target

- Related Files:
  - `game/src/game/stepGame.js` :: `getLooseBallContestTarget` (new), `stepGame` ??derive a safe contest point and pass PvP context; modify
  - `game/src/game/stepGame.test.js` :: new loose-ball target tests ??modify

#### Details
- **Signatures & Types**:
  ```js
  function getLooseBallContestTarget(state)
  // returns { x: number, y: number } or null

  function findLooseBallChasers(state, controlledPlayerId, target)
  // returns Map<'home' | 'away', PlayerId | null>

  function updateLooseBallChasers(state, chasers, target, deltaSeconds)
  // mutates/moves each selected AI player once
  ```
- **Data & Schema Fields**:
  - Ball: `ownerId`, `x`, `y`, `vx`, `vy`, `height`, `verticalVelocity`, `flightKind`, optional `flightTarget`, `passTarget`, `passReceiverId`, `passTeam`, `skillId`.
  - Player: `id`, `team`, `role`, `dismissed`, `knockdownSeconds`, `motionAction`, optional `airborneSecondsRemaining`, `aiTarget`, `aiRetargetSeconds`.
  - Use `BALL_GRAVITY`, `FIELD`, existing `AI_SPEED`, and `clamp`; add no persistent state fields.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Return `null` if ball is owned; if required coordinates are not finite; for `flightKind === 'skill-shot'`; for a targeted ground pass with a valid `passTarget` or `passReceiverId`; or for a targeted aerial pass represented by both `passTeam` and finite `flightTarget`. Ground categories are `ground` and ordinary `shot` with height 0. Recoverable aerial categories are `shot`, `lob`, `cross`, or `header` with height >0.
  2. Core Processing: A ground target is current `{x,y}`. For an aerial ball, use finite `flightTarget` when present. Otherwise compute time to ground as `t = (vz + sqrt(vz^2 + 2*BALL_GRAVITY*height)) / BALL_GRAVITY`, where `vz = verticalVelocity ?? 0`, and use `t = 0` when height is 0. Project to `{x: clamp(ball.x + ball.vx*t, 0, FIELD.width), y: clamp(ball.y + ball.vy*t, 0, FIELD.height)}`.
  3. State Transition & Return: Return only a finite in-field point. Do not claim possession. Existing `collectLooseBall` remains responsible for pickup, with its current <=18-unit distance and <=14 height checks and event/state updates.
  4. Error & Exception Handling: If height, velocity, gravity calculation, or result is invalid, return `null` and let existing AI behavior run. Treat a missing vertical velocity as 0.

### I02. Select and move one eligible AI contestant per team
- Related Files:
  - `game/src/game/stepGame.js` :: `findLooseBallChasers` (new), `updateLooseBallChasers` (new), `updateSupportPlayer`, `updateHomeSupportAi`, `updateAwayDefense`, `updateAi`, `stepGame` ??add chaser priority and avoid duplicate movement; modify
  - `game/src/game/stepGame.test.js` :: loose-ball pursuit tests ??modify
#### Details
- Only run when `pvpMode === false` and `getLooseBallContestTarget(state)` returns a point.
- Candidate players per team must be active: not dismissed or stunned, `knockdownSeconds <= 0`, not recovering, and `(airborneSecondsRemaining ?? 0) <= 0`. Exclude stunned players because `moveToward` intentionally does not move them. Exclude `controlledPlayerId` from home AI candidates. Sort candidates by distance to target, then role string, then player ID; choose at most one from each side.
- Include a goalkeeper only if `Math.abs(target.x - ownGoalX) <= 180`, where own goal X is 0 for home and `FIELD.width` for away. The 180-unit x band is an implementation inference based on the existing 180-unit goal-side defensive band in `updateAwayDefense`; keep it documented in code.
- If the controlled home player would be closest, excluding that player means the closest remaining eligible AI teammate is selected. Never change user input movement, `controlledPlayerId`, `controlledPlayerIds`, `ball.ownerId`, or `possessionTeam` during pursuit.
- Set each chaser's `aiTarget = target` and `aiRetargetSeconds = 0`, then call `moveToward(chaser, target, AI_SPEED, deltaSeconds, false)` exactly once in a frame. The final `false` disables automatic sprint so movement stays within `AI_SPEED * deltaSeconds`. Skip selected chaser IDs in normal support/defense movement that frame to avoid double movement. All nonselected players retain existing formation/support/press movement.
- Wire this through both campaign possession branches so home and away chasers operate regardless of `state.possessionTeam`. Do not invoke it in the two-team PvP branch; there, retain the existing `collectLooseBall` flow without new AI targeting.
- Actual collection remains in `collectLooseBall`; if ball has not reached its existing contact height/radius, chasers continue toward the target on subsequent frames.

### I03. Test pursuit, manual control, keeper limits, and exclusions
- Related Files:
  - `game/src/game/stepGame.test.js` :: new tests next to existing loose-ball and PvP tests ??modify
#### Details
- Ground: nearest eligible AI on home and away moves toward an unowned ground ball; other teammates retain their existing target/movement.
- User input: make the controlled home player closest and give it a movement input; assert it moves from input and the nearest eligible AI teammate pursues the ball.
- Aerial: set positive height and vertical velocity with and without `flightTarget`; assert selected players target the declared/projected landing point.
- Keeper: keeper is selectable when target x is <=180 from own goal line and excluded outside that range; outfield candidate is selected when keeper is excluded.
- Filters and deterministic ties: dismissed, stunned, knocked-down, recovering, and airborne players are skipped; ties resolve by role then ID.
- Exclusions: owned balls, targeted ground/aerial passes, skill shots, and PvP frames do not get new chaser targets. Invalid projection inputs fall back safely.
- Assert a chaser moves no farther than `AI_SPEED * clampedDeltaSeconds` in one frame and is not moved twice.

## Acceptance Criteria
- [x] At most one eligible AI from each team pursues an ordinary unowned ball.
- [x] Ground chasers target the ball; aerial chasers target its landing point.
- [x] Other players retain current behavior; home manual control and possession state remain unchanged until normal collection.
- [x] Goalkeepers pursue only within 180 x-units of their own goal.
- [x] Targeted passes, skill shots, and PvP behavior are unchanged.

## Validation
- `npm test -- src/game/stepGame.test.js` (run from `game/`) ??loose-ball, possession, PvP, and simulation tests pass.
- `npm run build` (run from `game/`) ??production build succeeds.

## Commit Message
```text
feat(ai): contest campaign loose balls

Plan: 2026-10-29-campaign-goal-kick-and-loose-ball-ai
Phase: P01-campaign-match-ai
Task: T03-loose-ball-pursuit

- move one eligible AI from each side toward loose-ball recovery points
- preserve user control and special-ball behavior
- keep new pursuit out of PvP
```

## Progress
- [x] Implementation complete
- [x] Validation complete: 103/106 game tests pass; 3 existing baseline failures remain (opening clock, Eulryongta handoff, knockdown recovery). Production build succeeds with the existing large-chunk warning.
- commit: feat(ai): contest campaign loose balls
