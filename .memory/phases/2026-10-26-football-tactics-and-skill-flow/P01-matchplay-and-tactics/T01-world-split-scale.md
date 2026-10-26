# Task: T01 World Split Scale

## Status: done

## Goal
Make World Split's slide travel approximately 90 field units, render and collide as a 90-unit-high wall, and scale only the wall length modestly with campaign stages 1–5 (90, 100, 110, 120, 130). Preserve the ordinary tackle contact ranges and the barrier's three-second lifetime.

## Decision Summary
- Barrier height is 90. Skill forward slide distance and stage-one wall length are about 90. Later campaign stages add 10 length units per stage. Ordinary tackle range is separate and must not change.
- Existing barrier lengths are selected by skill level, but the confirmed design selects barrier length from `state.stage`.

## Implementation

### I01. Shared constants and barrier construction
- Related Files:
  - `game/src/game/constants.js` :: `WORLD_SPLIT_LENGTHS`, `WORLD_SPLIT_HEIGHT`, `WORLD_SPLIT_SLIDE_SECONDS`, `WORLD_SPLIT_SLIDE_SPEED`; modify
  - `game/src/game/skills.js` :: `applySkill`, `powerTackle` branch; modify
  - `game/src/game/stepGame.js` :: `advanceWorldSplitSlide`, `enforcePowerBarriers`; read-only unless needed to keep slide movement and wall collision consistent
  - `game/src/components/SkillEffects3D.jsx` :: World Split barrier rendering near `maximumWallHeight`; read-only unless it does not reflect the barrier height consistently

#### Details
- **Signatures & Types**:
  ```js
  // constants.js
  export const WORLD_SPLIT_HEIGHT = 90;
  export const WORLD_SPLIT_LENGTHS = Object.freeze([90, 100, 110, 120, 130]);
  export const WORLD_SPLIT_SLIDE_SECONDS = 0.95;
  export const WORLD_SPLIT_SLIDE_SPEED = 95; // 95 * 0.95 = 90.25 field units

  // skills.js uses the existing public signature:
  applySkill(state, { team, sourcePlayerId, skillId, level = 1 })
  ```
- **Data & Schema Fields**:
  - Keep the existing barrier shape `{ skillId, team, sourcePlayerId, x, y, facingX, facingY, length, thickness, wallOffset, height, elapsedSeconds, remainingSeconds }`.
  - Do not add persistent state fields. Compute the stage index from the existing integer `state.stage`, clamped to `1..5`; choose `WORLD_SPLIT_LENGTHS[stage - 1]`.
- **Execution Flow / Logic**:
  1. Set `WORLD_SPLIT_HEIGHT` to 90 and preserve thickness 20, wall offset 40, and duration 3 seconds.
  2. Set slide speed to 95 while retaining slide duration 0.95 seconds, producing 90.25 units of travel. Keep `advanceWorldSplitSlide` using the shared speed constant.
  3. In the `powerTackle` branch of `applySkill`, derive `barrier.length` from clamped campaign stage; do not select the length using the skill `level` parameter.
  4. Keep ordinary tackle ranges (26 and 39 in their current callers) unchanged.
  5. Verify that collision reads `barrier.height` and the 3D wall derives its rendered height from the same property; only edit rendering if it has a separate hard-coded override.
  6. Preserve `applySkill`'s current return shape and existing `powerBarrierCreated` and `skillUsed` events.
- **Error & Exception Handling**: If `state.stage` is missing or outside 1–5, use stage 1. Do not create NaN length or height values.
- **State Transition & Return**: Store the new height and stage-derived length in the existing `state.powerBarriers` entry; keep the existing per-team replacement behavior.

### I02. Focused regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: World Split skill test; modify
  - `game/src/game/stepGame.test.js` :: barrier collision test; modify only if needed
#### Details
- Assert height 90 and lengths 90, 100, 110, 120, 130 for stages 1–5 at multiple skill levels, proving stage—not level—selects length.
- Assert slide duration remains 0.95 seconds and speed produces approximately 90 units of travel.
- Retain assertions for 20 thickness, 40 wall offset, three-second lifetime, and blocking behavior; ordinary tackle contact-range coverage must remain unchanged.

## Acceptance Criteria
- [ ] World Split height is 90 in simulation and rendered wall geometry.
- [ ] Campaign stages 1–5 produce barrier lengths 90, 100, 110, 120, 130, independent of skill level.
- [ ] The slide travels approximately 90 field units; ordinary tackle contact ranges are unchanged.
- [ ] Existing barrier lifetime and collision behavior remain intact.

## Validation
- `npm test -- --test-name-pattern="World Split"` from `game/` — focused World Split coverage passes.
- `npm test` from `game/` — full game test suite passes.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
feat(skills): resize World Split barrier and slide

Plan: 2026-10-26-football-tactics-and-skill-flow
Phase: P01-matchplay-and-tactics
Task: T01-world-split-scale

- Raise barrier height to 90 and slide about 90 units
- Scale barrier length from campaign stage
```

## Progress
- [x] Implementation complete
- [x] Validation passed: focused World Split tests, all 157 game tests, and the production build succeed.
- commit: recorded in Git history
