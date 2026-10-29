# Plan: Campaign Goal-Kick and Loose-Ball AI

## Goal
Improve campaign match flow with reachable goal-kick lanes, space around the keeper before restart release, a modest stage 1 opponent increase, and one eligible AI player per team contesting unowned recoverable balls. Preserve PvP behavior.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Implement campaign-only AI tuning, goal-kick positioning, and loose-ball pursuit in the game simulation. | [P01](../phases/2026-10-29-campaign-goal-kick-and-loose-ball-ai/P01-campaign-match-ai/phase.md) |

## Scope
- Campaign changes only; PvP is detected by `stepGame` receiving `options.controlledTeams` containing `away` and must remain unchanged.
- No Azure, backend, matchmaking, visual, general movement-speed, or skill-shot changes.
- One phase is appropriate because changes share the game simulation and test module. Three sequential tasks keep each independently reviewable.

## Existing implementation facts
- Field is 960 by 540 units; home attacks toward increasing x, away toward decreasing x.
- AI movement speed is 136 units/second, sprint multiplier 1.35, and ordinary AI pass range is 48 to 330 units.
- Goal-kick targets are currently about 500 to 600 units from the keeper.
- Stage 1 tuning is 1.00 seconds / support radius 125 / pressing distance 95. Stages 2–5 have distinct stronger values.
- Loose-ball collection currently requires distance <=18 and ball height <=14; aerial header resolution is separate.
- `stepGame` has a dedicated PvP branch when `options.controlledTeams` contains `away`.

## Task Order
1. T01: Make stage 1 opponent tuning stronger without changing friendly or PvP tuning.
2. T02: Create reachable goal-kick lanes and move close opponents beyond 120 units, preserving PvP restarts.
3. T03: Add campaign loose-ball pursuit while preserving manual control and PvP behavior.
