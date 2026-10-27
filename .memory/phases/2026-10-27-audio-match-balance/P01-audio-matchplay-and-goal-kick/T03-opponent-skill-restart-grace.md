# Task: T03 킥오프 뒤 적 스킬 대기 시간

## Status: done

## Goal

초기 킥오프와 골 뒤 킥오프에서 공이 재개된 다음 3초 동안 적 팀의 자동 스킬 발동을 막아, 재개 즉시 스킬로 실점하는 일을 방지한다.

## Decision Summary

- 대기 시간은 시뮬레이션 시간 3초이며 골 뒤에는 `goalPause`가 끝나 실제 킥오프 상태를 만든 시점부터 센다.
- 제한은 자동 발동하는 away 팀 스킬에 적용한다. 3초 이후 현재 `maybeUseAiSkill` 방식은 그대로 유지한다.

## Implementation

### I01. 경기 상태와 킥오프 경과 시간

- Related Files:
  - `game/src/game/constants.js` :: 새 `AI_KICKOFF_SKILL_GRACE_SECONDS`; new export
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState`; modify
  - `game/src/game/stepGame.js` :: `releasePass`, `releaseShot`, `resetForKickoff`, `maybeUseAiSkill`, `stepGame`; modify
  - `game/src/game/createInitialGameState.test.js` :: 초기 대기 상태; modify
  - `game/src/game/stepGame.test.js` :: 초기 kickoff와 골 뒤 kickoff 스킬 억제; modify

#### Details

- **Signatures & Types**:
  ```js
  export const AI_KICKOFF_SKILL_GRACE_SECONDS = 3;
  createInitialGameState(options) // GameState.aiSkillGraceSecondsRemaining: number
  function maybeUseAiSkill(state, team, events) // void
  export function stepGame(state, inputFrame, deltaSeconds) // GameEvent[]
  ```
- **Data & Schema Fields**:
  - `GameState.aiSkillGraceSecondsRemaining: number`는 런타임 매치 전용이고 새 캠페인/프로필 저장 필드는 아니다. 초기값은 `0`이다.
- **Execution Flow / Logic**:
  1. `constants.js`에 `AI_KICKOFF_SKILL_GRACE_SECONDS=3`을 export하고 초기 상태에 카운터 0을 둔다.
  2. `releasePass`와 `releaseShot`이 아직 시작되지 않은 경기 시계를 `openingKickoffTakerId`가 시작하는 기존 분기에서 시계를 시작할 때 동일 카운터를 3으로 설정한다.
  3. `resetForKickoff`는 골 뒤 상태를 재생성·복원한 직후 카운터를 3으로 설정한다. `beginKickoff`는 goalPause가 끝난 때만 이 reset을 호출하므로 goalPause 동안 대기 시간이 소모되지 않는다.
  4. `stepGame`의 clamped `dt`를 기존 cooldown 감소 영역에서 카운터에 빼고 0 미만이 되지 않게 제한한다.
  5. `maybeUseAiSkill`은 `team === 'away'`이고 카운터가 0보다 클 때 바로 반환한다. 0이 된 다음 프레임부터 기존 actor 선택과 `activateNextTeamSkill`을 그대로 사용한다.
- **Error & Exception Handling**:
  - 오래된 테스트 상태에 필드가 없으면 0으로 간주한다.
  - home 사용자의 F 입력과 기존 팀별 쿨다운을 이 카운터로 막지 않는다.
- **State Transition & Return**: 초기 킥오프 첫 패스/슛과 골 뒤 재개마다 카운터가 3초로 시작하고, 경기 시간처럼 고정 `dt`만큼 감소해 만료 후 away 자동 스킬이 정상 복구된다.

### I02. 스킬 타이밍 회귀 테스트

- Related Files:
  - `game/src/game/stepGame.test.js` :: 기존 `both teams wait for the opening kickoff to start the clock before using skills` 및 goalPause 재개 테스트; modify

#### Details

- 테스트는 away skill deck과 스킬 유효 대상이 있는 상태에서 시작한다.
- 초기 킥오프 공이 출발한 직후 3초 미만 동안 `skillUsed`가 없고, 누적 시뮬레이션 시간 3초를 넘긴 뒤 기존 자동 발동이 발생하는지 검증한다.
- 골 득점 뒤 `goalPause` 동안은 대기 시간이 진행되지 않고, `beginKickoff` 이후 3초가 동일하게 적용되는지 검증한다.
- away 대기 중에도 home의 F 입력 스킬은 기존 규칙대로 작동하고, away의 기존 per-skill/team global cooldown은 별도로 유지되는지 확인한다.

## Acceptance Criteria

- [x] 초기 킥오프 시작 후 3초 안에 적 스킬이 자동 발동하지 않는다.
- [x] 골 뒤 `goalPause`를 제외하고 재개 후 3초 동안 적 스킬이 발동하지 않는다.
- [x] 대기 시간이 만료되면 적 AI의 기존 자동 스킬이 다시 동작한다.
- [x] 사용자 스킬과 기존 팀·개별 쿨다운에 회귀가 없다.

## Validation

- `node --test '--test-name-pattern=opening kickoff|kickoff|goal.*skill|skill.*goal'` from `game/` — kickoff 및 스킬 시점 테스트 통과 (13 passed).
- `npm run build` from `game/` — 프로덕션 빌드 성공.

## Commit Message

```text
fix(ai): delay opponent skills after kickoffs

Plan: 2026-10-27-audio-match-balance
Phase: P01-audio-matchplay-and-goal-kick
Task: T03-opponent-skill-restart-grace

- Add a three-second away skill grace period after kickoffs
- Cover opening and post-goal restart timing
```

## Progress

- [x] 구현 완료
- [x] 검증 통과
- commit: pending
