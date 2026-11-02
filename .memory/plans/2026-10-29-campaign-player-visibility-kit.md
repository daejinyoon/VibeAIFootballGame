# Plan: Campaign 3D Player Visibility and Kit

## Goal
Make the saved campaign home kit reliably appear on every home player in a 3D match, and make the controlled player easy to find after each control handoff without changing the ball-tracking camera. PvP kit synchronization and PvP marker changes are deferred.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Trace campaign customization into rendered players and improve 3D controlled-player cues | [P01](../phases/2026-10-29-campaign-3d-player-visibility-and-kit/P01-campaign-3d-presentation/phase.md) |

## Confirmed Decisions
- A successful saved home logo and palette must be used for all four home players in a campaign match; the rival keeps its stage-specific kit.
- The kit failure was observed on the company site after the selection preview changed, Save returned to the start screen without an error, and all home players still showed the default kit. The current source appears to pass customization into match state and player rendering, so identify the first boundary that loses or masks the saved value; do not make a speculative color-only change.
- PvP is out of scope for this plan.
- In campaign play, show a persistent white down-arrow with a dark outline above the controlled player and an enlarged bright-lime ground ring. Pulse once for 0.8 seconds on every actual automatic or manual controlled-player change. Do not add player text.
- Keep the existing ball-tracking camera. When the selected player is outside the 3D viewport, show a matching screen-edge arrow pointing toward them until they enter the viewport. Keep the existing minimap marker.

## Constraints and Regression Risks
- Preserve skill-preview setup behavior when extracting campaign match-state creation from `App.jsx`.
- Preserve the stage-derived rival kit and the stage-five black rival kit.
- Keep the upgraded pulse and edge indicators limited to campaign mode; do not change the existing PvP marker behavior.
- `game/src/components/Match3DCanvas.jsx` has a pre-existing user change disabling shadows (`shadows={false}` and no `castShadow`). Any implementation touching that file must preserve those lines.
- Do not add Azure resources, modify profile schema version 7, or change Cosmos containers; this is a client/profile-pipeline and presentation fix.
