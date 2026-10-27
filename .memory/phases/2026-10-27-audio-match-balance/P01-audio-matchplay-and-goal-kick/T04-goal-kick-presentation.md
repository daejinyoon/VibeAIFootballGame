# Task: T04 골키퍼 골킥 연출과 수신 움직임

## Status: done

## Goal

골킥 준비 시간 동안 골키퍼가 킥을 준비하는 모션을 보여주고, 공이 발에서 나갈 때 전용 킥 모션을 재생하며, 양 팀 필드 선수들이 실제 골킥 패스를 받을 수 있는 위치로 달려가게 한다.

## Decision Summary

- 기존 골킥의 A 장거리 킥, S 짧은 패스, 상대 자동 재개를 보존한다.
- 새 렌더링/시뮬레이션 상태는 경기 중에만 존재하며 저장 데이터 스키마는 바꾸지 않는다.

## Implementation

### I01. 골킥 준비와 킥 동작 상태

- Related Files:
  - `game/src/game/stepGame.js` :: `beginManualRestart`, `releaseRestart`, `advanceManualRestart`, `beginGoalKick`, `launchAutomaticRestart`, `advancePlayerRecovery`, `advanceKeeperAction`; modify
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel`; goalkeeper pose animation; modify
  - `game/src/game/stepGame.test.js` :: manual/automatic 골킥 motion state; modify

#### Details

- **Signatures & Types**:
  ```js
  function beginManualRestart(state, type, restartTeam, spot) // GameEvent[]
  function releaseRestart(state, restart, action) // GameEvent[]
  function beginGoalKick(state, deltaSeconds) // GameEvent[]
  function advancePlayerRecovery(player, deltaSeconds) // void
  function advanceKeeperAction(player, deltaSeconds) // void
  export function MiiPlayerModel({ player, gameStateRef, pose, scale, paused, kit, logoId, isKeeper })
  ```
- **Data & Schema Fields**:
  - 골키퍼에 기존 optional runtime 필드 `keeperAction`과 `keeperActionSeconds`를 사용한다. 새 값은 `'goalKickPrepare'`, `'goalKick'`이며 각 animation timer는 각각 준비 시간 0.35초, 킥 모션 0.55초다.
  - `motionAction`은 새 영구 모델 필드가 아니며 기존 `motionAction`/`motionTimerSeconds`로 킥 동작 생명주기를 가진다.
- **Execution Flow / Logic**:
  1. 골키퍼 골킥 restart가 시작될 때 준비 동작을 설정한다. 사용자가 고른 A/S 입력 대기 시간은 기존 `restart.readySeconds=0.35`를 유지한다.
  2. home 수동 `releaseRestart`에서 `restart.type==='goalKick'`이면 공 속도를 설정하는 같은 프레임에 `keeperAction='goalKick'`, `keeperActionSeconds=0.55`, `motionAction='goalKick'`, `motionTimerSeconds=0.55`를 설정한다. shortPass 선택에서도 keeper kick/pass motion은 동일하게 재생한다.
  3. away 자동 restart의 `advanceManualRestart` 경로와 keeper save 후 `beginGoalKick` 자동 클리어 경로도 공 발사 직전 같은 킥 모션 상태를 설정한다.
  4. `advanceKeeperAction`은 골킥 `keeperActionSeconds`를 감소시키고 0에서 `keeperAction='idle'`로 복귀한다. `advancePlayerRecovery`는 `motionTimerSeconds` 0에서 `motionAction='idle'`로 복귀하도록 `goalKick`을 기존 timed action 목록에 추가한다. 기존 dive/recover timer 동작을 보존한다.
  5. `MiiPlayerModel`의 `isKeeper` 분기에서 준비 모션은 몸통을 살짝 기울이고 한 팔을 균형 자세로 벌린다. 킥 모션은 진행도 `1 - keeperActionSeconds / 0.55`로 계산해 차는 다리의 back-swing과 follow-through, 몸통 회전을 보간한다. pause 중에는 기존처럼 pose timer를 진행하지 않는다.
- **Error & Exception Handling**:
  - state가 오래된 경우 timer는 0으로 취급한다. goalkeeper가 dismissed이거나 사라진 경우 기존 restart 실패/자동 재개 동작을 바꾸지 않는다.
  - 재개 입력이 없거나 방향 벡터가 0이라 release에 실패한 경우 준비 동작을 킥 동작으로 바꾸지 않는다.
- **State Transition & Return**: goalKick 준비 상태 → 재개 입력/자동 재개 → 0.55초 골키퍼 킥 포즈 → idle 순으로 진행하며 공의 기존 비행 속도와 제어권 이동 규칙은 유지한다.

### I02. 필드 동료 수신 위치와 이동

- Related Files:
  - `game/src/game/stepGame.js` :: `positionHomeGoalKickTriangle`, `beginManualRestart`, `advanceManualRestart`, `moveToward`; replace/modify
  - `game/src/game/stepGame.test.js` :: 양 팀 goalKick support movement; modify

#### Details

- **Data & Schema Fields**:
  - 각 필드 선수의 기존 `aiTarget: {x:number,y:number}`와 `aiRetargetSeconds`만 사용한다. 저장 프로필과 경기 결과 schema는 변경하지 않는다.
- **Execution Flow / Logic**:
  1. 기존 `positionHomeGoalKickTriangle(state)`를 양 팀을 받을 수 있는 `positionGoalKickTriangle(state, team)`로 일반화한다. 필드 선수는 role/id 순으로 정렬하고 공격 방향에 따라 중앙 수신자 `x=70%`, 위·아래 수신자 `x=60%`의 기존 target 배치를 미러링한다. y 오프셋은 기존 `FIELD.height * 0.19`를 쓴다.
  2. 팀이 goalKick restart를 시작하면 해당 팀 필드 선수에게 각 target을 할당하고 `aiRetargetSeconds=0`으로 만든다. 다른 팀 선수를 현재 위치에서 순간 이동시키지 않는다.
  3. `advanceManualRestart`의 goalKick 처리에서 준비 타이머를 감소시키는 동안 target이 있는 수신자를 `moveToward(..., AI_SPEED, deltaSeconds)`로 이동시킨다. away 자동 재개 조기 반환보다 앞에서 수신자 이동을 수행한다.
  4. 사용자 방향 입력은 goalkeeper의 facing만 바꾸고 수신 target을 덮어쓰지 않는다. kickoff circle enforcement와 `FIELD` clamp는 기존 규칙을 따른다.
  5. 목표 수신자는 수동 home goal kick의 short pass/long kick, away 자동 restart 양쪽에서 움직이며 dismissed 선수는 건너뛴다.
- **Error & Exception Handling**: 선수 수가 3명보다 적거나 일부가 dismissed여도 존재하는 선수만 target을 받는다. 입력 미리 큐잉과 기존 0.35초 restart delay를 바꾸지 않는다.
- **State Transition & Return**: 골킥 준비 동안 필드 선수는 자기 수신 target으로 실제 이동하고, 재개 뒤 일반 AI/사용자 이동 흐름에 넘겨준다.

#### Regression Cases

- home과 away goalKick 각각에서 keeper가 준비 모션을 시작하고 goalKick release에 킥 모션으로 바뀐다.
- 골킥 입력을 준비 중 큐잉해도 0.35초보다 일찍 발사하지 않고 모션이 겹치거나 중복 발사하지 않는다.
- 두 팀의 세 필드 선수가 각자 공격 방향에 맞는 수신 target으로 이동하고 dismissed 선수 상태는 유지된다.
- 기존 goalKick event, 공 flight, controlled player 복귀, A/S 입력 결과가 동일하게 유지된다.

## Acceptance Criteria

- [x] 골키퍼가 준비 및 킥 follow-through 모션을 모든 골킥 경로에서 보인다.
- [x] 양 팀 필드 선수들이 골킥 준비 중 서로 다른 수신 위치로 이동한다.
- [x] 기존 A/S 입력, 자동 상대 재개, 공의 목표 비행, 사용자 조작 선수 복귀가 유지된다.

## Validation

- `node --test '--test-name-pattern=goal kick|goalKick|restart'` from `game/` — 수동·자동 골킥 회귀 테스트 통과 (14 passed).
- `npm run build` from `game/` — 프로덕션 빌드 성공.

## Commit Message

```text
feat(match): animate goalkeeper goal kicks

Plan: 2026-10-27-audio-match-balance
Phase: P01-audio-matchplay-and-goal-kick
Task: T04-goal-kick-presentation

- Add goalkeeper preparation and kick follow-through motions
- Move teammates into goal-kick receiving lanes
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending
