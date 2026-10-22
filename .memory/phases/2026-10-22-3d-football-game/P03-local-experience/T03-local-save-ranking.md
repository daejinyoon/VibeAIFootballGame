# Task: T03 로컬 저장 마이그레이션과 랭킹

## Status: done

## Goal
새 5단계 캠페인과 스킬 카드 성장을 저장·이어 하기 할 수 있게 하고, 기존 v1 프로필의 별명·랭킹·캠페인 진행을 v2 형식으로 보존한다.

## Decision Summary
- 브라우저 저장만 사용한다. Entra·Azure·온라인 대전 코드는 포함하지 않는다.
- 기존 `STORAGE_KEY`를 유지해 로컬 데이터에 접근하고 내부 `schemaVersion`을 1에서 2로 마이그레이션한다.

## Implementation

### I01. Profile v2 schema and v1 migration
- Related Files:
  - `game/src/storage/localProfile.js` :: `createEmptyProfile`, `isCampaignSave`, `isBestRecord`, `migrateProfileV1`, `readProfile`, `writeProfile`, `createCampaignSave`, `updateBestRecord`; modify
  - `game/src/storage/localProfile.test.js` :: schema/migration/save tests; modify
  - `game/src/App.jsx` :: `saveAndExit`, `continueSavedCampaign`, `handleGameEvents`; modify
- Details
  - **Signatures & Types**:
    ```js
    export const STORAGE_KEY = 'dex-pixel-football:v1';
    export function migrateProfileV1(parsedProfile) // ProfileV2
    export function readProfile(storage = getDefaultStorage()) // ProfileV2
    export function writeProfile(profile, storage = getDefaultStorage()) // ProfileV2
    export function createCampaignSave(campaign) // CampaignSaveV2
    ```
  - **Data & Schema Fields**:
    - `ProfileV2 = { schemaVersion:2, nickname:string, campaignSave:CampaignSaveV2|null, bestRecord:{nickname:string,stageReached:1|2|3|4|5,goalDifference:number,updatedAt:string}|null }`.
    - `CampaignSaveV2 = { savedAt:string,currentStage:1..5,clearedStageResults:Array<{stage:number,homeGoals:number,awayGoals:number,goalDifference:number}>,playerSkillStacks:Record<FieldPlayerId,{skillId:SkillId,copies:1..3}|null>,skillInventory:Record<SkillId,number>,opponentSkillSets:Record<'1'|'2'|'3'|'4'|'5',SkillId[]> }`.
    - Runtime fields `skillUsesRemaining`, `jumpHeight`, `jumpVelocity`, active match score and current positions are not persisted; resume starts current stage from kickoff.
  - **Execution Flow / Logic**:
    1. `readProfile` parses JSON inside try/catch. Version 2 is validated; version 1 passes through `migrateProfileV1`; unknown/corrupt versions return empty profile.
    2. Migration keeps nickname and valid bestRecord fields. Convert old stageReached 1..3 without changing score.
    3. For an old campaignSave, keep currentStage (1..3) and clearedStageResults. Move each valid skill ID from old `homeLoadout` into new `skillInventory` counts; initialize new three player stacks to null. Ignore old goalkeeper assignment as an equipped skill, but preserve it as an inventory card. Regenerate opponent sets using the new 0/1/2/3/3 stage counts.
    4. Persist migrated v2 on next `writeProfile`; do not delete or rename the existing storage key.
    5. `createCampaignSave` copies inventory, stacks, opponent sets and completed results to avoid reference sharing. Resume uses these fields, makes a new kickoff state and preserves cleared stage results.
    6. `updateBestRecord` accepts stageReached 1..5, preserving existing tiebreak by cumulative cleared-stage goal difference.
    7. Storage unavailable/full, malformed JSON, and localStorage getter exceptions preserve existing user-facing error messages and do not silently claim save success.

### I02. Save/ranking edge-case coverage
- Related Files:
  - `game/src/storage/localProfile.test.js` :: v1 migration, v2 validation, save/resume shape and 5-stage ranking; modify
  - `game/src/game/campaign.test.js` :: current stage restart keeps inventory/build; modify
- Details
  - Test v1 profile with six-player loadout, null save, invalid skill IDs, corrupt JSON, unavailable storage, valid v2 profile and stage 5 record.
  - Verify pause save stores skill copies and unassigned inventory; resume reconstructs campaign progression but resets match and skill-use counters.
  - Verify only a stage win updates best record; losses do not change goal-difference tiebreak.

## Acceptance Criteria
- [ ] v1 nickname and best record survive migration; old saved campaign progress is available in v2.
- [ ] Skill inventory/stacks survive save and continue; current match and per-match skill uses restart from kickoff.
- [ ] Stage 4/5 records validate and sort after stage 1/2/3 records.
- [ ] Existing single slot, overwrite confirmation and save-and-exit flow still work.

## Validation
- `npm test` — local profile, campaign, skill and full existing tests pass
- `npm run build` — local-only app compiles

## Commit Message
```text
feat(game): migrate local saves for five stage skill runs

Plan: 2026-10-22-3d-football-game
Phase: P03-local-experience
Task: T03-local-save-ranking

- Migrate schema v1 profiles to campaign skill inventory v2
- Preserve temporary saves and extend leaderboard through stage five
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: 4cb1632
