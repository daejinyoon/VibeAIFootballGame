# Plan: Football Tactics and Skill Flow

## Goal
Make World Split visible and appropriately sized, restore control and loose-ball play after Eulryongta hits the home-controlled player, give the ball carrier two distinct diagonal passing outlets, use readable triangular positioning at opponent goal kicks, allow goalkeepers to use team skills, and streamline skill rewards by auto-equipping new skills into free slots or opening the loadout when all three slots are occupied.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Update match simulation, skill eligibility, and tactical positioning. | [P01](../phases/2026-10-26-football-tactics-and-skill-flow/P01-matchplay-and-tactics/phase.md) |
| P02 | `done` | Integrate skill rewards with the existing three-slot loadout flow. | [P02](../phases/2026-10-26-football-tactics-and-skill-flow/P02-skill-reward-flow/phase.md) |

## Scope Note
- World Split slide travel is approximately 90 field units; wall height is 90. Barrier length uses campaign stage rather than skill level: `90 + (stage - 1) * 10` for stages 1–5 (90, 100, 110, 120, 130). This concretizes the confirmed gradual increase. Ordinary tackle contact ranges remain unchanged.
- Eulryongta drops the ball at the hit carrier's position as a loose ball and selects the nearest eligible home field player when the currently controlled player is knocked down, in either possession state.
- The skill reward automatically equips only newly acquired skills when a slot is free. With all three slots full, continuing from the reward screen opens the existing loadout. Duplicate upgrades leave equipment unchanged.
- Do not reopen the previously completed pre-kickoff skill guard, five-second Eulryongta duration, Eagle Shot trajectory, or tornado funnel orientation.
