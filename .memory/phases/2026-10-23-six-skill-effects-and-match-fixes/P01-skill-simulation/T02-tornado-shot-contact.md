# Task: T02 Tornado Shot Contact

## Status: pending

## Goal
Make Tornado Shot create a moving ground-level tornado around its ball, and lift only players whose positions intersect the tornado path. Lift lasts five seconds at all levels; level scales the path width.

## Decision Summary
- The caster is immune. Teammates, opponents, and both goalkeepers can be lifted when touched.
- Lift duration is always 5 seconds. Level 1 width is about two player widths; level 2 is +25% and level 3 is +50% of level 1.
- A low direct tornado shot remains blocked by World Split if its ball trajectory intersects the wall.

## Implementation

### I01. Tornado contact state and simulation
- Related Files:
  - `game/src/game/skills.js` :: `applySkill`, `launchSkillShot`, `addSkillEffect`; modify
  - `game/src/game/stepGame.js` :: `integrateLooseBall`, `blockedByBarrier`, `clearSkillTransientState`, `advanceSkillEffects`; modify
  - `game/src/game/constants.js` :: `PLAYER_BODY_WIDTH`; modify
  - `game/src/game/skills.test.js` :: Tornado tests; modify
  - `game/src/game/stepGame.test.js` :: path contact and barrier tests; modify

#### Details
- **Signatures & Types**:
  ```js
  state.tornadoShotEffect: null | {
    team: 'home'|'away', sourcePlayerId: string, level: 1|2|3,
    pathWidth: number, hitPlayerIds: string[], elapsedSeconds: number
  }
  applyTornadoContacts(state, previousBallPosition, currentBallPosition): Array<GameEvent>
  ```
- **Data & Schema Fields**:
  - Add `PLAYER_BODY_WIDTH = 24` game units to `constants.js`; define base tornado width as `2 * PLAYER_BODY_WIDTH` (48 units), level 2 as 60, level 3 as 72.
  - Initialize `tornadoShotEffect: null`. On activation create the effect with `hitPlayerIds: []`, level-scaled width, and `durationSeconds: 5` in `skillEffects`.
  - Keep the ordinary Tornado ball fields (`flightKind: 'skill-shot'`, `skillId: 'tornadoShot'`) so existing goal-line and barrier flow remains authoritative.
- **Execution Flow / Logic**:
  1. Remove the activation-time loop that immediately sets airborne state for every player and the current `4 + level` duration.
  2. In `integrateLooseBall`, retain the old position before movement and pass old/new positions to `applyTornadoContacts` after ball integration. Use point-to-segment distance so fast simulation steps cannot skip over a player.
  3. For each non-dismissed player other than `sourcePlayerId` not already in `hitPlayerIds`, apply a hit when segment distance is at most `pathWidth / 2 + PLAYER_BODY_WIDTH / 2`. Set `airborneSecondsRemaining = 5`, `airborneFromTeam = effect.team`, append ID, and emit a tornado-contact/lift event.
  4. Do not add a team filter: both teams and goalkeepers are eligible. A player can be lifted only once per shot, so touching later segments does not refresh the five-second timer.
  5. Keep World Split ball collision in `blockedByBarrier`; it blocks this low ground-level skill shot. Clear `tornadoShotEffect` when the shot ends, is reflected, or transient state is reset.
- **Error & Exception Handling**: Treat missing `hitPlayerIds` as an empty array; ignore non-finite coordinates and dismissed players. If the source player is missing, terminate the effect safely.
- **State Transition & Return**: `applySkill` still returns one `skillUsed` event and no longer emits an all-player `tornadoLift` at activation. Contact events occur only for affected players.

### I02. Tornado simulation tests
- Related Files:
  - `game/src/game/skills.test.js` :: remove level-scaled global-lift assertions; modify
  - `game/src/game/stepGame.test.js` :: add contact path tests; modify
#### Details
- Verify width at each level, 5-second duration at each level, caster immunity, both-team/keeper eligibility, no hit outside the path, no duplicate refresh, a fast segment crossing still hits, and wall blockage for the low shot.

## Acceptance Criteria
- [ ] Tornado travels with the skill ball and affects only players intersecting its path.
- [ ] The caster is unaffected; all other roles and both teams can be lifted.
- [ ] Contact always applies five seconds, and path widths are 48/60/72 game units.
- [ ] A low tornado shot cannot pass through an intersecting World Split barrier.

## Validation
- `cd game; npm test -- --test-name-pattern="Tornado|tornado"` — Tornado behavior passes.

## Commit Message
```text
feat(skills): lift players touched by Tornado Shot

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P01-skill-simulation
Task: T02-tornado-shot-contact

- Track tornado contact along the ball path
- Apply fixed five-second lift with level-based width
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
