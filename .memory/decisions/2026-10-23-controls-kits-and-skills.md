# Decisions: Football Game Controls, Kits, and Shared Skills

- Date: 2026-10-23
- Status: Confirmed

## D01. Home Kit Color Presets
- **Chosen**: Show nine ready-made uniform palettes in the team customization screen. Each palette is a named, accessible card with jersey, trim, shorts, and boot swatches. The assistant may choose the nine palette colors and names. Keep the existing four logo choices.
- **Rationale**: Ready-made combinations are easier to compare and select than separate color inputs.

## D02. Kickoff Player Control
- **Chosen**: When the home team restarts after conceding, control starts with the home forward taking kickoff. Keep the current pass behavior that transfers control to the intended receiver after a home pass. Do not switch players during the kickoff before the ball is passed.
- **Rationale**: The user wants a predictable kickoff controller and a simple passing transition.
- **Code finding**: `resetForKickoff` currently preserves the previous home controlled player instead of selecting the kickoff taker. Update this so the home kickoff taker is controlled.

## D03. Main Screen Control Guide
- **Chosen**: Show movement with arrow keys only. Put `E` sprint in the movement row. Remove the separate `SPRINT` and `AERIAL` entries.
- **Rationale**: The guide should match the keyboard behavior and emphasize the requested controls.
- **Code finding**: `createInputController` already maps movement only to arrow keys; the start screen currently also mentions WASD.

## D04. Campaign Starting Stage
- **Chosen**: A new player starts at Stage 1.
- **Rationale**: Stage progression should begin at the first stage.
- **Code finding**: `createCampaign` already sets `currentStage` to 1 and `getUnlockedStage` initially returns 1. Preserve this behavior.

## D05. Shared Skill Ownership and Order
- **Chosen**: Skills are owned by the team, not assigned to individual players. A skill reward adds the chosen skill to the shared team collection. The user can place its order immediately after choosing the reward and reorder the collection later on the existing team setup screen.
- **Rationale**: All field players can use the team's shared skills without per-player loadout assignment.

## D06. Skill Activation and Cooldown
- **Chosen**: Pressing `F` attempts the next currently usable skill according to the team's placed order. Skip skills whose gameplay conditions are not met; advance the order only after a successful activation. Apply a 10-second cooldown to the entire team after any skill successfully activates. The same shared cooldown and unlimited uses apply to both home and AI teams.
- **Rationale**: This keeps skill order predictable while preventing rapid repeated activations.

## D07. Duplicate Skill Rewards
- **Chosen**: Duplicate rewards raise a skill's level up to level 3 only when that skill has a confirmed upgrade. Do not offer an already-owned skill when it has no confirmed duplicate upgrade. Exclude skills at maximum level from future offers. Vacuum Cleaner upgrades are deferred, so duplicates are excluded for now. The team cooldown remains 10 seconds.
- **Rationale**: Duplicates strengthen the team collection rather than adding per-player copies or uses, while deferred and non-upgradeable skills do not create unusable duplicate rewards.

## D08. Eagle Shot
- **Chosen**: Skill goals are worth 1 point at level 1, 2 points at level 2, and 3 points at level 3. A goalkeeper cannot block or stop an Eagle Shot.
- **Rationale**: Its level-up benefit is clear and its signature shot remains decisive.

## D09. Tornado Shot
- **Chosen**: The ball still flies toward goal. The tornado lifts every other character, including both teams' players and goalkeepers, while excluding the user. Affected characters spin in the air and cannot move or act until they fall back onto the field. Duration is 5 seconds at level 1, 6 at level 2, and 7 at level 3.
- **Rationale**: The skill combines the existing shot with the requested dramatic crowd-control effect.

## D10. Power Tackle
- **Chosen**: Pressing `F` immediately raises an impassable wall from the ground in the controlled player's facing direction. Characters struck by the wall are launched. Wall duration is 3 seconds at level 1, 4 at level 2, and 5 at level 3. The wall blocks all characters.
- **Rationale**: This follows the supplied fractured-earth barrier reference and gives duplicate levels a duration upgrade.

## D11. Eulryongta
- **Chosen**: Show the supplied soccer photo as a brief cut-in with a slap-like impact sound. The skill knocks down 1 target at level 1, 2 at level 2, and 3 at level 3. Each target stays down for 10 seconds at every level.
- **Rationale**: Target count scales while the requested visual and knockdown duration stay consistent.
- **Code finding**: The current implementation knocks down one target for 1 second, though its description says 2 seconds; the confirmed duration is 10 seconds.

## D12. Vacuum Cleaner
- **Chosen**: Instantly pull the ball to the user from anywhere on the field. Defer decisions about duplicate upgrades for a later discussion.
- **Rationale**: The full-field effect is confirmed; the user explicitly deferred its upgrades.

## D13. Rainbow Reflect
- **Chosen**: Keep it automatic. When the opposing team uses a skill, cancel that skill effect regardless of player position; remove terrain effects such as walls as well. The base effect has no duplicate upgrade.
- **Rationale**: It protects the team from opposing skill effects, including terrain effects, without requiring a player to activate it manually.
