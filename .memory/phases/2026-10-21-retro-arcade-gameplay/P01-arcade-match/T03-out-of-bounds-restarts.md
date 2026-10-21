# Task: T03 아웃과 경기 재개 규칙

## Status: done

## Goal
공이 필드 바깥으로 나갔을 때 위치와 마지막 터치 팀으로 스로인·골킥·코너킥을 판정하고, 기존 중앙 킥오프 리셋을 올바른 경기 재개로 대체한다.

## Decision Summary
- 터치라인 아웃은 마지막 터치의 반대 팀에 주며 가까운 선수의 자동 스로인으로 빠르게 재개한다.
- 골라인 아웃은 공격 팀 마지막 터치면 골킥, 수비 팀 마지막 터치면 공격 팀 코너킥이다. 필드 좌우 방향은 home은 오른쪽, away는 왼쪽 공격으로 기존 규칙과 같다.

## Implementation

### I01. 경계 판정과 자동 재개
- Related Files:
  - `game/src/game/stepGame.js` :: `setBallOwner`, `putBallAtPlayer`, `resetForKickoff`, `checkBallBoundary`, `beginGoalKick`, `stepGame` — 재개 상태 전이; modify
  - `game/src/game/createInitialGameState.js` :: 초기 공 상태 — 마지막 터치 기본값; read-only unless schema extension required
  - `game/src/game/constants.js` :: `FIELD.goalTop`, `FIELD.goalBottom` — 골대 구간; read-only
  - `game/src/game/stepGame.test.js` :: 경계 재개 시나리오; modify

#### Details
- **Signatures & Types**:
  ```js
  // internal checkBallBoundary(state) -> GameEvent[]
  // internal restartThrowIn(state, restartTeam, exitX, exitY) -> GameEvent[]
  // internal restartCorner(state, restartTeam, exitX, exitY) -> GameEvent[]
  // existing beginGoalKick(state, deltaSeconds) -> GameEvent[] remains public-file internal
  ```
- **Data & Schema Fields**:
  - `state.phase`: existing strings plus `cornerKick` if a short automatic corner animation is used; prefer instant restart and keep `playing` for throw-in/corner.
  - `state.ball.lastTouchTeam`: `'home' | 'away'`; use to determine restart team.
  - New event variants: `{ type:'throwIn', team, playerId }`, `{ type:'cornerKick', team, playerId }`, `{ type:'goalKick', team, playerId? }`.
  - Throw-in and corner place the restart player at the clamped exit coordinate. Goal kick retains current one-second `goalKick` phase and keeper possession.
- **Execution Flow / Logic**:
  1. Precondition & Validation: process a ball outside x `[0, FIELD.width]` or y `[0, FIELD.height]` only when it has not scored through the goal mouth. A score check runs before out adjudication, as today.
  2. Core Processing: if y crossed a touchline, restart team is opposite `lastTouchTeam`; select nearest non-dismissed player of that team to `{clamp(ball.x), yEdge}`. If x crossed goal line outside goal mouth, attack direction identifies whether last touch was attacker or defender: attacker last touch awards keeper's goal kick; defender last touch awards a corner to attacking team. Select nearest eligible restart player. Throw-in/corner are automatic: place ball at restart player and immediately pass it at ground speed 275 toward nearest active teammate (tie-break by player array order); if no teammate exists, keep ball with restart player at feet. Goal kick sets keeper owner and follows existing countdown/launch behavior. Record `lastTouchTeam` consistently.
  3. Error & Exception Handling: if lastTouchTeam missing, use the existing fallback restart team `home`; if no eligible restart player, leave match state safe, stop ball, and emit restart event with `playerId:null`. Coordinates are clamped to FIELD.
  4. State Transition & Return: replace generic `outOfBounds`/center kickoff behavior with a specific event. Throw-in/corner remain in `playing`; goal kick uses `goalKick`. Scores, remaining time, stage, skill gauge, and loadout are preserved.

### I02. Boundary regression tests
- Related Files:
  - `game/src/game/stepGame.test.js` :: touchline, goal-line, post, and goal-mouth cases; modify
- **Details**:
  - Test both touchlines and both end lines, both last-touch teams, exit near/outside goal mouth, and actual goal mouth scoring.
  - Assert nearest eligible restart player, clamped coordinates, correct restart team/event, and preservation of score/timer/stage.

## Acceptance Criteria
- [ ] Touchline exits award an automatic throw-in to the team that did not last touch the ball.
- [ ] Goal-line exits award goal kick or corner according to last touch and attack direction.
- [ ] A ball crossing within the goal mouth still scores before out logic.
- [ ] No restart resets score, timer, or campaign stage.
- [ ] Existing keeper-catch goal-kick flow continues to work.

## Validation
- `cd game; npm test -- --test-name-pattern="boundary|goal|kick|throw|corner|out"` — boundary and restart cases pass
- `cd game; npm test` — full test suite passes
- `cd game; npm run build` — Vite build succeeds

## Commit Message
```text
feat(game): add football throw-in and goal-line restarts

Plan: 2026-10-21-retro-arcade-gameplay
Phase: P01-arcade-match
Task: T03-out-of-bounds-restarts

- Award throw-ins, goal kicks, and corners from last-touch rules
- Keep restart state local to the match without resetting campaign progress
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
