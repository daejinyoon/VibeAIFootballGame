# Task: T01 Remove World Split from Runtime

## Status: done

## Goal

Remove the `powerTackle` skill from all new-game and live-match behavior so it cannot be selected, awarded, assigned to opponents, activated, or rendered. Keep ordinary tackle controls, the 26-unit tackle range, normal tackle ownership transfer, knockdown, and tackle animation intact.

## Decision Summary

- Delete only World Split-specific skill behavior and presentation; ordinary tackles remain.
- Remove the skill from skill definitions so existing `SKILL_IDS`-driven selection and reward systems exclude it.

## Implementation

### I01. Remove skill registration and World Split simulation

- Related Files:
  - `game/src/game/skills.js` :: `SKILL_IDS`, `SKILLS`, `SKILL_MAX_LEVELS`, `applySkill`, skill animation/effect finalization; modify
  - `game/src/game/constants.js` :: `WORLD_SPLIT_*` constants; modify
  - `game/src/game/createInitialGameState.js` :: initial `powerBarriers`; modify
  - `game/src/game/stepGame.js` :: barrier collision helpers, `advanceWorldSplitSlide`, `resolveTackle`, live skill call sites, timers, barrier cleanup; modify

#### Details

- Remove `'powerTackle'` from `SKILL_IDS`, its metadata from `SKILLS`, and its entry from `SKILL_MAX_LEVELS`. This automatically removes it from selection, rewards, and opponent skill generation that derive from `SKILL_IDS`.
- Remove the `WORLD_SPLIT_*` constants: lengths, duration, thickness, wall offset, height, slide duration, and slide speed.
- Remove the `powerTackle` branch in `applySkill`, including barrier creation, caster slide, and area knockdown. Ensure `applySkill` rejects unknown skill IDs through its existing validation path.
- Remove the skill-specific motion/effect special cases for `powerTackle`; retain normal skill motion handling for remaining skills.
- Remove `powerBarriers` from initial state and remove functions that test, enforce, update, reset, or expire those barriers, including barrier segment collision checks.
- Remove `advanceWorldSplitSlide` and its calls at the start of `moveToward` and `moveByInput`; these movement helpers must continue to handle standard movement exactly as before.
- Simplify `resolveTackle(state, tackler, ballCarrier, powerTackleActive = false)` to the ordinary two-player tackle contract. Remove the powered range/effect path and all call-site arguments based on `powerTackleSeconds`; preserve standard range 26, tackle action, ball-owner transfer, home controlled-player update, and knockdown behavior.
- Remove World Split-specific decrement/cleanup and skill event/cut-in duration references. Keep timers and cut-in handling for remaining skills.

### I02. Remove World Split visual, audio, and asset references

- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: color table, generic skill-effect visibility/sizing branches, barrier renderer; modify
  - `game/src/components/MiiPlayerModel.jsx` :: World Split slide presentation; modify
  - `game/src/components/GameScreen.jsx` :: skill cut-in duration classification; modify
  - `game/src/game/skillAudio.js` :: supported skill list and World Split sound branch; modify
  - `game/public/images/skills/world-split.svg` :: World Split artwork; delete if no references remain

#### Details

- Remove the World Split palette entry and skill-specific VFX branches from `SkillEffects3D`; remove the barrier rendering block that reads `state.powerBarriers`.
- Remove the `worldSplitSlideSecondsRemaining`-based pose selection from `MiiPlayerModel`; preserve tackle and knockdown poses.
- Remove `powerTackle` from skill cut-in durations and audio allowlists/dispatch. Unsupported World Split audio requests should follow the existing unsupported-skill behavior.
- Delete `world-split.svg` once reference search confirms it is unused. Do not delete unrelated skill artwork.

### I03. Replace obsolete runtime assertions with regression coverage

- Related Files:
  - `game/src/game/skills.test.js` :: loadout, skill availability, and World Split activation tests; modify
  - `game/src/game/stepGame.test.js` :: World Split barrier/activation tests and tackle tests; modify
  - `game/src/game/campaign.test.js` :: reward/loadout fixtures; modify
  - `game/src/game/createInitialGameState.test.js` :: initial skill deck/cooldown fixtures; modify
  - `game/src/game/skillAudio.test.js` :: skill audio allowlist fixture; modify

#### Details

- Remove tests that expect World Split can be equipped, activated, generated, heard, slid, or used to create/block with a barrier. Replace fixtures with supported skill IDs where a generic inventory/loadout/reward test still needs entries.
- Add assertions that `SKILL_IDS` and `SKILLS` exclude `powerTackle`, opponent sets contain only registered skills, and attempts to activate `powerTackle` fail without creating effects or state changes.
- Preserve and, where useful, explicitly assert ordinary tackle still transfers possession, knocks down the carrier, animates the tackler, and uses the normal 26-unit range without a World Split VFX.
- Keep the existing test for normal tackle range behavior, removing only the obsolete `powerTackleSeconds` setup and powered range expectation.

## Acceptance Criteria

- [x] `powerTackle` is absent from skill definitions and cannot be earned, equipped, generated, or activated in a new game.
- [x] No World Split barrier, slide state, VFX, audio, cut-in, or asset reference remains in runtime code.
- [x] Ordinary tackle behavior and its standard range remain intact.
- [x] All affected game unit tests pass.
- [x] Production build succeeds.

## Validation

- From `game/`: `node --test src/game/skills.test.js src/game/stepGame.test.js src/game/campaign.test.js src/game/createInitialGameState.test.js src/game/skillAudio.test.js` — expected: all targeted tests pass.
- From `game/`: `npm run build` — expected: Vite production build succeeds.
- Search from `game/`: `rg -n "powerTackle|WORLD_SPLIT|worldSplit|World Split|world-split" src public` — expected: only intentional migration/test references owned by T02 remain; no runtime references remain.

## Commit Message

```text
feat(game): remove World Split skill

Plan: 2026-10-26-remove-world-split
Phase: P01-skill-and-save-removal
Task: T01-remove-runtime-skill

- Remove World Split from skill definitions, simulation, rendering, and audio
- Preserve ordinary tackles and replace skill-specific tests
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
