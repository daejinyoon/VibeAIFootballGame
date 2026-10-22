# Task: T01 충전 게이지 없는 방향 조작 패스와 슛

## Status: done

## Goal
공격 액션을 버튼 누름 즉시 실행하고 일반 공격 충전 게이지를 제거한다. S 땅볼 패스와 A 로빙 패스는 선수의 바라보는 방향을 기준으로 목적지를 정하고, D 슛은 골대 거리별 자동 조준 보정을 적용한다. 수비 중 S 선수 전환, 기존 기술/헤딩 동작은 보존한다.

## Decision Summary
- 일반 A/S/D에는 누름 시간 충전이 없다. D는 눌렀을 때 즉시 슛한다.
- S는 바라보는 방향 앞의 가장 가까운 동료, 없으면 같은 방향 빈 공간을 택한다. A는 앞쪽 동료를 전방 거리순으로 정렬해 두 번째로 먼 선수를 택하고, 한 명이면 그 선수, 없으면 제한 거리 전방 걷어내기를 한다.
- 가까운 슛일수록 자동 조준 보정을 높인다. 골키퍼/수비의 선방·차단은 유지한다.
- 수비 중 S 선수 순환 선택은 기존 동작을 보존한다.

## Implementation

### I01. 시뮬레이션 입력과 공격 액션 변경
- Related Files:
  - `game/src/game/stepGame.js` :: `chooseReceiver`, `releasePass`, `releaseShot`, `handleHomeAttack`, `controlBallAction`, `stepGame`; modify
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` charge 초기 필드; modify
  - `game/src/game/constants.js` :: clear 거리/슛 보정 상수; modify

#### Details
- **Signatures & Types**:
  ```ts
  type PlayerState = { id: string; team: 'home' | 'away'; role: string; x: number; y: number; facingX: number; facingY: number; dismissed: boolean };
  type PassTarget = { x: number; y: number; receiver: PlayerState | null; kind: 'groundPass' | 'lobPass' | 'clearance' };
  chooseReceiver(state: GameState, passer: PlayerState, action: 'groundPass' | 'lobPass'): PassTarget | null;
  releasePass(state: GameState, player: PlayerState, target: PassTarget): GameEvent[];
  releaseShot(state: GameState, player: PlayerState): GameEvent[];
  ```
- **Data & Schema Fields**:
  - `PlayerState.facingX/facingY`는 조준 벡터다. 0,0이면 팀 공격 방향(home `+x`, away `-x`)을 쓴다.
  - `GameState.charge`는 일반 A/S/D 액션에서 더 이상 사용하지 않는다. 초기 필드와 `stepGame` 내 시작/취소/리셋 코드를 제거한다. 스킬 독립 충전 데이터가 있으면 유지한다.
  - `BallState.passTarget`은 땅볼 목표 `{x:number,y:number}`를 유지한다. 공중 패스는 `flightTarget: {x:number,y:number} | null`을 저장해 선택 지점을 넘지 않게 한다.
- **Execution Flow / Logic**:
  1. facing은 기존 이동 방향키를 누를 때 갱신하고, 입력이 없으면 마지막 방향을 유지한다. 패스 조준은 `input.moveX/moveY`가 아니라 facing을 사용한다.
  2. `input.pressed`에서 A/S/D를 즉시 처리하고 키 release/CHARGE_SECONDS를 기다리지 않는다.
  3. 전방 후보는 생존한 비골키퍼 동료 중 facing 내적이 0보다 큰 선수다. S는 거리 오름차순 첫 후보, A는 전방 거리 내림차순 두 번째 후보(1명일 때 그 선수)를 선택한다.
  4. 후보가 없으면 S는 180 game unit, A는 260 game unit 앞의 빈 공간을 목표로 한다. 목표 x/y는 필드 경계에 clamp한다.
  5. 수신자/목표 거리 및 액션에 맞춰 공의 수평 속도와 flight duration을 설정한다. 공중 패스는 `flightTarget`까지의 수평 이동을 제한하고 도착 후 수평 속도를 0으로 만들어 A가 목표 지점을 지나지 않게 한다. 전방/측면 조합에 따른 기존 lob/cross 분류와 공중 경합은 유지한다.
  6. D는 `releaseShot(state, controlled)`를 즉시 호출한다. 공격 골문 중심을 기준으로 목표 궤적을 계산하고 goal distance가 짧을수록 goal mouth 방향으로 강하게 보정한다. 먼 거리 보정은 낮춘다. 기존 골키퍼/수비 충돌 판정은 계속 적용한다.
  7. away AI의 패스/슛 호출에서도 charge 인자를 제거하고 AI가 고른 receiver를 보존한다.
  8. 기존 테스트 파일은 수정/추가하지 않는다. 이 Task는 production build와 브라우저 수동 확인으로 검증한다.
- **Error & Exception Handling**:
  - dismissed/골키퍼 teammate는 일반 패스 후보에서 제외한다. 방향 길이가 0/NaN이면 팀 공격 방향을 쓴다.
  - 비수치 좌표는 목표 계산에 전달하지 않는다. 모든 계산된 목적지는 필드 안으로 clamp한다.
- **State Transition & Return**:
  - 패스는 ball.ownerId=null, possessionTeam/lastTouchTeam=패서 팀으로 만들고 홈 팀 수신자를 controlledPlayerId로 선택한다.
  - 슛은 flightKind=`shot`, ownerId=null로 전환하고 기존 shot/shotOnTarget 이벤트를 반환한다.

### I02. 게임 화면의 충전 표시 제거와 조작 설명 변경
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen`의 charge selector/UI/조작 안내; modify
  - `game/src/styles.css` :: `.charge-gauge*` 규칙; modify
- **Details**:
  - `chargePercent`, `chargeLabels`, `.charge-gauge` JSX와 전용 미사용 CSS를 제거한다.
  - 조작 안내는 `방향키 이동 · Space 점프/헤딩 · A 로빙 패스/걷어내기 · S 땅볼 패스(수비 시 선수 전환) · D 슛 · F 스킬`로 표시한다.
  - stage, foul notice, skill stock, pause/error UI는 유지한다.

## Acceptance Criteria
- [ ] A/S/D가 keydown 프레임에 실행되고 길게 눌러도 힘/사거리가 바뀌지 않는다.
- [ ] S가 가장 가까운 앞 동료 또는 전방 빈 공간을 선택한다.
- [ ] A가 두 번째로 먼 앞 동료, 유일 후보, 또는 260-unit 전방 clear를 선택한다.
- [ ] D의 근거리 보정이 원거리보다 강하고 골키퍼/수비가 막을 수 있다.
- [ ] 수비 중 S, Space, F와 기타 경기 상태 전이가 유지된다.
- [ ] charge gauge가 사라지고 설명이 실제 입력과 일치한다.

## Validation
- `cd game; npm run build` — Vite production build 성공
- 브라우저 수동 확인: 앞 동료 0/1/2명인 A/S, 근거리/원거리 D, 수비 S 전환, Space/F 동작.

## Commit Message
```text
feat(game): remove action charge and add facing based controls

Plan: 2026-10-22-law-based-3d-football-rework
Phase: P01-match-rules-and-presentation
Task: T01-instant-controls-and-passing

- Make passes and shots execute immediately
- Select pass targets from facing and remove charge gauge
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`npm run build`)
- commit: pending
