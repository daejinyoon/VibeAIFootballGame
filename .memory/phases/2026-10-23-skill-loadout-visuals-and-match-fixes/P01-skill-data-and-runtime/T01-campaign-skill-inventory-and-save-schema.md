# Task: T01 Campaign Skill Inventory and Save Schema

## Status: ready to commit

## Goal
Represent all campaign-owned skills independently from the maximum-three ordered match equipment slots, while preserving existing campaign progress and skill levels across local profile saves and migrations.

## Decision Summary
- Use `ownedTeamSkills: Array<{skillId, level}>` as the unlimited skill bag and `equippedTeamSkillIds: string[]` as an ordered list of at most three unique IDs that must exist in the bag.
- A new campaign starts with the existing one random non-Rainbow skill owned and equipped. A newly chosen reward is owned but is not automatically equipped. Duplicate upgrade confirmation is handled by T02 before the reward mutation is committed.

## Implementation

### I01. Campaign skill state
- Related Files:
  - `game/src/game/campaign.js` :: `createCampaign`, `finishStage` — initialize owned/equipped data and create reward offers against owned skills; modify.
  - `game/src/game/skills.js` :: `isSkillRewardEligible`, `createSkillCardOffer`, `validateTeamSkillDeck`, `awardSkillCard`, `placeTeamSkill`, `reorderTeamSkill` — adapt reward eligibility and campaign skill operations to the inventory/equipment model; modify.
  - `game/src/App.jsx` :: `makeMatchState`, `createSkillPreviewCampaign`, `continueSavedCampaign` — map owned/equipped campaign state into match deck entries and restore new save fields; modify.
  - `game/src/game/campaign.test.js` :: campaign/reward tests — update expectations and add invariant coverage; modify.
  - `game/src/game/skills.test.js` :: inventory/equipment validation tests — update expectations and add invariant coverage; modify.

#### Details
- **Signatures & Types**:
  ```ts
  type SkillId = 'eagleShot' | 'tornadoShot' | 'powerTackle' | 'eulryongta' | 'vacuumCleaner' | 'rainbowReflect';
  type OwnedTeamSkill = { skillId: SkillId; level: number };
  type CampaignSkills = {
    ownedTeamSkills: OwnedTeamSkill[];
    equippedTeamSkillIds: SkillId[]; // unique, ordered, length 0..3, subset of ownedTeamSkills.skillId
    pendingSkillOffer: SkillId[] | null;
  };
  function validateTeamSkillLoadout(ownedTeamSkills: OwnedTeamSkill[], equippedTeamSkillIds: SkillId[]): { valid: boolean; errors: Array<{ skillId?: string; reason: string }> };
  function awardSkillCard(campaign: Campaign, skillId: SkillId): SkillAwardResult;
  ```
- **Data & Schema Fields**:
  - Campaign: replace persisted/use-site `teamSkillDeck` with `ownedTeamSkills` and ordered `equippedTeamSkillIds`; remove `pendingSkillPlacement` because a new skill enters the bag directly.
  - Keep each owned ID unique. `level` remains an integer from 1 through `SKILL_MAX_LEVELS[skillId]`.
  - Equipped IDs are unique, at most three, and must refer to an owned skill. The bag has no capacity limit.
- **Execution Flow / Logic**:
  1. `createCampaign` selects the same random starter from non-Rainbow IDs, stores `{ skillId, level: 1 }` in `ownedTeamSkills`, and initializes `equippedTeamSkillIds` with that ID.
  2. `finishStage` calls reward generation with `ownedTeamSkills`, so a skill remains offer-eligible only when unowned or below max level. Keep max-level/non-upgradeable filtering.
  3. `awardSkillCard` validates that the selection is in `pendingSkillOffer`. For a new ID, append it to `ownedTeamSkills` and clear the offer without changing equipped IDs. For a duplicate, retain the level increment operation; T02 must request confirmation before invoking this mutation.
  4. Replace or adapt `placeTeamSkill` and `reorderTeamSkill` with validated equip, unequip, and reorder helpers. Reject unknown IDs, unowned IDs, duplicate equipped IDs, invalid indexes, and a fourth equipped skill without mutating the input campaign.
  5. Keep legacy player-specific card utilities only if still referenced; remove them only when no production import remains and update directly related tests.
- **Persistence Migration**:
  - `game/src/storage/localProfile.js` :: `PROFILE_VERSION`, `isCampaignSave`, `migrateLegacyCampaign`, `migrateProfileV1`, `migrateProfileV2`, `migrateProfileV3`, new `migrateProfileV4`, `readProfile`, `createCampaignSave` — modify.
  - Set profile schema version to 5. Convert v4 `teamSkillDeck` entries into the full owned bag, equip the first three IDs in their old order, and preserve stage/results/offers/opponent skills/status/branding.
  - Update v1–v3 migration output to the v5 campaign shape. Preserve aggregated legacy levels, clamp to `SKILL_MAX_LEVELS`, and equip the first three unique converted skills.
  - Validate inventory levels/uniqueness and equipment subset/uniqueness/maximum before accepting a campaign save. `createCampaignSave` persists only new campaign skill fields and progression data.

### I02. Save and campaign tests
- Related Files:
  - `game/src/storage/localProfile.test.js` :: profile round-trip, malformed save, v1/v2/v3 migration tests — modify.
  - `game/src/App.jsx` :: campaign restore and match initialization — keep the app runtime connected to the new campaign shape; modify.
- **Scenarios**:
  - Round-trip an owned bag with more than three entries and an ordered three-skill equipment list.
  - Reject equipment with four IDs, duplicate IDs, or an ID absent from the bag, without discarding a valid profile's other fields.
  - Migrate v4 saves with more than three deck skills: keep all as owned and equip the first three in former order.
  - Migrate legacy v1–v3 stacks/inventory to unique owned entries with preserved/clamped levels and at most three equipped IDs.
  - Confirm new campaigns still begin with exactly one random eligible skill, owned and equipped.

## Acceptance Criteria
- [x] Campaign skill ownership and ordered equipment are distinct fields and obey the validation rules.
- [x] Existing save versions migrate to profile v5 without losing skill levels or campaign progress.
- [x] A new reward adds to ownership without forcing equipment; duplicate reward mutation remains available for a confirmed upgrade.
- [x] Max-level skills do not reappear as upgrade rewards.

## Validation
- `npm test -- src/game/campaign.test.js src/game/skills.test.js src/storage/localProfile.test.js` — campaign and save migration tests pass.

## Commit Message
```text
feat(skills): separate owned skills from match equipment

Plan: 2026-10-23-skill-loadout-visuals-and-match-fixes
Phase: P01-skill-data-and-runtime
Task: T01-campaign-skill-inventory-and-save-schema

- Persist unlimited owned skills separately from three ordered equipment slots
- Migrate existing campaign saves and validate loadout invariants
```

## Validation Result
- `npm test -- src/game/campaign.test.js src/game/skills.test.js src/storage/localProfile.test.js` — passed (49 tests).
- `npm run build` — passed; Vite reported the existing large Three.js chunk advisory.

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in `.memory/current.md`
