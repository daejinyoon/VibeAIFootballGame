# Decisions: Campaign Goal Kick and Loose Ball AI

- Date: 2026-10-29
- Status: Confirmed

## D01. Goal-kick receiver movement
- **Chosen**: Make the receiving teammates move sooner and open passing lanes. Keep the existing movement speed; bring the target positions closer to the goalkeeper.
- **Rationale**: Receivers already run at the current AI speed (136 units/s, with existing sprint behavior). Their current targets are roughly 500 to 600 units away, which makes the restart feel slow and exceeds the regular AI pass range.

## D02. Goal-kick passing options
- **Chosen**: Provide one short option at 140 units and intermediate options at 250 units from the kicker, arranged as a usable passing triangle with lateral separation.
- **Rationale**: Both distances are inside the current 330-unit AI pass limit and give the keeper near and farther choices.
- **Implementation note**: Mirror the target layout for home and away goal kicks; keep target points inside the field. The three receiver slots follow the existing three-player triangle arrangement.

## D03. Opponent position during goal kicks
- **Chosen**: Move opposing players that are too close so they remain at least 120 units from the goalkeeper until the kick is released.
- **Rationale**: The user wants opponents positioned farther away at the restart, leaving room for the keeper and intended passing options.
- **Implementation note**: Reposition only as needed to satisfy the minimum distance, then allow normal play movement after release.

## D04. Stage 1 opponent difficulty
- **Chosen**: For stage 1 opponents only, reduce the decision interval from 1.00 to 0.94 seconds and increase pressing distance from 95 to 104 units. Keep the user's AI teammates on their existing tuning.
- **Rationale**: A moderate increase should make stage 1 more challenging without changing the friendly support behavior. The current tuning values are shared, so the implementation must separate the opponent adjustment from friendly AI tuning.

## D05. Loose-ball pursuit
- **Chosen**: When the ball has no owner, send the nearest eligible AI player from each team toward it; other players keep their formation behavior. For recoverable aerial balls, pursue the projected landing point. Preserve existing behavior for targeted passes and skill shots.
- **Rationale**: This creates visible attempts to win possession without making every player abandon their position.
- **Implementation note**: A manually controlled home player keeps user control. If that player would otherwise be the closest home chaser, send the nearest AI teammate instead.

## D06. Goalkeeper eligibility for loose-ball pursuit
- **Chosen**: A goalkeeper may pursue a loose ball near their own goal; otherwise, select from field players only.
- **Rationale**: The keeper can help recover nearby danger while avoiding unnecessary runs that leave the goal exposed.

## D07. Scope
- **Chosen**: Apply these behavior changes to campaign play. Keep PvP deferred and unaffected.
- **Rationale**: PvP was explicitly deferred earlier; this request concerns campaign AI behavior.

## Existing-code constraints and findings
- `game/src/game/constants.js` defines stage tuning in `AI_TUNING`; the current stage 1 entry is `thinkIntervalSeconds: 1`, `teammateSupportRadius: 125`, and `pressingDistance: 95`.
- `game/src/game/stepGame.js` defines a field 960 units wide and 540 units high, `AI_SPEED` of 136, a 1.35 sprint multiplier, a 330-unit maximum regular AI pass distance, and a 0.35-second goal-kick preparation delay.
- `positionGoalKickTriangle` currently places its targets at approximately 500 to 600 units from the goalkeeper. Goal-kick receivers already move at the existing AI speed.
- Loose-ball collection currently requires the player to be within 18 units and the ball to be at or below 14 units in height. AI with no carrier generally return to role positions rather than contesting the ball.
- The current shared AI tuning affects both away opponents and home support players, so opponent-only stage 1 tuning needs an explicit side-aware path.

## Out of scope
- PvP matchmaking, networking, and PvP behavior.
- Azure resources, deployment, or other hosting changes.
- Changes to general player movement speed, shot logic, or special-skill ball behavior.
