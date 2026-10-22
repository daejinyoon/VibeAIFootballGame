# Task: T01 4대4 roster와 5단계 캠페인

## Status: done

## Goal
6명 팀 데이터를 필드 선수 3명+골키퍼 1명의 4명으로 바꾸고, 5단계 캠페인과 최종 5단계 승패를 처리한다.

## Decision Summary
- 선수 ID는 홈 `home-gk`, `home-def-1`, `home-mid-1`, `home-fw`; 원정은 `away-` 접두사 대응 ID다.
- 경기 시간 60초, 동점 골든골, 재도전·저장 규칙을 유지한다. 새 최대 단계는 5다.

## Implementation

### I01. 경기 상수와 team formation
- Related Files:
  - `game/src/game/constants.js` :: `STAGE_COUNT`, `FIELD`, `REGULATION_SECONDS` — 다섯 단계와 기존 필드 유지; modify
  - `game/src/game/createInitialGameState.js` :: `homeFormation`, `createAwayFormation`, `createPlayer`, `createInitialGameState` — 팀 4명 상태 생성; modify
  - `game/src/game/createInitialGameState.test.js` :: 상태 형상 테스트; modify
- Details
  - **Signatures & Types**:
    ```js
    export const STAGE_COUNT = 5;
    export function createInitialGameState({ stage = 1, playerSkillStacks = {}, opponentSkillStacks = {} } = {})
    ```
  - **Data & Schema Fields**:
    - `Player`: `{ id: string, team: 'home'|'away', role: 'goalkeeper'|'defender'|'midfielder'|'forward', x:number, y:number, vx:number, vy:number, jumpHeight:number, jumpVelocity:number, skillId:string|null, skillCopies:number, skillUsesRemaining:number, dismissed:boolean, foulCount:number, card:'none'|'yellow'|'red' }`.
    - 홈 선발: GK `(55,270)`, 수비 `(220,190)`, 미드 `(370,350)`, 공격 `(480,270)`; 원정은 `x=FIELD.width-x`, 역할·y 동일.
    - GK의 `skillId=null`, `skillCopies=0`, `skillUsesRemaining=0`는 항상 강제한다.
    - `GameState.stage` 허용 범위는 1~5. 기존 `FIELD.width=960`, `FIELD.height=540`, `REGULATION_SECONDS=60` 유지.
  - **Execution Flow / Logic**:
    1. `createInitialGameState`는 `stage`가 1~5가 아니면 1로 보정한다.
    2. 홈·원정 각각 4명을 만들고 기존 점유·점수·반칙 상태 초기값을 채운다.
    3. 입력된 skill stacks는 해당 팀의 필드 선수 ID만 허용하며 골키퍼 스킬은 제거한다.
    4. 캠페인 종료 상태는 `status:'complete'`; `finishStage`에서 `currentStage===5` 승리만 완료 처리한다.

### I02. 5단계 캠페인 검증
- Related Files:
  - `game/src/game/campaign.js` :: `createCampaign`, `finishStage`; modify
  - `game/src/game/campaign.test.js` :: 1~5단계 진행 및 5단계 완료; modify
- Details
  - 캠페인 데이터: `{ id:string, currentStage:1|2|3|4|5, clearedStageResults:Array<{stage:number,homeGoals:number,awayGoals:number,goalDifference:number}>, playerSkillStacks:Record<string,{skillId:string,copies:number}|null>, skillInventory:Record<string,number>, opponentSkillSets:Record<string,string[]>, status:'active'|'complete' }`.
  - 패배는 같은 `currentStage`와 보유 스킬 상태를 보존한다. 동점 점수는 골든골 종료 전 `finishStage`가 거부한다.
  - 단계 5 승리는 결과를 누적하고 `status='complete'`로 바꾸며, 다음 단계로 증가시키지 않는다.

## Acceptance Criteria
- [x] 매치 상태에 양 팀 각각 필드 3명과 골키퍼 1명만 존재한다.
- [x] 1~4단계 승리는 다음 단계로 진행하고 5단계 승리는 캠페인을 완료한다.
- [x] 60초·골든골·패배 재도전 규칙이 기존 테스트와 함께 통과한다.

## Validation
- `npm test` — 상태·캠페인·관련 경기 테스트 전체 통과
- `npm run build` — React 앱 프로덕션 빌드 성공

## Commit Message
```text
feat(game): update roster and five stage campaign

Plan: 2026-10-22-3d-football-game
Phase: P02-match-core
Task: T01-roster-five-stages

- Reduce each team to three field players and one goalkeeper
- Extend campaign and boss completion to five stages
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 5f3c2cb
