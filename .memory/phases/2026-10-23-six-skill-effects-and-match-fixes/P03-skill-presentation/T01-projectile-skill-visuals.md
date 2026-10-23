# Task: T01 Projectile Skill Visuals

## Status: done

## Goal
Show the Eagle Shot ascent/transformation/volley and a physically moving Tornado Shot around the actual ball path, while keeping the existing gameplay camera framing.

## Decision Summary
- Eagle Shot: ball rises vertically, changes into glowing eagle projectiles, then flies toward separate goal lanes. No camera cut. Return to an ordinary ball after resolution.
- Tornado Shot: a visible tornado surrounds/follows the ball and its width reflects level; only simulation-contacted players rise.
- Continue using the live simulation state as the source of visual positions.

## Implementation

### I01. Eagle/Tornado 3D renderer
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: `makeSlot`, `SkillEffects3D`, `useFrame` effect loop; modify
  - `game/src/components/FootballBall3D.jsx` :: ball visibility while transformed; modify
  - `game/src/components/Match3DCanvas.jsx` :: effects renderer props; modify only if needed
  - `game/src/components/TrackingCamera3D.jsx` :: read-only; preserve camera tracking behavior
  - `game/src/components/SkillEffects3D.test.js` :: visual-state helper tests if a pure helper is extracted; new only if needed

#### Details
- **Signatures & Types**:
  ```js
  // Read state fields created by P01 tasks
  SkillEffects3D({ gameStateRef })
  // state.skillProjectiles[]: id, skillId, team, x, y, height, phase, targetY
  // state.tornadoShotEffect: team, sourcePlayerId, level, pathWidth, hitPlayerIds
  ```
- **Data & Schema Fields**: Do not add a second visual-only projectile position. Render eagle positions from `state.skillProjectiles`; render Tornado from current ball position plus `tornadoShotEffect.pathWidth`. Reuse skill team colors only as accents, not as substitutes for the motion trail.
- **Execution Flow / Logic**:
  1. Add eagle mesh slots sized for the maximum 3 projectiles. Build each as a readable stylized energy bird from procedural meshes (body, wings, tail, emissive trail); animate wings and position from projectile `x/y/height` after game-to-world conversion.
  2. Hide the ordinary soccer ball only while an Eagle projectile is in the ascent/transformation phase at the ball's current position; show the three eagle models as the volley spawns. Restore the normal ball immediately after the projectile volley resolves/reset.
  3. Use emissive warm gold/white energy and a short vertical ascent beam, followed by a directional trail. Keep all effects within the normal `TrackingCamera3D` view and do not change camera target or FOV.
  4. For Tornado Shot, build a tapered rotating funnel from ring/curve meshes centered on the live ball, give it floor contact and a visible trail along recent ball positions, and scale funnel width from `pathWidth`.
  5. Add the recent path to transient visual state with a fixed-size circular buffer (maximum 24 points) updated per render frame; clear it when `tornadoShotEffect` ends. This trail is cosmetic only; gameplay collisions remain in `stepGame.js`.
  6. Dispose geometries/materials on unmount and avoid allocating new Three.js objects every frame; mutate existing meshes as the current effect renderer does.
- **Error & Exception Handling**: If no simulation projectile or tornado state exists, hide the corresponding slots; invalid coordinates use the last finite position and then hide after one frame.
- **State Transition & Return**: Renderer does not mutate score or collisions. It only reads `gameStateRef.current` and visual-only trail buffers.

### I02. Visual regression/build checks
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: effect rendering
  - `game/src/components/FootballBall3D.jsx` :: visibility and reset
#### Details
- Build a stage with a test/development Eagle Shot at each level and inspect that 1/2/3 birds are visible in sequence; trigger Tornado Shot to ensure funnel tracks moving ball and no camera cut occurs.

## Acceptance Criteria
- [x] Eagle Shot visibly rises before transformation and renders the correct number of distinct eagles.
- [x] Tornado wraps the moving ball and its width grows by the planned level ratios.
- [x] Normal ball returns for restart; regular camera framing remains active.
- [x] Effects read simulation coordinates and do not determine gameplay hits.

## Validation
- `cd game; npm run build` — 3D components compile.
- Manual: run Eagle Shot at levels 1/2/3 and Tornado Shot at levels 1/2/3 in the match; verify camera remains in normal gameplay mode.

## Commit Message
```text
feat(render): show Eagle and Tornado skill projectiles

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P03-skill-presentation
Task: T01-projectile-skill-visuals

- Render ascending energy eagles from simulation projectiles
- Add a moving tornado and ground trail around its shot
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm test`, 148/148; `npm run build`)
- commit: `cd9a14d`
