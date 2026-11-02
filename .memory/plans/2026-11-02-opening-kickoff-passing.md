# Plan: Opening Kickoff Teammate Pass

## Goal
Let the user aim the opening kickoff toward an active teammate and ensure pressing S always passes to an eligible teammate when no teammate lies ahead, rather than sending an uncontrolled ball toward the opponent.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Add kickoff-only aiming and a nearest-teammate fallback | [P01](../phases/2026-11-02-opening-kickoff-teammate-pass/P01-kickoff-pass/P01-kickoff-pass.md) |

## Dependencies and Constraints
- Decisions: `.memory/decisions/2026-11-02-opening-kickoff-passing.md`.
- Keep the opening and post-goal kickoff freeze and lock-release timing unchanged.
- Do not let directional aiming move the taker or any other player before S.
- Teammate passes may select only active field players from the taker's team.
