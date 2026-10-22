# Task: T01 Kickoff Clock

## Status: done

## Goal
Start the 60-second regulation clock on the opening kickoff taker's first actual kick, rather than when the match scene mounts or while the taker carries/positions with the untouched center ball.

## Decision Summary
- Keep 60 seconds regulation, 30 seconds golden goal on regulation ties, and draw/retry if golden goal also ties.
- Once the opening kick occurs, continue counting through play and restart states; only the existing user pause stops the clock. A goal restart must not reset the match clock.

## Implementation

### I01. Match-clock state and first-kick transition
- Related Files:
  - game/src/game/createInitialGameState.js :: createInitialGameState; modify
  - game/src/game/stepGame.js :: releasePass, releaseShot, resetForKickoff, stepGame; modify
  - game/src/game/constants.js :: REGULATION_SECONDS; read-only unless a test exposes a constant mismatch
- Data and signatures:
  - Add state field hasMatchClockStarted: boolean, initialized to false for a new match.
  - Add state field openingKickoffTakerId: string, initialized to the actual opening kickoff taker ID (home-fw in the current formation).
  - Preserve hasMatchClockStarted in resetForKickoff when a goal resets player/ball positions; opening-kick state is not a per-goal field.
  - releasePass(state, player, kind, receiverOverride = null) and releaseShot(state, player) set the field true only when hasMatchClockStarted is false and player.id equals openingKickoffTakerId. Do not gate this on kickoffLocked/kickoffTakerId: releaseKickoffLockIfBallCleared clears those after the kickoff carrier moves with the untouched ball.
- Execution flow:
  1. In stepGame, do not decrement remainingSeconds until hasMatchClockStarted is true.
  2. On the simulation tick that accepts the opening taker's first A/S/D kick, set the flag and begin countdown on the following simulation tick; do not charge the setup frame. A little movement with the untouched ball does not start the clock.
  3. After the flag becomes true, decrement through goal pause, throw-in, corner, goal kick, free kick, and penalty phases exactly as the current clock does.
  4. Preserve overtimeRemainingSeconds handling and stop all clock changes while state.phase is paused by the existing outer game loop.
- Error/state constraints:
  - Do not start the clock from player movement/dribbling, initial kickoff placement, a post-goal kickoff, or actions by a player other than openingKickoffTakerId.
  - Never reset hasMatchClockStarted when the score changes.

### I02. Simulation regressions
- Related Files:
  - game/src/game/stepGame.test.js :: kickoff/timer cases; modify/add
  - game/src/game/createInitialGameState.test.js :: initial state defaults; modify/add
- Cover initial timer stability, movement with the center ball, first kickoff A/S/D kick, countdown after kick, countdown during later goal/restart phases, golden-goal transition, and final draw/win/loss event.

## Acceptance Criteria
- [x] Remaining time stays at 60 before the first kickoff kick, including while the taker moves with the ball.
- [x] A/S/D by the opening kickoff taker starts the clock; later kickoffs do not reinitialize it.
- [x] Existing 60-second, golden-goal, draw, and pause semantics remain correct.

## Validation
- From game/: node --test src/game/createInitialGameState.test.js src/game/stepGame.test.js
- From game/: npm run build

## Commit Message
```text
fix(game): start match clock on first kickoff

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P01-match-simulation
Task: T01-kickoff-clock

- Hold the clock at 60 seconds until the opening kick.
- Preserve the started clock through goals and restarts.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

## Execution Notes
- Added persistent opening kickoff taker and match-clock-started state. The timer remains at 60 seconds while the opening taker moves with the untouched ball, starts on that player's first accepted kick, and remains active through later kickoffs.
- Validation: the two kickoff-clock regressions and initial-state assertions pass; `npm run build` passes. The full requested Node test command reports 11 failures, but the same 11 failures reproduce at the unchanged baseline commit (`7cfc70b`: 47/58 pass; changed tree: 49/60 pass). `git diff --check` passes.
- Build output retains the existing Three.js vendor chunk warning (745.90 kB, above the 500 kB advisory threshold).
- The baseline comparison excludes these legacy failures from T01; this task did not modify the unrelated cases.
