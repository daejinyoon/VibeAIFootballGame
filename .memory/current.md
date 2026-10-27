# Current Context

## Active Plan
[Football Beta Feedback](./plans/2026-10-27-football-beta-feedback.md)

## Active Phase
[P01 Game Stability and Polish](./phases/2026-10-27-football-beta-feedback/P01-game-stability-and-polish/phase.md)

## Active Task
[T03 Beta Badge and Goal-Kick HUD](./phases/2026-10-27-football-beta-feedback/P01-game-stability-and-polish/T03-beta-badge-and-goal-kick-hud.md)

## Status
- T01 tackle-pose fix and T02 distance-based shot arcs are committed locally; targeted simulation tests and production build pass.
- Post-fix Chrome/Edge soak and input-latency measurements are deferred to the batch release per user direction. No Azure deployment was made.
- The prior Cosmos DB Profile Storage task `P02-T01` and its plan/task files remain unchanged and preserved.
- Preserve existing unrelated worktree changes; do not revert them.
## Next Step (IMPORTANT)
Read T03 completely and implement the start-screen BETA badge and goal-kick HUD guidance. Preserve the existing `shadows={false}` setting in `game/src/components/Match3DCanvas.jsx`. Keep post-fix browser soak and shot-feel review for batch-release verification.
