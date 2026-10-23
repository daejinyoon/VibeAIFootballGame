# Plan: Football Restarts and Starting Skill

## Goal

Make manual throw-in, corner, and goal-kick controls reliable when the user presses early, and begin each new campaign with one randomly selected active skill owned by the home team-wide deck.

## Confirmed Design

- Out-of-bounds play uses throw-ins, goal kicks, or corners according to existing soccer rules; it does not reset to center kickoff.
- A valid home restart action pressed during the setup delay is queued and released once the 0.35-second ready timer reaches zero.
- New campaigns start at stage 1 with exactly one random level-1 active skill in the home shared deck. Rainbow Reflect is passive and is excluded.
- Opponent stage-one deck remains empty.
- Existing saved campaigns are preserved; the starter skill applies only in `createCampaign`.

## Phases

| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Reliable out-of-bounds restarts and a team starter skill | [P01](../phases/2026-10-23-football-restarts-and-starting-skill/P01-restarts-and-starter-skill/phase.md) |

## Execution Order

1. T01 queues home restart key presses during the setup delay and tests all restart types.
2. T02 seeds new campaigns with one randomly selected active team skill and updates campaign tests.

## Regressions and Risks to Verify

- A queued action must not cause two restarts or bypass the existing ready delay.
- Throw-in accepts S; corner kick accepts A or S; goal kick accepts A or S.
- AI-controlled away restarts stay automatic.
- The random starter is always a valid non-passive `SkillId`, appears once at level 1, and survives the existing save/load representation.
- Existing campaigns retain their saved deck without injected or reordered skills.

## Status

- T01 and T02 are complete; all planned validations passed.
