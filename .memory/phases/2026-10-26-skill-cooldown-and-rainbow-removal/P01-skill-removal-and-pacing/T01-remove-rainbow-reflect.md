# Task: T01 Remove Rainbow Reflect

## Status: done

## Goal
Remove Rainbow Reflect from game mechanics, catalogs, rewards, presentation, and opponent decks. Migrate existing profile saves so references to that skill are discarded while all unrelated campaign progress and skills remain intact.

## Decision Summary
- Rainbow Reflect is removed completely from active gameplay and new campaign content.
- Profile schema version 5 saves containing Rainbow Reflect must migrate to the new current schema without discarding the profile or its remaining campaign data.
- A removed skill's equipment slot becomes empty; do not substitute another skill automatically.

## Implementation

### I01. Remove the skill from catalogs, gameplay, and presentation
- Related Files:
  - `game/src/game/skills.js` :: `SKILL_IDS`, `SKILLS`, `SKILL_MAX_LEVELS`, `applySkill`, `activateNextTeamSkill`, and transfer-status helpers; modify
  - `game/src/game/campaign.js` :: `createCampaign`; modify
  - `game/src/game/stepGame.js` :: home F-key eligibility; modify
  - `game/src/App.jsx` :: `makeMatchState`, `createSkillPreviewCampaign`; modify
  - `game/src/components/GameScreen.jsx` :: `nextTeamSkill`; modify
  - `game/src/components/GameLoop3D.jsx` :: reflected-skill audio dispatch; modify
  - `game/src/game/skillAudio.js` :: `playSkillAudio`; modify
  - `game/src/components/SkillEffects3D.jsx` :: Rainbow Reflect color, geometry, anchor, visibility, ribbon, shield, and cancellation rendering branches; modify
  - `game/public/images/skills/rainbow-reflect.png`; delete
  - `game/src/game/skills.test.js`, `game/src/game/campaign.test.js`, `game/src/game/createInitialGameState.test.js`, `game/src/game/skillAudio.test.js`, `game/src/game/stepGame.test.js`; modify

#### Details
- **Signatures & Types**:
  ```js
  SKILL_IDS: readonly string[] // excludes 'rainbowReflect'
  SKILLS: Record<SkillId, SkillDefinition> // excludes Rainbow Reflect
  applySkill(state, { team, sourcePlayerId, skillId, level = 1 }) -> SkillAttempt
  activateNextTeamSkill(state, team, sourcePlayerId) -> SkillAttempt
  createCampaign({ rng }) -> Campaign
  ```
- **Data & Schema Fields**:
  - Keep the existing campaign shape: `ownedTeamSkills`, `equippedTeamSkillIds`, `pendingSkillOffer`, and `opponentSkillSets`.
  - Bump `PROFILE_VERSION` from `5` to `6` for explicit current-save migration. Do not add campaign fields.
- **Execution Flow / Logic**:
  1. Remove the Rainbow Reflect ID, metadata, max level, status transfer logic, away status-bearer caster override, reflected-shot effects, related preview setup, HUD eligibility logic, audio dispatch, and all special 3D geometry/rendering branches.
  2. Remove the Rainbow Reflect knockdown exception from `applySkill` and the Rainbow-specific F-key eligibility exception in `stepGame`; retain ordinary skill and player-status checks for the remaining skills.
  3. Let `createCampaign` select directly from `SKILL_IDS`; remove the explicit exclusion that is no longer needed. `createOpponentSkillSets`, `createSkillCardOffer`, `createInitialGameState`, and loadout validators already derive valid skill IDs from `SKILL_IDS`; keep their generated new content limited to the remaining catalog.
  4. Add `migrateProfileV5(parsedProfile)` in `game/src/storage/localProfile.js` and route schema version 5 through it from `readProfile`. Preserve nickname, best record, team customization, campaign stage, cleared results, status, and all still-valid skills.
  5. In the v5 campaign migration, clone and filter `rainbowReflect` from owned skills, equipped IDs, pending offers, and every stage's opponent skill IDs. If a pending offer becomes empty, set it to `null`. Keep equipment order for remaining entries and leave freed slots empty.
  6. Allow migrated opponent skill arrays to contain fewer entries than the stage's normal maximum after removal, while still requiring arrays, uniqueness, valid current skill IDs, and no more than the existing stage count `[0, 1, 2, 3, 3]`. Newly generated opponent sets keep their normal counts using remaining skills.
  7. Older v1-v4 migration paths must also discard removed skill IDs via the existing catalog-based filtering and preserve other valid data. For legacy `opponentSkillSets`, filter removed IDs from each valid stage array before validation so a set containing Rainbow Reflect does not cause all its other skills to be replaced by the fallback set. Keep the fallback only for structurally malformed legacy data.
  8. Update test fixtures and assertions that expect Rainbow Reflect gameplay. Keep a migration regression containing the literal removed ID and assert that the rest of the save survives, its references disappear, and its remaining equipment/opponent skill order is preserved.
- **Error & Exception Handling**:
  - Invalid or unsupported profile versions keep existing `createEmptyProfile()` fallback behavior.
  - A malformed campaign save may still be discarded under existing validation; a valid v5 save whose only invalid references are Rainbow Reflect must migrate rather than be discarded.
- **State Transition & Return**: New campaigns and matches cannot contain or activate Rainbow Reflect. A migrated current profile returns with schema version `6` and preserves unrelated campaign state.

### I02. Regression coverage for removal and save migration
- Related Files:
  - `game/src/storage/localProfile.test.js` :: current v5 migration, legacy migration, opponent skill set, and saved campaign cases; modify
  - `game/src/game/skills.test.js` :: catalog, offer, validation, and remaining skill activation cases; modify
  - `game/src/game/skillAudio.test.js` :: supported audio skill list; modify
#### Details
- Test a v5 save where Rainbow Reflect appears in ownership, equipment, a pending offer, and opponent skill sets; assert schema version 6, removal of only those entries, preservation of all other campaign fields, and successful subsequent `readProfile` validation.
- Test that v5 saves without Rainbow Reflect preserve their data and that existing v1-v4 migration tests continue to pass.
- Test that Rainbow Reflect cannot be generated, equipped, activated, rendered as a supported effect, or played as a supported skill sound. Keep catalog/artwork assertions aligned with the reduced skill list.

## Acceptance Criteria
- [x] No active gameplay, new rewards, equipment, previews, opponent selection, audio, or VFX include Rainbow Reflect.
- [x] Existing v5 saves containing Rainbow Reflect migrate to schema version 6, preserve all unrelated progress, and remove only the skill's references.
- [x] Older save migrations and all remaining skills continue to work.

## Validation
- `npm test -- --test-name-pattern=rainbow` from `game/` — focused removal and migration regressions pass.
- `npm test` from `game/` — full suite passes.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
feat(skills): remove Rainbow Reflect and migrate saves

Plan: 2026-10-26-skill-cooldown-and-rainbow-removal
Phase: P01-skill-removal-and-pacing
Task: T01-remove-rainbow-reflect

- Remove Rainbow Reflect from gameplay and presentation
- Preserve existing campaigns while filtering removed skill references
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm test -- --test-name-pattern=rainbow`, `npm test`, `npm run build`)
- commit: `pending` (will be recorded after commit)
