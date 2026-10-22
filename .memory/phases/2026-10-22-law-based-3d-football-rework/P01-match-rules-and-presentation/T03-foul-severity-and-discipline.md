# Task: T03 접촉 위험도 기반 파울 징계

## Status: pending

## Goal
현재 파울 감지 및 직접 프리킥/페널티킥 재개를 유지하면서 부주의 접촉, 무모한 태클, 과도한 힘을 구분한다. 부주의는 파울만, 무모함은 경고, 과도한 힘은 즉시 퇴장, 두 번째 경고는 퇴장으로 처리한다.

## Decision Summary
- 위험도는 기존 충돌 정보(후방 접근, tackle/slide 동작, power-tackle 활성 상태, 접촉 순간 속도)로 자동 판정한다. 별도 버튼은 추가하지 않는다.
- 파울 위치와 penalty area 판정은 유지한다. 양 팀 필드 선수에게 동일 적용한다.

## Implementation

### I01. 파울 분류 및 징계 상태 변경
- Related Files:
  - `game/src/game/stepGame.js` :: `isBehindTackler`, `awardFoul`, `resolveTackle`, `knockDownPlayer`; modify
  - `game/src/game/createInitialGameState.js` :: `createPlayer` foul/card 초기값; modify if separate caution count is needed
  - `game/src/game/constants.js` :: danger thresholds; modify if extracted

#### Details
- **Signatures & Types**:
  ```ts
  type FoulSeverity = 'careless' | 'reckless' | 'excessiveForce';
  type PlayerCard = 'none' | 'yellow' | 'red';
  type TackleContact = { behind: boolean; approachSpeed: number; sliding: boolean; powerTackle: boolean };
  classifyFoulSeverity(tackler: PlayerState, victim: PlayerState, contact: TackleContact): FoulSeverity;
  awardFoul(state: GameState, foulingPlayer: PlayerState, fouledPlayer: PlayerState,
    spot: { x: number; y: number }, severity: FoulSeverity): GameEvent[];
  ```
- **Data & Schema Fields**:
  - Add `PlayerState.yellowCardCount: number`, initialized 0. Keep `foulCount` only for compatibility; it no longer determines dismissal.
  - Keep `PlayerState.card: 'none' | 'yellow' | 'red'` and `dismissed: boolean`.
  - Add severity to `state.lastFoul` and foul events: `careless | reckless | excessiveForce`.
- **Execution Flow / Logic**:
  1. Keep current foul trigger: contact inside tackle range, player distance <=22, and either behind approach or tackler reaches player before ball.
  2. Compute `approachSpeed = max(0, dot(tackler.vx/vy, unit(victim - tackler)))`; `sliding = slideSeconds > 0 || motionAction === 'tackle'`; `powerTackle = powerTackleSeconds > 0`.
  3. Classify `excessiveForce` when powerTackle is active and contact is from behind or approachSpeed >= `SLIDE_SPEED * 0.9` (144 game units/sec).
  4. Otherwise classify `reckless` when sliding, or when behind and approachSpeed >= `PLAYER_SPEED * 0.75` (120 units/sec). Other triggered fouls are `careless`.
  5. Careless does not change card/yellowCardCount and emits no card event. Reckless increments yellowCardCount and sets yellow; when the count becomes 2, set card red and dismissed=true. ExcessiveForce immediately sets red/dismissed and does not add a yellow first.
  6. For second caution emit `yellowCard`, then `redCard` and `playerDismissed`; straight red emits `redCard` and `playerDismissed`; careless emits only foul and restart events. Add severity to foul event and `lastFoul`.
  7. Keep `awardFoul` spot clamp, freeKick/penaltyKick selection, one-second restart setup, possession and taker selection unchanged.
  8. Existing `skillProtected` may affect tackle success but must not suppress severity classification when power-tackle contact meets excessiveForce criteria.
  9. Use same classifier for home and away. Do not add a tackle button or new 3D motion rendering in this task.
- **Error & Exception Handling**:
  - Non-finite approach speed is 0; unknown severity becomes careless. Dismissed tacklers cannot create fouls/cards.
  - Missing caution count is 0. A second caution dismisses once without duplicate events.
- **State Transition & Return**:
  - Every foul preserves current free kick/penalty and possession state transition.
  - Careless: no card. Reckless: caution, then red at caution two. ExcessiveForce: straight red.

### I02. 경기 중 징계 알림
- Related Files:
  - `game/src/components/GameScreen.jsx` :: foul notice label; modify
- **Details**:
  - Keep FREE KICK/PENALTY KICK and append `부주의 접촉 · 파울`, `무모한 태클 · 경고`, `과도한 힘 · 퇴장`, or `두 번째 경고 · 퇴장`.
  - Older events without severity keep the current label.

## Acceptance Criteria
- [ ] 부주의는 재개만 주고 카드 상태/이벤트를 바꾸지 않는다.
- [ ] 무모한 태클은 경고, 같은 선수의 두 번째 경고는 퇴장이다.
- [ ] 과도한 힘은 곧바로 퇴장이다.
- [ ] 파울 위치와 프리킥/페널티 판정이 유지된다.
- [ ] 양 팀에 같은 규칙이 적용되고 조작 버튼이 늘지 않는다.
- [ ] HUD가 severity에 맞는 알림을 표시한다.

## Validation
- `cd game; npm run build` — Vite production build 성공
- 브라우저 수동 확인: 일반 접촉, 슬라이딩/후방, power tackle 후방 접촉, 2회 경고, 페널티 구역 파울.

## Commit Message
```text
feat(game): classify tackle fouls by severity

Plan: 2026-10-22-law-based-3d-football-rework
Phase: P01-match-rules-and-presentation
Task: T03-foul-severity-and-discipline

- Separate careless, reckless, and excessive force fouls
- Apply cautions and dismissals by severity and repeat cautions
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
