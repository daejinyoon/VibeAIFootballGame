# Task: T01 Eagle Shot Volley

## Status: done

## Goal
Replace the current single flat Eagle Shot with a vertical ball ascent followed by a level-scaled energy-eagle volley. Each eagle that crosses the opponent goal line inside the goal opening adds one point, and the whole volley starts no more than one kickoff.

## Decision Summary
- The ball rises vertically before turning into a glowing eagle projectile; the ordinary camera stays in place and goalkeepers cannot catch the shot.
- Levels 1/2/3 launch 1/2/3 eagles in succession, aimed at separate lanes of the goal. Each goal is one point. Keep internal skill ID `eagleShot` and return the display ball to a normal soccer ball after resolution.
- World Split collision must use projectile height; an eagle clears the structure only above its configured wall height.

## Implementation

### I01. Projectile and volley simulation
- Related Files:
  - `game/src/game/skills.js` :: `applySkill`, `launchSkillShot`, `addSkillEffect`; modify
  - `game/src/game/createInitialGameState.js` :: initial match state; modify
  - `game/src/game/stepGame.js` :: `integrateLooseBall`, `handleKeeperContact`, `checkBallBoundary`, goal transition; modify
  - `game/src/game/constants.js` :: Eagle timing/height constants; modify
  - `game/src/game/skills.test.js` :: Eagle activation and level coverage; modify
  - `game/src/game/stepGame.test.js` :: score and restart coverage; modify

#### Details
- **Signatures & Types**:
  ```js
  // createInitialGameState result additions
  skillProjectiles: Array<{
    id: number, skillId: 'eagleShot', team: 'home'|'away', sourcePlayerId: string,
    x: number, y: number, vx: number, vy: number, height: number,
    verticalVelocity: number, phase: 'ascending'|'flying', ageSeconds: number,
    targetY: number, resolved: boolean
  }>,
  eagleVolley: null | {
    team: 'home'|'away', sourcePlayerId: string, level: 1|2|3,
    spawned: number, resolved: number, nextLaunchSeconds: number, points: number
  }
  ```
- **Data & Schema Fields**:
  - Add `EAGLE_ASCENT_SECONDS = 0.45`, `EAGLE_SHOT_INTERVAL_SECONDS = 0.18`, and `EAGLE_FLIGHT_HEIGHT = 180` to `constants.js`.
  - Use a per-state monotonically increasing projectile ID. Initialize `skillProjectiles: []`, `eagleVolley: null`, and `nextSkillProjectileId: 1`.
  - During volley flight, do not use `ball.scoreValue` to award `level` points. Only successful goal-line crossings by individual projectile objects award points.
  - Target lanes are the goal center plus offsets `[-0.22, 0, +0.22] * (FIELD.goalBottom - FIELD.goalTop)` for a three-shot volley; for two shots use the negative and positive outer lane. Clamp each `targetY` inside the goal opening by `BALL_RADIUS`.
- **Execution Flow / Logic**:
  1. On `applySkill(... eagleShot ...)`, require the current player to own the ball as today, release the ordinary ball, create one volley descriptor, and schedule the first projectile. Do not change shared team cooldown or queue order.
  2. During each `stepGame` frame, advance the volley timer. Spawn up to `level` projectiles at the fixed interval. A projectile first raises `height` linearly to `EAGLE_FLIGHT_HEIGHT` during `EAGLE_ASCENT_SECONDS`, then travels toward its `targetY` and the attack-side goal at current Eagle Shot speed.
  3. Check every projectile segment against the World Split segment and its configured `height`; ignore goalkeeper contact for Eagle Shot. A projectile crossing the goal plane between `FIELD.goalTop` and `FIELD.goalBottom` increments score by one exactly once and emits `{type:'goal', team, points:1, skillId:'eagleShot'}`.
  4. Resolve missed projectiles at the appropriate goal-line restart. Finish the volley only after all `level` projectiles are resolved. If one or more scored, enter one `goalPause` and set `pendingKickoffTeam` once; use accumulated `points` in the final score event. If none scored, perform one normal goal-line restart.
  5. Clear `eagleVolley` and all projectiles on kickoff, match finish, and transient-state reset. Keep the ordinary ball's visual state ordinary during the following restart.
  6. Remove the current Eagle Shot path that stores `scoreValue = level` and awards all level points from one ball crossing.
- **Error & Exception Handling**: Clamp projectile coordinates to finite field bounds except for the single goal-plane crossing check. On reset or malformed missing volley state, clear orphan projectiles; do not duplicate points for a projectile already marked resolved.
- **State Transition & Return**: `applySkill` continues emitting `skillUsed`; projectile spawn/goal/restart events are returned through the existing `stepGame` event array. Match score remains `state.score.home/away`.

### I02. Deterministic regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: Eagle activation tests; modify
  - `game/src/game/stepGame.test.js` :: Eagle volley scoring/restart tests; modify
#### Details
- Cover all three levels, vertical ascent before forward motion, lane spread, keeper bypass, individual scoring, exactly one kickoff, miss restart, barrier clear/block according to height, and reset of projectiles after goal.
- Use fixed deltas and explicit state positions; assert event and score totals rather than wall-clock timing.

## Acceptance Criteria
- [ ] Levels 1, 2, and 3 create exactly 1, 2, and 3 visible/gameplay projectiles.
- [ ] Each eagle that enters the goal awards exactly one point; the volley resolves to one kickoff only.
- [ ] A keeper never blocks Eagle Shot, and World Split blocks only when the projectile's actual height is below its top.
- [ ] Normal soccer ball state and appearance are restored for the next restart.

## Validation
- From `game/`: `npm test -- --test-name-pattern=Eagle` — all Eagle Shot tests pass.
- From `game/`: `npm test -- --test-name-pattern=goal` — goal/restart regression tests pass.
- From `game/`: `npm test` — full suite passes.

## Commit Message
```text
feat(skills): add Eagle Shot volley simulation

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P01-skill-simulation
Task: T01-eagle-shot-volley

- Add vertical launch and level-scaled eagle projectiles
- Score each goal independently and restart once per volley
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
