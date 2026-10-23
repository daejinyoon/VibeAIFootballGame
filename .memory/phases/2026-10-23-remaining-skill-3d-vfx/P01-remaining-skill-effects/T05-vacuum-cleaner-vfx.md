# Task: T05 Vacuum Cleaner VFX

## Status: done

## Goal
Make Vacuum Cleaner visibly pull the ball to the user with a bright, continuous suction stream and moving ball cue that accelerates near the caster rather than appearing to teleport.

## Decision Summary
- Preserve immediate gameplay ownership change and the previously confirmed approximately 0.7-second visual pull.
- Keep the ball visibly following the field-level path from its original position to the user.

## Implementation

### I01. Suction source, vortex, and traveling ball cue
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: `makeSlot`, Vacuum branch in main effect loop, line/beam update; modify or delegate
  - `game/src/components/VacuumCleaner3D.jsx` :: new `VacuumCleaner3D` component for suction geometry and animation
  - `game/src/components/GameLoop3D.jsx` :: `vacuumPullVisual` creation/interpolation; read-only unless render interpolation must be passed through
  - `game/src/components/FootballBall3D.jsx` :: ordinary ball visual; modify only if needed to render visual-only moving ball while authoritative ball is already owned
  - `game/src/game/skills.js` :: Vacuum Cleaner `applySkill` and `state.vacuumEffect`; read-only

#### Details
- **Signatures & Types**:
  ```js
  export function VacuumCleaner3D({ gameStateRef }: { gameStateRef: React.RefObject<GameState> }): JSX.Element
  state.vacuumPullVisual: null | {
    from: { x: number, y: number, height: 0 },
    to: { x: number, y: number, height: 0 }, sourcePlayerId: string,
    elapsedSeconds: number, durationSeconds: number
  }
  ```
- **Data & Schema Fields**: Use `vacuumPullVisual` as cosmetic timing/endpoints and `vacuumEffect`/`skillEffects` as activation state. Do not add another ownership model or alter ownership timing.
- **Execution Flow / Logic**:
  1. Build a compact stylized vacuum canister/nozzle from meshes, float it beside the caster and point its intake toward `from`; do not depend on modifying the Mii hand rig.
  2. Render a visible spiral wind channel from `from` to `to`, with multiple curved ribbons rotating around and tightening toward the nozzle.
  3. Add traveling dust/air streaks, bright intake rings at the nozzle, and a brief expanding vortex at the caster end.
  4. Interpolate the visual ball cue over `durationSeconds` using an ease-in curve that is slow at the distant end and noticeably faster near the player.
  5. Keep geometry near ground level and orient suction toward the live caster location; hide ordinary duplicate ball only while the visual cue occupies the same path position.
  6. Reuse bounded geometry/materials and clear path history on expiry. Do not move the authoritative ball, alter its owner, or block play.
- **Error & Exception Handling**: If endpoints/source are unavailable, use valid stored endpoints for the current cue only; otherwise hide it. Avoid per-frame geometry allocation.
- **State Transition & Return**: Visual timer ends the cue; possession and score remain simulation-owned.

### I02. Preview validation
- Related Files:
  - `game/src/App.jsx` :: Vacuum Cleaner preview ball setup; read-only after T01
  - `game/src/components/VacuumCleaner3D.jsx` :: suction and ball path; inspect visually
- Confirm the ball starts away from the user, travels continuously for the visible pull interval, and reaches the user without a teleport-looking gap.

## Acceptance Criteria
- [x] A recognizable vacuum nozzle and bright spiral stream connect the starting ball position to the caster.
- [x] Ball stays continuously visible and accelerates near the user over the current visual interval.
- [x] Visual remains ground-level and ends without duplicate balls or possession changes.

## Validation
- `cd game; npm run build` — suction component and scene integration compile.
- Manual: preview `vacuumCleaner` and trigger at multiple ball/caster distances.

## Commit Message
```text
feat(vfx): show Vacuum Cleaner pulling the ball

Plan: 2026-10-23-remaining-skill-3d-vfx
Phase: P01-remaining-skill-effects
Task: T05-vacuum-cleaner-vfx

- Draw a visible rotating suction path from the ball to the caster
- Keep a continuous accelerating ball cue through the pull
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm run build`)
- [x] Preview route remains available for in-game inspection; gameplay ownership and ball motion remain simulation-owned.
- commit: recorded in Git history after validation
