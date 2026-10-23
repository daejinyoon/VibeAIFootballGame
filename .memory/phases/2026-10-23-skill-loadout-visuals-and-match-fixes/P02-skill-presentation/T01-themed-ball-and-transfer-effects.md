# Task: T01 Themed Ball and Transfer Effects

## Status: done

## Goal
Make ball-related skill activity readable at gameplay speed: Eagle Shot visibly transforms the ball into an eagle, Tornado Shot visibly wraps the ball in a traveling funnel, Vacuum Cleaner draws the ball continuously to the user over about 0.7 seconds, and Rainbow Reflect shows the status moving from player to player.

## Decision Summary
- The ordinary soccer-ball appearance returns when a ball skill ends. Tornado keeps the soccer ball visible inside a moving tornado. Vacuum keeps the recognizable ball and uses an accelerating spiral suction path.
- Preserve the existing cycloidal Eagle Shot, World Split terrain, Eulryongta stars, and skill audio; this task adds or corrects presentation, not their established gameplay rules.

## Visual Reference Follow-up
- Increase VFX readability to match the requested six-panel concept sheet: a bright eagle trail toward goal, a tall moving tornado with a visible wrapped ball, long twin World Split walls with glowing cracks and flying debris, unmistakable dizzy stars on Eulryongta targets, a continuous spiral suction route for Vacuum Cleaner, and a rainbow transfer beam with an arrival cue.
- These are 3D gameplay effects; do not display the static concept sheet as an in-game overlay.

## Implementation

### I01. Ball mesh and travel visualization
- Related Files:
  - `game/src/components/FootballBall3D.jsx` :: `FootballBall3D` — render skill-aware ball meshes/materials while preserving the ordinary mesh fallback; modify.
  - `game/src/components/SkillEffects3D.jsx` :: `SkillEffects3D` frame updates and skill effect slots — strengthen moving Tornado, Vacuum spiral, and Rainbow transfer visuals; modify.
  - `game/src/components/Match3DCanvas.jsx` :: `FootballBall3D`, `SkillEffects3D` mounting — pass state/effect references needed by ball visuals if current props are insufficient; modify only as needed.
  - `game/src/game/skills.js` :: `applySkill` Vacuum Cleaner branch — initialize a travel effect without immediately placing the ball at the user; modify.
  - `game/src/game/stepGame.js` :: `advanceVacuum`, skill effect lifecycle — move the real ball over the selected duration; modify.
  - `game/src/components/GameLoop3D.jsx` :: `vacuumPullVisual` event handling — use live ball position/effect rather than a snapped endpoint; modify if presentation still needs elapsed time.
- **Data & Schema Fields**:
  ```ts
  type VacuumEffect = {
    playerId: string;
    startPosition: { x: number; y: number };
    elapsedSeconds: number;
    durationSeconds: 0.7;
    remainingSeconds: number;
  };
  ```
  - Extend current `state.vacuumEffect` only as needed to retain the initial ball position and elapsed time. Do not serialize this transient into campaign saves.
- **Execution Flow / Logic**:
  1. For Eagle Shot, keep the currently implemented projectile/eagle transformation and ensure the main ball is hidden only during the ascending transform; make the custom projectile visible throughout its cycloidal flight and restore the normal ball after the scoring/restart transition.
  2. For Tornado Shot, keep the normal ball mesh visible and render an animated funnel/wind bands centered on the live ball position; continue using `tornadoShotEffect.level` for its current level-scaled path.
  3. On Vacuum activation, capture the ball's starting coordinates and create `vacuumEffect`; do not set `ball.x/y` to the player in `applySkill`.
  4. In `advanceVacuum`, recompute the target player's current coordinates each frame and move along the suction path. Use an ease-in curve that accelerates toward the player; complete at 0.7 seconds or the existing close-contact threshold, then set ball ownership and clear transient visuals.
  5. Show a continuous spiral path between the ball's current coordinates and the player. Do not render the ball only at a remembered end point.
  6. Keep non-skill, pass, shot, and post-effect ball appearance on the ordinary soccer-ball mesh/material.

### I02. Rainbow transfer and regression checks
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: `SkillEffects3D` — animate a rainbow connector from transfer source to target and status effect at destination; modify.
  - `game/src/game/skills.test.js` :: Vacuum and Rainbow cases — validate continuous travel state and transfer metadata; modify.
  - `game/src/game/stepGame.test.js` :: effect advancement cases — ensure Vacuum duration/easing completes and clears transient state; modify.
- **Visual Flow**:
  1. At successful Rainbow activation, show the user's existing status icon/effect disappear.
  2. Animate a rainbow connection from the controlled player to the recorded last skill caster.
  3. At arrival, show the same status-specific visual on the recipient: dizzy stars for knockdown, airborne/wind effect for lift, or an explicit stun cue for stun.
  4. Clear transfer VFX when travel finishes or the match ends; do not re-apply status in the visual layer.

## Acceptance Criteria
- [x] Eagle Shot's eagle is visible along its full flight and the soccer ball returns after the skill resolves.
- [x] Tornado Shot's soccer ball remains recognizable inside a visibly moving tornado.
- [x] Vacuum movement is continuous for about 0.7 seconds, accelerates near the user, and cannot appear to teleport or travel toward an unrelated opponent.
- [x] Rainbow status visibly leaves the user and reaches the designated opponent; gameplay owns the actual state change.
- [x] Ordinary ball display returns after all skill-specific effects end.

## Validation
- `npm test -- src/game/skills.test.js src/game/stepGame.test.js` — Vacuum travel state and transfer event behavior pass.
- `npm run build` — 3D components compile.

## Commit Message
```text
feat(vfx): make skill ball travel and status transfer visible

Plan: 2026-10-23-skill-loadout-visuals-and-match-fixes
Phase: P02-skill-presentation
Task: T01-themed-ball-and-transfer-effects

- Add per-skill ball presentation and restore normal ball after effects
- Animate Vacuum travel and Rainbow status transfer visibly
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in `.memory/current.md`

## Validation Result
- `npm test -- src/game/skills.test.js src/game/stepGame.test.js src/game/createInitialGameState.test.js` — passed (105 tests).
- `npm run build` — passed; Vite reports the existing large Three.js chunk advisory.

