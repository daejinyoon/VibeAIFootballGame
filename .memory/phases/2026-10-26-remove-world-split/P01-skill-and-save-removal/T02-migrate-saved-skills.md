# Task: T02 Migrate Saved Skills

## Status: done

## Goal

Upgrade local profile schema version 6 to version 7 and sanitize existing campaign saves so all persisted World Split skill entries are removed without compensation, while preserving other campaign data and the order of remaining equipped skills.

## Decision Summary

- Remove `powerTackle` from owned skills, equipped IDs, pending skill offers, and opponent skill sets.
- Keep other skills and their levels in their current order; an emptied equipment list leaves the corresponding UI capacity available, with no replacement skill or reward.
- Existing save migrations must continue to load older schema versions directly into the current profile version.

## Implementation

### I01. Add version 7 migration and route all legacy profiles through it safely

- Related Files:
  - `game/src/storage/localProfile.js` :: `PROFILE_VERSION`, `withoutRemovedOpponentSkills`, `migrateV5Campaign`, `migrateProfileV5`, new `migrateV6Campaign`/`migrateProfileV6`, `readProfile`; modify

#### Details

- Set `PROFILE_VERSION` from `6` to `7`.
- Add a v6-to-v7 migration for a parsed profile whose `schemaVersion === 6` and whose `nickname` is a string. Preserve `nickname`, valid `bestRecord`, normalized `teamCustomization`, and unrelated `campaignSave` fields. Return `schemaVersion: 7`.
- For a valid campaign object, clone and sanitize its persisted skill collections:
  - Filter entries with `entry.skillId === 'powerTackle'` from `ownedTeamSkills`; retain each other entry and its `level` and order.
  - Filter `'powerTackle'` from `equippedTeamSkillIds` and `pendingSkillOffer`; retain the relative order of all remaining skill IDs. If a pending offer becomes an empty array, normalize it to `null`.
  - Filter `'powerTackle'` from every array in `opponentSkillSets`; preserve other stage keys and skill order.
  - Preserve unrelated fields such as `savedAt`, `currentStage`, `clearedStageResults`, and `status`.
- Ensure `readProfile` dispatches schema version 6 through `migrateProfileV6`. The current version 7 path continues to validate with `isCampaignSave`.
- Because v1-v5 migration functions build data using current `SKILL_IDS`, update existing removed-skill sanitation helpers so legacy v5 `powerTackle` entries are filtered before campaign validation rather than causing the whole campaign save to be discarded. Keep existing Rainbow Reflect migration behavior intact.
- Validate the migrated campaign with `isCampaignSave`; if remaining data is invalid, preserve the current established behavior of setting `campaignSave` to `null` rather than accepting malformed data.

#### Data & Schema Fields

- Profile envelope: `schemaVersion: number` (`7` after migration); `nickname: string`; `campaignSave: object | null`; `bestRecord: object | null`; `teamCustomization: normalized customization object`.
- Campaign skill data:
  - `ownedTeamSkills: Array<{ skillId: string, level: integer }>`; remove entries whose `skillId` is `powerTackle`.
  - `equippedTeamSkillIds: string[]`; filter the removed ID while preserving remaining order.
  - `pendingSkillOffer: string[] | null`; filter the removed ID; empty result becomes `null`.
  - `opponentSkillSets: Record<string, string[]>`; filter the removed ID in each stage array.

### I02. Cover v6 and legacy migration and save preservation

- Related Files:
  - `game/src/storage/localProfile.test.js` :: profile migration and persistence tests; modify

#### Details

- Add a schema-v6 migration fixture containing `powerTackle` in owned/equipped/pending/opponent collections and at least two other skills in nonalphabetical order. Assert schema 7, removal of `powerTackle`, preservation of other skills/levels/order, null pending offer when all offer entries were removed, and preservation of stage/results/nickname/record/customization.
- Add/adjust a case where `equippedTeamSkillIds` contains `powerTackle` between other skill IDs; assert remaining equipped IDs retain their relative order and no substitute is inserted.
- Cover empty and null campaign saves, and malformed remaining campaign data according to current `readProfile` behavior.
- Update schema-version expectations and test fixtures for earlier migrations that previously expected `powerTackle` to survive. Preserve unrelated Rainbow Reflect migration assertions.
- Verify a profile read from local storage is returned in v7 shape and can be written/read again without `powerTackle` reappearing.

## Acceptance Criteria

- [x] Schema-v6 saves migrate to schema version 7 and remain playable when all non-World-Split campaign data is valid.
- [x] World Split is removed from ownership, equipment, pending rewards, and opponent skill sets without granting compensation.
- [x] Other skill levels and relative order, stage progress, results, nickname, customization, and best record are preserved.
- [x] Older profile migrations still load and sanitize removed skills.
- [x] Storage migration tests pass.

## Validation

- From `game/`: `node --test src/storage/localProfile.test.js` — expected: all storage migration tests pass.
- From `game/`: `node --test` — expected: complete test suite passes after T01 and T02.

## Commit Message

```text
fix(storage): migrate saves without World Split

Plan: 2026-10-26-remove-world-split
Phase: P01-skill-and-save-removal
Task: T02-migrate-saved-skills

- Bump local profile schema to version 7
- Remove World Split from persisted campaign skill collections
- Preserve remaining skills and campaign progress during migration
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
