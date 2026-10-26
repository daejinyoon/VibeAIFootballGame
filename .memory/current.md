# Current Context

## Active Plan
[Football Tactics and Skill Flow](./plans/2026-10-26-football-tactics-and-skill-flow.md)

## Active Phase
[P01 Matchplay and Tactics](./phases/2026-10-26-football-tactics-and-skill-flow/P01-matchplay-and-tactics/phase.md)

## Active Task
[T02 Eulryongta Control Recovery](./phases/2026-10-26-football-tactics-and-skill-flow/P01-matchplay-and-tactics/T02-eulryongta-control-recovery.md)

## Status
- T01 complete: World Split height is 90, slide travel is about 90 units, and barrier length scales from 90 to 130 by campaign stage. Focused and full tests plus production build pass.
- T02 is active: implement loose-ball release and home-player control switching after Eulryongta hits.
- The prior Football Skill Fixes plan is complete and remains unchanged.

## Next Step (IMPORTANT)
Read the T02 blueprint and implement Eulryongta ball release and nearest eligible home field-player control handoff in `game/src/game/skills.js` and `game/src/game/stepGame.js`.
