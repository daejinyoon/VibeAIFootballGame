# Task: T04 Match Result Progression

## Status: done

## Goal
Ensure every finished match visibly shows the correct result, then route a win to the stage reward and next-stage setup, while loss and draw retry the same stage without receiving a clear reward.

## Decision Summary
- Result display must precede reward claiming.
- A win proceeds to the existing three-card skill offer, player assignment/keep choice, loadout, and next stage. Loss and draw preserve campaign inventory and retry the current stage.
- The fifth-stage win shows campaign completion and does not advance to a nonexistent sixth stage.

## Implementation

### I01. Match end event delivery and result rendering
- Related Files:
  - game/src/components/GameLoop3D.jsx :: useFrame event callback; inspect and modify only if end events are lost or duplicated
  - game/src/components/GameScreen.jsx :: GameScreen and onGameEvents forwarding; modify only if needed
  - game/src/App.jsx :: handleGameEvents, startStage, ResultsScreen routing; modify
  - game/src/components/ResultsScreen.jsx :: outcome labels and actions; modify
  - game/src/game/campaign.js :: finishStage; read-only unless a confirmed transition bug requires a focused fix
- Details
  - Trace the existing event chain: stepGame emits matchWon/matchLost/matchDraw; GameLoop3D forwards those events; GameScreen forwards the callback; App handles campaign persistence and sets screen to results.
  - Add an idempotency guard keyed to the active match instance/stage so the same terminal event cannot finish/save a campaign twice.
  - Store result fields stage, homeGoals, awayGoals, outcome (win | loss | draw | campaignComplete), stageReached, and goalDifference. Treat matchDraw as an actual draw, never as win.
  - ResultsScreen must render explicit Korean stage, final score, and win/loss/draw labels. A win uses a clear reward button; loss and draw use a retry-current-stage button. A draw must not award cards or start a new campaign.
  - On a regular-stage win, the reward button opens the existing SkillRewardScreen. Choosing one of the three offered cards and assigning/keeping it continues to LoadoutScreen, and confirming loadout starts campaign.currentStage. On stage five, after reward assignment/keep, show campaign completion and clear the saved active campaign only after the player leaves the completion screen.
  - Preserve campaign save, best-record update, skill inventory, skill stacks, and current retry behavior.
- Acceptance Criteria
  - Regulation-time and golden-goal terminal events always produce one visible results screen.
  - Win, loss, and draw have correct labels, score, action, and campaign effect.
  - Win path order is result → skill reward → assignment/keep → loadout → next stage; stage five ends in campaign completion.
  - Loss/draw path allows retry of the same stage and grants no stage-clear reward.
  - Repeated terminal callbacks do not double-award or double-advance.
- Validation
  - npm run test -- src/game/campaign.test.js src/game/stepGame.test.js
  - npm run build
  - Manually play or simulate win, loss, regulation draw, and golden-goal draw; verify screen order and persistence.
- Commit Message
  fix(game): show match results before campaign rewards

  Plan: 2026-10-22-arcade-3d-match-polish
  Phase: P01-arcade-match-polish
  Task: T04-match-result-progression

  - Handle terminal events once and display explicit match outcomes.
  - Route wins to rewards and draws/losses back to the same stage.
- Progress
- [x] Implementation complete
- [x] Production build passed; campaign tests passed
- [ ] Full requested test run passed (11 known failures remain in legacy stepGame cases)
- [ ] Manual end-to-end win/loss/draw flow inspected (no local browser executable is available)
- commit: 1148a89

## Execution Notes
- Added a terminal-event idempotency key for each campaign stage and match instance.
- Only wins call `finishStage`; draw and loss results preserve campaign state and retry the same stage.
- Reworked the result screen to label win, loss, draw, and campaign completion explicitly. Draw/loss show a retry action, and neither offers a stage reward.
- The final campaign save is cleared when leaving the stage-five completion result.
- `npm run build` passed and all 9 campaign tests passed. The requested combined campaign/stepGame suite reports 52 passing and 11 existing legacy stepGame failures. Browser end-to-end inspection was unavailable.

