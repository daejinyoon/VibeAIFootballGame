# Task: T03 Status and Utility Visuals

## Status: pending

## Goal
Make Eulryongta's ten-second knockdown obvious, show Vacuum Cleaner pulling the ball along the ground through a wind path, and show Rainbow Reflect visibly returning the reflected effect.

## Decision Summary
- Keep the supplied Eulryongta soccer-photo cut-in and show spinning dizzy stars for the full ten-second knockdown.
- Vacuum Cleaner keeps instant full-field gameplay; its visual shows a swirling path from the ball to the user as the ball travels along the ground.
- Rainbow Reflect shows a short rainbow shield at the reflect point and an arc/returned shot or effect. Add no camera cut.

## Implementation

### I01. Player status and field utility visuals
- Related Files:
  - `game/src/components/PlayerMotionEffects3D.jsx` :: player effects and per-frame update; modify
  - `game/src/components/SkillEffects3D.jsx` :: Vacuum Cleaner/Rainbow effect slots; modify
  - `game/src/components/GameLoop3D.jsx` :: `vacuumPullVisual` creation; modify if path timing must match travel
  - `game/src/components/SkillCutInOverlay.jsx` :: Eulryongta supplied photo; read-only unless cut-in timing needs correction
  - `game/src/components/GameScreen.jsx` :: skill cut-in duration; modify only if needed to avoid conflicting with full knockdown cue

#### Details
- **Signatures & Types**:
  ```js
  state.vacuumPullVisual: null | {
    from:{x,y,height:0}, to:{x,y,height:0}, sourcePlayerId:string,
    elapsedSeconds:number, durationSeconds:number
  }
  state.players[].knockdownSeconds: number // 10 at impact, decreases to 0
  state.skillEffects[] may carry targetPlayerId and elapsedSeconds/durationSeconds
  ```
- **Data & Schema Fields**: Use existing status/effect fields and `vacuumPullVisual`; do not add another gameplay timer or change instant Vacuum Cleaner ownership.
- **Execution Flow / Logic**:
  1. Attach three bright star meshes above each player with `motionAction === 'knockdown'` and `knockdownSeconds > 0`; rotate them continuously and place them above the player's live actor position.
  2. Keep stars visible until `knockdownSeconds` reaches zero, including the full ten seconds after Eulryongta. Remove immediately when the player recovers, is dismissed, or no longer has the knockdown state.
  3. Keep `SkillCutInOverlay` using `/images/skills/eulryongta-cutin.jpg`; ensure the current short cut-in does not replace or interrupt the match view for ten seconds.
  4. Draw Vacuum Cleaner wind ribbons from `vacuumPullVisual.from` to `.to`, with a ground-level spiral, traveling ball cue, and tapering gusts. Interpolate progress from `elapsedSeconds/durationSeconds`; remove the cue after its current 0.48-second travel.
  5. For Rainbow Reflect, show a brief segmented rainbow shield at `effect.position` and a curved return arc directed toward the original caster/goal. Use event/effect source metadata from P01 T04; when the reflect is a shot, let the ball's returned trajectory supply arc direction.
  6. Reuse mesh slots and dispose any material/geometry on teardown; preserve current normal camera and UI overlays.
- **Error & Exception Handling**: If a target/source actor no longer exists, hide its local cue. If path endpoints are absent, use current ball and source positions only for one frame and remove the visual.
- **State Transition & Return**: All meshes are presentation-only and read the game state; effect expiry stays controlled by simulation timers.

### I02. Visual verification
- Related Files:
  - `game/src/components/PlayerMotionEffects3D.jsx` :: knocked-down player stars
  - `game/src/components/SkillEffects3D.jsx` :: suction and reflect visuals
#### Details
- Manually trigger the three skills and verify star lifetime, ground-level suction movement, and shield/return direction. Confirm the photo cut-in remains intact.

## Acceptance Criteria
- [ ] Eulryongta target shows fall plus dizzy rotating stars for the full ten-second status.
- [ ] Vacuum shows a ground-level moving ball path from field location to user without changing instant-pull gameplay.
- [ ] Rainbow Reflect shows a localized shield and return arc at the actual reflection location.
- [ ] No visual cue changes the underlying simulation or camera.

## Validation
- `cd game; npm run build` — effects and cut-in components compile.
- Manual: trigger Eulryongta, Vacuum Cleaner, and Rainbow Reflect and confirm duration/path/return visuals.

## Commit Message
```text
feat(render): clarify status, suction, and reflection skills

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P03-skill-presentation
Task: T03-status-utility-visuals-and-art

- Show dizzy stars through the full knockdown duration
- Draw ground suction and localized rainbow returns
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
