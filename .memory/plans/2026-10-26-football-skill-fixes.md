# Plan: Football Skill Fixes

## Goal
Prevent either team from using skills before the opening kickoff starts the clock, reduce Eulryongta's knockdown to five seconds, lower the World Split barrier to height 72 in both simulation and rendering, mirror Eagle Shot field paths for home and away attacks and shape its height as a gradual landing glide, and turn the Tornado Shot funnel point toward the ground.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Apply the skill gameplay and visual fixes with focused regression coverage. | [P01](../phases/2026-10-26-football-skill-fixes/P01-skill-gameplay-and-vfx/phase.md) |

## Scope Note
- Both away AI activation and player-controlled home skill activation are gated on `hasMatchClockStarted`; normal skill behavior resumes after the opening kickoff starts the clock.
