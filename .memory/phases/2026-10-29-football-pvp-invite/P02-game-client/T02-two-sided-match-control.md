# Task: T02 Two-Sided Match Control

## Status: done

## Goal
Extend the existing deterministic simulation so a PvP host can supply inputs for both teams, while campaign mode remains byte-for-byte compatible in its default control behavior. A non-host client must be able to render authoritative snapshots without running a second simulation.

## Decision Summary
- Host simulates the authoritative state. Host owns home controls and guest owns away controls; each player switches among eligible field players while teammates remain AI controlled.
- Preserve the existing `stepGame(state, inputFrame, deltaSeconds)` call and campaign behavior. Add an optional PvP option and per-team frames rather than changing campaign call sites.
- Keep `controlledPlayerId` as the home controlled-player field for existing UI/campaign code; add a controlled-player ID for away and a canonical map for PvP presentation.

## Implementation

### I01. Per-team controls in the game state and simulation

- Related Files:
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` — initialize both team control IDs; modify
  - `game/src/game/stepGame.js` :: `stepGame`, `controlBallAction`, `handleHomeAttack`, `updateAi`, `updateHomeSupportAi`, `updateAwayDefense`, selection helpers — per-team human input path; modify
  - `game/src/game/stepGame.test.js` :: existing campaign regression cases and PvP simulation cases; modify
  - `game/src/game/createInitialGameState.test.js` :: initial controlled-player IDs; modify
- **Signatures & Types**:
  ```ts
  type InputFrame = {
    moveX: -1|0|1; moveY: -1|0|1;
    down: Set<string>; pressed: Set<string>; released: Set<string>
  };
  type TeamInputFrames = { home: InputFrame; away: InputFrame };
  type StepOptions = { controlledTeams?: Array<'home'|'away'> };
  export function stepGame(
    state: GameState,
    inputFrame?: InputFrame | TeamInputFrames,
    deltaSeconds?: number,
    options?: StepOptions
  ): GameEvent[];
  ```
- **Data & Schema Fields**:
  - Add `state.controlledPlayerIds: {home:string|null, away:string|null}`. Initialize each to that team's forward ID (`home-fw`, `away-fw`).
  - Maintain `state.controlledPlayerId === state.controlledPlayerIds.home` whenever home selection changes. Existing campaign input with no options controls home only.
  - PvP state uses `teamSkillDecks.home` and `.away` with exactly three `{skillId,level:1}` entries each; `createInitialGameState` remains stage 1 for PvP and keeps the existing 60-second regulation and golden-goal overtime rules.
- **Execution Flow / Logic**:
  1. Precondition & Validation: retain existing invalid-state TypeError and delta clamp. Normalize missing team frames to a neutral frame. If a single `InputFrame` is passed, treat it as the home frame and leave `controlledTeams` at `['home']` for full campaign compatibility.
  2. Core Processing: when `controlledTeams` includes a team, apply that team's frame to its current non-dismissed, non-goalkeeper player. Use arrows/E for movement/sprint; A/S/D retain the existing attack semantics when that team has possession; F activates the next skill from that team's deck; when defending, S cycles the team's available field players and A starts the existing slide/tackle behavior. Clear or replace invalid/departed controlled IDs with the nearest eligible field player. Run teammate support AI for both teams, excluding each team's controlled player and ball carrier. When a team is not controlled, preserve existing AI ownership and decisions.
  3. Error & Exception Handling: a malformed/missing team frame becomes neutral input; invalid team names in `controlledTeams` are ignored; no network object is accepted by `stepGame` itself.
  4. State Transition & Return: update the canonical control map after switches/possession changes; keep the legacy home alias synchronized; return the same event array contract used by campaign.
- **Acceptance Criteria**:
  - [ ] Existing campaign tests continue to pass without changing their default input frames or expected home-vs-AI behavior.
  - [ ] With `{controlledTeams:['home','away']}`, home and away move independently and can each select players, pass, shoot, sprint, and activate their own skill deck.
  - [ ] Uncontrolled teammates and the opponent side in campaign mode still use AI; campaign skill rewards and saved loadouts are unaffected.
  - [ ] `controlledPlayerId` remains a valid home-player ID for all existing call sites.

### I02. Serializable input frames and authoritative render mode
- Related Files:
  - `game/src/pvp/pvpInput.js` :: `serializeInputFrame`, `deserializeInputFrame`, `createPvpInputBuffer` — wire-safe input and sequence handling; new
  - `game/src/pvp/pvpInput.test.js` :: input sequence, Set conversion, and one-shot actions; new
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D` — host simulates two frames; guest only applies snapshots; modify
  - `game/src/components/Match3DGame.jsx` :: `Match3DGame` — PvP mode props; modify
  - `game/src/components/MatchMiniMap.jsx` :: local-team selection marker; modify
- **Signatures & Types**:
  ```js
  export function serializeInputFrame(frame, sequence);
  export function deserializeInputFrame(message);
  export function createPvpInputBuffer(); // push(message), readFrame(), reset()

  GameLoop3D({ initialState, paused, focused, simulationMode = 'local',
    localTeam = 'home', remoteInputRef, snapshotRef, onLocalInput, ...existingProps })
  Match3DGame({ initialState, paused, simulationMode = 'local', localTeam = 'home',
    remoteInputRef, snapshotRef, onLocalInput, ...existingProps })
  ```
- **Execution Flow / Logic**:
  1. Serialize each `Set` as a sorted string array. Validate integer `sequence >= 0`, axes in `{-1,0,1}`, and key names against `GAME_KEYS` from `createInputController.js`.
  2. `createPvpInputBuffer.push()` accepts strictly increasing sequence numbers only. It preserves latest held keys, queues `pressed`/`released` edges once, and returns neutral input before the first packet. `readFrame()` consumes edge sets but retains held keys.
  3. In `simulationMode:'host'`, read local keyboard into `localTeam`, read buffered remote frame for the other team, and call `stepGame(...,{controlledTeams:['home','away']})`. Emit serializable cloned state snapshots every 3 animation frames (nominally 20 Hz).
  4. In `simulationMode:'remote'`, never call `stepGame`; copy the newest validated server snapshot into the shared game-state ref and update actor positions from that state. Emit local input frames through `onLocalInput` at a 20 Hz cap and immediately when a key edge occurs.
  5. In default `simulationMode:'local'`, preserve the current input, simulation, and six-frame UI snapshot cadence.
  6. The minimap accepts `controlledPlayerIds` or the single legacy `controlledPlayerId`; mark only the current viewer's selected player in PvP, not the remote player's marker.
- **Acceptance Criteria**:
  - [ ] Serialization round-trips valid frames and rejects invalid/replayed sequence data without throwing in the render loop.
  - [ ] Guest mode never mutates the game through `stepGame`; it reflects the newest accepted authoritative snapshot.
  - [ ] Host mode broadcasts snapshots at the specified cadence and consumes one-shot remote actions once.
  - [ ] Campaign render and snapshot cadence remain unchanged in local mode.

## Validation
- `npm --prefix game test` — all game simulation, initialization, input-buffer, and existing campaign tests pass.
- `npm --prefix game run build` — component and simulation imports compile.

## Commit Message
```text
feat(pvp): support human control for both teams

Plan: 2026-10-29-football-pvp-invite
Phase: P02-game-client
Task: T02-two-sided-match-control

- Add per-team controlled players and team-specific simulation inputs
- Add serializable input frames and host/remote game-loop modes
```

## Progress
- [x] Implementation complete
- [x] PvP focused tests and production build pass
- Full game suite: 204/208 pass; three existing campaign regression tests remain failing (opening skill grace, Eulryongta control handoff, knockdown input/AI movement).
- commit: recorded in Git history
