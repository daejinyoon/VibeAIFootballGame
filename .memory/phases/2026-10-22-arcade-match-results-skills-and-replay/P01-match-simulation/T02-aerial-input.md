# Task: T02 Aerial Input

## Status: done

## Goal
Prevent A/lob-pass input from directly making players jump, and ensure aerial contests use one reachable field player at a time while Space remains the controlled player's manual jump key.

## Decision Summary
- A remains lob pass/clearance while the controlled carrier has possession; S remains ground pass and Space remains manual jump.
- For a descending aerial ball inside header height, only the nearest reachable eligible AI field player auto-jumps. Goalkeepers never auto-jump.
- Do not change team size, pass type, heading rules, or the existing cooldown/physics without a failing case that proves it is necessary.

## Implementation

### I01. Input and jump eligibility
- Related Files:
  - game/src/game/createInputController.js :: GAME_KEYS, handleKeyDown, readFrame; read-only unless key normalization is the proven source of an A/Space collision
  - game/src/game/stepGame.js :: handleHomeAttack, updateJumps, resolveAerialHeader; modify
  - game/src/game/constants.js :: AI_JUMP_REACH_RADIUS, JUMP_COOLDOWN_SECONDS; inspect existing values, modify only if the stated eligibility tests need tuning
- Data and signatures:
  - Input frame retains moveX/moveY numbers and down/pressed/released Sets of normalized key names. A is lowercase a; jump is Space.
  - updateJumps(state, controlled, input, deltaSeconds) may start a manual jump only for controlled.id when input.pressed contains Space and the player is a non-goalkeeper, active, upright, and past cooldown.
  - Automatic jump candidate is at most one active non-goalkeeper other than controlled; select the eligible player with the smallest distance to predictedLandingPoint(ball), using stable roster order for ties.
- Execution flow:
  1. Keep A's attack action in handleHomeAttack mapped only to releasePass(..., lobPass).
  2. Require an actual descending ball in the existing valid header-height window before selecting an automatic jumper.
  3. Require landing distance at most AI_JUMP_REACH_RADIUS, no knockdown/recovery, no existing jump, and expired cooldown.
  4. Leave header resolution based on the jumping player's location and the real ball height; do not synthesize headers when a jump input is pressed without a reachable aerial ball.
- Error/state constraints:
  - Pressing A with no possession must not trigger manual jumps.
  - Pressing Space must not make every home/away player jump.
  - Goalkeepers remain excluded from both automatic header jumps and field-player skill rules.

### I02. Input simulation regressions
- Related Files:
  - game/src/game/stepGame.test.js :: jump/header tests; modify/add
  - game/src/game/createInputController.test.js :: normalized A and Space inputs; modify only if needed
- Cover A as a lob without direct jump, Space affecting only controlled field player, no auto-jump for a high rising/unreachable ball, exactly one nearest AI jumper for a valid descending ball, and goalkeeper exclusion.

## Acceptance Criteria
- [x] A performs its existing lob/clearance action and never directly sets jumpVelocity.
- [x] Manual Space jump affects only the selected controlled field player.
- [x] Aerial AI contest selects one nearest reachable field player and never a goalkeeper.
- [x] A valid header can still be won by either team through the existing ball/player collision rules.

## Validation
- From game/: node --test src/game/createInputController.test.js src/game/stepGame.test.js
- From game/: npm run build
- In the running match: test A with possession, A without possession, Space, and a descending lob from both teams.

## Commit Message
```text
fix(game): constrain aerial jumps to eligible players

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P01-match-simulation
Task: T02-aerial-input

- Keep A as a lob action and Space as the manual jump key.
- Limit automatic aerial contests to the nearest reachable field player.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

## Execution Notes
- The jump controls and AI eligibility logic already matched the decision. Updated the stale lob-pass regression to assert the immediate A action, then added checks that A never starts jumps, Space jumps only the controlled player, an out-of-reach descending ball causes no AI jump, and a valid reachable header still resolves.
- Validation: focused aerial/jump regressions pass (7/7); `createInputController.test.js` passes (4/4); `npm run build` and `git diff --check` pass. The broader simulation suite still has 10 unrelated legacy failures; the prior T01 baseline had 11, including the now-corrected stale A timing assertion. No browser harness is available here for the blueprint's manual in-match check.
- Build output retains the existing Three.js vendor chunk warning (745.90 kB, above the 500 kB advisory threshold).
