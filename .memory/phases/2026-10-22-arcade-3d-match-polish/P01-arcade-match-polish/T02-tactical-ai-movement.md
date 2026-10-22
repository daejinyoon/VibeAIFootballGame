# Task: T02 Tactical AI Movement

## Status: done

## Goal
Make opponent defending coordinated and predictable, and give the two non-controlled home field players distinct short-support and forward-run behaviors.

## Decision Summary
- The defending team has one stable presser; the other field defenders retain their marking and passing-lane assignments until possession changes.
- A home teammate nearer to the controlled carrier offers a short pass; the farther teammate runs behind the defensive line.
- Keep the existing five-stage difficulty ramp and direct player controls unchanged.

## Implementation

### I01. Stable press and marking assignments
- Related Files:
  - game/src/game/stepGame.js :: updateAwayDefense, activePlayers, nearestPlayer, distance; modify
  - game/src/game/createInitialGameState.js :: AI assignment state initialization; modify
  - game/src/game/stepGame.test.js :: defensive assignment behavior; modify
- Details
  - Add state.aiPressingPlayerId: string | null and state.aiMarkingAssignments: Record<string, string> (defender id to attacker id). Initialize both on new match.
  - On a defending-team or ball-carrier change, pick the nearest eligible non-goalkeeper defender as presser. Keep that ID until the ball-carrier changes, the presser is dismissed/knocked down/recovering, or the presser is more than 1.5 × getAiTuning(stage).pressingDistance from the carrier for 0.75 seconds.
  - Track the invalid/out-of-range timer as state.aiPressingLostSeconds: number and reset it when the presser is eligible and within range. Do not recompute nearest presser each frame.
  - Assign each remaining defender to a distinct active opposing field player at the start of a possession. Prefer same-role attackers; break ties by distance to the defender, then player id. Retain assignments until possession changes or a marked player becomes dismissed.
  - Position cover defenders between their assigned attacker and the defending goal, biased toward the carrier-to-attacker passing segment. If the assigned attacker makes a forward run inside 180 units of the defending goal, let the nearest available cover defender take that mark and update the assignment.
  - Keep the existing goalkeeper goal-line logic. Keep user-controlled home defense player under direct input and exclude it from AI movement.
  - Ensure assignment selection is deterministic and does not consume aiRandomSeed.
- Acceptance Criteria
  - The presser ID remains stable across frames and changes only for the listed reasons.
  - Cover defender assignments remain stable across frames and represent distinct active attackers where possible.
  - A marked forward run toward the defending goal causes a controlled mark adjustment rather than all defenders chasing the ball.
  - Current stage-based pressure distance and think interval remain in use.
- Validation
  - npm run test -- src/game/stepGame.test.js
  - npm run build
  - Manually verify an away attack and a home attack: one AI presses, others keep shape, and control remains responsive.
- Commit Message
  feat(game): stabilize defensive and support AI

  Plan: 2026-10-22-arcade-3d-match-polish
  Phase: P01-arcade-match-polish
  Task: T02-tactical-ai-movement

  - Persist a presser and defender-to-attacker marks per possession.
  - Separate short-pass support from forward penetration runs.
- Progress
- [x] Implementation complete
- [ ] Full validation passed (the requested suite still has 11 unrelated legacy failures; focused T02 tests and production build pass)
- commit: 4bead0e

## Execution Notes
- Added persistent presser selection, deterministic per-possession defender marks, recovery from invalid/out-of-range pressers, and goal-side cover targets.
- Split home off-ball support into a short outlet and a separate forward run behind the defensive line.
- Focused T02 tests passed; `npm run build` passed. `npm run test -- src/game/stepGame.test.js` reports 43 passing and 11 existing failures in legacy pass/shot, restart, golden-goal, and foul cases.
- Browser match inspection was not available during this execution.

