# Current Context

## Active Plan
[Football Beta Feedback](./plans/2026-10-27-football-beta-feedback.md)

## Active Phase
[P01 Game Stability and Polish](./phases/2026-10-27-football-beta-feedback/P01-game-stability-and-polish/phase.md)

## Active Task
[T02 Distance-Based Shot Arcs](./phases/2026-10-27-football-beta-feedback/P01-game-stability-and-polish/T02-distance-based-shot-arcs.md)

## Status
- T01 tackle-pose fix is committed locally after the user reproduced the live freeze; `npm test` and `npm run build` pass.
- Post-fix Chrome/Edge soak and input-latency measurements are deferred to the batch release per user direction. No Azure deployment was made.
- The prior Cosmos DB Profile Storage task `P02-T01` and its plan/task files remain unchanged and preserved.
- Preserve existing unrelated worktree changes; do not revert them.
## Next Step (IMPORTANT)
Read T02 completely and implement the planned distance-based ordinary-shot trajectories. Preserve the existing `shadows={false}` setting in `game/src/components/Match3DCanvas.jsx`. Keep T01 post-fix browser soak for batch-release verification.
