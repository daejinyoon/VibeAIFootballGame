# Task: T02 Controlled Player Marker

## Status: done

## Goal
Make the locally controlled campaign player immediately recognizable in the 3D field with a persistent overhead arrow and larger ground ring, plus one brief pulse each time control changes automatically or manually.

## Decision Summary
- Scope the enhanced marker and pulse to `simulationMode === 'local'`; preserve current PvP ring behavior.
- Use a white down-arrow with a dark outline and a bright lime ring. Keep it visible while selected; pulse once for 0.8 seconds on each actual player-ID change. Do not add text.

## Implementation

### I01. Render and animate the campaign selection marker

- Related Files:
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D`, selected marker ref registration — add the campaign arrow/ring marker group; modify
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D` selection marker update — detect player handoffs and animate refs without React state updates each frame; modify
  - `game/src/components/Match3DGame.jsx` :: `actorsRef` initialization and props — provide marker refs and campaign-only mode; modify
  - `game/src/components/Match3DCanvas.jsx` :: `FootballPlayer3D` props — pass the campaign marker mode; modify
  - `game/src/game/playerSelectionPresentation.js` :: `didControlledPlayerChange`, `getSelectionPulseScale` — pure transition/pulse helpers; new
  - `game/src/game/playerSelectionPresentation.test.js` :: handoff and pulse timing tests; new

#### Details
- **Signatures & Types**:
  ```js
  export function didControlledPlayerChange(previousPlayerId, nextPlayerId)
  export function getSelectionPulseScale(elapsedSeconds)
  ```
  `didControlledPlayerChange` returns `true` only for a non-null next ID different from the prior ID. `getSelectionPulseScale` returns `1` outside `[0,0.8)` and `1 + 0.35 * Math.sin(Math.PI * elapsedSeconds / 0.8)` inside it.
- **Data & Schema Fields**:
  - Extend the existing `actorsRef.current.selectedMarkers: Map<string, Object3D>` entries to point to a marker root group containing the ground ring and overhead arrow.
  - Track `previousControlledPlayerId: string | null` and `selectionPulseElapsedSeconds: number | null` in `GameLoop3D` refs; initialize the previous ID from the initial campaign state so the opening player does not get a false switch pulse.
  - Add a `campaignSelectionCue` boolean prop. It is true only for local campaign simulation; host/remote PvP keeps the current small ring and receives no new arrow/pulse.
- **Execution Flow / Logic**:
  1. In `FootballPlayer3D`, register one marker root group per player in `actorsRef.current.selectedMarkers`.
  2. Campaign marker root contains a down-pointing white triangular arrow above the head with a dark outline and a ground ring with outer radius `0.43` world units, bright-lime fill/emissive color, and a dark contrast border. Keep all parts hidden unless that player is currently controlled.
  3. In local campaign mode, derive selected ID from `state.controlledPlayerId` once per frame. After `stepGame`, compare it with `previousControlledPlayerId`; when it changes to a valid ID, reset pulse elapsed to `0` and update the previous ID.
  4. Advance pulse elapsed with nonnegative frame delta. Apply `getSelectionPulseScale` to the marker root group. At 0.8 seconds, clear the active pulse and return to scale `1` while leaving the arrow and ring visible.
  5. Preserve the existing selected-player logic for host/remote simulations and do not animate the old PvP marker.
- **Error & Exception Handling**:
  - A null/missing selected ID hides all marker groups and does not start a pulse.
  - Clamp elapsed time at 0.8 seconds; do not let frame delta extend the pulse or make scale non-finite.
  - Animate Three.js refs in `useFrame`; do not set React state on each rendered frame.
- **State Transition & Return**: Initial campaign selection is shown immediately without a pulse. Every later valid controlled-player ID change shows the new marker and plays one 0.8-second pulse; after the pulse, the marker stays steadily visible.

### I02. Verify switching and PvP isolation

- Related Files:
  - `game/src/game/playerSelectionPresentation.test.js` :: transition and pulse boundaries; modify
  - `game/src/components/GameLoop3D.jsx` :: campaign and PvP selection branches; read-only for validation if no implementation changes are needed

#### Details
- Assert same ID and null next ID do not count as a valid player handoff; a distinct valid ID does.
- Assert scale is 1 at 0 and 0.8 seconds, reaches 1.35 at 0.4 seconds, and never exceeds 1.35.
- Manual match check: opening kickoff does not pulse; a manual defensive player switch pulses; pass reception and automatic possession/control changes pulse; marker remains visible after each pulse.
- Verify the PvP host/remote branch retains only its existing marker and does not receive the new arrow or pulse.

## Acceptance Criteria
- [x] Campaign selected player has the overhead arrow and enlarged lime ring continuously while controlled.
- [x] Every actual automatic or manual campaign control handoff triggers one 0.8-second pulse; initial selection does not.
- [x] No player name, position, or number text is shown.
- [x] Existing minimap marker and PvP marker behavior remain unchanged.
- [x] Marker and pulse updates do not schedule React state updates per animation frame.

## Validation
- `npm --prefix game test -- src/game/playerSelectionPresentation.test.js` — transition and pulse helper tests pass.
- `npm --prefix game run build` — 3D marker changes compile into the client bundle.
- Manual campaign check described in I02 — opening, manual, and automatic transitions match the acceptance criteria.

## Commit Message
```text
feat(game): clarify controlled player changes

Plan: 2026-10-29-campaign-3d-player-visibility-and-kit
Phase: P01-campaign-3d-presentation
Task: T02-controlled-player-marker

- Add a persistent overhead arrow and larger ground marker
- Pulse the campaign marker on automatic and manual handoffs
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- Manual in-game visual check not performed in this turn; campaign and PvP variants are separated by `simulationMode` and the helper boundary tests passed.
- commit: recorded in git history
