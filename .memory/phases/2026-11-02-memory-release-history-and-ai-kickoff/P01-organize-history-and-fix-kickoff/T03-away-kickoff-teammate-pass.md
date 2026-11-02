# Task: T03 Make the Away AI Pass to a Teammate at Kickoff

## Status: done

## Goal
Ensure the away AI's automatic kickoff pass reaches an active away field player at match start and after every home goal, instead of clearing toward the home team when no teammate is ahead.

## Decision Summary
- Keep the away team's kickoff automatic and use a short ground pass.
- Prefer the existing forward-facing receiver selection; if it returns no teammate, choose the nearest active non-goalkeeper teammate. Never pass to the home team or a goalkeeper.
- Preserve the user-controlled home kickoff and all kickoff freeze, half-line, and lock-release behavior.

## Implementation

### I01. Select a guaranteed away-team receiver
- Related Files:
  - `game/src/game/stepGame.js` :: `advanceLockedKickoff`, `chooseReceiver`, `getTeammates`, `nearestPlayer`, `releasePass` — modify only the away AI kickoff branch and reuse existing helpers.
  - `game/src/game/stepGame.test.js` :: existing away kickoff behavior — read-only reference; do not change tests unless separately requested.

#### Details
- **Signatures & Types**:
  ```js
  function advanceLockedKickoff(state, input, teamInputs, pvpMode) { /* returns game events */ }
  function chooseReceiver(state, passer, kind) { /* Player | null */ }
  function getTeammates(state, player) { /* active same-team Player[] */ }
  function nearestPlayer(players, point) { /* Player | null; stable original order breaks distance ties */ }
  function releasePass(state, player, kind, receiverOverride = null) { /* PassEvent[] */ }
  ```
- **Player eligibility**:
  - `getTeammates(state, taker)` already excludes the taker, dismissed players, and all players from the opposite team.
  - Further filter `candidate.role !== 'goalkeeper'` before fallback selection.
  - `nearestPlayer` compares Euclidean distance from the kickoff taker and preserves array order for equal distances.
- **Execution flow / logic**:
  1. Keep the existing human branch unchanged: home and PvP-controlled kickoffs continue to use directional input and S exactly as before.
  2. In the `else` branch for a single-player away AI taker, call `chooseReceiver(state, taker, 'groundPass')` first.
  3. If no forward teammate exists, compute `nearestPlayer(getTeammates(state, taker).filter((candidate) => candidate.role !== 'goalkeeper'), taker)`.
  4. Call `releasePass(state, taker, 'groundPass', receiver)` with the selected teammate as the explicit override.
  5. If no eligible teammate exists because all away field players are dismissed, pass `null` and retain existing `releasePass` clearance behavior; do not select a home player or goalkeeper.
  6. Keep `advanceLockedKickoff` shared by opening and post-goal restarts; do not add a separate kickoff path. This makes the fallback apply to both situations automatically.
- **State and events**:
  - On a successful pass, the event is `{ type: 'pass', team: 'away', action: 'groundPass', receiverId: awayPlayerId, completed: false }` until ball control resolves.
  - `state.ball.passTeam` remains `'away'`; `passReceiverId` is the chosen receiver ID.
  - The existing ball-cleared condition continues to release kickoff lock after the pass moves clear.

### I02. Preserve all other kickoff behavior
- Related Files:
  - `game/src/game/stepGame.js` :: `enforceKickoffCircle`, `releaseKickoffLockIfBallCleared`, `advanceLockedKickoff` — read-only except the away receiver selection.
  - `game/src/game/stepGame.test.js` :: kickoff freeze, teammate filtering, and restart cases — read-only reference.

#### Details
- Do not change player positions, orientation, home taker controls, clock-start rules, ball-clear distance, or skill grace timing.
- Do not change `chooseReceiver` globally; its forward-only behavior remains in effect for normal play.
- Ensure the same fallback runs for the opening away kickoff and after the home team scores, because both enter the shared locked-kickoff path.

## Acceptance Criteria
- [x] When an away AI kickoff has an eligible forward teammate, it makes a short ground pass to that away field player.
- [x] When no away teammate is forward, it passes to the nearest active away field player.
- [x] A kickoff pass never targets a home player or goalkeeper.
- [x] The behavior applies at match start and after a home goal through the shared kickoff path.
- [x] Home user kickoff, kickoff lock, player freeze, half-line restriction, and lock-release timing remain unchanged.

## Validation
- `cd game; npm run build` — simulation changes compile.
- `git diff --check` — no whitespace errors.
- Read-only inspect the existing away-kickoff cases in `game/src/game/stepGame.test.js`; do not add or run tests unless separately requested.

## Commit Message
```text
fix(game): pass away kickoffs to teammates

Plan: 2026-11-02-memory-release-history-and-ai-kickoff
Phase: P01-organize-history-and-fix-kickoff
Task: T03-away-kickoff-teammate-pass

- Give the away AI a nearest-teammate fallback at kickoff
- Preserve home kickoff controls and kickoff lock rules
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm run build`, `git diff --check`; existing kickoff tests inspected, not run)
- commit: completed (task commit)
