# Task: T04 AI 난이도와 기존 경기 규칙 연결

## Status: done

## Goal
다섯 캠페인 단계의 상대 스킬 수와 최종 보스 AI를 맞추고, 기존 점유·패스·반칙·세트피스·골 판정을 새 4대4 roster와 스킬 사용 방식에서 유지한다.

## Decision Summary
- 상대 AI 스킬 선수 수는 stage 1~5에서 `0,1,2,3,3`; 5단계에서 의사결정 빈도와 압박·수비 재배치가 강화된다.
- 기존 규칙을 유지하되 퇴장 인원 감소는 4명 roster에 즉시 반영한다. 골키퍼 스킬은 없고 필드 선수의 스킬 사용 잔여 수만 사용한다.

## Implementation

### I01. 상대 스킬 구성과 보스 스케일
- Related Files:
  - `game/src/game/campaign.js` :: `createOpponentSkillSets`, `assignOpponentSkills`; modify
  - `game/src/game/campaign.test.js` :: 5단계 AI 스킬 수; modify
  - `game/src/game/stepGame.js` :: AI update/target choice; modify
  - `game/src/game/stepGame.test.js` :: 보스 AI와 수적 열세; modify
- Details
  - **Signatures & Types**:
    ```js
    export function createOpponentSkillSets(rng = Math.random)
    export function assignOpponentSkills(players, skillIds)
    ```
  - **Data & Schema Fields**:
    - `opponentSkillSets`: `{ '1':[], '2':[SkillId], '3':[SkillId,SkillId], '4':[SkillId,SkillId,SkillId], '5':[SkillId,SkillId,SkillId] }`.
    - 각 목록은 중복 없는 `SkillId`; 4명 중 GK 제외된 필드 player ID 순서에만 대입한다.
    - `bossStage=5`; 보스 AI think interval `0.45s`(기본 `0.8s`), teammate support radius 210(기본 160), pressing distance 170(기본 130).
  - **Execution Flow / Logic**:
    1. 주입된 RNG로 각 단계의 skill IDs를 섞되 stage 1은 빈 목록, 나머지는 위 개수만 선택한다.
    2. `assignOpponentSkills`는 상대 필드 세 명에만 배정하고 GK에는 `skillId=null`을 보장한다.
    3. AI 스킬은 현 조건에서 사용 가능한 경우에만 쓰며 `skillUsesRemaining`을 하나 소비한다. gauge 및 passive charge 검사 코드를 제거한다.
    4. stage 5에서만 think/press/support 상수를 강화한다. 플레이어 입력이나 물리 시간은 stage에 따라 바꾸지 않는다.

### I02. 기존 경기 규칙 회귀 테스트
- Related Files:
  - `game/src/game/stepGame.js` :: 규칙 reducer/이벤트 — 4대4 통합; modify
  - `game/src/game/stepGame.test.js` :: goal, restart, foul, card, dismissal, keeper cases; modify
- Details
  - 각 팀 선수 수가 4이며 GK는 골문을 지킨다. 한 선수가 퇴장하면 해당 팀의 활성 필드 수가 줄고, GK 퇴장은 빈 골문을 유지한다.
  - 터치라인·골라인 아웃, 프리킥·페널티킥, 옐로 누적 퇴장, 태클 반칙 판정과 골 후 kickoff는 기존 규칙대로 보존한다.
  - 경기 stage 5 결과에서 승리 이벤트만 `campaignComplete`까지 도달하고, 패배는 stage 5 재도전 상태로 남긴다.

## Acceptance Criteria
- [x] AI stage skill counts are exactly 0, 1, 2, 3, 3 with unique skill IDs.
- [x] 최종 보스는 더 빠른 판단·압박·팀 지원을 보이고 상대 필드 선수 세 명만 스킬을 가진다.
- [x] 골·아웃·세트피스·반칙·카드·퇴장 기존 테스트가 네 명 roster에서 통과한다.

## Validation
- `npm test` — campaign/stepGame 기존·신규 테스트 전체 통과
- `npm run build` — 앱 컴파일 성공

## Commit Message
```text
feat(game): scale five stage ai and preserve match rules

Plan: 2026-10-22-3d-football-game
Phase: P02-match-core
Task: T04-ai-difficulty-rules

- Scale opponent skills and boss tactics across five stages
- Keep set pieces fouls and dismissals working in 4v4
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 00162c7
