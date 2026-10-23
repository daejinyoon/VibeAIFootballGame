# Task: T01 Sprint Stamina and E Input

## Status: done

## Goal
Add a hold-to-sprint action on E with stamina and recovery for every player, while increasing normal movement speed slightly and allowing AI players to sprint for tactical runs.

## Decision Summary
- Arrow keys remain normal movement; E is sprint; Space remains unused. Home-player stamina is shown in P03; AI stamina stays hidden.
- Stamina range is `0..100`. Constants: `SPRINT_STAMINA_MAX = 100`, `SPRINT_DRAIN_PER_SECOND = 32`, `SPRINT_RECOVERY_PER_SECOND = 24`; recovery starts as soon as the player stops sprinting.

## Implementation

### I01. Input and player state
- Related Files:
  - `game/src/game/createInputController.js` :: `GAME_KEYS`, `readFrame()` — add held E; modify.
  - `game/src/game/constants.js` :: sprint constants — define stamina limits/rates; modify.
  - `game/src/game/createInitialGameState.js` :: `createPlayer()` — initialize stamina; modify.
- Details
  - Add lowercase `'e'` to `GAME_KEYS`; `readFrame()` already exposes `down: Set<string>`, so do not add another input field.
  - Add the three constants with the values above.
  - Add `sprintStamina: number` (default `100`) and `sprinting: boolean` (default `false`) to each player.
  - Keep the existing input frame contract (`moveX`, `moveY`, `down`, `pressed`, `released`) unchanged.

### I02. Movement and AI bursts
- Related Files:
  - `game/src/game/stepGame.js` :: `moveByInput()`, `moveToward()`, `updateHomeSupportAi()`, `updateAi()`, `stepGame()` — drain/recover stamina and apply speeds; modify.
- Details
  - Raise `PLAYER_SPEED` from `160` to `176` and `AI_SPEED` from `125` to `136`. Keep `KEEPER_SPEED`, `PRESSURE_SPEED`, and `SLIDE_SPEED` unchanged here.
  - Add `SPRINT_SPEED_MULTIPLIER = 1.35` in `stepGame.js`.
  - Sprint the controlled player only when `input.down.has('e')`, movement input is nonzero, the player may move, and `sprintStamina > 0`.
  - AI field players sprint automatically when a tactical target is over `90` field units away and stamina is positive. A ball carrier does not sprint while an opposing field player is within `26` field units, preserving close-control and tackle outcomes. Do not auto-sprint keepers.
  - Drain `32 * dt` while sprinting; otherwise recover `24 * dt`; clamp to `0..100`. Clear `sprinting` when movement stops, the player cannot move, or stamina reaches zero.
  - Multiply the requested move speed without changing possession, tackle, pass, or shot rules. Keep state changes compatible with existing `motionAction`; P02 adds rendered animation.
  - Leave control-guide copy to T02, which removes all obsolete Space/jump instructions in one pass.

## Acceptance Criteria
- [ ] E is present in `input.down` only while held and is cleared on blur/disable like other keys.
- [ ] Normal movement is modestly faster; holding E while moving increases speed and drains stamina.
- [ ] Releasing E, stopping, or exhausting stamina prevents sprint and restores stamina at the configured rate.
- [ ] AI field players sprint for long runs and recover stamina; goalkeepers do not use this rule.
- [ ] Existing movement boundaries and action/key behavior remain unchanged except the new E action.

## Validation
- `cd game; npm test -- src/game/createInputController.test.js src/game/createInitialGameState.test.js src/game/stepGame.test.js` — existing input/state/simulation suites pass with assertions updated for sprint.
- `cd game; npm run build` — Vite production build succeeds.

## Commit Message
```text
feat(game): add stamina-based E sprint

Plan: 2026-10-23-football-game-overhaul
Phase: P01-match-simulation
Task: T01-sprint-stamina

- Add held E input and per-player stamina
- Give field AI situational sprint bursts
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
