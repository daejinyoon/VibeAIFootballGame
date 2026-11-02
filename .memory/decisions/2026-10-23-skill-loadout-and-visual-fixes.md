# Decision: Skill Loadout, Visuals, and Match Fixes

- Date: 2026-10-23
- Status: Confirmed
- Workflow: Interview complete; implementation has not started.

## D01. Uniforms
- **Chosen**: Fix the reported home-team kit mismatch. The customization preview shows the selected color, but saved selections still render as the default cyan kit in a newly started campaign and match.
- **Acceptance**: The selected home palette and logo must be visible on in-match 3D players after saving and starting a new campaign. Preserve the existing opponent stage-kit behavior, including the distinct stage 5 black kit.
- **Context**: The user already confirmed that the preview is correct, a non-default color was selected, and the test was done in a new campaign and match.

## D02. Skill ball visuals
- **Chosen**: Ball-using skills receive a skill-specific appearance during their effect, then restore the normal soccer ball when the effect ends.
- **Eagle Shot**: Preserve the existing decision: the ball rises vertically, transforms into an eagle, flies toward goal along the cycloidal arc, and returns to the ordinary soccer ball after the scoring play.
- **Tornado Shot**: Keep the soccer ball visible and wrap it in a clearly visible moving tornado as it travels.
- **Vacuum Cleaner**: Keep the soccer ball recognizable. Show a visible spiraling suction path as the ball is pulled toward the user. The ball must travel continuously rather than jump to its destination; use about 0.7 seconds and accelerate as it gets closer.
- **Other skills**: World Split and Eulryongta do not transform the ball because their effects do not use it. Their existing terrain and dizzy-star visuals remain the intended read.

## D03. Active Rainbow Reflect
- **Chosen**: Rainbow Reflect is an active skill in the shared, ordered team deck, not a passive effect. F activates the next eligible skill according to the equipped deck order.
- **Trigger and effect**: When the controlled player has any negative status, F clears that status and applies the same status to the last opposing player who cast a skill. This target rule applies regardless of who originally caused the status or the players' positions.
- **Duration**: Apply the status to the opponent for that status's original duration.
- **Unavailable condition**: If the controlled player has no negative status to transfer, Rainbow Reflect does not activate and does not consume its cooldown.
- **Visual**: Show the status effect disappear from the controlled player, then travel along a rainbow-colored connection to the last opposing skill caster, where the same status effect appears.
- **Cooldown**: Each equipped skill has its own 10-second cooldown. There is no additional shared team cooldown.

## D04. Skill inventory, equipment, and order
- **Chosen**: Store acquired skills in an unlimited-capacity bag. Equip at most three skills for a match. The equipped skills are shared by the team and activate in their configured order.
- **Management**: Skills can be equipped or removed from the main menu and between rounds. Lock the equipment once a match begins.
- **Cooldown/order behavior**: Each skill has its own 10-second cooldown. When the next skill in order is cooling down or otherwise unavailable, skip it and check the following equipped skill until a usable one is found.
- **Duplicate reward**: When the player chooses a skill already owned, show a level-up confirmation. On confirmation, raise its level. Skills at their level cap remain excluded from reward offers.

## D05. Skill cut-ins
- **Chosen**: Show a cut-in every time either team activates a skill, on every round. Do not suppress later uses because an earlier round displayed a cut-in.

## D06. Match timer
- **Code finding**: A normal kickoff preserves the current remaining time. A new match state starts at the 60-second regulation duration; stage transitions and rematch starts create a new match state.
- **Chosen**: Starting a new round or rematch at 60 seconds is intended. During a match, the timer must not reset unexpectedly. Investigate and fix any mid-match reset separately from the intended new-match initialization.

## D07. Existing skill effect decisions to preserve
- Keep the current confirmed skill behavior and visuals for Eagle Shot, Tornado Shot, World Split, Eulryongta, and Vacuum Cleaner, including the user's prior specifications for score, collision, knockdown, duration, levels, and audio.
- Replace the prior passive/global Rainbow Reflect design with D03 above.
- Keep World Split's sliding caster, ground fissure, paired impassable barrier, three-second duration, and level-scaled length.
- Keep Eulryongta's fall animation and visible dizzy stars for the full knockdown duration.

## Open verification notes for implementation
- Verify the saved kit values at the final in-match mesh/material boundary; the existing app-to-match branding path appeared wired, but the reported cyan appearance remains unresolved.
- Trace the cut-in event lifecycle across round transitions; the current presentation uses local event-driven state and can suppress an event while a prior cut-in is still active.
- Confirm the timer remains unchanged for all in-match events and resets only when a new match is created.
