# Task: T02 Distance-Based Shot Arcs

## Status: done

## Goal
Make ordinary shots visibly low and fast at close range and higher and slower at long range, with smooth interpolation, while preserving immediate `D` input, facing direction, existing goal-mouth assist, goalkeeper interaction, and normal scoring rules.

## Decision Summary
- Do not add a charge state or gauge. `D` continues to release a shot immediately.
- Apply the same distance curve to human and AI calls to `releaseShot`.
- Use existing ballistic units and gravity (`BALL_GRAVITY = 900` game units/s²). The 3D goal crossbar is `0.76` world units high at `80` world units per field unit, so use a 61-game-unit goal-height limit for scoring.

## Implementation

### I01. Calculate and integrate the distance-based trajectory

- Related Files:
  - `game/src/game/constants.js` :: shot constants — define blend distances and goal height; modify.
  - `game/src/game/stepGame.js` :: `releaseShot`, `integrateLooseBall`, `checkBallBoundary`, `predictGoalCrossing` — calculate, integrate, predict, and score ordinary shot arcs; modify.
  - `game/src/components/FootballPitch3D.jsx` :: `Goal` — read-only reference for the existing `postHeight = 0.76` world-unit geometry.
  - `game/src/components/GameLoop3D.jsx` :: ball actor height mapping — read-only reference for world/game scale conversion.

#### Details
- **Signatures & Types**:
  ```typescript
  export const SHOT_ARC_START_DISTANCE: number; // 180 field units
  export const SHOT_ARC_FULL_DISTANCE: number;  // 520 field units
  export const GOAL_CROSSBAR_HEIGHT: number;   // 61 field units

  type ShotBall = {
    flightKind: 'shot' | 'ground';
    height: number;
    verticalVelocity: number;
    vx: number;
    vy: number;
  };
  ```
- **Data & Schema Fields**:
  - Add no persistent game-state field. Continue using existing `ball.height`, `ball.verticalVelocity`, and `ball.flightKind`.
- **Execution Flow / Logic**:
  1. In `releaseShot`, preserve the existing facing vector and assisted target direction. Compute `horizontalGoalDistance = Math.abs(goalX - start.x)`.
  2. Compute `blend = clamp((horizontalGoalDistance - 180) / (520 - 180), 0, 1)` using the named constants.
  3. Preserve team base speed (`500` for home and `430` for away) at close range. Compute `speed = teamBaseSpeed * (1 - 0.16 * blend)`; this is 84% of the team's existing base speed at and beyond 520 field units.
  4. Set `ball.height = 0` and `ball.verticalVelocity = 80 + 240 * blend`. Close shots therefore begin with vertical velocity 80; long shots saturate at 320.
  5. In `integrateLooseBall`, include `shot` with the existing ballistic kinds `lob`, `cross`, and `header`. Apply `BALL_GRAVITY` each frame. When height reaches zero, clear vertical velocity and set the flight kind to `ground`, retaining the existing horizontal ball movement and friction rules.
  6. In `checkBallBoundary`, both left and right goal branches score only when the ball's planar y coordinate is inside the existing goal mouth and `ball.height <= GOAL_CROSSBAR_HEIGHT`. A shot above the crossbar continues through the existing out-of-play restart path.
  7. Keep `predictGoalCrossing` and `keeperThreat` using the existing projected ballistic height. Do not weaken `KEEPER_MAX_SAVE_HEIGHT` or alter skill-shot trajectories.
  8. Preserve immediate action: `handleHomeAttack` still calls `releaseShot` on `input.pressed.has('d')`; no behavior is added to `input.down` or `input.released`.

### I02. Update the existing simulation verification

- Related Files:
  - `game/src/game/stepGame.test.js` :: existing ordinary-shot tests — update expectations and add the listed cases; modify.

#### Details
- Keep the existing immediate-shot and eight-facing-direction assertions.
- Keep the existing close-versus-long goal-mouth-assist assertion.
- Replace any assumption that ordinary shots always have zero vertical velocity with assertions for close (80), midpoint (200), and long (320) curves.
- Assert the corresponding home/away speed uses the 84% far-distance multiplier and returns to full base speed at the 180-unit boundary.
- Advance a shot over multiple simulation frames and assert height rises, then falls to ground with `flightKind === 'ground'`.
- Assert a ball crossing the goal plane below or at 61 height scores, while a ball above 61 does not score and enters the normal out-of-play restart path.
- Assert holding `D` still emits one immediate shot and does not create charge state.

## Acceptance Criteria
- [x] Close shots are faster/lower than long shots and the distance curve has no discontinuity at 180 or 520 units.
- [x] Both teams use the distance curve without changing shot direction or existing aim assistance.
- [x] Ballistic height affects keeper prediction and a ball above the crossbar cannot score.
- [x] `D` remains an immediate shot and no gauge appears.

## Validation
- `npm test -- src/game/stepGame.test.js` from `game/` — shot, goalkeeper, and restart cases pass.
- `npm run build` from `game/` — production build completes.

## Commit Message
```text
feat(game): add distance-based shot trajectories

Plan: 2026-10-27-football-beta-feedback
Phase: P01-game-stability-and-polish
Task: T02-distance-based-shot-arcs

- Interpolate ordinary-shot speed and vertical velocity by goal distance
- Respect crossbar height when resolving goals
```

## Progress
- Implementation complete: distance-interpolated ordinary-shot speed/arc, ballistic shot integration, crossbar-aware scoring, and simulation coverage.
- Validation passed: `npm test -- src/game/stepGame.test.js` (91/91) and `npm run build`.
- Browser/gameplay feel review remains part of the user's deferred batch-release check; no deployment was made.
- Commit: `feat(game): add distance-based shot trajectories`