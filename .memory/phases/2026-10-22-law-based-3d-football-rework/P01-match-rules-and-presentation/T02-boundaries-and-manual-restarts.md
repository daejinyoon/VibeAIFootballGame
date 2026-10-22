# Task: T02 공 경계 판정과 직접 조작하는 경기 재개

## Status: done

## Goal
공 전체가 경기장 경계선을 넘었을 때 정확한 스로인/골킥/코너킥을 판정하고, 홈 사용자가 위치·방향·재개 액션을 선택한다. 골킥 중 골키퍼로 자동 전환하고 킥 후 직전 조작 선수로 복귀한다.

## Decision Summary
- 공 전체 아웃 및 마지막 터치에 따른 재개만 적용한다. 오프사이드는 추가하지 않는다.
- 스로인은 잠시 멈춘 뒤 방향을 골라 S로 던진다. 코너는 A 크로스/S 짧은 패스. 골킥은 A 장거리/S 짧은 패스다.
- 홈 골킥 동안 keeper를 조작하며 킥 후 이전 선택 선수로 돌아온다. away 재개는 AI 처리다.

## Implementation

### I01. 아웃 감지와 재개 상태 데이터
- Related Files:
  - `game/src/game/constants.js` :: `FIELD`, `BALL_RADIUS`; modify
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState`; modify
  - `game/src/game/stepGame.js` :: `stopBallAtFieldEdge`, `restartThrowIn`, `restartCorner`, `restartGoalKick`, `checkBallBoundary`, `stepGame`; modify

#### Details
- **Signatures & Types**:
  ```ts
  type RestartType = 'throwIn' | 'cornerKick' | 'goalKick';
  type RestartState = {
    type: RestartType; team: 'home' | 'away'; takerId: string | null;
    spot: { x: number; y: number }; readySeconds: number;
    previousControlledPlayerId: string | null;
  } | null;
  // GameState adds restart: RestartState; phase adds 'throwIn' | 'cornerKick'.
  ```
- **Data & Schema Fields**:
  - `BALL_RADIUS = 11.6` game units, from `FootballBall3D.jsx` radius `0.145` Three units × field conversion 80.
  - `GameState.restart` is null in normal play and populated while waiting for a manual/AI restart.
  - `previousControlledPlayerId` is used only for home goal kick; fallback is nearest active home player.
- **Execution Flow / Logic**:
  1. `checkBallBoundary` tests whole ball extents: touchline if `y < -BALL_RADIUS || y > FIELD.height + BALL_RADIUS`; goal line if `x < -BALL_RADIUS || x > FIELD.width + BALL_RADIUS`.
  2. A goal counts only when the ball’s full y diameter passes within the goal opening: `ball.y - BALL_RADIUS >= FIELD.goalTop && ball.y + BALL_RADIUS <= FIELD.goalBottom`, with the whole ball past the goal line. Preserve attack direction/score team.
  3. Keep last-touch mapping: touchline awards throw-in to opposite team; goal-line by attacker awards goal kick to defender; by defender awards corner to attacker.
  4. Throw spot uses x clamped to `[0, FIELD.width]` and y at the touchline. Corner uses the corresponding corner, 18 units inside the field. Goal kick places ball at the defending goalkeeper’s goal area.
  5. Stop play at restart, zero ball velocity and set `readySeconds=0.35`. Do not pause the established match clock during this state.
  6. Home restart taker is the nearest active teammate at the restart spot. For a home goal kick save current controlled id then set controlled id to goalkeeper. Away restart executes its selected AI action after readiness.
  7. While readySeconds > 0 ignore restart actions. Afterward direction keys update taker facing. Throw-in uses S; corner uses A cross/S short pass; goal kick uses A long/S short pass. Only existing Arrow/A/S keys are needed.
  8. S restart short pass targets nearest forward active teammate; when none exists it targets 180 units in facing direction. Corner A targets an attack-side goal-area point in facing lane. Goal-kick A targets 300 units ahead. Clamp target to field bounds.
  9. After the ball is released set restart=null and restore phase to `playing` or `overtime`. After home goal-kick kick restore prior active home controlled id, falling back to nearest active home player.
  10. Keep normal loose ball interception, aerial contest, goalkeeper contact, and boundary checking active after restart release.
- **Error & Exception Handling**:
  - If no active taker exists, ignore A/S rather than emitting an invalid kick. Do not invent forfeit rules.
  - Zero facing uses existing taker facing, then attack direction. Invalid ball coordinates cannot reach Three/game boundary math; clamp/finite check first.
  - Finished/goal transition cancels any stale restart.
- **State Transition & Return**:
  - Restart event keeps existing `throwIn`, `cornerKick`, `goalKick` with `team` and `playerId`.
  - Released pass/kick event is `pass` with action `throwIn`, `cornerCross`, `goalKickLong`, or `groundPass`; subsequent ball flight uses normal simulation.

### I02. 재개 상황 조작 안내
- Related Files:
  - `game/src/components/GameScreen.jsx` :: phase-dependent restart prompt; modify
  - `game/src/game/createInputController.js` :: `GAME_KEYS`/`readFrame`; read-only unless an existing key is missing
- **Details**:
  - 재개 동안 현재 상황에 맞춰 `방향키로 방향 선택 · S 스로인`, `A 크로스 · S 짧은 패스`, `A 장거리 킥 · S 짧은 패스`를 표시한다.
  - 재개 외에는 T01 조작 문구를 쓴다. 새로운 키를 추가하지 않는다.

## Acceptance Criteria
- [ ] ball center가 아니라 ball 전체가 경계를 넘었는지로 아웃/득점을 판정한다.
- [ ] 마지막 터치에 맞춰 throw-in/corner/goal kick의 팀과 종류가 맞다.
- [ ] 스로인 잠시 정지 후 S와 방향 입력으로 직접 던진다.
- [ ] 코너 A/S와 골킥 A/S가 각각 cross/long 또는 short restart로 작동한다.
- [ ] 골킥 중 home 조작자가 keeper이고 킥 뒤 이전 선택자로 복귀한다.
- [ ] 재개 대기 중에도 경기 시계가 계속 감소하고 발사 후 일반 경기가 이어진다.

## Validation
- `cd game; npm run build` — Vite production build 성공
- 브라우저 수동 확인: 양 터치라인/골라인 마지막 터치 양쪽, 네 코너, 골킥, 골문 끝 위치, 조작 선수 복귀.

## Commit Message
```text
feat(game): add rule based manual match restarts

Plan: 2026-10-22-law-based-3d-football-rework
Phase: P01-match-rules-and-presentation
Task: T02-boundaries-and-manual-restarts

- Judge boundaries by the full ball crossing the line
- Add user controlled throw-ins, corners, and goal kicks
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`npm run build`)
- commit: pending
