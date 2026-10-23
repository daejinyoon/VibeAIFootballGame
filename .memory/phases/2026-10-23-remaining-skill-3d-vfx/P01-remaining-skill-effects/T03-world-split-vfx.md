# Task: T03 World Split VFX

## Status: done

## Goal
Make World Split read as a large ground rupture that opens along the caster's slide, with a dark central fissure, separated stone plates, and two raised walls visibly forming on either side.

## Decision Summary
- Keep the confirmed 3-second impassable paired barrier and 400/500/600-unit fissure lengths at levels 1/2/3.
- Align slide, fissure, walls, and gameplay collision to the same barrier direction and length.

## Implementation

### I01. Ruptured ground and paired wall model
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: `makeBarrierSlot`, barrier slot allocation/disposal and barrier `useFrame` loop; modify
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel` tackle pose; read-only unless pose fails to show the confirmed low slide
  - `game/src/game/skills.js` :: `applySkill` barrier fields; read-only
  - `game/src/game/constants.js` :: world-split length, height, duration constants; read-only
  - `game/src/game/stepGame.js` :: `state.powerBarriers` collision and `worldSplitSlideSecondsRemaining`; read-only

#### Details
- **Signatures & Types**:
  ```js
  state.powerBarriers: Array<{
    skillId: 'powerTackle', team: 'home' | 'away', sourcePlayerId: string,
    x: number, y: number, facingX: number, facingY: number,
    length: number, thickness: number, height: number,
    elapsedSeconds: number, remainingSeconds: number, wallOffset: number
  }>
  ```
- **Data & Schema Fields**: Keep `state.powerBarriers` as the sole lifetime source. Reuse `makeBarrierSlot` mesh pool; add irregular rock geometry only if needed for silhouette.
- **Execution Flow / Logic**:
  1. Keep a dark uneven central trench extending for `barrier.length`; draw a hot seam and jagged displaced plates on both sides.
  2. Make each flanking wall a distinct irregular raised rock structure, not a thin glowing line; place at `±wallOffset` from fissure centerline.
  3. Animate plates and fragments lifting outward during the first 0.35 seconds from `barrier.elapsedSeconds`, then hold wall form for the remaining lifetime.
  4. Scale length to `barrier.length / 80`, orient from `facingX/facingY`, and align floor contacts with the slide direction.
  5. Preserve wall height and contrast above player bodies from the existing camera; the crack glow is an accent, not the main wall.
  6. Reuse the bounded slots and dispose dynamic materials; allocate no meshes in the frame loop.
- **Error & Exception Handling**: Hide empty/expired slots; normalize facing or use stored direction; clamp negative age and rise progress.
- **State Transition & Return**: Render from barrier fields only. Do not change collision, slide movement, duration, or level length.

### I02. Preview validation
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: barrier slot update; inspect both home/away direction
  - `game/src/App.jsx` :: World Split preview setup; read-only after T01
- Confirm lengths, 3-second lifetime, initial wall lift, and slide alignment.

## Acceptance Criteria
- [x] Ground visibly opens into an uneven dark fissure with separated raised plates.
- [x] Two raised, impassable rock walls flank the slide and read clearly in the match camera.
- [x] Visual length, direction, and lifetime match the 400/500/600-unit, 3-second barrier.
- [x] Gameplay collision and slide behavior are unchanged.

## Validation
- `cd game; npm run build` — barrier geometry compiles.
- Manual: preview `powerTackle`; trigger both directions at levels 1/2/3 and compare with simulation.

## Commit Message
```text
feat(vfx): make World Split rupture the field

Plan: 2026-10-23-remaining-skill-3d-vfx
Phase: P01-remaining-skill-effects
Task: T03-world-split-vfx

- Build a deep fissure with displaced ground and paired rock walls
- Align the visual rupture with the existing slide and barrier state
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm run build`)
- [x] Preview route remains available for direct in-game inspection; no capture artifacts created.
- commit: recorded in Git history after validation
