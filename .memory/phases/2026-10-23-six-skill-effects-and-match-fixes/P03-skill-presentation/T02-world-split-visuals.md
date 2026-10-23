# Task: T02 World Split Visuals

## Status: pending

## Goal
Make the caster perform a recognizable forward slide and make a jagged blue-violet dimensional fissure wall rise sequentially along the gameplay barrier.

## Decision Summary
- The slide creates the terrain along its direction, rather than showing a generic flat ring or a wall disconnected from the player.
- Match the supplied fractured-rock reference: uneven rising rocks, glowing blue-violet crack, visible ground fissure; the structure reads as an impassable wall.
- Use the barrier's actual 3-second timer and level lengths 220/275/330 from the simulation state.

## Implementation

### I01. Barrier meshes and player slide animation
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: barrier slot builder and barrier `useFrame` loop; modify
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel` tackle/skill pose; modify
  - `game/src/components/GameLoop3D.jsx` :: actor transform for tackle slide; modify only if pose has no motion signal
  - `game/src/game/skills.js` :: skill display name/art reference; read-only from P01 or adjust if P01 not yet updated
  - `game/public/images/skills/world-split.png` :: new card illustration

#### Details
- **Signatures & Types**:
  ```js
  // Reads barrier fields from P01 T03
  {x,y,facingX,facingY,length,thickness,height,elapsedSeconds,remainingSeconds,team}
  ```
- **Data & Schema Fields**: Keep wall gameplay geometry in `state.powerBarriers`; no separate visual duration. Place card art at `/images/skills/world-split.png` and keep internal key `powerTackle`.
- **Execution Flow / Logic**:
  1. Replace the generic nine-dodecahedron ridge with an irregular row of about 15 rock shards, variable height and lean, using dark earth/stone materials.
  2. Add a blue-violet emissive ground crack along the barrier base; use a segmented emissive line and particles that travel from barrier start toward its end.
  3. Use `elapsedSeconds` to raise each segment over the first 0.35 seconds from ground level to `height/80` world units. Keep the formation fixed after rise and fade it during its last 0.25 seconds before the 3-second expiry.
  4. Scale mesh length from the simulation's 220/275/330 value and align with its actual `facingX/facingY`; do not independently recalculate orientation.
  5. In `MiiPlayerModel`, give `motionAction === 'tackle'` a low body lean, torso near ground, forward arm reach, and legs trailing behind. Drive pose from `motionTimerSeconds` or elapsed skill state; return smoothly to run/idle.
  6. Create original card art inspired by the supplied image: fractured ground wall, electric blue-violet seam, readable action-card composition, no source watermark/text. Save as `game/public/images/skills/world-split.png` and keep it transparent only if the existing card frame expects transparency.
- **Error & Exception Handling**: Hide unused barrier slots; clamp negative elapsed progress to 0 and expired progress to 1. Materials and generated asset must load without blocking fallback card rendering.
- **State Transition & Return**: Visual effect does not block actors itself; `stepGame` remains the source of collision. Animation reads `motionAction` and barrier state only.

### I02. Visual/art validation
- Related Files:
  - `game/src/game/skills.test.js` :: artwork path assertion; update
  - `game/public/images/skills/world-split.png` :: asset existence; new
#### Details
- Confirm the art path exists and the player slide starts with the skill. Verify barrier visual length/orientation and expiry agree with gameplay state at all levels.

## Acceptance Criteria
- [ ] Player visibly slides forward before/while the wall forms.
- [ ] Ground crack and jagged rocks rise sequentially along the same path as the physics wall.
- [ ] Blue-violet dimensional lighting is distinct from the current cyan/orange generic barrier.
- [ ] Card art loads under the displayed Korean name “세계의 분리”.

## Validation
- `cd game; npm test -- --test-name-pattern="artwork|Power Tackle|World Split"` — skill metadata/art tests pass.
- `cd game; npm run build` — renderer and asset URL compile.
- Manual: trigger World Split from both attack directions at levels 1/2/3 and compare formation, length, and 3-second expiry with simulation.

## Commit Message
```text
feat(render): animate the World Split slide and fissure

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P03-skill-presentation
Task: T02-world-split-visuals

- Raise an irregular blue-violet rock wall from the slide path
- Add dedicated World Split skill-card art
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
