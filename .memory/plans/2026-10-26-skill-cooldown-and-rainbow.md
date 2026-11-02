# Plan: Skill Cooldown and Rainbow Reflect Removal

## Goal
Remove Rainbow Reflect from active gameplay and safely strip it from existing saves without losing unrelated campaign progress. Prevent rapid skill chaining by adding independent three-second team-wide cooldowns after successful casts, and show each team's remaining cooldown in the match HUD.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Remove Rainbow Reflect, add team-wide activation pacing, and show cooldown status. | [P01](../phases/2026-10-26-skill-cooldown-and-rainbow-removal/P01-skill-removal-and-pacing/phase.md) |

## Confirmed Decisions
- Rainbow Reflect is removed from new and existing play. Current and legacy saves discard only references to that skill and preserve other progress and skills.
- Home and away have independent three-second cooldowns shared by all skills on each team.
- A cooldown starts only after a successful activation. Failed attempts do not start it. Existing per-skill cooldowns remain.
- The HUD shows each team's remaining shared cooldown.
