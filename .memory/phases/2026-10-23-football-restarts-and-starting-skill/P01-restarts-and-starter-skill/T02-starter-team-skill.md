# Task: T02 Starter Team Skill

## Status: done

## Goal

Start each newly created campaign at stage 1 with one randomly selected active level-1 skill in the home team's shared ordered deck.

## Decision Summary

- The skill is owned by the home team, not individually by every player.
- Randomly select exactly one non-passive skill for each new campaign.
- Leave opponent stage 1 empty and do not mutate existing saved campaigns.

## Implementation

### I01. Seed the new-campaign deck

- Related Files:
  - `game/src/game/campaign.js` :: imports from `./skills.js`; `createCampaign`; modify.
  - `game/src/game/skills.js` :: `SKILL_IDS`; read-only.
  - `game/src/game/campaign.test.js` :: campaign creation and opponent stage tests; modify.
  - `game/src/storage/localProfile.js` :: `createCampaignSave`; read-only.

#### Details

- Keep public signature `createCampaign({ rng = Math.random } = {})`.
- Define the eligible starter pool as all `SKILL_IDS` except `'rainbowReflect'`, which is passive.
- Select exactly one candidate using the injected `rng` value, clamped consistently with existing `shuffledSkills` handling: convert to `Number`, use 0 for non-finite values, clamp to `[0, 0.999999]`, then `Math.floor(value * eligibleSkills.length)`.
- Set `teamSkillDeck` to `[{ skillId: selectedSkillId, level: 1 }]` in deck order.
- Preserve `currentStage: 1`, empty cleared results, null reward fields, and stage-one opponent skill list `[]`.
- Existing campaign save/load already serializes `teamSkillDeck`; do not add a profile version or rewrite existing saves. The starter is generated only inside `createCampaign`.

### I02. Test starter skill ownership and persistence compatibility

- Related Files:
  - `game/src/game/campaign.test.js` :: `createCampaign` tests; modify.
  - `game/src/storage/localProfile.test.js` :: existing team deck round-trip coverage; read-only unless regression requires an assertion.

#### Details

- Replace the empty-deck assertion with checks that the deck has exactly one entry at level 1 and its skill is a member of `SKILL_IDS` other than `rainbowReflect`.
- Use two controlled RNG values that select different eligible skills and assert deterministic selection.
- Assert a fresh campaign remains stage 1 and its stage-one opponent skill set remains empty.
- Assert saving and restoring a new campaign preserves the starter entry through the existing v4 deck serialization path.
- Keep tests that manually construct campaigns with their own decks unchanged.

## Acceptance Criteria

- [x] New campaigns start at stage 1 with exactly one random active team skill at level 1.
- [x] Rainbow Reflect is never selected as the active starter and the stage-one opponent deck stays empty.
- [x] Existing saved campaign decks remain unchanged.

## Validation

- `npm test` from `game` — campaign and profile regressions pass.
- `npm run build` from `game` — app compiles.

## Commit Message

```text
feat(campaign): grant a random starter team skill

Plan: 2026-10-23-football-restarts-and-starting-skill
Phase: P01-restarts-and-starter-skill
Task: T02-starter-team-skill

- Seed new campaigns with one level-one active team skill
- Preserve existing campaign saves and stage-one opponent rules
```

## Progress

- [x] Implementation complete
- [x] Validation passed (`npm test`, `npm run build`)
- commit: pending
