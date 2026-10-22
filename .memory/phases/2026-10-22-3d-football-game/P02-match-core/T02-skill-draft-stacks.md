# Task: T02 스킬 보상 카드와 중복 사용 횟수

## Status: done

## Goal
캠페인 첫 경기를 무스킬로 시작하고 승리 때마다 카드 3장 중 하나를 골라 선수에게 배정하며, 카드 복사본 수로 경기당 사용 가능 횟수를 정한다.

## Decision Summary
- 기존 여섯 스킬을 유지한다. 골키퍼는 제외한다. 필드 선수 하나는 한 종류를 최대 3장 보유하며, 같은 종류는 여러 선수에게도 배정할 수 있다.
- 스킬 발동에는 팀 게이지가 없다. 복사본 수만큼 한 경기에서 쓰고, 다음 경기 시작 시 횟수를 다시 채운다.

## Implementation

### I01. 선수별 스킬과 캠페인 inventory 모델
- Related Files:
  - `game/src/game/skills.js` :: `SKILL_IDS`, `MAX_SKILL_COPIES`, `createSkillCardOffer`, `awardSkillCard`, `assignSkillCard`, `validateSkillAssignments`; modify
  - `game/src/game/campaign.js` :: `createCampaign`, `createCampaignSave`; modify
  - `game/src/game/skills.test.js` :: 장착·카드·복사본 테스트; modify
  - `game/src/game/campaign.test.js` :: 보상 보유·저장 테스트; modify
- Details
  - **Signatures & Types**:
    ```js
    export const MAX_SKILL_COPIES = 3;
    export function createSkillCardOffer(rng = Math.random) // SkillId[3]
    export function awardSkillCard(campaign, skillId) // new Campaign
    export function assignSkillCard(campaign, playerId, skillId) // new Campaign
    export function validateSkillAssignments(playerSkillStacks, fieldPlayerIds) // {valid, errors}
    ```
  - **Data & Schema Fields**:
    - `SkillId`: `'eagleShot'|'tornadoShot'|'powerTackle'|'eulryongta'|'vacuumCleaner'|'rainbowReflect'`.
    - `playerSkillStacks[playerId]`: `null` 또는 `{ skillId: SkillId, copies: 1|2|3 }`; 한 playerId에 skillId 한 종류만 저장.
    - `skillInventory[skillId]`: 장착하지 않은 카드의 0 이상의 정수 수량.
    - `pendingSkillOffer`: 화면용 `SkillId[3]`이며 같은 offer 안에서는 세 종류를 중복하지 않는다. 이전 보유 여부에 상관없이 여섯 스킬에서 뽑는다.
    - `skillUsesRemaining[playerId]`: kickoff마다 장착 복사본 수로 초기화되는 0~3 정수; 경기 상태에만 존재하고 저장하지 않는다.
  - **Execution Flow / Logic**:
    1. `createCampaign`은 세 필드 선수 stack을 모두 `null`로, inventory 여섯 항목을 0으로 시작한다.
    2. `createSkillCardOffer`는 주입된 RNG로 여섯 `SKILL_IDS`를 섞고 앞의 세 개를 반환해 테스트를 결정적으로 만든다.
    3. `awardSkillCard`는 선택된 유효 카드 하나를 inventory에 더한다.
    4. `assignSkillCard`는 해당 카드 하나를 inventory에서 빼고 선수에게 준다. 같은 종류면 `copies+1`(최대 3); 다른 종류면 기존 copies를 inventory로 반환하고 새 카드 한 장을 장착한다.
    5. `playerId`가 골키퍼/존재하지 않는 선수이거나 inventory 카드가 없거나 copies가 3이면 상태를 수정하지 않고 `{ok:false, reason}`을 반환한다.
    6. `createInitialGameState`는 `skillUsesRemaining`을 각 필드 선수의 `copies`로 초기화한다. 스킬 게이지와 시간 기반 충전은 제거한다.

### I02. 경기당 사용 횟수
- Related Files:
  - `game/src/game/skills.js` :: `applySkill`, `applyAutomaticRainbowReflect`; modify
  - `game/src/game/stepGame.js` :: kickoff/reset; modify
  - `game/src/game/skills.test.js`, `game/src/game/stepGame.test.js` :: 사용 횟수; modify
- Details
  - `applySkill(state, playerId)`는 스킬 조건이 유효할 때 그 선수의 `skillUsesRemaining`을 정확히 1 감소시킨다. 잔여 0 또는 부적절한 스킬 조건이면 게이지·횟수·경기 상태를 바꾸지 않는다.
  - 자동 `rainbowReflect`도 반사 시작 시 해당 사용자의 남은 사용 횟수를 1 감소시킨다.
  - 1장/2장/3장 보유 선수는 각각 한 경기에서 최대 1/2/3회 사용 가능하다. 골이 들어가 재개해도 횟수는 초기화하지 않고 새 경기 시작 때만 복구한다.
  - 상대 AI는 배정된 필드 선수마다 한 장을 가지며 같은 `skillUsesRemaining` 규칙을 쓴다.
  - `skillGauge`와 `addSkillGauge(...,'time',...)` 호출 및 HUD 의존은 이 Task에서 제거하고 UI 삭제는 P03-T02에서 한다.

## Acceptance Criteria
- [x] 캠페인은 스킬 없이 시작하고 매 승리에서 3개의 서로 다른 카드 선택지를 만든다.
- [x] 같은 종류 카드 2장/3장은 한 선수의 경기당 2회/3회 사용을 허용한다.
- [x] 다른 종류로 바꾸면 기존 복사본이 inventory에 돌아오며 골키퍼 장착은 거부된다.
- [x] 게이지 충전과 게이지 검사 없이 사용 횟수만 소비한다.

## Validation
- `npm test` — skills/campaign/stepGame 테스트 전체 통과
- `npm run build` — 앱 컴파일 성공

## Commit Message
```text
feat(game): add stage skill drafts and stacked uses

Plan: 2026-10-22-3d-football-game
Phase: P02-match-core
Task: T02-skill-draft-stacks

- Draft one of three skill cards after each stage win
- Track one skill type and up to three uses per field player
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
