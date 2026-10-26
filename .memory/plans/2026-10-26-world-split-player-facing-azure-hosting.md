# Plan: World Split Visibility, Player Facing, and Azure Hosting

## Goal
Make World Split's rock wall clearly visible as a large opaque wall leaning 35 degrees in the tackle direction without changing its gameplay collision or reach; turn players toward play; and publish the Vite game at a public Azure Static Web Apps URL with GitHub automatic deployment from a private repository.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Improve World Split presentation and player facing while leaving match rules intact. | [P01](../phases/2026-10-26-world-split-player-facing-azure-hosting/P01-game-presentation/phase.md) |
| P02 | `in_progress` | Configure the private GitHub source and Azure Static Web Apps automatic deployment; obtain and verify the public game URL. | [P02](../phases/2026-10-26-world-split-player-facing-azure-hosting/P02-azure-deployment/phase.md) |

## Prerequisites and Constraints
- P02 requires a GitHub account, a new private GitHub repository, and permission from the Azure administrator to create/manage a Static Web App in the designated resource group.
- Use the Azure Static Web Apps Free plan, GitHub Actions, branch `master`, app location `game`, empty API location, and output location `dist`.
- Keep Azure deployment credentials in GitHub Actions secrets; never put them in source files or chat.
- The current working tree contains unrelated modifications and untracked files. Stage only files named by the active Task; do not use `git add .`.
- Game progress continues to use browser-local storage; this plan adds hosting, not cloud save or an API.

## Known Findings
- Rainbow Reflect removal only filters legacy skill IDs in saved data; World Split visuals are independent. The rock blocks currently use a vertical scale factor of `maximumWallHeight / 1.88`, which makes the solid body appear short.
- `GameLoop3D.jsx` currently rotates actors to a fixed team heading. Simulation player state includes position, velocity, and facing vectors.
- The game is in `game/`, with `npm run build`, Vite output `dist`, and no Azure workflow or GitHub remote configured.
