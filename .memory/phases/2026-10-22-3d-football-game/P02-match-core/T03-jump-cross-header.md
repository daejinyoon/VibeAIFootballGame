# Task: T03 점프·크로스·헤딩 물리

## Status: done

## Goal
Space 점프와 공의 수직 궤적을 게임 상태에 넣어 로빙 패스·측면 크로스·공중 경합과 헤딩을 실제 경기 판정으로 처리한다.

## Decision Summary
- 게임 엔진은 기존 평면 `x/y` 계산을 유지하고 `jumpHeight`, `height`, `verticalVelocity`를 추가한다. 렌더러가 평면을 Three.js `x/z`로 변환한다.
- 크로스는 A 로빙 패스를 측면에서 공격 방향으로 보낼 때 발생한다. 헤딩은 Space 점프 중 공과 머리 높이에서 접촉하면 자동으로 일어난다.

## Implementation

### I01. 점프 입력과 선수 수직 상태
- Related Files:
  - `game/src/game/constants.js` :: `JUMP_INITIAL_VELOCITY`, `JUMP_GRAVITY`, `JUMP_MAX_HEIGHT` — 수치; modify
  - `game/src/game/createInputController.js` :: `GAME_KEYS`, `readFrame` — Space pressed edge; modify
  - `game/src/game/createInitialGameState.js` :: `createPlayer` — jump fields; modify
  - `game/src/game/stepGame.js` :: `stepGame` — 점프·착지; modify
  - `game/src/game/createInputController.test.js`, `game/src/game/stepGame.test.js` — 신규 케이스; modify
- Details
  - **Signatures & Types**:
    ```js
    export function createInputController(targetWindow = window)
    export function stepGame(state, inputFrame, deltaSeconds)
    ```
  - **Data & Schema Fields**:
    - `InputFrame.pressed`에 `'Space'`를 포함한다. `KeyboardEvent.code==='Space'`를 내부 키 `'Space'`로 정규화한다.
    - Player fields: `jumpHeight:number`(0 이상), `jumpVelocity:number`, `jumpCooldownSeconds:number`.
    - 상수 초기값: `JUMP_INITIAL_VELOCITY=360`, `JUMP_GRAVITY=920`, `JUMP_MAX_HEIGHT=70`, `JUMP_COOLDOWN_SECONDS=0.15`(재점프는 발이 땅에 닿은 후 허용).
  - **Execution Flow / Logic**:
    1. 조작 중인 비퇴장 필드 선수만 `pressed.has('Space')`에 반응한다. 골키퍼는 점프하지 않는다.
    2. 바닥에 있고 cooldown 0일 때 `jumpVelocity`를 초기값으로 설정한다.
    3. 각 step에서 `jumpVelocity -= JUMP_GRAVITY*dt`, `jumpHeight += jumpVelocity*dt` 한다.
    4. height가 0 이하가 되면 height/velocity를 0으로 clamp한다. 일시정지·실점 reset에서도 점프 값을 초기화한다.

### I02. 공중 공·크로스·헤딩 판정
- Related Files:
  - `game/src/game/constants.js` :: `BALL_GRAVITY`, `HEADER_RADIUS`, `HEADER_HEIGHT_MIN/MAX` — 공중 수치; modify
  - `game/src/game/createInitialGameState.js` :: `ball` schema — `height`, `verticalVelocity`; modify
  - `game/src/game/stepGame.js` :: 로빙 패스, `stepBall`, `resolvePlayerBallContacts` — 공중 궤적과 헤딩; modify
  - `game/src/game/stepGame.test.js` — 로빙·크로스·헤딩 테스트; modify
- Details
  - **Data & Schema Fields**:
    - Ball fields: 기존 `x,y,vx,vy` + `height:number`, `verticalVelocity:number`, `flightKind:'ground'|'lob'|'cross'|'header'|'skill-shot'`, `flightSeconds:number`.
    - 상수 초기값: `BALL_GRAVITY=900`, `LOB_VERTICAL_VELOCITY=360`, `HEADER_RADIUS=24`, contact head-height window `20..72` 게임 단위. 모든 수치는 constants에 모은다.
  - **Execution Flow / Logic**:
    1. A 로빙패스 발사 때 `height=0`, `verticalVelocity=LOB_VERTICAL_VELOCITY`; 지면 포물선 중에는 기존 수평 pass target/last touch 규칙을 유지한다.
    2. 필드의 y가 전체 높이 22% 이내 위·아래 측면이고 발사 방향이 공격 진영이면 `flightKind='cross'`; 그 밖의 A 패스는 `'lob'`이다.
    3. 매 step에 `verticalVelocity -= BALL_GRAVITY*dt`, `height += verticalVelocity*dt`. 착지하면 height와 verticalVelocity를 0으로 만들고 기존 루즈볼·가로채기 규칙으로 돌아간다.
    4. `height>0`이며 공이 내려오는 동안 `jumpHeight>0`인 선수 중 공과 평면 거리가 가장 가까우며 거리 24 이하, 공 높이와 머리 위치 차가 20..72인 선수가 있으면 헤딩한다. 같은 거리면 배열상 앞선 선수 한 명만 선택한다.
    5. 헤딩은 공을 소유 없는 상태로 만들고 선수의 facing 방향(없으면 공격 방향)으로 수평 속도 360, 수직 속도 120을 설정해 `flightKind='header'`로 보낸다. 양 팀 선수 모두 같은 조건을 적용한다.
    6. AI 필드 선수는 공이 내려오며 평면 거리 90 이내면 Space 입력 없이 점프 상태를 자동 시작해 경합한다.

## Acceptance Criteria
- [x] Space 입력으로 점프 후 중력에 따라 다시 착지하고 공중에서 재점프할 수 없다.
- [x] A 로빙 패스가 실제 높이와 포물선 궤도를 가지며, 측면에서 공격 방향으로 보낼 때 크로스 분류된다.
- [x] 사람/AI 선수가 공중에서 접촉하면 헤딩 궤적과 소유권 이벤트가 발생한다.
- [x] 기존 땅볼 패스·슛·경계·골 규칙은 공중 물리로 회귀하지 않는다.

## Validation
- `npm test` — 입력·stepGame 테스트 전체 통과
- `npm run build` — 앱 컴파일 성공

## Commit Message
```text
feat(game): add jumping crosses and headers

Plan: 2026-10-22-3d-football-game
Phase: P02-match-core
Task: T03-jump-cross-header

- Add Space jump and vertical ball trajectory state
- Resolve crosses and automatic aerial headers
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 0becc05
