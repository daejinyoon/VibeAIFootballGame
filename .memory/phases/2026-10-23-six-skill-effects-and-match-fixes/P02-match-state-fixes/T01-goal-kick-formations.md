# Task: T01 Goal Kick Formations

## Status: pending

## Goal
After a goalkeeper save starts a goal kick, move active players from both teams back to their default base formation while leaving the goal-kick goalkeeper at the ball.

## Decision Summary
- Both teams return to their standard formations on a goal kick. This applies after a keeper save and after a goal-line ball-out that awards a goal kick.
- Use base formation positions before the kickoff-circle adjustment: home GK/DF/MF/FW at `(55,270)`, `(220,190)`, `(370,350)`, `(480,270)`; away players mirror x across field width 960.

## Implementation

### I01. Reusable base formation reset
- Related Files:
  - `game/src/game/createInitialGameState.js` :: `homeFormation`, `createAwayFormation`; export a base-position helper
  - `game/src/game/stepGame.js` :: `beginManualRestart`, goal-kick setup; modify
  - `game/src/game/stepGame.test.js` :: keeper save and goal-kick cases; modify

#### Details
- **Signatures & Types**:
  ```js
  export function getBaseFormationPositions(): Map<string, {x:number,y:number}>
  function resetActivePlayersToBaseFormation(players: Player[]): void
  ```
- **Data & Schema Fields**: No persistent state schema migration. Use existing `id`, `x`, `y`, `vx`, `vy`, `aiTarget`, and `aiRetargetSeconds` player fields. Do not reset skill decks, stamina, cards, score, timer, or status timers.
- **Execution Flow / Logic**:
  1. Export `getBaseFormationPositions` from `createInitialGameState.js`; derive it from the existing `homeFormation` array plus `createAwayFormation()` to avoid duplicate coordinate tables.
  2. In `beginManualRestart` when `type === 'goalKick'`, reposition every non-dismissed player from both teams to their base point, set `vx=0`, `vy=0`, clear `aiTarget`, and set `aiRetargetSeconds=0` so AI recalculates immediately.
  3. Preserve each player's role, `dismissed` state, stamina, skill status, and other match data. Do not revive sent-off players.
  4. After the reset, place the selected goalkeeper at `(70, FIELD.height/2)` for home or `(FIELD.width-70, FIELD.height/2)` for away, then create the current restart object and put the ball at the keeper.
  5. Do not apply this reset to throw-ins, corners, or kickoffs.
- **Error & Exception Handling**: If an active player's ID is absent from the formation map, leave its position unchanged and stop its velocity; dismissed players remain at their current position and invisible.
- **State Transition & Return**: Keep the existing `goalKick` event, restart readiness delay, pre-buffered input, controlled-player behavior, and score/clock semantics.

### I02. Restart regression tests
- Related Files:
  - `game/src/game/stepGame.test.js` :: keeper save and goal-line goal-kick cases; modify
#### Details
- Verify both teams move from intentionally scattered coordinates to their expected formation; keeper remains at the ball; dismissed player remains dismissed; other restart types do not change formation; a save still enters the existing manual goal-kick flow.

## Acceptance Criteria
- [ ] Both teams return to base formation on a goal kick, independent of which team takes it.
- [ ] The taker keeper stays at the goal-kick spot and owns the stopped ball.
- [ ] Dismissal, skill, stamina, score, timers, and restart input buffering remain intact.

## Validation
- `cd game; npm test -- --test-name-pattern="keeper saves|goal kick|goal-line exits"` — restart formation tests pass.

## Commit Message
```text
fix(match): reset both formations for goal kicks

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P02-match-state-fixes
Task: T01-goal-kick-formations

- Reuse initial base formation coordinates for both teams
- Keep the goal-kick keeper and restart state intact
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
