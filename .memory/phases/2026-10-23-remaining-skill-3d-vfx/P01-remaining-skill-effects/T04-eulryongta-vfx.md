# Task: T04 Eulryongta VFX

## Status: pending

## Goal
Make Eulryongta's knockdown impact and dizzy state unmistakable: a visible impact burst followed by animated, readable 3D stars that track the downed player for the confirmed ten-second status.

## Decision Summary
- Preserve the confirmed fall/knockdown and ten-second duration.
- Keep the existing soccer-photo skill cut-in; add the field effect around the actual target.

## Implementation

### I01. Impact and persistent dizzy object
- Related Files:
  - `game/src/components/PlayerMotionEffects3D.jsx` :: `DIZZY_STAR_GEOMETRY`, `makePool`, dizzy-star `useFrame` loop; modify
  - `game/src/game/skills.js` :: `applySkill` Eulryongta target fields; read-only
  - `game/src/game/stepGame.js` :: knockdown expiry and skill effect timer; read-only
  - `game/src/components/SkillEffects3D.jsx` :: `makeSlot` and effect loop for one-time impact pulse; modify if needed
  - `game/src/components/SkillCutInOverlay.jsx` :: `/images/skills/eulryongta-cutin.jpg`; preserve

#### Details
- **Signatures & Types**:
  ```js
  state.players[]: {
    id: string, x: number, y: number, dismissed: boolean,
    motionAction: string, knockdownSeconds: number,
    knockdownSkillId?: 'eulryongta' | string
  }
  ```
- **Data & Schema Fields**: Add no gameplay fields. Use existing `knockdownSkillId`/effect target metadata and player timer.
- **Execution Flow / Logic**:
  1. Keep the dizzy mesh pool bounded; refine the flat shared star into a dimensional extruded/beveled star with a bright contrasting rim.
  2. At Eulryongta impact, show a short expanding ground ring and shard burst at the live target coordinates.
  3. During knockdown, attach three stars above the target; orbit at distinct radii/heights and rotate in opposing directions.
  4. Filter this signature cue to Eulryongta knockdowns so unrelated falls do not inherit its treatment.
  5. Fade near the end of the simulation timer; hide immediately on recovery, dismissal, status expiry, or missing actor.
  6. Keep the photo cut-in independent; stars do not hold or replace the match camera/UI.
- **Error & Exception Handling**: Hide an impact/star slot when its target is missing; reuse geometry/materials and dispose them in existing teardown.
- **State Transition & Return**: Effects read target/timer state only; they do not apply knockdown, extend duration, or control recovery.

### I02. Preview validation
- Related Files:
  - `game/src/App.jsx` :: Eulryongta preview target position; read-only after T01
  - `game/src/components/PlayerMotionEffects3D.jsx` :: impact and dizzy cue; inspect visually
- Confirm a legal forward target falls, the impact is visible, and stars follow until the ten-second timer expires.

## Acceptance Criteria
- [ ] Eulryongta has a clear target-centered impact and dimensional 3D dizzy stars.
- [ ] Stars follow the target and persist exactly as long as the existing knockdown status.
- [ ] Photo cut-in, skill behavior, and camera remain intact.

## Validation
- `cd game; npm run build` — pooled star and impact meshes compile.
- Manual: preview `eulryongta`; confirm the cue follows the target through recovery.

## Commit Message
```text
feat(vfx): give Eulryongta a clear dizzy impact

Plan: 2026-10-23-remaining-skill-3d-vfx
Phase: P01-remaining-skill-effects
Task: T04-eulryongta-vfx

- Add a target-centered impact burst and dimensional dizzy stars
- Tie the cue lifetime to the existing knockdown state
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
