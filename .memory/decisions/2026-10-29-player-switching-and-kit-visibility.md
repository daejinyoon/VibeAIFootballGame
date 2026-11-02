# Decisions: 3D Player Switching Visibility and Campaign Kit

- Date: 2026-10-29
- Status: Confirmed

## D01. Scope
- **Chosen**: Improve controlled-player visibility in 3D campaign matches and fix the saved home kit not appearing in the campaign match. Defer PvP changes.
- **Rationale**: The feedback concerns the 3D match presentation and the reported kit issue was observed in the company site's campaign flow. PvP is intentionally postponed.

## D02. Campaign kit application
- **Chosen**: When a player saves team customization before a campaign match, render the selected home logo and kit palette on all home-team players in the match. Keep the stage-defined rival kit unchanged.
- **Rationale**: The player reported that every home player still uses the default uniform after a successful save on the deployed site. The saved selection should carry from the profile into the rendered 3D match.
- **Observed reproduction**: The selection preview changes, the player presses Save, the app returns to the start screen without an error, and every home player still appears in the default uniform on the company site.
- **Implementation note**: The current source passes `profile.teamCustomization` through `makeMatchState` and `getTeamBranding` into `createInitialGameState`; `FootballPlayer3D` resolves the kit from that match branding. No root cause is confirmed yet, so implementation must trace and verify the complete persisted-profile-to-render path instead of assuming a missing prop.

## D03. On-screen controlled-player marker
- **Chosen**: Keep a persistent, prominent arrow above the locally controlled player and enlarge the ground ring while that player is controlled. On every actual control-player change, including automatic and manual changes, play one 0.8-second emphasis pulse, then return to the persistent marker.
- **Rationale**: A persistent marker identifies the controlled player; the short pulse draws attention to each handoff without continuous flashing.
- **Visual treatment**: Use a white arrow with a dark outline and a bright lime ground ring for contrast against the selected kit colors and pitch.
- **Text**: Do not show player name, number, or position text.

## D04. Off-screen player indicator
- **Chosen**: Keep the current ball-tracking camera. If the controlled player is outside the camera viewport, show a screen-edge direction arrow until the player enters the viewport, then rely on the overhead arrow.
- **Rationale**: This guides the player to the newly controlled teammate without changing the established camera framing.

## D05. Existing behavior and boundaries
- **Chosen**: Preserve the existing minimap controlled-player marker and stage-specific rival kit. Keep PvP kit synchronization and PvP switching markers out of this task.
- **Rationale**: The minimap already shows the controlled player. PvP is deferred by the user; campaign kit work must remain scoped to the home team.
