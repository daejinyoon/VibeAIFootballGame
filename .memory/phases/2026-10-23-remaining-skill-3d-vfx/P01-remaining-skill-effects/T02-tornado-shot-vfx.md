# Task: T02 Tornado Shot VFX

## Status: pending

## Goal
Make Tornado Shot look like a dense, energetic storm physically wrapped around the moving ball, with its funnel and ground contact clearly visible from the existing match camera.

## Decision Summary
- The ball remains visible inside the storm; the existing shot trajectory and player-lift contacts remain authoritative.
- Use live `state.ball` and `state.tornadoShotEffect`; add no second gameplay projectile or camera cut.

## Implementation

### I01. Dedicated moving storm object
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: `makeTornadoSlot`, tornado slot setup/disposal, tornado `useFrame` loop; modify or remove duplicate meshes
  - `game/src/components/TornadoShot3D.jsx` :: new `TornadoShot3D` scene component and reusable geometry
  - `game/src/components/Match3DCanvas.jsx` :: mount component inside `<Canvas>` with `gameStateRef`; modify
  - `game/src/game/skills.js` :: `applySkill` tornado fields; read-only
  - `game/src/game/stepGame.js` :: `advanceSkillProjectiles`, `advanceTornadoShot`; read-only state source

#### Details
- **Signatures & Types**:
  ```js
  export function TornadoShot3D({ gameStateRef }: { gameStateRef: React.RefObject<GameState> }): JSX.Element
  state.tornadoShotEffect: null | {
    team: 'home' | 'away', sourcePlayerId: string, level: number,
    pathWidth: number, hitPlayerIds: string[], elapsedSeconds: number,
    durationSeconds: number
  }
  state.ball: { x: number, y: number, height: number, skillId: 'tornadoShot' | null }
  ```
- **Data & Schema Fields**: Add no state fields. Use `FIELD` for game-to-world conversion. Derive width only from `tornadoShotEffect.pathWidth`.
- **Execution Flow / Logic**:
  1. Create a tapered translucent funnel, two independently twisting helical wind bands, a ragged outer wind silhouette, ground-contact rings, and a short fixed-capacity path ribbon.
  2. Center the storm on live `state.ball` each frame, including vertical height; keep the football visible at the core.
  3. Scale radial geometry from `pathWidth` while preserving funnel height and legible ball scale.
  4. Animate rings upward/inward, rotate helices in opposite directions, and vary wind brightness from `elapsedSeconds`; use team colors only as accents.
  5. Extend the ribbon from recent rendered ball positions and clear it when `tornadoShotEffect` ends or the ball no longer has a Tornado trajectory.
  6. Remove/hide old Tornado geometry in `SkillEffects3D.jsx` to prevent double rendering.
  7. Mount in the existing R3F scene and preserve `TrackingCamera3D` framing.
- **Error & Exception Handling**: Hide meshes and clear history when effect/ball/finite coordinates are missing. Clamp delta/path sample count; never generate geometry in the frame loop.
- **State Transition & Return**: Renderer reads simulation state only. Expiry, trajectory, collision, and lift contacts remain in `stepGame.js`.

### I02. Preview validation
- Related Files:
  - `game/src/App.jsx` :: Tornado preview setup; read-only after T01
  - `game/src/components/TornadoShot3D.jsx` :: storm update loop; visual inspection
- Confirm a visible ball inside the funnel, continuous field travel, and width changes at levels 1/2/3 without a camera cut.

## Acceptance Criteria
- [ ] Funnel, paired helices, ground contact, and path ribbon form one readable moving storm.
- [ ] Ball remains visible inside the storm during flight.
- [ ] Width tracks `pathWidth`; effect hides when simulation state expires.
- [ ] Tornado trajectory, hits, score, lift duration, and camera remain unchanged.

## Validation
- `cd game; npm run build` — scene component and geometry compile.
- Manual: preview `tornadoShot` and trigger levels 1/2/3.

## Commit Message
```text
feat(vfx): build a moving tornado around skill shots

Plan: 2026-10-23-remaining-skill-3d-vfx
Phase: P01-remaining-skill-effects
Task: T02-tornado-shot-vfx

- Render a layered storm funnel around the live ball
- Scale wind width from the existing skill level state
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
