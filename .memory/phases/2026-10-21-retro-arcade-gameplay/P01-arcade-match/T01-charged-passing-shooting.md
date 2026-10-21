# Task: T01 충전식 패스와 8방향 슛

## Status: done

## Goal
공격 중 A/S/D를 누르고 놓아 힘과 방향을 조절하고, S 패스의 비가로채기 및 루즈볼 예외까지 시뮬레이션에서 일관되게 처리한다.

## Decision Summary
- 공격 입력은 1초에 걸쳐 55–100%로 충전하며, 방향키 이동은 충전 중에도 유지한다. 슛은 마지막 이동 방향의 8방향으로 나간다.
- S 패스는 릴리즈 시점 수신 선수 위치를 목표로 하며 비행 중 상대가 가로챌 수 없다. 도착 또는 목표 이탈 후에는 루즈볼을 양 팀이 주울 수 있다. A 로빙 패스는 착지 후 양 팀이 주울 수 있다.

## Implementation

### I01. 패스·슛 시뮬레이션과 패스 보호 상태
- Related Files:
  - `game/src/game/stepGame.js` :: `chooseReceiver`, `releasePass`, `releaseShot`, `integrateLooseBall`, `collectLooseBall`, `handleHomeAttack`, `stepGame` — 입력 릴리즈에서 공 상태와 이벤트 전이; modify
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` — 초기 충전 상태 및 수신 목표/보호 상태 기본값; modify
  - `game/src/game/constants.js` :: `FIELD` — 공 경계 계산에 사용; read-only
  - `game/src/game/stepGame.test.js` :: 패스·슛·루즈볼 시나리오; modify

#### Details
- **Signatures & Types**:
  ```js
  // 내부 helper: chooseReceiver(state, passer, moveX, moveY) -> Player | null
  // 내부 helper: releasePass(state, player, kind, chargeRatio, moveX, moveY) -> GameEvent[]
  // 내부 helper: releaseShot(state, player, chargeRatio) -> GameEvent[]
  // 공개 API 유지: stepGame(state, inputFrame = {}, deltaSeconds = 0) -> GameEvent[]
  // GameEvent은 기존 plain object union이며 pass, shot, shotOnTarget 타입을 유지한다.
  ```
- **Data & Schema Fields**:
  - `state.charge`: `{ action: 'lobPass' | 'groundPass' | 'shot' | null, elapsedSeconds: number }`; 0초부터 1초까지 clamp한다.
  - `state.ball.passTeam`: 기존 선택 팀 문자열을 유지하고 패스 완료 이벤트 판단에 사용한다.
  - `state.ball.passTarget`: `{ x: number, y: number } | null`; 릴리즈 순간 수신자 위치를 복사한다.
  - `state.ball.passProtectionSeconds`: `number`, 기본 0. 땅볼 S 패스 이동시간만큼 감소시키고, 0 이하일 때 상대의 볼 픽업을 허용한다. `setBallOwner` 및 새 킥 상태 초기화 때 0/null로 지운다.
  - `Player.facingX`, `Player.facingY`: 현재 필드에 이미 존재하는 마지막 이동 방향의 부호값. 움직임이 없으면 기존 facing을 유지한다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 공격 팀 소유이고 `state.ball.ownerId === controlled.id`일 때만 A/S/D 릴리즈가 공을 찬다. 경기장 입력 규격과 0–1 charge ratio를 기존 clamp로 보호한다.
  2. Core Processing: A/S/D 충전 동작과 `CHARGE_SECONDS=1`, `0.55 + 0.45 * ratio`를 유지한다. S/A 수신자는 릴리즈 순간 방향키 의도에 가장 가까운 유효 아군으로 정하고, 방향키 입력이 0이면 선수 facing을 사용한다. S 목표 좌표를 복사해 공 진행 시간/보호 시간을 설정한다. 보호 시간에는 `collectLooseBall` 후보에서 상대를 제외하고, 보호 종료 후에는 양 팀 모두 후보로 넣는다. 목표 수신자가 도착 지점에서 움직여 공이 빗나가더라도 어느 팀이든 공을 주울 수 있다. A는 `flightKind='lob'`, 착지 높이 0 후 정상 픽업을 허용한다. D는 `unit(player.facingX, player.facingY)`로 발사하며 목표 골문으로 강제 보정하지 않는다. 전력은 기존 충전 속도 계수를 유지한다.
  3. Error & Exception Handling: 수신 팀원이 없으면 패스 릴리즈는 빈 이벤트를 반환하고 공 소유/상태를 변경하지 않는다. 입력 누락은 기존 `stepGame`의 기본 빈 Set 처리로 무시한다. 잘못된 패스 목표는 기존 `clamp`로 FIELD 범위에 제한한다.
  4. State Transition & Return: S 패스 릴리즈 시 조작 선수는 선택 수신자로 전환하고 `{type:'pass', action:'groundPass', receiverId, completed:false}` 이벤트를 낸다. 실제 우리 선수가 픽업하면 완료 이벤트와 스킬 게이지 보상을 기존 흐름으로 낸다. 슛 이벤트에는 기존 `shot`을 내며, `shotOnTarget`은 기존 타깃 판정 대신 공의 발사 벡터가 양쪽 골문 개구부를 통과할 수 있는지로 판정한다.

### I02. 공격 중 충전 게이지 표시와 회귀 시나리오
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen` — 현재 공격 액션과 퍼센트를 화면 상태로 표시; modify
  - `game/src/styles.css` :: `.charge-gauge` 및 기존 `.game-bottomline` 규칙 — 픽셀풍 파워 게이지; modify
  - `game/src/game/stepGame.test.js` :: 기존 테스트와 추가 시뮬레이션 사례; modify
- **Details**:
  - `GameScreen`은 `viewState.charge.action`이 null이 아니면 해당 액션의 한글명(A 로빙패스/S 땅볼패스/D 슛), `elapsedSeconds / 1 * 100` 퍼센트를 노출한다. UI는 Canvas 물리 상태를 수정하지 않는다.
  - 테스트는 최소 충전·최대 충전, 릴리즈 직전 8방향 이동, 정지 시 마지막 facing, S 패스 진행 중 상대 픽업 불가, 목표 이동 후 보호 만료 시 상대 픽업 가능, 로빙 공이 뜬 동안 픽업 불가/착지 뒤 픽업 가능을 검증한다.
  - 기존 S 패스에서 실제 위치가 다른 선수에게 조작권이 넘어가는 테스트를 새 릴리즈 방향 선택 방식에 맞게 업데이트한다.

## Acceptance Criteria
- [ ] A/S/D를 누르는 동안 0–100% 게이지가 채워지고 놓으면 각각 로빙 패스/땅볼 패스/슛이 발생한다.
- [ ] 땅볼 패스 비행 보호 중 상대가 공을 소유할 수 없고, 보호 만료 후에는 어느 팀이나 픽업할 수 있다.
- [ ] 로빙 패스는 공중에서 픽업할 수 없고 착지한 뒤 양 팀이 경합한다.
- [ ] 슛의 x/y 속도 부호가 8개 facing 방향과 일치하며, 임의 목표 골문 방향으로 회전하지 않는다.
- [ ] 캔버스 없이도 게임 로직 테스트가 가능하고 기존 캠페인·스킬 테스트가 통과한다.

## Validation
- `cd game; npm test -- --test-name-pattern="pass|shot|ball|moves"` — 관련 게임 시나리오 테스트 통과
- `cd game; npm test` — 전체 Node 테스트 통과
- `cd game; npm run build` — Vite 프로덕션 빌드 성공

## Commit Message
```text
feat(game): add charged passing and eight-way shots

Plan: 2026-10-21-retro-arcade-gameplay
Phase: P01-arcade-match
Task: T01-charged-passing-shooting

- Show attack charge power and preserve directional movement
- Protect ground passes only until their target arrival window ends
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
