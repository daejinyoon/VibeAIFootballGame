# Task: T01 World Split Rock Wall

## Status: done

## Goal
Make the World Split rock body clearly visible, opaque, about 1.5 times its current vertical size, and tilted 35 degrees in the tackle travel direction while preserving the existing barrier data, gameplay collision line, barrier length, and tackle range.

## Decision Summary
- Rainbow Reflect removal is unrelated to this rendering issue; do not restore it.
- Tilt the rendered rocks only. Preserve barrier creation, `WORLD_SPLIT_LENGTHS`, `WORLD_SPLIT_HEIGHT`, and all collision calculations.
- Use local +X as the tackle travel direction after the barrier root's existing yaw alignment. A 35-degree forward lean uses negative local Z rotation in Three.js.

## Implementation

### I01. Enlarge and incline the rendered rock body

- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: `makeBarrierSlot`; `SkillEffects3D` barrier update loop; modify
  - `game/src/game/constants.js` :: `WORLD_SPLIT_HEIGHT`, `WORLD_SPLIT_LENGTHS`; read-only, verify unchanged
  - `game/src/game/skills.js` :: `applySkill` powerTackle barrier construction; read-only, verify unchanged
  - `game/src/game/stepGame.js` :: `barrierSegments`, barrier collision helpers; read-only, verify unchanged

#### Details
- **Barrier data** (no schema change):
  - `skillId: string` (`powerTackle`), `team: 'home' | 'away'`, `sourcePlayerId: string`
  - `x`, `y`, `facingX`, `facingY`, `length`, `thickness`, `wallOffset`, `height`, `elapsedSeconds`, `remainingSeconds`: finite numbers
- **Existing transforms**: barrier root center derives from `x/y` plus half `length` along normalized `facingX/facingY`; root yaw aligns local +X with that direction; root X scale is `length / 80`. Rock blocks are dodecahedra, opaque `MeshStandardMaterial`, with existing randomized block positions and color variation.
- **Execution Flow / Logic**:
  1. Keep barrier validation, root visibility, root position/yaw/scale, lift animation (`rise`), wall offsets, color assignment, ground plates, shards, debris, and slot disposal behavior intact.
  2. Define local `leanAngle = 35 * Math.PI / 180` in the barrier visual logic. Keep every computed block's existing height variation and rise factor, but change its height scale from `maximumWallHeight / 1.88 * shapeHeight * rise` to `maximumWallHeight / 1.25 * shapeHeight * rise` (1.5x the previous factor, rounded to a simple stable divisor).
  3. Treat `height` as the block's half-height. Place the block center at `x = -0.48 + lane * 0.96 + Math.sin(leanAngle) * height`, `y = Math.cos(leanAngle) * height`, and the existing `z = side * wallOffset`. Set its Z rotation to `-leanAngle + variation * 0.07`; preserve its existing X/Y jitter and X/Z scale formulas. This pivots the rock's visual body forward while keeping its lower edge near the ground.
  4. Leave the wall opaque. Do not modify gameplay collision, barrier lifetime, tackle slide, hit distance, stage progression, or wall length.
  5. Inspect both home and away effects in the running 3D game: rocks must lean along each side's tackle direction, retain staggered stone shapes, and remain visible through their full animation.
- **Error & Exception Handling**: Keep the existing invalid-barrier guard that hides a slot when required coordinates/length/direction are invalid or `remainingSeconds <= 0`. No new state or exceptions are introduced.
- **State Transition & Return**: Visual-only transform updates per frame; `state.powerBarriers` and all simulation state remain unchanged.

## Acceptance Criteria
- [x] Rock blocks appear substantially taller and wider than the first adjustment and remain opaque with stronger contrast.
- [x] Rock tops lean 35 degrees in the barrier's tackle travel direction for both teams.
- [x] Wall length, sliding/tackle reach, collision line, collision height, expiry, and stage scaling are unchanged.
- [x] `npm test` and `npm run build` pass from `game/`.

## Validation
- `npm test` from `game/` — all existing simulation and progression tests pass.
- `npm run build` from `game/` — Vite production build completes.
- Manual visual check: run `npm run dev` from `game/`, activate World Split for home and away, and confirm the rock wall is visible and leans forward for each direction.

## Commit Message
```text
feat(game): make World Split rocks visible and slanted

Plan: 2026-10-26-world-split-player-facing-azure-hosting
Phase: P01-game-presentation
Task: T01-world-split-rock-wall

- Increase rendered rock height by 1.5x and lean the solid stones 35 degrees toward tackle travel.
- Preserve barrier gameplay collision and range values.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- [x] Follow-up screenshot review prompted a second visual-size and contrast adjustment; simulation and collision remain untouched.
- [ ] User visual confirmation after refreshing the game.
- commit: feat(game): make World Split rocks visible and slanted
