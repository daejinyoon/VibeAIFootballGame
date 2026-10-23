# Plan: Remaining Skill 3D VFX

## Goal
Bring the five non-Eagle skills up to the same readable, characterful 3D presentation as Eagle Shot. Each preview URL must visibly activate its skill. Preserve confirmed mechanics, level scaling, existing match camera, and simulation authority.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Make every skill preview reliably activate, then replace generic-looking portions of the other five skill effects with distinct 3D forms and motion. | [P01](../phases/2026-10-23-remaining-skill-3d-vfx/P01-remaining-skill-effects/phase.md) |

## Confirmed Decisions
- Build a dedicated 3D subject and distinctive motion for Tornado Shot, World Split, Eulryongta, Vacuum Cleaner, and Rainbow Reflect.
- Preserve existing skill simulation behavior and camera framing. Visual components read live game state and do not decide collisions, status, score, ball ownership, or duration.
- Preview URLs use `?skillPreview=<skillId>` and must arrange valid activation conditions such as a target or an active status.
- Focus on in-match 3D visuals and preview setup. Do not redesign the loadout, HUD, mechanics, or card art.

## Completion Criteria
- [ ] Each non-Eagle skill has a distinctive 3D form with its own visible motion, while its ordinary activation and resolution remain simulation-driven.
- [ ] All six skill preview URLs initialize the appropriate activation conditions and visibly play their effect.
- [ ] Tornado follows the moving ball; World Split remains aligned to the slide and barrier; Eulryongta stars track the downed target; Vacuum's visible pull reaches the user; Rainbow's reflected cue travels to the last caster.
- [ ] Existing skill camera framing, level behavior, gameplay durations, score, collision, and status transfer remain unchanged.

## Validation Strategy
- `cd game; npm run build` compiles all integrated 3D effect components.
- Manually open `http://127.0.0.1:4173/?skillPreview=<skillId>` for `tornadoShot`, `powerTackle`, `eulryongta`, `vacuumCleaner`, and `rainbowReflect`; verify the skill starts, its signature form is visible, and its effect follows the live state.
- Open the Eagle Shot preview to check that integration did not regress the existing dedicated eagle model.
