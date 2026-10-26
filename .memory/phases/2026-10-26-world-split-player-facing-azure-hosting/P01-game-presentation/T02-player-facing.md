# Task: T02 Player Facing

## Status: done

## Goal
Rotate all visible, active player models toward the ball when they do not own it; rotate the carrier in its movement direction. Keep the change visual-only and preserve existing airborne spin and all simulation behavior.

## Decision Summary
- Non-carriers look from their field position toward the ball position.
- The carrier looks along its velocity; if stationary, use its stored facing vector. If a direction vector is unavailable or zero, fall back to the existing team heading.
- Existing coordinates are field units: player `x/y`, velocity `vx/vy`, and ball `x/y`. Field `y` maps to Three.js world Z; field `x` maps to world X.

## Implementation

### I01. Add a deterministic player yaw helper

- Related Files:
  - `game/src/game/playerOrientation.js` :: `getPlayerFacingYaw`; new
  - `game/src/game/playerOrientation.test.js` :: orientation cases; new
  - `game/src/game/constants.js` :: `TEAM_IDS`; read-only, verify team values

#### Details
- **Signature**:
  ```js
  export function getPlayerFacingYaw(player, ball) // player shape and ball shape below; returns yaw in radians
  ```
- **Data & Schema Fields**:
  - `player`: `{ id: string, team: 'home' | 'away', x: number, y: number, vx?: number, vy?: number, facingX?: number, facingY?: number }`
  - `ball`: `{ ownerId: string | null, x: number, y: number }`
  - No fields are added to the saved or simulation state.
- **Execution Flow / Logic**:
  1. For a carrier (`ball?.ownerId === player.id`), use `(player.vx, player.vy)` when its magnitude is at least 3 field units per second; otherwise use `(player.facingX, player.facingY)`.
  2. For a non-carrier, use direction `(ball.x - player.x, ball.y - player.y)` when all coordinates are finite.
  3. If the selected vector is absent, non-finite, or has magnitude below `0.001`, use team-forward vector: home `(1, 0)`, away `(-1, 0)`.
  4. Convert field vector `(dx, dy)` to Three.js yaw with `Math.atan2(dx, dy)`, because local player forward is +Z and field Y maps to world Z. Return the number in radians.
  5. Unit-test home/away fallback, non-carrier toward-ball direction in all four field quadrants, moving-carrier velocity direction, stationary-carrier facing fallback, and coincident/invalid coordinates.
- **Error & Exception Handling**: Missing/invalid `player`, `ball`, coordinates, or vectors must fall back to a finite team-forward yaw. The helper must not mutate either input.
- **State Transition & Return**: Pure return value only; no state mutation.

### I02. Apply yaw in the 3D game loop

- Related Files:
  - `game/src/components/GameLoop3D.jsx` :: `useFrame` player actor transform update; modify
  - `game/src/game/playerOrientation.js` :: `getPlayerFacingYaw`; import/read-only

#### Details
- **Execution Flow / Logic**:
  1. Replace the fixed `player.team` yaw base in the per-player loop with `getPlayerFacingYaw(player, state.ball)`.
  2. Preserve the current airborne spin term exactly: add `animationTimeRef.current * 7 * spin` when airborne, with `spin = player.team === 'away' ? -1 : 1`; keep zero additional spin on the ground.
  3. Do not change `actor.position`, actor visibility, selected markers, `stepGame`, AI or player movement, or the ball owner.
  4. Preserve the same orientation application for field players and goalkeepers; continue to hide dismissed players as currently done.

## Acceptance Criteria
- [x] Active non-carriers turn their body to face the ball as it moves around the pitch.
- [x] A moving carrier faces its direction of movement; a stationary carrier preserves its last facing direction.
- [x] Invalid/coincident vectors produce a finite, team-aligned yaw without visible rapid flipping.
- [x] Airborne spin behavior remains intact and orientation does not alter match simulation.
- [x] `node --test src/game/playerOrientation.test.js`, `npm test`, and `npm run build` pass from `game/`.

## Validation
- `node --test src/game/playerOrientation.test.js` from `game/` — focused orientation unit tests pass.
- `npm test` from `game/` — all tests pass.
- `npm run build` from `game/` — Vite production build completes.
- Manual visual check: run a match, move the ball to both sides of the field, and verify defenders/keepers face the ball while the carrier faces its travel direction.

## Commit Message
```text
feat(game): orient players toward the ball and movement

Plan: 2026-10-26-world-split-player-facing-azure-hosting
Phase: P01-game-presentation
Task: T02-player-facing

- Add a pure field-vector to Three.js yaw calculation with safe fallbacks.
- Apply ball-facing and movement-facing yaw without changing simulation logic.
```

## Progress
- [x] Implementation complete
- [x] Validation passed (5 focused tests, 168 total tests, production build)
- commit: `8b1dac3`
