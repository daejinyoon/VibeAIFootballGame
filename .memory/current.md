# Current Context

## Active Plan
[World Split Visibility, Player Facing, and Azure Hosting](./plans/2026-10-26-world-split-player-facing-azure-hosting.md)

## Active Phase
[P01 Game Presentation](./phases/2026-10-26-world-split-player-facing-azure-hosting/P01-game-presentation/phase.md)

## Active Task
[T02 Player Facing](./phases/2026-10-26-world-split-player-facing-azure-hosting/P01-game-presentation/T02-player-facing.md)

## Status
- T01 is done: World Split's opaque rock blocks are 1.5x larger and lean 35 degrees toward tackle travel. Barrier simulation and collision values are unchanged.
- `npm test` passed (163 tests); `npm run build` passed.
- Automated validation is complete. A graphical browser preview was not available in this environment, so the requested home/away visual check still needs an in-game look.
- P02 Azure deployment depends on the user's GitHub account/private repository and permission to create/manage an Azure Static Web App in the designated resource group.

## Next Step (IMPORTANT)
Read the active T02 blueprint and add/test the pure field-vector-to-Three.js yaw helper, then apply it in `game/src/components/GameLoop3D.jsx`.
