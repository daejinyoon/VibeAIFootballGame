# Task: T02 Team Skill Deck and Save Migration

## Status: pending

## Goal

Replace per-player skill assignments and unspent inventory with one ordered, levelled skill deck per campaign team. Let the player place a newly chosen reward and reorder the deck in team setup, and migrate existing saved campaigns without losing progress or skill ownership.

## Decision Summary

- Home ownership is one ordered list of `{ skillId, level }`; field players share it.
- A newly won skill is inserted at a user-selected position; an upgrade keeps its existing position. The team setup screen later supports reordering.
- Eligible upgradeable skills level to 3. Exclude owned non-upgradeable skills and max-level skills from reward offers. Vacuum Cleaner and Rainbow Reflect have no duplicate upgrades.
- Preserve the existing `createCampaign().currentStage === 1` behavior.

## Implementation

### I01. Define team deck and reward transitions

- Related Files:
  - `game/src/game/skills.js` :: `SKILL_IDS`, skill metadata, `createSkillCardOffer`, `awardSkillCard`, assignment helpers; modify.
  - `game/src/game/campaign.js` :: `createCampaign`, `finishStage`, opponent skill set data; modify.
  - `game/src/game/campaign.test.js` :: reward generation/progression cases; modify.
  - `game/src/game/skills.test.js` :: ownership/level/eligibility cases; modify.

#### Details

- **Schema**: Replace `playerSkillStacks` and `skillInventory` with `teamSkillDeck: Array<{skillId: SkillId, level: 1|2|3}>`, preserving array order. Campaign also stores `pendingSkillOffer: SkillId[]` and `pendingSkillPlacement: SkillId | null`. No separate count field is needed; list membership means the team owns the skill.
- **Upgrade metadata**: Eagle Shot, Tornado Shot, Power Tackle, and Eulryongta have max level 3. Vacuum Cleaner and Rainbow Reflect have max level 1. Add typed/validated metadata alongside skill definitions so offer logic has one source of truth.
- **Offer generation**: Build candidates from all skills not owned plus owned skills whose level is below their max. Sample at most three unique IDs. Return an empty list when there are no candidates. `finishStage` stores `pendingSkillOffer: null` for an empty offer and does not create a blocking reward state.
- **Reward transition**: `awardSkillCard(campaign, skillId)` validates that a pending offer contains the ID. For a new skill, add `{skillId, level:1}` at the default end of the deck and set `pendingSkillPlacement` to that ID. For an eligible duplicate, increment level by one up to max and keep the current deck index; do not open placement. Clear the pending offer on successful selection. Invalid selection returns the existing structured failure without mutating campaign state.
- **Placement/reorder APIs**: Add pure helpers such as `placeTeamSkill(campaign, skillId, insertionIndex)` and `reorderTeamSkill(campaign, fromIndex, toIndex)`. Clamp/validate integer indices in `[0, deck.length]` for insertion and `[0, deck.length-1]` for reordering. Placement clears `pendingSkillPlacement` only for the matching pending skill. Reordering preserves each item's level and ID.
- **Opponent deck**: Convert `opponentSkillSets[currentStage]` to an ordered array of `{skillId, level:1}` at match creation. Keep stage-specific opponent selection deterministic and do not change the skill IDs in existing sets.

### I02. Migrate and validate persisted campaigns

- Related Files:
  - `game/src/storage/localProfile.js` :: `PROFILE_VERSION`, validators, migrations, `createCampaignSave`, `readProfile`, `writeProfile`; modify.
  - `game/src/storage/localProfile.test.js` :: v1/v2/v3 migration and round-trip tests; modify.
  - `game/src/game/skills.js` :: legacy conversion helper if shared conversion belongs here; modify only if needed.

#### Details

- **Profile schema**: Increment `PROFILE_VERSION` from 3 to 4. A v4 campaign stores `teamSkillDeck`, `pendingSkillOffer`, `pendingSkillPlacement`, current stage/progress, `opponentSkillSets`, and existing branding/customization fields. Do not serialize the removed player stack/inventory fields in newly written v4 saves.
- **Migration**: Add `migrateProfileV3`. Aggregate all skill copies from legacy `playerSkillStacks` in `FIELD_PLAYER_IDS` order, followed by the legacy `skillInventory` counts in `SKILL_IDS` order. For upgradeable skills clamp total copies to level 3; for non-upgradeable skills map any positive total to level 1. Preserve each skill once in deterministic first-seen order. Preserve stage, unlocked stage, wins/losses, team customization, profile nickname, and records byte-for-byte in meaning.
- **Pending states**: Sanitize a saved pending offer to unique known skill IDs that remain eligible. Keep `pendingSkillPlacement` only if its skill is present in the deck. A malformed or unknown legacy skill is discarded without invalidating the whole profile.
- **Validation**: Validate each deck entry has a known ID, integer level 1..max, and unique skill ID. Validate pending reward IDs against eligible skill IDs and ensure pending placement refers to an owned skill. Invalid v4 campaigns fail campaign-save validation and are ignored using existing profile fallback behavior.
- **Compatibility**: Preserve migrations for v1 and v2 by routing through the v3-to-v4 conversion or producing the old intermediate shape then converting once. Keep leaderboard and nickname behavior unchanged.

### I03. Replace reward/setup assignment UI

- Related Files:
  - `game/src/App.jsx` :: campaign handlers, `chooseSkill`, `assignSkill`, `assignInventorySkill`, save/resume flow, `SkillRewardScreen`/`LoadoutScreen` props; modify.
  - `game/src/components/SkillRewardScreen.jsx` :: reward choice and placement state; modify.
  - `game/src/components/LoadoutScreen.jsx` :: team skill ordering UI; modify.
  - `game/src/styles.css` :: team skill list and insertion controls; modify.

#### Details

- Remove player selection, per-player slots, and unspent inventory interactions. Replace them with a team deck display showing skill name, level, and position.
- After choosing a new skill reward, show the ordered deck and insertion-position controls (`first`, between entries, `last`). Do not resume to stage selection until placement is completed. For an upgrade reward, show the new level and keep the existing position, then return to stage selection.
- In team setup, provide move earlier/later controls for each skill, disabled at list boundaries. Keep Rainbow Reflect labeled automatic/passive so players understand it is not activated by F.
- On resume, restore pending reward/placement screen using the v4 campaign state. Do not lose a pending placement on reload.
- Pass `teamSkillDeck` onward in match setup props; T03 will consume it. Keep the new-campaign start stage at 1.

### I04. Cover model, migration, and UI transitions

- Related Files:
  - `game/src/game/skills.test.js` :: deck/reward helper tests; modify.
  - `game/src/game/campaign.test.js` :: empty/full reward pool and stage progression; modify.
  - `game/src/storage/localProfile.test.js` :: migration and serialization tests; modify.
  - `game/src/App.test.jsx` or existing UI test location :: reward placement/resume flows; new only if test infrastructure already supports React components.

#### Details

- Cover new skill insertion, upgrade position retention, max-level exclusion, no-upgrade duplicate exclusion, offer pool exhaustion, reorder bounds, and invalid selection non-mutation.
- Cover v3 legacy aggregation across player stacks and inventory, clamping and non-upgradeable behavior, and preservation of stage/branding/records.
- Cover v4 round-trip and pending-placement resume.
- If no React component test harness exists, test pure campaign handlers/helpers and rely on build plus manual desktop review; do not introduce a new UI test framework.

## Acceptance Criteria

- [ ] A campaign owns one unique ordered team deck with valid skill levels; no individual assignment or inventory remains in active flow.
- [ ] Reward options respect ownership, upgrade eligibility, and level caps; new skills can be placed immediately and reordered later.
- [ ] v1/v2/v3 saves migrate to v4 without losing progress, logos, kits, or valid skills.
- [ ] A pending reward/placement survives save and resume.
- [ ] Stage 1 remains the starting stage for a new campaign.

## Validation

- `npm test -- --test-name-pattern="skill|campaign|profile|migration"` from `game` — model, campaign, and save cases.
- `npm run build` from `game` — reward, setup, and App integration.

## Commit Message

```text
feat(skills): move campaign skills into a shared team deck

Plan: 2026-10-23-football-game-controls-kits-skills
Phase: P01-team-controls-and-skills
Task: T02-team-skill-deck-and-migration

- Add ordered team ownership and reward placement
- Migrate legacy player stacks and inventory into profile v4
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
