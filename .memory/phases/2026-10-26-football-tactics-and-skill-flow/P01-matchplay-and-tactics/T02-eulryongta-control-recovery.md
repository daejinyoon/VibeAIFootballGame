# Task: T02 Eulryongta Control Recovery

## Status: done

## Goal
When Eulryongta knocks down the home-controlled player, immediately control the nearest eligible home field player to the ball in both attacking and defending play. If a knocked-down target owned the ball, release it at that target's position as a loose ball.

## Decision Summary
- A hit carrier drops the ball where they were hit so teammates can recover it.
- Control switches to the nearest eligible home field player to the ball regardless of possession. Goalkeepers, dismissed players, knocked-down or recovering players, stunned players, and airborne players are ineligible.

## Implementation

### I01. Release a hit carrier's ball
- Related Files:
  - `game/src/game/skills.js` :: `applySkill`, `eulryongta` target loop; modify
  - `game/src/game/skills.test.js` :: Eulryongta cases; modify

#### Details
- **Signatures & Types**:
  ```js
  applySkill(state, { team, sourcePlayerId, skillId, level = 1 })
  // Existing mutable state shape: state.ball, state.possessionTeam, state.players
  ```
- **Data & Schema Fields**:
  - Keep existing `ball.ownerId`, `ball.x/y`, `ball.vx/vy`, `ball.height`, `ball.verticalVelocity`, `ball.flightKind`, `ball.flightSeconds`, `ball.lastTouchTeam`, and pass metadata fields.
  - Do not add schema fields.
- **Execution Flow / Logic**:
  1. Before or while applying each Eulryongta target status, check whether `state.ball.ownerId === target.id`.
  2. If true, clear `ownerId`; set ball x/y to target x/y; zero vx/vy, height, and vertical velocity; set flight kind to ground and flight seconds to zero; set `lastTouchTeam` to the target team; clear pass receiver/target/team/protection metadata and skill-shot metadata that would prevent loose-ball pickup; set `state.possessionTeam = null`.
  3. Leave the existing five-second knockdown status, source metadata, direction, and event intact.
  4. Do not release the ball if a different player owns it or it is already loose.
- **Error & Exception Handling**: Use finite target coordinates from the matched player state; if target coordinates are invalid, do not overwrite ball position but still clear ownership and velocity safely.
- **State Transition & Return**: Return the existing `skillUsed` and `playerKnockedDown` events; do not add an event unless an existing event consumer requires it.

### I02. Switch control after a home player is hit
- Related Files:
  - `game/src/game/stepGame.js` :: `maybeUseAiSkill`, `stepGame`, home player eligibility helper; modify
  - `game/src/game/stepGame.test.js` :: Eulryongta and automatic home defender tests; modify

#### Details
- **Signatures & Types**:
  ```js
  // Add an internal helper; no exported API change:
  nearestEligibleHomeFieldPlayer(state) -> Player | null
  // Existing public function remains:
  stepGame(state, inputFrame = {}, deltaSeconds = 0) -> GameEvent[]
  ```
- **Data & Schema Fields**: Use `Player.id`, `team`, `role`, `dismissed`, `knockdownSeconds`, `motionAction`, `stunnedSeconds`, `airborneSecondsRemaining`, and x/y; no new fields.
- **Execution Flow / Logic**:
  1. After the away AI skill attempt and any successful home skill attempt in `stepGame`, resolve the current `controlledPlayerId` again.
  2. If the currently controlled home player has just been knocked down by Eulryongta, select the nearest home player with `role !== 'goalkeeper'`, not dismissed, `knockdownSeconds <= 0`, `motionAction !== 'recover'`, `stunnedSeconds <= 0`, and `airborneSecondsRemaining <= 0`.
  3. Rank by Euclidean distance to `state.ball`; break ties by `player.id.localeCompare` for deterministic selection.
  4. Set `state.controlledPlayerId` to the selected player's id before home movement or defensive AI runs. This applies independent of `state.possessionTeam`.
  5. If no eligible field player exists, set control to null and let the existing next-frame fallback recover an available player; never select the goalkeeper in this Eulryongta handoff.
  6. Preserve normal away-possession auto-selection and manual S switching behavior.
- **Error & Exception Handling**: Missing controlled player or missing candidate must not throw; do not switch when the controlled player was not knocked down by this skill.
- **State Transition & Return**: Only change `controlledPlayerId` for the Eulryongta hit case; leave possession determined by the loose-ball state and subsequent pickup.

### I03. Focused regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: add owner-release assertions to Eulryongta tests; modify
  - `game/src/game/stepGame.test.js` :: add both home possession and away possession hit/switch scenarios; modify
#### Details
- Verify a home carrier hit by away Eulryongta drops the ball in place, clears pass ownership metadata, and can be picked up by a nearby eligible teammate.
- Verify that the knocked-down controlled home player is replaced by the nearest eligible field player during both home possession and away possession.
- Verify goalkeepers and incapacitated players are skipped, and deterministic tie-breaking is stable.

## Acceptance Criteria
- [ ] An Eulryongta-hit carrier no longer retains the ball; the ball is loose at the hit position.
- [ ] Control changes immediately to the nearest eligible home field player in both possession states.
- [ ] Goalkeeper and incapacitated/recovering players are never chosen by this handoff.
- [ ] Existing Eulryongta five-second duration and ordinary control switching remain unchanged.

## Validation
- `npm test -- --test-name-pattern="Eulryongta|automatic home defender"` from `game/` — focused coverage passes.
- `npm test` from `game/` — full game test suite passes.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
fix(skills): restore control after Eulryongta hits

Plan: 2026-10-26-football-tactics-and-skill-flow
Phase: P01-matchplay-and-tactics
Task: T02-eulryongta-control-recovery

- Drop the ball when Eulryongta knocks down its carrier
- Switch to the nearest eligible home field player
```

## Progress
- [x] Implementation complete
- [x] Validation passed: focused Eulryongta/control tests, all 161 game tests, and the production build succeed.
- commit: recorded in Git history
