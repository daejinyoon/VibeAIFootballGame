# Decisions: Field-Boundary Running Animation

- Date: 2026-10-30
- Status: Confirmed

## D01. Root cause
- **Chosen**: Treat the reported edge behavior as a running-animation mismatch at the pitch boundary, not an input lock. Movement clamps player coordinates to the field but leaves intended `vx`/`vy` nonzero; the 3D model uses those velocity values to decide whether to play the running animation. The player moves immediately when the user presses the opposite direction.
- **Rationale**: The user confirmed this happens near the touchline or goal line and that reversing direction moves the player right away. This matches the movement and animation code paths.

## D02. Animation movement signal
- **Chosen**: Determine running animation from actual player position change, while retaining `vx` and `vy` for game logic.
- **Rationale**: Player velocity is also used for facing direction and pass receiver lead. Changing its meaning to the clamped displacement could alter those gameplay decisions; a render-side movement signal fixes the visual mismatch without changing them.

## D03. Scope
- **Chosen**: Fix the 3D running-in-place animation when input is pushing a player into a pitch boundary. Do not change player movement or input behavior.
- **Rationale**: The player is not actually locked and can move away immediately; the visible issue is the animation continuing while position is clamped.

## Existing-code constraints and findings
- `game/src/game/stepGame.js` clamps player `x` and `y` to the field in `moveByInput` and `moveToward`, while setting `vx` and `vy` from intended movement before clamping.
- `game/src/components/MiiPlayerModel.jsx` plays the running motion when the speed from `vx`/`vy` exceeds 3 and the motion action is `run` or `tackle`.
- `vx` and `vy` also affect facing in `game/src/game/playerOrientation.js` and pass-receiver leading in `game/src/game/stepGame.js`; keep their game-logic meaning intact.
- The user reported that this happens near field boundaries and confirmed reversing direction moves the player immediately.

## Out of scope
- Input controller changes, actual player movement tuning, AI behavior, and PvP networking.
