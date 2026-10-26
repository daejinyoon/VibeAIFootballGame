# Task: T03 Triangular Positioning

## Status: done

## Goal
Give a home ball carrier two visibly separate diagonal passing outlets during attacks, maintain a moving triangular base shape in attack and defense, and prevent the home field players from lining up in a row while the opponent goalkeeper prepares a goal kick.

## Decision Summary
- Use a dynamic triangle in attack, defense, and opponent goal-kick setups.
- During a home attack, place the short link and forward support on different diagonal lanes so the carrier has two genuine passing directions.
- Goalkeeper remains at the goal or takes the goal kick; only field-player support positions change.

## Implementation

### I01. Separate the two attacking support lanes
- Related Files:
  - `game/src/game/stepGame.js` :: `updateHomeSupportAi`, `homeSupportTarget`, `updateAwayDefense`; modify
  - `game/src/game/stepGame.test.js` :: home support and defense positioning tests; modify

#### Details
- **Signatures & Types**:
  ```js
  // Preserve existing internal signatures unless a helper needs explicit lane data:
  updateHomeSupportAi(state, controlled, deltaSeconds) -> void
  homeSupportTarget(state, player, ballCarrier, isShortOutlet) -> { x: number, y: number }
  updateAwayDefense(state, deltaSeconds, events, defendingTeam = 'away', controlled = null) -> void
  ```
- **Data & Schema Fields**: Use existing player x/y, `aiTarget`, `aiRetargetSeconds`, role, carrier, `FIELD`, and AI support radius. Do not add state fields.
- **Execution Flow / Logic**:
  1. Preserve the controlled home carrier and goalkeeper exclusions.
  2. Assign the nearest eligible non-carrier field player to the short-link role. Assign the other eligible field player to the forward-support role, with deterministic id tie-breaking.
  3. Aim the short link about 65 units ahead and 55 units to one side of the carrier. Aim the forward option about 140 units ahead and 105 units to the opposite side. Determine the side pair from carrier y relative to the field center, then clamp both targets inside the existing field margins.
  4. Keep the two support y targets at least 90 units apart when the field boundary allows; near a sideline, move both inward while preserving a distinct diagonal offset.
  5. Retarget at the existing AI think interval; do not add randomness. Continue preserving away-defender marking and one-player pressing behavior.
  6. In defense, preserve the current press-and-mark structure and ensure the two non-presser cover targets stay on separate lanes rather than collapsing to the same target.
- **Error & Exception Handling**: With fewer than two eligible field support players, position the available player as the short link and skip the unavailable outlet. Clamp every target to `0..FIELD.width` and `0..FIELD.height`.
- **State Transition & Return**: Update only `aiTarget` and existing retarget timers; do not alter possession or ball state.

### I02. Use a triangle against an opponent goal kick
- Related Files:
  - `game/src/game/stepGame.js` :: `resetActivePlayersToBaseFormation`, `beginManualRestart`, opponent goal-kick setup; modify
  - `game/src/game/createInitialGameState.js` :: `homeFormation`, `getBaseFormationPositions`; read-only unless shared base positions must change
  - `game/src/game/stepGame.test.js` :: goal-kick setup tests; modify

#### Details
- **Signatures & Types**:
  ```js
  resetActivePlayersToBaseFormation(players) -> void
  beginManualRestart(state, type, restartTeam, spot) -> GameEvent[]
  // Existing player positions remain numeric field-space x/y.
  ```
- **Data & Schema Fields**: Use active players, team, role, x/y and `FIELD.width/height`; keep restart and goalkeeper ownership schema unchanged.
- **Execution Flow / Logic**:
  1. Preserve `resetActivePlayersToBaseFormation` behavior for non-goal-kick restarts.
  2. For an opponent (away) goal kick, position the three home field players as a pressing triangle between the away goalkeeper and the home goal: one central front presser at approximately `(0.70 * FIELD.width, FIELD.height / 2)`, two cover players at approximately `(0.60 * FIELD.width, FIELD.height / 2 ± 0.19 * FIELD.height)`.
  3. For mirrored team logic where applicable, derive direction from restart team rather than duplicating unmirrored constants; leave the actual goalkeeper at the goal-kick spot.
  4. Clear old `aiTarget`, velocities, and retarget timers after placing players so AI does not pull them back into a straight line.
  5. Keep players inside the pitch and outside any restart exclusion region already enforced by `advanceManualRestart`.
- **Error & Exception Handling**: If a field player is dismissed or absent, distribute available players over the remaining triangle vertices in deterministic role/id order; never move a goalkeeper away from their goal-kick role.
- **State Transition & Return**: Change only non-kicker field-player positions and AI targets during the setup; preserve restart team, taker, ball ownership, and countdown.

### I03. Focused regression coverage
- Related Files:
  - `game/src/game/stepGame.test.js` :: support targets, defensive cover targets, and opponent goal-kick formation assertions; modify
#### Details
- Assert both home support players have distinct diagonal targets, at least 90 y units apart where field geometry allows, remain in bounds, and retarget deterministically as the ball carrier moves.
- Assert the three home field players are not collinear during an away goal-kick setup and occupy a central presser plus two separated cover lanes; retain the away goalkeeper's position at the ball.
- Assert defense retains its one presser and separate cover targets.

## Acceptance Criteria
- [ ] Home attacks present two support players on distinct diagonals around the carrier.
- [ ] Support targets stay in bounds and move as play changes.
- [ ] Defensive marking and press behavior continue to function with separated cover lanes.
- [ ] Home field players form a readable triangle during an opponent goal-kick setup; keeper and restart behavior are preserved.

## Validation
- `npm test -- --test-name-pattern="home support|goal kick|pressing lanes"` from `game/` — focused positioning coverage passes.
- `npm test` from `game/` — full game test suite passes.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
feat(ai): create two passing lanes with triangular positioning

Plan: 2026-10-26-football-tactics-and-skill-flow
Phase: P01-matchplay-and-tactics
Task: T03-triangular-positioning

- Separate short and forward diagonal support targets
- Set a triangular press for opponent goal kicks
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
