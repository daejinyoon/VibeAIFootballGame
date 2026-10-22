# Task: T01 Stage Replay Data

## Status: done

## Goal
Allow a cleared stage to be replayed and replace that stage's prior score while preserving access to all previously unlocked stages, saved skill state, and a new skill-card offer for every replay win.

## Decision Summary
- clearedStageResults remains an array of stage results with one row per stage, sorted by stage.
- Winning a replay replaces the matching stage row; no duplicate stage results are stored.
- currentStage becomes the stage after the just-won selected stage (Stage 5 remains Stage 5 and complete). Previously unlocked stages remain unlocked, and each win creates a new three-card offer.
- Keep existing storage key and field names; legacy saves with contiguous result arrays remain valid.

## Implementation

### I01. Campaign stage result upsert and unlock calculation
- Related Files:
  - game/src/game/campaign.js :: createCampaign, finishStage; modify/add exported helper getUnlockedStage
  - game/src/game/campaign.test.js :: finish/replay progression cases; modify/add
  - game/src/game/constants.js :: STAGE_COUNT; read-only
- Schema:
  - StageResult = {stage:number, homeGoals:number, awayGoals:number, goalDifference:number}.
  - Campaign.clearedStageResults: StageResult[] with unique stages, ascending stage order.
  - Campaign.currentStage: integer 1..STAGE_COUNT.
  - getUnlockedStage(campaign): integer clamp(max(campaign.currentStage, highestClearedStage + 1), 1, STAGE_COUNT), where highestClearedStage is the maximum result stage or 0 when none exist.
- finishStage(campaign, result, rng):
  1. Preserve current validation for active campaign and non-negative finite scores. A tie/loss returns a campaign copy without changing progress/rewards.
  2. On a win, construct the stage result using campaign.currentStage and upsert it by stage, replacing the old row; sort ascending.
  3. Set currentStage to min(stage + 1, STAGE_COUNT). Set status complete only when the just-won stage is STAGE_COUNT; a replay win on an earlier stage sets status active even if a later stage was previously completed.
  4. Generate a fresh createSkillCardOffer(rng) on every win, including replay wins.
  5. Preserve playerSkillStacks, skillInventory, opponentSkillSets, and all unrelated campaign fields.
- Do not decrease the highest unlocked stage when currentStage is moved back to replay an earlier stage.

### I02. Local profile validation for replay results
- Related Files:
  - game/src/storage/localProfile.js :: isStageResult, isCampaignSave, migrateLegacyCampaign, createCampaignSave; modify
  - game/src/storage/localProfile.test.js :: campaign save validation/migration; modify/add
- Validation contract:
  - Accept an empty results list or unique valid stage rows in ascending order; each row has stage 1..5, finite non-negative scores, and goalDifference = homeGoals - awayGoals.
  - Reject duplicate stages, out-of-range stages, invalid scores, malformed offer/skill stacks, and invalid currentStage.
  - Preserve old contiguous v2 saves and existing migration behavior; do not bump PROFILE_VERSION unless a genuinely new persisted field is introduced.

## Acceptance Criteria
- [x] Re-clearing a stage replaces its result row and does not add a duplicate.
- [x] A replay win grants a new three-card offer and advances currentStage to the next stage.
- [x] Previously unlocked stages remain derivable from saved results after replaying an earlier stage.
- [x] Loss/draw do not change results, progress, or rewards.
- [x] Existing local saves still load and round-trip through validation.

## Validation
- From game/: node --test src/game/campaign.test.js src/storage/localProfile.test.js
- From game/: npm run build

## Commit Message
```text
feat(game): support replayable campaign stage results

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P02-stage-selection
Task: T01-stage-replay-data

- Upsert cleared stage records and preserve unlocked progress.
- Award a new skill offer after each replay win.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `feat(game): support replayable campaign stage results` (Plan: 2026-10-22-arcade-match-results-skills-and-replay)

## Execution Notes
- `finishStage` now replaces the row for the just-played stage and sorts results by stage; wins still grant a fresh three-card offer and advance to the following stage.
- Added `getUnlockedStage`, which derives the furthest available stage from both `currentStage` and the highest saved clear. Replaying an earlier stage therefore does not erase access to later cleared content.
- Save validation now accepts unique, ascending stage rows with gaps, while rejecting duplicate/unsorted rows and invalid scores. Legacy migration still preserves contiguous saves and normalizes valid rows without changing profile version 2.
- Validation passed: campaign and local-profile tests (22/22) and `npm run build`. Build reports the existing Three.js chunk-size warning.
- Replay selection must set a previously completed campaign back to `active` before starting its match because `finishStage` only processes active campaigns; the stage-selection flow task should handle this transition.
