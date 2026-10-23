# Plan: Football Game Overhaul

## Goal
Rework the active 3D football match into a faster, more readable 4v4 arcade match: Mii-style animated players, contextual AI movement, automatic aerial play without jumping, stamina-based sprint, dramatic skill cut-ins, a wide ball-follow camera, an informative HUD/minimap, and persistent team branding. Preserve existing campaign progress and skill effect gameplay.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Match input, movement, aerial rules, and tactical AI | [P01](../phases/2026-10-23-football-game-overhaul/P01-match-simulation/phase.md) |
| P02 | `done` | 3D player motion, camera, speed effects, and skill cut-ins | [P02](../phases/2026-10-23-football-game-overhaul/P02-three-dimensional-presentation/phase.md) |
| P03 | `done` | Match HUD, sprint meter, and minimap | [P03](../phases/2026-10-23-football-game-overhaul/P03-match-hud/phase.md) |
| P04 | `done` | Persistent team customization and stage rival branding | [P04](../phases/2026-10-23-football-game-overhaul/P04-persistent-team-identity/phase.md) |
| P05 | `done` | Remove the unused legacy 2D renderer and its dedicated assets/styles | [P05](../phases/2026-10-23-football-game-overhaul/P05-legacy-2d-cleanup/phase.md) |

## Status
Complete — all five phases are marked done.

## Scope Boundaries
- Desktop keyboard controls only. Keep gamepad and mobile controls out of this plan.
- Keep the active 3D match path. After P01-P04 are complete, remove the unused `PitchCanvas` / `drawGameFrame` renderer and its dedicated test/style references in P05.
- Preserve shared match simulation and input modules used by the active 3D game; legacy cleanup is limited to the orphaned 2D rendering path.
- Keep the existing 4v4 roster, campaign progression, and skill effect gameplay. Add presentation and customization around them.
- No implementation code is written in this planning stage.
