# Task: T02 골 입구와 기본 자동 태클

## Status: done

## Goal

골 입구 유효 높이를 120에서 180으로 넓히고, 상대 공격수가 공을 가지고 있을 때 사용자가 조종하는 수비수가 가까이 접근하면 스킬이나 A 키 없이 기본 태클을 시도하게 한다.

## Decision Summary

- 골 입구는 필드 세로 중앙 270을 기준으로 `goalTop=180`, `goalBottom=360`으로 설정한다.
- 자동 태클 거리와 쿨다운은 기존 규칙의 26 게임 단위와 1.35초를 재사용한다. 카드·파울·퇴장 판정은 추가하지 않는다.

## Implementation

### I01. 골 입구 수치와 세이브·슛 범위 동기화

- Related Files:
  - `game/src/game/constants.js` :: `FIELD.goalTop`, `FIELD.goalBottom`; modify
  - `game/src/game/stepGame.js` :: `releaseShot`, `shotCanReachGoal`, `keeperThreat`, `updateKeeperPosition`, 골 경계 처리; modify
  - `game/src/game/skills.js` :: `applyEagleShot`, `applyTornadoShot` 골대 조준; read-only unless tests reveal a hard-coded opening
  - `game/src/components/FootballPitch3D.jsx` :: `Goal`, `FootballPitch3D`; read-only because posts derive from FIELD
  - `game/src/game/stepGame.test.js` :: 경계 득점과 골키퍼 반응; modify
  - `game/src/game/skills.test.js` :: 스킬 슛의 on-target 범위; modify

#### Details

- **Signatures & Types**:
  ```js
  export const FIELD = Object.freeze({ width: 960, height: 540, goalTop: 180, goalBottom: 360 });
  function shotCanReachGoal(player) // boolean
  function keeperThreat(state, keeper) // null | { seconds, y, height, reachable }
  ```
- **Data & Schema Fields**:
  - 게임 필드 픽셀 좌표에서 중심 `y=270`, 반높이 `90`, 총 유효 높이 `180`이다.
  - `BALL_RADIUS=11.6`을 포함한 실제 골 판정은 공 전체가 aperture 안에 있는 기존 규칙을 유지한다.
- **Execution Flow / Logic**:
  1. `constants.js`에서 `goalTop`을 180, `goalBottom`을 360으로 변경한다.
  2. `stepGame.js`가 이미 참조하는 목표 조준, 골라인 판정, `predictGoalCrossing`, `keeperThreat`의 경계는 FIELD 값으로 계산되므로 해당 참조를 숫자 상수로 대체하지 않는다.
  3. `updateKeeperPosition`의 기존 `clamp(targetY, 224, 316)`은 골대 가장자리 14 단위를 유지해 `clamp(targetY, FIELD.goalTop + 14, FIELD.goalBottom - 14)`로 바꾼다.
  4. `FootballPitch3D.jsx`의 `halfMouth`는 기존에 FIELD 범위를 사용하므로 별도 비율 상수나 임시 크기 조정을 추가하지 않는다.
  5. 공 중심이 새 입구 안에 있지만 공 외곽이 포스트를 넘는 경계 사례와, 새 입구 밖인 사례를 테스트한다. 골키퍼가 새 입구 끝까지 반응하는지 함께 검사한다.
- **Error & Exception Handling**: 기존의 `BALL_RADIUS`, crossbar 높이, 골 판정 순서를 보존한다. 새 골 폭을 이유로 필드 바깥 좌표나 골대 밖 높이의 공을 득점 처리하지 않는다.
- **State Transition & Return**: 필드 상수만으로 렌더링, 일반 슛, 스킬 슛, 골 판정, 골키퍼 예상 교차점이 동일한 180 높이를 사용한다.

### I02. 조종 수비수의 근접 자동 태클

- Related Files:
  - `game/src/game/stepGame.js` :: `updateAi`, `resolveTackle`, `putBallAtPlayer`; modify
  - `game/src/game/stepGame.test.js` :: 사용자 조종 수비수 태클 테스트; modify

#### Details

- **Signatures & Types**:
  ```js
  function updateAi(state, controlled, input, deltaSeconds, events) // Player
  function resolveTackle(state, tackler, ballCarrier) // GameEvent[]
  ```
- **Data & Schema Fields**:
  - 새 persistent/profile 필드는 없다. `player.aiTackleCooldownSeconds`를 기존 1.35초의 반복 방지에 재사용한다.
- **Execution Flow / Logic**:
  1. `updateAi`에서 공 소유가 away이고 `opponentCarrier`가 있을 때 기존 이동 입력, D 압박, A 슬라이드 이동을 먼저 적용한다.
  2. 이동 후 controlled가 dismissed/stunned/knocked-down/recover 상태가 아니고 `aiTackleCooldownSeconds <= 0`, `distance(controlled, opponentCarrier) <= 26`이면 `putBallAtPlayer(state, opponentCarrier)` 다음 `resolveTackle(state, controlled, opponentCarrier)`를 호출한다.
  3. 태클 이벤트가 생겼을 때만 쿨다운을 1.35초로 설정한다. carrier가 없거나 거리가 범위 밖이면 공 소유·쿨다운을 바꾸지 않는다.
  4. 기존 A 슬라이드 태클과 D 압박 이동을 유지하며, 태클 결과는 기존 `resolveTackle`의 소유권 이전·넉다운·모션을 사용한다.
- **Error & Exception Handling**: `resolveTackle`의 기존 eligibility 조건과 26 거리 제한을 우회하지 않는다. 파울, 카드, 퇴장, penalty 이벤트는 만들지 않는다.
- **State Transition & Return**: 조건 충족 시 기존 수비 태클 이벤트와 함께 공 소유가 home으로 바뀌고, 다음 자동 태클은 쿨다운 종료 뒤에만 가능하다.

#### Regression Cases

- 조종 수비수가 공 소유 away 선수로 걸어가 26 이내가 되면 A 또는 F 입력 없이 tackle 이벤트, `motionAction='tackle'`, home 소유권을 얻는다.
- 26 초과, 스턴/넉다운 상태, 또는 이미 쿨다운 중인 경우 자동 태클이 발동하지 않는다.
- 기존 A 슬라이드 태클, 비조종 수비수의 자동 압박, 카드 없는 규칙을 유지한다.

## Acceptance Criteria

- [x] 골대 화면과 실제 판정 모두 180 높이를 사용한다.
- [x] 변경된 aperture의 가장자리 슛과 골키퍼 범위가 테스트된다.
- [x] 가까운 조종 수비수가 스킬이나 태클 버튼 없이 상대 공을 탈취한다.
- [x] 기존 수동 슬라이드와 무카드 태클 동작이 유지된다.

## Validation

- `node --test '--test-name-pattern=goal|shot|keeper|tackle'` from `game/` — 득점 경계, 골키퍼, 태클 회귀 테스트 통과 (48 passed).
- `npm run build` from `game/` — 프로덕션 빌드 성공.

## Commit Message

```text
feat(match): widen goals and add close-range tackles

Plan: 2026-10-27-audio-match-balance
Phase: P01-audio-matchplay-and-goal-kick
Task: T02-goal-opening-and-basic-tackle

- Widen the goal opening consistently across play and presentation
- Let the controlled defender win the ball at close range
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending
