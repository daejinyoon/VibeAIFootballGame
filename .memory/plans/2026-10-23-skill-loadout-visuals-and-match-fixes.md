# Plan: Skill Loadout, Visuals, and Match Fixes

## Goal
Resolve the saved home-kit mismatch and make skill ownership, activation, cooldowns, and visuals match the confirmed rules. A campaign stores all acquired skills in an unlimited inventory, equips at most three in an ordered shared deck, gives each equipped skill its own 10-second cooldown, and treats Rainbow Reflect as an active status-transfer skill. Ball skills receive clear themed visuals, cut-ins display for every activation by either team, and ordinary in-match clock time remains preserved.

## Confirmed Timer Finding
The reported reset occurs when moving to another round or starting a rematch. `App.jsx::startStage` creates a fresh game state through `makeMatchState`, and `createInitialGameState` initializes regulation time to 60 seconds. This is the chosen behavior. `stepGame.js::resetForKickoff` explicitly preserves remaining time, and existing step-game coverage checks the kickoff boundary. No separate timer implementation task is planned unless another reset path is found while executing the gameplay task.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Separate campaign skill ownership from the three ordered match slots, update save migration and loadout/reward flows, and implement active ordered skill rules. | [P01](../phases/2026-10-23-skill-loadout-visuals-and-match-fixes/P01-skill-data-and-runtime/phase.md) |
| P02 | `done` | Make ball-skill travel and reflection effects legible, then ensure every skill activation receives its cut-in. | [P02](../phases/2026-10-23-skill-loadout-visuals-and-match-fixes/P02-skill-presentation/phase.md) |
| P03 | `in_progress` | Trace saved team branding through the final 3D player material and fix the in-match kit mismatch. | [P03](../phases/2026-10-23-skill-loadout-visuals-and-match-fixes/P03-kit-render-fix/phase.md) |

## Scope Notes
- Preserve the already-confirmed Eagle Shot, Tornado Shot, World Split, and Eulryongta gameplay rules, including their level scaling, collisions, scoring, duration, and audio.
- Newly selected reward skills enter the inventory. Equipping and ordering happen in the loadout screen; duplicate rewards require explicit level-up confirmation.
- Round transition and rematch timer resets to 60 seconds are intentional. The timer must still remain continuous within a match.
- Do not change the nine home palettes, four logo options, opponent color contrast, or stage 5 black kit while diagnosing the mesh/material mismatch.

## Completion Criteria
- [ ] Existing saves migrate without losing owned skills, levels, or progression; at most three unique skills are equipped in order.
- [ ] F uses the next ready, valid skill in the equipped order. Each skill has an independent 10-second cooldown. Rainbow Reflect only activates when it can transfer a negative status.
- [ ] Eagle, Tornado, and Vacuum visuals read clearly and the ordinary ball appearance returns after skill effects.
- [ ] Both teams' skill cut-ins display for every activation in every round.
- [ ] The saved home palette and logo appear on in-match 3D players; opponent stage kits remain distinct and stage 5 remains black.
- [ ] New rounds/replays start at 60 seconds, while goals and kickoffs do not reset the active match clock.
