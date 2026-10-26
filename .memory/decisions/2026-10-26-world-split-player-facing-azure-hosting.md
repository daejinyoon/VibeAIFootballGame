# Decisions: World Split Visibility, Player Facing, and Azure Hosting

- Date: 2026-10-26
- Status: Confirmed

## D01. Rainbow Reflect and World Split visibility
- **Chosen**: Treat the missing World Split rocks as a separate rendering issue; do not restore Rainbow Reflect.
- **Rationale**: Rainbow Reflect removal only filters old skill references from saved data. World Split barriers are created by `skills.js` and drawn independently by `SkillEffects3D.jsx`.
- **Code finding**: `WORLD_SPLIT_HEIGHT` is 90 field units, but each rock block's rendered height is scaled by `maximumWallHeight / 1.88`, making the solid rock body much shorter than the barrier value suggests.

## D02. World Split rock appearance and gameplay collision
- **Chosen**: Make the opaque rock wall visibly larger and lean it 35 degrees from vertical in the tackle travel direction. Adjust the rendered rock mesh only; preserve the existing wall length, tackle reach, collision line, and collision behavior.
- **Rationale**: A stronger, slanted rock silhouette should read clearly while feeling less like a tall upright screen. Keeping collision separate avoids changing the already-chosen gameplay range.
- **Code finding**: Barrier visuals and barrier collision are calculated independently. `WORLD_SPLIT_LENGTHS` currently grows by campaign stage from 90, and `WORLD_SPLIT_HEIGHT` is 90.

## D03. Player facing
- **Chosen**: All active players without the ball face the ball. The player carrying the ball faces its movement direction.
- **Rationale**: Players appear engaged with play, while the carrier's orientation communicates where they are going.
- **Code finding**: `GameLoop3D.jsx` currently rotates all actors toward a fixed team direction. Player state already exposes position, movement velocity, and facing vectors; use these for visual yaw only so orientation does not alter simulation.

## D04. Azure hosting
- **Chosen**: Publish the Vite football game as an Azure Static Web App using GitHub Actions. Create a new private GitHub repository for this project and deploy the `master` branch, with app location `/game`, no API location, and output location `dist`.
- **Rationale**: The user wants a shareable public game URL with automatic redeployment when changes are pushed, while keeping source code private.
- **Code finding**: The game is a Vite SPA in `game/`; `game/package.json` defines `npm run build`, and Vite builds to `game/dist`. There is no GitHub remote, Azure configuration, or `gh` CLI installed. The app currently has no API; existing browser-local saves remain local to each player's browser.
- **Prerequisites**: The user needs a GitHub account and a private repository. An Azure administrator must grant permission to create/manage an Azure Static Web App in the designated resource group. Do not place Azure deployment tokens in chat; use the GitHub Actions secret or the Azure-generated workflow setup.
- **Repository safety**: The current local repository has numerous unrelated dirty and untracked files. Only the intended game, deployment, and memory-plan files should be included in new task commits; do not stage the entire working tree by default.
