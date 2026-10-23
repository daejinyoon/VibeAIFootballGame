# Task: T03 Tactical Off-Ball AI and Goalkeeper Positioning

## Status: done

## Goal
Make both teams’ off-ball players support or defend according to role, automatically select the nearest useful home defender when possession changes, and make keepers track the ball and step out only for close one-on-ones.

## Decision Summary
- Keep four players per side and existing roles: goalkeeper, defender, midfielder, forward. Preserve manual S cycling as an override.
- One eligible field player presses; other field players cover opponents or lanes. Support players keep separation and create forward/pass targets.

## Implementation

### I01. Attacking and defending support targets
- Related Files:
  - `game/src/game/stepGame.js` :: `homeSupportTarget()`, `updateHomeSupportAi()`, `updateSupportPlayer()`, `targetForRole()`, `updateAwayDefense()` ? role-aware targets; modify.
- Details
  - When home owns the ball, retain the nearest short outlet; make the other field support player target a forward open lane.
  - When away owns the ball, make away non-carriers use role-aware targets: forward finds space, midfielder offers an outlet, defender holds behind the carrier. Keep stage retarget intervals from `getAiTuning(state.stage)`.
  - When defending, retain `aiMarkingAssignments` and select one presser. The nearest eligible field player pressures the carrier; others mark a receiver or cover the lane between carrier and own goal. Avoid duplicate marks unless no unassigned eligible target remains.
  - Keep decisions deterministic using distance, role, then player ID tie-breaking. Do not introduce random targeting.
  - Clamp targets within `[20, FIELD.width - 20] × [12, FIELD.height - 12]`.

### I02. Controlled-player selection and keeper behavior
- Related Files:
  - `game/src/game/stepGame.js` :: `updateAi()`, `updateAwayDefense()`, `targetForRole()`, `stepGame()` ? selection and keeper motion; modify.
  - `game/src/game/createInitialGameState.js` :: AI/control transition fields ? add only fields required for a possession/carrier transition; modify.
- Details
  - When away possession begins or the away ball carrier changes, choose the nearest active home field player. Exclude the goalkeeper, dismissed, knocked-down, and recovering players.
  - Set `controlledPlayerId` once for that transition; do not overwrite a manual S-cycle selection on every frame. Keep S cycling through active home players during away possession.
  - Keeper X stays within its own penalty area. Track ball Y across the goal mouth. Step out only when an opponent carrier is within `150` field units of goal and has a clear 1v1 lane; return to the goal line when the threat ends.
  - Do not change save/catch outcomes, `KEEPER_SPEED`, or the keeper’s separate dive behavior. Do not apply field-player auto-sprint to keepers.

## Acceptance Criteria
- [x] Home and away support players make distinct outlet/run/cover movements based on possession and role.
- [x] Exactly one home field player is automatically selected on an away possession/carrier transition; manual S selection persists until the next transition.
- [x] One AI defender presses while other defenders cover players or lanes toward their own goal.
- [x] Keepers track the goal lane, remain near their box, step out only for the specified close 1v1, and recover afterward.
- [x] Targets stay in bounds and repeated identical states produce identical AI choices.

## Validation
- `cd game; npm test -- src/game/stepGame.test.js` ? existing support, switch, away-attack, keeper, and boundary scenarios pass with assertions updated for the new tactical choices.
- `cd game; npm run build` ? production build succeeds.

## Commit Message
```text
feat(ai): improve off-ball tactics and keeper positioning

Plan: 2026-10-23-football-game-overhaul
Phase: P01-match-simulation
Task: T03-tactical-ai

- Add role-aware support and defensive coverage
- Select the nearest defender and tune keeper positioning
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: created with this task blueprint
