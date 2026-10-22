# Task: T01 Kickoff Circle Rule

## Status: done

## Goal
At the opening kickoff and after every goal, place exactly the kickoff taker inside the center circle. Keep every other field player and goalkeeper from entering until the ball has been kicked or carried clear of the circle; then restore normal movement.

## Decision Summary
- Apply the rule to both teams and all kickoffs.
- The visible center-circle radius is 0.87 Three.js world units; game coordinates use 80 game units per world unit. Use a 70-unit exclusion radius to account for the drawn ring and player body size.
- Keep the existing match clock behavior and kickoff ownership behavior; do not add a separate kick button or kickoff countdown.

## Implementation

### I01. Kickoff state and initial formations
- Related Files:
  - game/src/game/constants.js :: kickoff constants; modify
  - game/src/game/createInitialGameState.js :: createInitialGameState, homeFormation, createAwayFormation; modify
  - game/src/game/createInitialGameState.test.js :: initial kickoff setup assertions; modify
- Details
  - Add KICKOFF_CIRCLE_RADIUS = 70 game units and export it with the other simulation constants.
  - Add state fields kickoffLocked: boolean and kickoffTakerId: string | null.
  - A new match starts with kickoffLocked true, kickoffTakerId home-fw, home-fw and the ball at FIELD.width / 2, FIELD.height / 2.
  - Position every other player outside the exclusion circle before the first simulation step. Keep players within [0, FIELD.width] × [0, FIELD.height], keep goalkeepers in their existing goal area, and retain each player's role and team.
  - The away formation must be constructed from valid kickoff-safe positions instead of blindly mirroring a home player through the center.
- Acceptance details
  - Initial state has exactly one player strictly inside the 70-unit center radius: kickoffTakerId.
  - Every other player is at least 70 units from the center.

### I02. Lock enforcement and release
- Related Files:
  - game/src/game/stepGame.js :: resetForKickoff, moveToward, moveByInput, stepGame; modify
  - game/src/game/stepGame.test.js :: kickoff setup, movement lock, release, and post-goal kickoff cases; modify
- Details
  - resetForKickoff(state, kickoffTeam) resets kickoffLocked, selects the corresponding forward as taker when available, places the taker at the center spot, places all other players outside the circle, attaches the ball to the taker, and retains scores, remaining time, card state, skill uses, and controlledPlayerId using the existing behavior.
  - While kickoffLocked is true, constrain every non-taker's proposed position to the circumference or beyond the 70-unit radius. Apply this to human input, support AI, opponent pressing/covering, goalkeepers, and unselected players; do not block the taker.
  - After ball ownership or dribbling movement carries the ball at least 12 units from the center spot, set kickoffLocked false. Explicit ground pass, lob pass, shot, or AI kick also unlocks the setup. Do not unlock merely because a frame elapsed.
  - Continue to keep all non-takers out for the whole simulation step in which the ball is first moved; normal movement resumes on the following step.
  - On goalPause completion, call resetForKickoff with pendingKickoffTeam and preserve the rule during overtime kickoffs if any occur.
- Acceptance Criteria
  - Initial kickoff and post-goal kickoff each have only the taker inside the center circle.
  - Neither side can enter while the ball remains at the kickoff spot.
  - A pass, shot, or carried ball leaving the center spot releases all players for normal movement.
  - Existing scores, timer, cards, skills, and selected home player survive post-goal reset.
- Validation
  - npm run test -- src/game/createInitialGameState.test.js
  - node --test --test-name-pattern="kickoff circle|post-goal kickoff" src/game/stepGame.test.js
  - npm run build
  - Manually verify the opening kickoff and a post-goal kickoff in the browser.
  - The original broad stepGame command was attempted but currently reports unrelated failures in legacy charge-input expectations, boundary/restart scenarios, jump behavior, and foul scenarios. Keep these failures recorded; do not expand T01 into unrelated fixes.
- Commit Message
  feat(game): enforce kickoff circle positioning

  Plan: 2026-10-22-arcade-3d-match-polish
  Phase: P01-arcade-match-polish
  Task: T01-kickoff-circle-rule

  - Keep all non-kickers outside the center circle until play starts.
  - Apply the setup to opening and post-goal kickoffs.
- Progress
  - [x] Implementation complete
  - [x] Focused validation passed; broader legacy stepGame suite has pre-existing unrelated failures recorded above.
  - commit: committed
