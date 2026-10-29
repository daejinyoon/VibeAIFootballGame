# Task: T02 Goal-Kick Positioning

## Status: done

## Goal
Give campaign goal kicks one short and two intermediate reachable teammate options, and move nearby opponents at least 120 units from the keeper until release, for both home and away restarts.

## Decision Summary
- Use a mirrored receiver triangle: one short option 140 units from the keeper and two laterally separated intermediate options 250 units away. Keep current movement speed.
- Reposition only opponents inside the 120-unit minimum when a campaign goal kick starts. Preserve legacy PvP goal-kick layout and positions.

## Implementation

### I01. Build the short and intermediate passing triangle

- Related Files:
  - `game/src/game/stepGame.js` :: `positionGoalKickTriangle`, `repositionGoalKickOpponents`, `moveGoalKickReceivers`, `beginManualRestart`, `handleKeeperContact`, `advanceVacuum`, `beginGoalKick`, `advanceManualRestart`, `checkBallBoundary`, `restartGoalKick`, `finishEagleVolley`, `advanceEagleVolley`, `stepGame` - modify goal-kick positioning and PvP context propagation
  - `game/src/game/stepGame.test.js` :: `goal-line goal kicks move receiving teammates toward mirrored lanes without teleporting players` and new goal-kick geometry tests ??modify

#### Details
- **Signatures & Types**:
  ```js
  function positionGoalKickTriangle(state, team, { pvpMode = false } = {})
  function repositionGoalKickOpponents(state, restartTeam, { pvpMode = false } = {})
  function beginManualRestart(state, type, restartTeam, spot, { pvpMode = false } = {})
  function handleKeeperContact(state, previousPosition, { pvpMode = false } = {})
  function advanceVacuum(state, deltaSeconds, { pvpMode = false } = {})
  function beginGoalKick(state, deltaSeconds, { pvpMode = false } = {})
  function advanceManualRestart(state, input, deltaSeconds, { pvpMode = false } = {})
  function checkBallBoundary(state, { pvpMode = false } = {})
  function restartGoalKick(state, restartTeam, { pvpMode = false } = {})
  function finishEagleVolley(state, volley, { pvpMode = false } = {})
  function advanceEagleVolley(state, deltaSeconds, { pvpMode = false } = {})
  ```
- **Data & Schema Fields**:
  - Use existing `state.players[]`: `team`, `role`, `dismissed`, `x`, `y`, `vx`, `vy`, `aiTarget`, `aiRetargetSeconds`.
  - Use existing `state.ball.ownerId`, `state.restart`, `state.phase`, and `state.phaseSeconds`; add no persistent state fields.
  - Constants: short distance 140; intermediate distance 250; forward component 230; lateral component `sqrt(250^2 - 230^2)`; opponent radius 120; existing `FIELD`, `AI_SPEED`, and `clamp`.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Run new behavior only for a valid restart team, active keeper, and `pvpMode === false`. Sort active, non-dismissed field receivers by existing `(role.localeCompare, id.localeCompare)` order.
  2. Core Processing: Find the active restart-team keeper and use its actual `{x,y}` as the target origin (normal restarts and shot catches place it at x=70 or `FIELD.width-70`, y=270). Let `direction = team === 'home' ? 1 : -1`. In sorted order assign targets `(keeper.x + direction*140, keeper.y)`, `(keeper.x + direction*230, keeper.y - sqrt(250^2-230^2))`, `(keeper.x + direction*230, keeper.y + sqrt(250^2-230^2))`. Clamp x to `[20, FIELD.width-20]`, y to `[12, FIELD.height-12]`; set `aiTarget` and `aiRetargetSeconds = 0`. The two wide options are each 250 units from the keeper before clamping. Retain `moveGoalKickReceivers` at `AI_SPEED`; never teleport receivers.
  3. Context propagation: `stepGame` derives PvP mode from `options.controlledTeams.includes('away')`. Pass it through `stepGame -> checkBallBoundary -> restartGoalKick -> beginManualRestart`, the keeper catch path through `handleKeeperContact`, the keeper Vacuum Cleaner completion path through `advanceVacuum`, and timed paths through `advanceManualRestart` and `beginGoalKick`. Thread it through `advanceEagleVolley -> finishEagleVolley -> checkBallBoundary` because that path can start a goal kick. In PvP manual restarts and shot catches, keep legacy target geometry and do not reposition opponents. The vacuum-capture path did not previously reset targets, so skip all new setup there in PvP.
  4. State Transition & Return: Campaign restart teammates move toward their targets at current speed; existing manual or automatic release clears the restart and resumes normal play. The radius constraint is applied only at setup and does not persist after release.
  5. Error & Exception Handling: Missing keeper/receiver keeps existing no-op/fallback behavior; never index past available receivers. Clamp all target points. Throw-ins, corner kicks, and their event/input behavior stay unchanged.

### I02. Keep opposing players outside the restart radius
- Related Files:
  - `game/src/game/stepGame.js` :: `positionGoalKickTriangle`, `repositionGoalKickOpponents`, `moveGoalKickReceivers`, `beginManualRestart`, `handleKeeperContact`, `advanceVacuum`, `beginGoalKick`, `advanceManualRestart`, `checkBallBoundary`, `restartGoalKick`, `finishEagleVolley`, `advanceEagleVolley`, `stepGame` - modify goal-kick positioning and PvP context propagation
  - `game/src/game/stepGame.test.js` :: goal-kick tests ??add both-team and PvP coverage
#### Details
- At campaign goal-kick setup (manual boundary restart, shot catch, or keeper completing Vacuum Cleaner), locate the restart-team keeper and each active opponent. Leave any opponent already >=120 units away unchanged.
- Move closer opponents to a legal position at least 120 units from the keeper: project radially to 120; if positions coincide or field clamping leaves the player too close, place the opponent 120 units horizontally toward field interior (right when the keeper is at or left of field center, otherwise left) and clamp y to `[12, FIELD.height-12]`.
- Set `vx = 0` and `vy = 0` on repositioned opponents. Never move the keeper or dismissed players.
- Existing restart early returns keep opponents still until release. Normal AI resumes after release.

### I03. Update goal-kick regression tests
- Related Files:
  - `game/src/game/stepGame.test.js` :: current goal-kick test and new cases ??modify
#### Details
- Replace old normalized lane-X assertions with distance checks: 140 for one option and 250 (tolerance <=0.01) for both intermediate options, mirrored for home and away.
- Keep checks for receiver motion without teleporting, `aiRetargetSeconds === 0`, keeper action, and release events.
- Verify close opponents are moved to >=120 units, distant opponents remain unchanged, and all points stay in the field.
- Exercise a PvP goal-kick setup using `stepGame(..., { controlledTeams: ['home', 'away'] })`; assert legacy receiver targets and opposing-player positions are unchanged.

## Acceptance Criteria
- [ ] Both teams get mirrored 140-unit and two 250-unit goal-kick options.
- [ ] Receiver speed and no-teleport behavior remain unchanged.
- [ ] Campaign opponents are at least 120 units from the keeper until release.
- [ ] PvP keeps its old goal-kick targets and player positions.
- [ ] Throw-ins, corner kicks, and release events remain unchanged.

## Validation
- `node --test --test-name-pattern="goal-line goal kicks|PvP goal kicks|PvP keeper catches|campaign keeper recovering|keeper catches an ordinary shot|goal-line exits" src/game/stepGame.test.js` (run from `game/`) - all 6 goal-kick/PvP/catch-path regression tests pass.
- `npm run build` (run from `game/`) - production build succeeds; Vite reports the existing large-bundle advisory (>500 kB).
- `npm test -- src/game/stepGame.test.js` (run from `game/`) - 97/100 tests pass. The same 3 existing failures recorded in T01 (opening-clock skill activation, Eulryongta possession handoff, and knockdown animation recovery) reproduce on baseline commit `e6312ed`.

## Commit Message
```text
feat(ai): improve campaign goal kick spacing

Plan: 2026-10-29-campaign-goal-kick-and-loose-ball-ai
Phase: P01-campaign-match-ai
Task: T02-goal-kick-positioning

- move goal-kick receivers into 140 and 250 unit passing lanes
- keep campaign opponents 120 units from the keeper before release
- preserve legacy PvP goal-kick positioning
```

## Progress
- [x] Implementation complete
- [x] Goal-kick regressions and production build passed
- commit: committed

