# Task: T02 Skill Inventory and Loadout UI

## Status: ready to commit

## Goal
Let the player equip, remove, and reorder up to three owned skills before a match, keep unselected skills in the bag, and confirm duplicate reward level-ups before applying them.

## Decision Summary
- Equipment changes are available from the pre-match stage setup and between rounds; equipment is fixed once a match starts. New reward selections go into the bag first.
- Duplicate rewards open an explicit confirmation; confirming raises the level and canceling leaves ownership and the pending offer unchanged.

## Implementation

### I01. Loadout controls
- Related Files:
  - `game/src/components/LoadoutScreen.jsx` :: `LoadoutScreen` — render owned bag and three ordered equipment slots with equip/unequip/reorder actions; modify.
  - `game/src/components/StageSelectScreen.jsx` :: `StageSelectScreen` — retain the pre-match setup entry point; modify only if its label/help text needs to identify equipment.
  - `game/src/App.jsx` :: imports, `moveTeamSkill`, stage-select/loadout screen wiring — pass owned skills/equipped IDs and validated mutation callbacks; modify.
  - `game/src/styles.css` :: `.loadout-*`, `.team-skill-*` — style bag, empty slots, controls, full-slot state, and keyboard-visible focus; modify.
- **Data & Props**:
  ```ts
  type LoadoutScreenProps = {
    stage: number;
    ownedTeamSkills: OwnedTeamSkill[];
    equippedTeamSkillIds: SkillId[];
    skills: Record<SkillId, SkillMetadata>;
    onEquip(skillId: SkillId, index?: number): void;
    onUnequip(skillId: SkillId): void;
    onMove(fromIndex: number, toIndex: number): void;
    onConfirm(): void;
    onBack(): void;
  };
  ```
- **Execution Flow / Logic**:
  1. Render every owned entry in the bag and exactly three equipment positions; empty positions are visibly available.
  2. Equip only owned skills not already equipped and only while the list has fewer than three IDs. An equipped skill can be removed back to the bag.
  3. Reordering changes only `equippedTeamSkillIds`; the underlying skill level remains attached to its owned entry.
  4. Keep the screen outside the match tree; do not expose equip callbacks in `GameScreen` or pause controls.
  5. Update copy to explain that F uses the next ready skill in order and each skill has an individual 10-second cooldown. Remove “passive Rainbow Reflect” and shared-team-cooldown text.

### I01.a Match HUD wording
- `game/src/components/GameScreen.jsx` :: team skill HUD labels ??remove passive/whole-team cooldown wording from the skill status display; modify.

### I02. Reward interaction
- Related Files:
  - `game/src/components/SkillRewardScreen.jsx` :: `SkillRewardScreen`, `chooseSkill`, `SkillDeckEntry` — add duplicate-upgrade confirmation and describe inventory ownership; modify.
  - `game/src/App.jsx` :: `chooseSkill`, `placeRewardSkill`, reward-screen props — add confirm/cancel callbacks and remove pending-placement routing; modify.
  - `game/src/game/campaign.test.js` :: reward behavior coverage — update to the bag/equipment model; modify.
- **Execution Flow / Logic**:
  1. Clicking an offered new skill immediately adds it to the owned bag and clears the reward offer; it does not change current equipment slots.
  2. Clicking an owned upgradeable skill opens a confirmation showing old and next levels. Do not call `awardSkillCard` until the user confirms.
  3. Confirm commits the level-up and persists the campaign. Cancel closes confirmation and leaves the reward choice available.
  4. Capped skills remain absent from offers; the UI must not offer a level beyond `SKILL_MAX_LEVELS`.
  5. After reward handling, allow the normal inter-round stage setup to open the same loadout screen.

## Acceptance Criteria
- [x] All owned skills are visible in the bag, including more skills than fit in equipment.
- [x] The player can equip/unequip/reorder up to three unique skills before a match; a fourth cannot be equipped.
- [x] A duplicate reward changes level only after confirmation; cancel leaves the reward unresolved.
- [x] UI labels no longer describe Rainbow Reflect as passive or cooldown as one shared team timer.

## Validation
- `npm run build` — screens and callbacks compile.
- `npm test -- src/game/campaign.test.js src/storage/localProfile.test.js` — campaign mutations persist with the new fields.

## Validation Result
- `npm test -- src/game/campaign.test.js src/storage/localProfile.test.js` — passed (33 tests).
- `npm run build` — passed; Vite reported the large Three.js chunk advisory.

## Commit Message
```text
feat(ui): add skill bag and three-slot team loadout

Plan: 2026-10-23-skill-loadout-visuals-and-match-fixes
Phase: P01-skill-data-and-runtime
Task: T02-skill-inventory-and-loadout-ui

- Add pre-match equip, unequip, and ordering controls
- Require confirmation before applying duplicate-skill upgrades
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in `.memory/current.md`
