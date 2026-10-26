# Task: T03 Lower the World Split Wall

## Status: done

## Goal
Reduce World Split's physical and rendered height from 144 to 72 field units so players can see activity on the far side more easily.

## Decision Summary
- Apply D03: use height 72 for the wall created by World Split and for its visual height scaling.
- Keep wall length, thickness, offsets, duration, and height-aware collision rules unchanged.

## Implementation

### I01. Set the shared barrier height to 72
- Related Files:
  - `game/src/game/constants.js` :: `WORLD_SPLIT_HEIGHT` — shared simulation/rendering height; modify
  - `game/src/game/skills.js` :: `applySkill` — assigns the shared height to each new barrier; read-only unless assignment needs correction
  - `game/src/components/SkillEffects3D.jsx` :: barrier rendering loop — derive visible height from `barrier.height`; read-only unless required

#### Details
- **Signatures & Types**:
  ```js
  export const WORLD_SPLIT_HEIGHT = 72; // field-space height units
  export function applySkill(state, { team, sourcePlayerId, skillId, level = 1 } = {}) // creates a barrier with height: WORLD_SPLIT_HEIGHT
  ```
- **Data & Schema Fields**:
  - `state.powerBarriers[]`: each barrier keeps `height: number`; new World Split barriers use `72`.
  - Renderer converts field units with `Math.max(0.3, Number(barrier.height) || 144) / 80`; preserve the dynamic `barrier.height` dependency and existing fallback.
  - Collision compares projectile/object height to `barrier.height`; use the same physical height as rendering.
- **Execution Flow / Logic**:
  1. Change `WORLD_SPLIT_HEIGHT` from `144` to `72`.
  2. Preserve the assignment of this constant in `applySkill` and confirm no renderer-only hard-coded height overrides it.
  3. Preserve older/manual barrier fallback behavior and all height-aware collision logic.

### I02. Update World Split regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: `World Split slides the caster along a long, three-second level-scaled ground split` — assert height 72; modify
  - `game/src/game/skills.test.js` :: `Eagle Shot clears a lower wall and is blocked by a wall above its flight height` — retain collision threshold coverage; read-only

#### Details
- Assert a newly created level 2 barrier has height `72`, length `500`, thickness `20`, wall offset `40`, and duration `3` seconds.
- For levels 1, 2, and 3, assert lengths remain `400`, `500`, and `600`, and every barrier has height `72`.
- Keep the explicit projectile-height test to ensure wall height still controls whether Eagle Shot is blocked.

## Acceptance Criteria
- [ ] New World Split barriers store height 72 at every skill level.
- [ ] The rendered wall follows `barrier.height`, matching collision height.
- [ ] Existing barrier length, duration, and projectile-height collision behavior remain covered.

## Validation
- `node --test src/game/skills.test.js` from `game/` — skill simulation tests pass.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
fix(skills): lower World Split barrier height

Plan: 2026-10-26-football-skill-fixes
Phase: P01-skill-gameplay-and-vfx
Task: T03-lower-world-split-wall

- Reduce World Split gameplay and rendered height to 72 units
- Assert the shared height while retaining other barrier dimensions
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
