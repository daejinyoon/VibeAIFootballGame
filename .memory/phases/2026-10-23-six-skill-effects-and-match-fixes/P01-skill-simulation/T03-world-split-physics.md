# Task: T03 World Split Physics

## Status: pending

## Goal
Replace the Power Tackle gameplay boost with a forward sliding World Split that raises a solid height-aware fissure wall. Keep the stored skill ID `powerTackle` for saved campaign compatibility while changing all player-facing labels to “세계의 분리”.

## Decision Summary
- Slide the user forward; build the barrier sequentially along that real path. It lasts exactly 3 seconds at every level and has lengths 220/275/330 game units at levels 1/2/3.
- Block player movement, passes, ordinary shots, and skill shots only when the ball's physical height intersects the wall. Launch characters it hits, including keepers and either team, but never launch the caster.
- A descending Eagle can pass over the wall only when above wall height; a low Tornado shot is blocked.

## Implementation

### I01. Wall model, collision, and slide
- Related Files:
  - `game/src/game/skills.js` :: `SKILLS`, `applySkill`, Power Tackle branch; modify
  - `game/src/game/stepGame.js` :: `blockedByBarrier`, `enforcePowerBarriers`, `integrateLooseBall`, player movement and barrier timers; modify
  - `game/src/game/constants.js` :: World Split dimensions; modify
  - `game/src/game/skills.test.js` :: barrier activation tests; modify
  - `game/src/game/stepGame.test.js` :: player/ball collision tests; modify

#### Details
- **Signatures & Types**:
  ```js
  state.powerBarriers: Array<{
    skillId: 'powerTackle', team: 'home'|'away', sourcePlayerId: string,
    x: number, y: number, facingX: number, facingY: number,
    length: 220|275|330, thickness: 28, height: 72,
    elapsedSeconds: number, remainingSeconds: number
  }>
  blockedByBarrier(state, point, radius, objectHeight = 0): boolean
  ```
- **Data & Schema Fields**:
  - Barrier height is 72 game units; wall thickness stays 28. Keep `powerBarriers` and `powerTackleSeconds` fields to avoid profile migration.
  - World Split lengths are `[220, 275, 330]`; duration is `3` for every level.
  - Rename `SKILLS.powerTackle.name` to `세계의 분리`, update description and artwork URL to `/images/skills/world-split.png`; internal ID remains `powerTackle`.
- **Execution Flow / Logic**:
  1. In `applySkill`, normalize player facing, set `motionAction='tackle'`, give the caster a short forward slide impulse using existing `SLIDE_SPEED`, and create a barrier with level length, fixed duration, and wall height.
  2. Build the wall from the recorded slide start toward its facing direction. Store its start and direction once; do not recenter it on the player's later position.
  3. Extend `blockedByBarrier` with `objectHeight`; player movement uses height 0 and remains blocked. Every ball trajectory passes its current `ball.height`; reject the crossing only if `objectHeight <= barrier.height` and its point/segment intersects the barrier segment.
  4. Apply collision to ground/ordinary shots, passes, Eagle and Tornado skill shots, and flight targets. Keep Eagle goalkeeper immunity independent from barrier collision.
  5. Launch any non-caster player intersected by the rising wall: set velocity along barrier facing, `launchSecondsRemaining=0.35`, `knockdownSeconds >= 0.8`, team/source fields, and `motionAction='knockdown'`. Do not filter by team or role.
  6. Update duration decrement to exactly 3 seconds and delete the legacy skill activation that only increased tackle radius for four seconds.
- **Error & Exception Handling**: Normalize zero/missing facing to attack direction. Clamp movement to field bounds. Ignore malformed barriers with non-finite endpoints.
- **State Transition & Return**: Emit `skillUsed` with the existing `powerTackle` ID and `powerBarrierCreated`; shared cooldown and reward deck stay unchanged.

### I02. World Split gameplay coverage
- Related Files:
  - `game/src/game/skills.test.js` :: Power Tackle cases; rename test descriptions and update expectations
  - `game/src/game/stepGame.test.js` :: barrier collision coverage; modify
#### Details
- Assert length 220/275/330, duration 3 for each level, caster immunity, opposing and friendly player/keeper launch, wall blocks every listed low object class, high projectile clears, low Eagle/Tornado is blocked, and movement cannot cross.

## Acceptance Criteria
- [ ] `powerTackle` remains the persisted ID; all displayed skill names use “세계의 분리”.
- [ ] The slide creates a 3-second wall of level length 220/275/330 and height 72.
- [ ] Player movement is blocked; all listed ball types collide by actual ball height.
- [ ] Characters struck are launched regardless of team/role except the caster.

## Validation
- `cd game; npm test -- --test-name-pattern="Power Tackle|World Split|barrier"` — wall activation and collision tests pass.
- `cd game; npm test -- --test-name-pattern="Eagle|Tornado"` — projectile/barrier compatibility tests pass.

## Commit Message
```text
feat(skills): implement World Split terrain tackle

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P01-skill-simulation
Task: T03-world-split-physics

- Replace tackle boost with a fixed-duration height-aware barrier
- Launch all struck players except the caster
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
