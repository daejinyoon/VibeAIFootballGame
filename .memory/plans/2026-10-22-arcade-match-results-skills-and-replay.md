# Plan: Arcade Match Results, Skills, and Stage Replay

## Goal
Make match endings visibly reliable, begin the match clock only with the first kickoff kick, improve aerial control, shot accuracy, and pass reception, and complete the skill-card and stage-replay loop in the existing local 3D arcade campaign.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Correct kickoff timing, aerial input, shot/pass handling, and terminal result presentation. | [P01](../phases/2026-10-22-arcade-match-results-skills-and-replay/P01-match-simulation/phase.md) |
| P02 | `done` | Persist replayable stage results and let new/saved campaigns select unlocked stages. | [P02](../phases/2026-10-22-arcade-match-results-skills-and-replay/P02-stage-selection/phase.md) |
| P03 | `done` | Replace generic skill icons with six original illustrations and render each skill's 3D effect. | [P03](../phases/2026-10-22-arcade-match-results-skills-and-replay/P03-skill-arcade-visuals/phase.md) |

## Source Decisions
- [Confirmed decisions](../decisions/2026-10-22-arcade-match-results-skills-and-replay.md)

## Execution Notes
- Preserve the local React/Three.js app, five-stage 4v4 campaign, existing 60-second regulation and 30-second golden-goal rules, pause behavior, field-player-only skill assignment, and existing key mapping.
- Every win, including a replay win, awards one three-card skill choice. Replaying replaces that stage's score and changes current campaign progression to the stage after the replayed stage; previously unlocked stages remain selectable.
- Keep actual goalkeeper saves and defender/pass interception active while improving assistance.
- The existing result and generic skill reward screens are present. Trace the runtime result event handoff and extend the current screens instead of duplicating them.
- Complete phases in order. P01 stabilizes match outcomes; P02 depends on those outcomes to update the selected stage and rewards; P03 uses the existing skill IDs and gameplay state.
