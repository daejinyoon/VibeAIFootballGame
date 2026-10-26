# Task: T01 Reward Auto Equip

## Status: done

## Goal
After a stage reward, automatically equip a newly acquired skill into the next free team slot when fewer than three skills are equipped. If all three slots are occupied, take the player to the existing loadout screen so they can replace equipment. A duplicate reward that upgrades an owned skill must not alter the loadout.

## Decision Summary
- Auto-equip applies only to a newly acquired skill and only when a free slot exists.
- When the player continues after choosing a reward with all three slots full, open the existing team loadout.
- Duplicate upgrades change the owned skill level but do not automatically equip or reorder it.

## Implementation

### I01. Auto-equip newly acquired rewards
- Related Files:
  - `game/src/App.jsx` :: `chooseSkill`, `equipCampaignSkill`, `SkillRewardScreen` props; modify
  - `game/src/game/skills.js` :: `awardSkillCard`, `equipTeamSkill`; read-only unless return metadata is insufficient
  - `game/src/game/campaign.test.js` :: reward + free-slot auto-equip behavior; modify if App-level behavior is covered there
  - `game/src/App.test.jsx` or existing App/component test file if present; new only if an existing UI test harness exists

#### Details
- **Signatures & Types**:
  ```js
  chooseSkill(skillId) -> { upgradedLevel?: number, addedToBag?: boolean, autoEquipped?: boolean } | null
  equipTeamSkill(campaign, skillId, insertionIndex) -> existing equip result
  ```
- **Data & Schema Fields**:
  - Keep `campaign.ownedTeamSkills: Array<{ skillId: string, level: number }>` and `campaign.equippedTeamSkillIds: string[]` (max length 3).
  - Do not change campaign persistence schema.
- **Execution Flow / Logic**:
  1. Call `awardSkillCard` as today; on failure return null and do not mutate/persist state.
  2. If `awarded.upgradedLevel` is null and `equippedTeamSkillIds.length < 3`, call `equipTeamSkill` on the awarded campaign using the new skill id and insertion index equal to the current equipped length.
  3. Persist and set the final campaign once, after award and optional equip are resolved.
  4. If the reward upgraded an already owned skill, do not call equip/reorder, even if that skill is currently unequipped.
  5. If all three slots are occupied, leave the new reward in the bag; do not silently replace an existing skill.
  6. Return reward metadata for the existing `SkillRewardScreen` to mark the reward claimed; keep duplicate upgrade confirmation behavior.
- **Error & Exception Handling**: If `equipTeamSkill` unexpectedly fails after a valid new award, keep the awarded skill in the bag and persist that valid campaign rather than discarding the reward.
- **State Transition & Return**: Persist the awarded inventory and, when applicable, its newly appended equipped id through the existing `persistCampaign` path.

### I02. Route a full loadout to team setup
- Related Files:
  - `game/src/App.jsx` :: `SkillRewardScreen` `onContinue`, screen state; modify
  - `game/src/components/SkillRewardScreen.jsx` :: claimed reward continue button; read-only unless a prop is needed
  - `game/src/game/campaign.test.js` :: duplicate reward and equipment-full invariants; modify

#### Details
- **Signatures & Types**:
  ```js
  // Existing screen state names include 'skillReward', 'loadout', and 'stageSelect'.
  onContinue() -> void
  ```
- **Data & Schema Fields**: Use `campaign.equippedTeamSkillIds.length`; maximum remains 3. Do not add a route or screen state.
- **Execution Flow / Logic**:
  1. Keep `SkillRewardScreen` mounted after a reward is claimed; its existing continue action remains the transition point.
  2. On Continue, if exactly three skills are equipped, set the screen to `loadout`; otherwise set it to `stageSelect`.
  3. The existing loadout confirmation and back actions already return to stage selection; preserve them.
  4. Do not force the loadout screen for a duplicate upgrade when fewer than three slots are equipped.
  5. Keep the loadout screen's current equipment editing and persistence callbacks.
- **Error & Exception Handling**: Treat a missing/non-array equipped id list as empty, consistent with existing campaign defaults; do not block continuing.
- **State Transition & Return**: `skillReward -> loadout -> stageSelect` when full; `skillReward -> stageSelect` when at least one slot is free.

### I03. Focused regression coverage
- Related Files:
  - `game/src/game/campaign.test.js` :: new reward does not mutate equipment at model layer unless App adds it; preserve model contract
  - App/component test file only if one already exists; otherwise verify with the prescribed app build and manual flow
#### Details
- Cover one and two equipped slots (new reward becomes the next slot), three equipped slots (reward remains in bag), and duplicate upgrade (level rises, equipped order is unchanged).
- Verify Continue routes a full loadout to `loadout` and a non-full loadout to `stageSelect`; confirming or backing out of loadout returns to stage selection.
- Keep `awardSkillCard`'s domain behavior of inventory-only award intact; the UI orchestration in `App.jsx` owns auto-equip.

## Acceptance Criteria
- [ ] New reward is automatically placed in the next free slot when fewer than three are equipped.
- [ ] Three equipped slots are never silently replaced; Continue opens the existing loadout screen.
- [ ] Duplicate upgrade changes the skill level without changing equipped skill ids or order.
- [ ] Existing campaign save schema and loadout editing flow remain compatible.

## Validation
- `npm test -- --test-name-pattern="skill reward|duplicate rewards|equipment"` from `game/` — focused campaign/reward coverage passes.
- `npm test` from `game/` — full game test suite passes.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
feat(campaign): streamline skill reward equipment

Plan: 2026-10-26-football-tactics-and-skill-flow
Phase: P02-skill-reward-flow
Task: T01-reward-auto-equip

- Auto-equip new rewards in available slots
- Open team loadout when all slots are occupied
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
