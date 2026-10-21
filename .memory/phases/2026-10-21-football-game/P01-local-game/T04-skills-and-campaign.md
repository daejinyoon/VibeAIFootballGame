# Task: T04 선수 스킬과 캠페인 진행

## Status: pending

## Goal
6종 스킬을 중복 없이 선수에게 배정하고, 무작위 상대 스킬과 3단계 캠페인을 연결해 일반 경기·보스전까지 진행할 수 있게 한다.

## Decision Summary
- 캠페인 시작 시 상대 스킬 구성을 무작위로 한 번 정하고 저장한다. 1단계는 3종, 2단계는 4종, 보스는 6종 모두다.
- 양 팀이 각자 공유 게이지를 쓴다. 우리 팀 일반 스킬은 F, 무지개반사는 조건 충족 시 자동 발동하고, 상대 AI 스킬은 게이지가 찼을 때 상황에 맞춰 자동 발동한다.

## Implementation

### I01. 스킬 정의와 공통 게이지
- Related Files:
  - `game/src/game/skills.js` :: 스킬 정의, 검증, 발동; new
  - `game/src/game/skills.test.js` :: 스킬 규칙 테스트; new
  - `game/src/game/constants.js` :: 스킬 수치 상수 추가; modify
- **Signatures & Types**:
  ```js
  export const SKILL_IDS = ["eagleShot", "tornadoShot", "powerTackle", "eulryongta", "vacuumCleaner", "rainbowReflect"];
  export function validateLoadout(loadout, playerIds);
  export function applySkill(state, playerId);
  export function applyAutomaticRainbowReflect(state);
  export function addSkillGauge(state, eventType);
  ```
- **Data & Schema Fields**:
  - `loadout`: 객체 `{ [homePlayerId: string]: SkillId }`; 정확히 6개의 서로 다른 스킬 ID를 포함한다.
  - `SkillId`: 위 6개 문자열 union.
  - `state.skillGauge`: `{ home: number, away: number }`; 각각 0–100, 초기 0, 해당 팀이 스킬을 쓰면 100 소모.
  - `state.players[*].stunnedSeconds`: 을룡타가 맞은 선수는 2초로 설정.
  - `state.players[*].powerTackleSeconds`: 파워 태클 지속시간(초)을 추가한다. 초기값 4초.
- **Execution Flow / Logic**:
  1. 스킬 상수 초기값: 수동 패스/슛 charge max 1초; 각 팀 게이지는 시간에 따라 분당 100점 차고, 해당 팀의 성공 패스 `+12`, 공을 빼앗은 태클 `+20`, 유효 슛 `+15`, 골키퍼 선방 `+20`; 상한 100.
  2. 스킬 사용 전에는 해당 팀 게이지 100, `playerId`가 그 팀의 유효 선수, 스킬별 상황 조건을 검증한다. 실패하면 상태와 게이지를 바꾸지 않는다.
  3. 독수리슛은 공을 오른쪽 골문으로 발사하고 일반 골키퍼 세이브를 무시한다. 무지개반사가 준비된 경우에만 반사된다.
  4. 회오리슛은 공이 가장 가까운 수비수를 휘어 지나가게 하고 일반 골키퍼 충돌은 허용한다. 무지개반사는 스킬 공을 상대 골문 쪽으로 되돌린다.
  5. 파워 태클은 사용자 선수에 4초 타이머를 설정해 A 태클 접촉 범위를 1.5배로 한다. 을룡타는 반경 140 안에서 사용 선수 앞쪽에 가장 가까운 상대 한 명을 찾아 2초 기절시킨다. 적격 대상이 없으면 게이지를 소모하지 않는다.
  6. 진공청소기는 반경 220 안의 공을 0.5초 동안 사용자 쪽으로 이동시킨다. 골키퍼이면 손에 들고 `goalKick`으로, 필드 선수이면 발앞 소유 상태로 끝난다.
  7. 무지개반사는 상대 Eagle/Tornado 스킬 슛이 날아올 때 홈 게이지가 100이고 해당 스킬이 홈 선수에게 배정돼 있으면 자동 실행한다. 배정 선수가 공까지 달려가 공을 상대 골문 쪽으로 보낸 뒤 홈 게이지를 소모한다.
  8. 각 팀은 자기 게이지가 100이고 장착 스킬의 상황 조건이 맞으면 그 스킬을 사용할 수 있다. 경기당 스킬 횟수 제한은 두지 않고, 게이지 재충전과 상황 조건으로 빈도를 제어한다. 상대 AI는 가능한 스킬 중 상황에 맞는 것을 선택하며 무지개반사를 포함한 상대 스킬을 동일한 규칙으로 처리한다.
  9. 각 성공 이벤트에서 `addSkillGauge`를 불러 해당 팀 게이지의 상한 100을 유지한다. 같은 이벤트가 프레임마다 반복 적립되지 않도록 점유 전환/이벤트 경계에서 한 번만 적립한다.

### I02. 캠페인 및 상대 스킬 배치
- Related Files:
  - `game/src/game/campaign.js` :: 캠페인 생성, stage transition, RNG; new
  - `game/src/game/campaign.test.js` :: 상대 세트와 승패 테스트; new
- **Signatures & Types**:
  ```js
  export function createCampaign({ rng = Math.random, homeLoadout });
  export function createOpponentSkillSets(rng = Math.random);
  export function finishStage(campaign, result);
  export function assignOpponentSkills(players, skillIds);
  ```
- **Data & Schema Fields**:
  - `Campaign`: `{ id: string, currentStage: 1|2|3, clearedStageResults: Array<{ stage: 1|2|3, homeGoals: number, awayGoals: number, goalDifference: number }>, homeLoadout: Record<PlayerId, SkillId>, opponentSkillSets: { 1: SkillId[], 2: SkillId[], 3: SkillId[] }, status: "active"|"complete" }`.
  - `opponentSkillSets[1]`: 무작위로 고른 6종 중 3종, `[2]`: 4종, `[3]`: 전체 6종. 한 세트 안에는 중복이 없다. 테스트에서는 주입한 `rng`로 결과를 결정적으로 만든다.
- **Execution Flow / Logic**:
  1. 캠페인 시작 시 `validateLoadout`가 통과한 우리 팀 배정만 허용한다.
  2. `createOpponentSkillSets`를 한 번 호출해 세 stage 구성을 만들고 `Campaign`에 보관한다.
  3. stage에서 홈 승리면 `clearedStageResults`에 결과를 추가하고 1→2→3으로 진행한다. stage 3 승리 시 `status="complete"`다.
  4. 패배면 `currentStage`와 상대 스킬 구성을 유지하고 현재 stage 경기만 초기화한다.
  5. 점수 동률은 엔진이 골든골로 종결하기 전까지 승패 결과로 넘기지 않는다.
  6. 현재 단계의 상대 스킬 ID를 상대 선수들에게 중복 없이 하나씩 배정한다. 각 단계에서 사용 가능한 스킬 종류 수는 각각 3/4/6개이며, 한 경기에서의 사용 횟수는 공용 게이지와 상황 조건에 따라 정하고 별도의 횟수 상한은 두지 않는다.

## Acceptance Criteria
- [ ] 우리 팀 스킬 여섯 개를 한 번씩만 배정해야 시작할 수 있다. 역할과 스킬 범주 간 제한은 없다.
- [ ] 상대 스킬 조합은 새 캠페인마다 달라질 수 있지만, 같은 캠페인의 재도전에서는 유지된다.
- [ ] 진 경기에서는 현재 단계가 유지되고, 이긴 경기만 누적 골 차이에 들어간다.
- [ ] 일반/보스 스킬이 D07의 효과와 발동 조건을 따른다.

## Validation
- `cd game; npm test` — 중복 장착, 게이지 상한, 스킬 조건, RNG 결과, stage 승패 테스트 통과.
- `cd game; npm run build` — 엔진과 React 연결 빌드 성공.

## Commit Message
```text
feat(game): add player skills and campaign progression

Plan: 2026-10-21-football-game
Phase: P01-local-game
Task: T04-skills-and-campaign

- Add six unique player skills and shared gauge
- Add randomized 3-stage campaign and boss loadout
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
