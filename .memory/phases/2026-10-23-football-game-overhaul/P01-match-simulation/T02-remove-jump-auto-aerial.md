# Task: T02 Remove Jump and Automate Aerial Play

## Status: done

## Goal
Remove player jumping and Space input, while preserving aerial-ball play through automatic reachable headers/clearances and keeping the goalkeeper’s separate shot-dive behavior.

## Decision Summary
- No player jump state or jump animation remains. A reachable field player automatically contacts an aerial ball; the keeper never uses the deleted jump mechanic.
- Space is intentionally unbound. Do not repurpose it.

## Implementation

### I01. Simulation aerial contact
- Related Files:
  - `game/src/game/constants.js` :: `JUMP_*`, `AI_JUMP_REACH_RADIUS` ? remove jump-only constants; modify.
  - `game/src/game/createInitialGameState.js` :: `createPlayer()` ? remove jump fields; modify.
  - `game/src/game/stepGame.js` :: `updateJumps()`, `resolveAerialHeader()`, `stepGame()` ? replace jump-gated contact; modify.
- Details
  - Remove `JUMP_INITIAL_VELOCITY`, `JUMP_GRAVITY`, `JUMP_MAX_HEIGHT`, `JUMP_COOLDOWN_SECONDS`, `AI_JUMP_REACH_RADIUS` imports/exports and the player fields `jumpHeight`, `jumpVelocity`, `jumpCooldownSeconds`.
  - Delete `updateJumps()` and its call from `stepGame()`.
  - In `resolveAerialHeader(state)`, keep the current ball-height window (`HEADER_HEIGHT_MIN..HEADER_HEIGHT_MAX`), `HEADER_RADIUS`, last-header protection, interception event, possession update, and ball-flight response. Select the closest eligible non-goalkeeper field player in range without checking jump state; preserve deterministic tie-breaking by roster order.
  - At contact, clamp the contact height to the existing header window, preserve the existing forward velocity and `header` event shape, set `lastHeaderPlayerId`, and switch `controlledPlayerId` when the home team made contact.
  - Avoid repeated contacts by the same player until the ball moves beyond `HEADER_RADIUS`, using the existing `lastHeaderPlayerId` clearing behavior.

### I02. Remove stale jump presentation and controls
- Related Files:
  - `game/src/game/createInputController.js` :: `GAME_KEYS`, key normalization ? remove Space; modify.
  - `game/src/components/FootballPlayer3D.jsx` :: root Y offset ? remove jump offset; modify.
  - `game/src/components/GameLoop3D.jsx` :: player/marker Y offsets ? remove jump transforms; modify.
  - `game/src/components/StartScreen.jsx` :: control guide ? remove Space row; modify.
  - `game/src/components/GameScreen.jsx` :: `restartControls` ? describe automatic aerial contact; modify.
  - `game/src/App.jsx` :: footer control legend ? remove Space; modify.
- Details
  - Keep player models rooted at pitch level. Do not remove `ball.height`; ball flight still needs it.
  - Keep keeper dive logic and its animation/state path intact.
  - Keep E from T01 and all other existing action keys.

## Acceptance Criteria
- [ ] No active code path reads Space or player jump state to move/contact a player.
- [ ] A reachable player automatically contacts an aerial ball and emits the existing header/interception/possession events correctly.
- [ ] Goalkeepers remain grounded except for their separate shot dive.
- [ ] Start, match, and footer instructions no longer advertise jump or Space.
- [ ] Ground-ball, pass, keeper-save, foul, and skill behavior remains intact.

## Validation
- `cd game; npm test -- src/game/stepGame.test.js src/game/createInitialGameState.test.js src/game/createInputController.test.js` ? existing aerial and keyboard suites pass with jump expectations updated to automatic headers.
- `cd game; npm run build` ? production build succeeds with no stale jump imports.

## Commit Message
```text
refactor(game): remove jumping and automate headers

Plan: 2026-10-23-football-game-overhaul
Phase: P01-match-simulation
Task: T02-remove-jump-auto-aerial

- Remove player jump state and Space handling
- Resolve reachable aerial balls automatically
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: created with this task blueprint
