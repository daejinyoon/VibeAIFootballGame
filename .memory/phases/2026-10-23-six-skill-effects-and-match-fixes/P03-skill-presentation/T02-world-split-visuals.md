# Task: T02 World Split Visuals

## Status: done

## Goal
Make the field surface visibly split open along the caster's forward slide, at a length comparable to at least eight prone players at level 1. A dark trench and separated raised ground plates must read before the smaller rubble accents.

## Decision Summary
- The player slides low and physically forward along the same direction as the newly split ground.
- The ground itself visibly opens into a long dark fissure with separated, uneven earth plates on both sides; restrained glowing seam and rubble accents support this read.
- Two parallel raised rock walls flank the slide lane and both are represented in player/ball collision.
- Raise the paired walls to a clearly visible height above player models and light the rock faces/seam enough to read from the match camera.
- Keep the impassable gameplay collision aligned with the fissure and use its actual 3-second timer.
- Scale the fissure to lengths 400/500/600 at levels 1/2/3; level 1 is the minimum eight-player-length span.

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
  1. Replace the wide raised wall with a visibly open dark trench, glowing inner seam, and two staggered rows of displaced stone/ground plates.
  2. Stretch the terrain mesh along the actual 400/500/600 gameplay barrier and align it with `facingX/facingY`.
  3. Use `elapsedSeconds` for the initial plate lift and seam pulse; keep the terrain for the barrier's full 3-second lifetime.
  4. In `MiiPlayerModel`, show a low, nearly horizontal tackle-slide pose while simulation moves the caster along the fissure for 0.95 seconds.
  5. Keep the supplied image-inspired dark fractured earth and hot seam palette, with rubble as a supporting detail.
  6. Keep the existing card-art path for `game/public/images/skills/world-split.png` valid.
- **Error & Exception Handling**: Hide unused barrier slots; clamp negative elapsed progress to 0 and expired progress to 1. Materials and generated asset must load without blocking fallback card rendering.
- **State Transition & Return**: Visual effect does not block actors itself; `stepGame` remains the source of collision. Animation reads `motionAction` and barrier state only.

### I02. Visual/art validation
- Related Files:
  - `game/src/game/skills.test.js` :: artwork path assertion; update
  - `game/public/images/skills/world-split.png` :: asset existence; new
#### Details
- Confirm the art path exists, player slide displacement, barrier visual length/orientation, and the 3-second expiry agree with gameplay state at all levels.

## Acceptance Criteria
- [x] Player visibly slides forward along the fissure for 0.95 seconds.
- [x] The actual ground mesh reads as a long open trench with separated plates; level lengths are 400/500/600.
- [x] Ground fissure aligns with the 3-second gameplay barrier and remains a collision obstacle.
- [ ] Card art loads under the displayed Korean name “세계의 분리”.

## Validation
- `cd game; npm test -- --test-name-pattern="artwork|Power Tackle|World Split"` — skill metadata/art tests pass.
- `cd game; npm run build` — renderer and asset URL compile.
- Manual: trigger World Split from both attack directions at levels 1/2/3 and compare formation, length, and 3-second expiry with simulation.

## Commit Message
```text
fix(render): split the ground along the World Split slide

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P03-skill-presentation
Task: T02-world-split-visuals

- Draw a long open trench with paired walls flanking separated earth plates
- Move the caster low along the split ground and stop movement across either wall
```

## Progress
- [x] Implementation complete
- [x] Automated validation passed
- commit: pending
