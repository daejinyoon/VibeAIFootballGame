# Plan: RKO Contact Face-Up

## Goal
Keep the RKO finisher upright during approach, then turn them face-up exactly when they overlap the target and maintain that orientation through landing.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Set face-up transition at target contact and verify timing | [P01](../phases/2026-11-02-rko-contact-face-up/P01-contact-pose/phase.md) |

## Dependencies and Constraints
- Decisions: `.memory/decisions/2026-11-02-rko-contact-face-up.md`.
- Contact occurs at choreography time 1.2 seconds in the existing finisher approach branch.
- Preserve the finisher's existing forward landing, impact, and recovery movement.
- Do not alter target, striker, camera, or non-RKO poses.
