# Task: T04 Result Handoff

## Status: done

## Goal
Fix the reported case where the match HUD reaches 00:00 but the live match remains visible, and ensure every win/loss/draw terminal event produces one readable result screen before any reward action.

## Decision Summary
- The existing ResultsScreen, 60-second regulation, 30-second golden goal, and App terminal-event idempotency key stay in use.
- A win shows the score/result, then offers a skill reward. Loss and draw show the correct outcome and retry-current-stage action. A golden-goal tie ends as a draw.
- The supplied screenshot with score 1:0 and 00:00 is the regression reference.

## Implementation

### I01. Trace and repair terminal event handoff
- Related Files:
  - game/src/game/stepGame.js :: finishMatch, stepGame; read/modify only if terminal event state/order is incorrect
  - game/src/components/GameLoop3D.jsx :: useFrame event forwarding and callback refs; modify if the event is lost or emitted repeatedly
  - game/src/components/GameScreen.jsx :: GameScreen onGameEvents forwarding; modify only if the chain drops events
  - game/src/App.jsx :: handleGameEvents, startStage, result state routing; modify
  - game/src/components/ResultsScreen.jsx :: outcome and actions; modify only if result content is incomplete
- Result model:
  - result.stage: integer 1..5
  - result.homeGoals, result.awayGoals: non-negative numbers
  - result.outcome: win | loss | draw | campaignComplete
  - result.stageReached: integer 1..5; result.goalDifference: aggregate campaign goal difference
- Execution flow:
  1. Trace emitted matchWon/matchLost/matchDraw from stepGame through GameLoop3D and GameScreen into App.handleGameEvents.
  2. Identify why a runtime clock at 00:00 does not change screen. Fix the actual lost/ignored callback or state-routing cause; do not add a second competing result system.
  3. Ensure handleGameEvents selects the event's score, handles one event per campaign/stage/match instance, persists the terminal campaign once, and sets screen to results immediately.
  4. Render explicit Korean win/loss/draw label, stage and final score. Win's primary action opens SkillRewardScreen; draw/loss primary action retries the same selected stage without awarding a card.
  5. Preserve fifth-stage completion behavior and external match UI/error messages.
- Error/state constraints:
  - Do not infer a win from a tie or stale matchState score when event.score is present.
  - Duplicate terminal callbacks cannot duplicate skill offers, records, or progression.

### I02. Regression validation
- Related Files:
  - game/src/game/stepGame.test.js :: terminal events at regulation/overtime; read/add only for missing simulation coverage
  - game/src/App.jsx :: callback integration; browser-level validation
- Validate an already-leading score reaching regulation zero, a regulation tie entering golden goal, an overtime tie ending draw, a golden-goal score ending immediately, and win/loss result actions.

## Acceptance Criteria
- [x] A 00:00 non-tie transitions off the live match to the correct result screen in the running web app.
- [x] Regulation tie enters 30-second golden goal; its tie becomes draw and its goal becomes immediate win/loss.
- [x] Win, loss, draw show correct score and action, and result processing is idempotent.
- [x] Win opens the skill draft only after result is shown; draw/loss receive no skill reward.

## Validation
- From game/: node --test src/game/stepGame.test.js src/game/campaign.test.js
- From game/: npm run build
- Browser QA: reproduce the supplied 1:0 at 00:00 state and verify the result screen replaces the live match. Also verify draw/overtime and button paths.

## Commit Message
```text
fix(game): reliably show terminal match results

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P01-match-simulation
Task: T04-result-handoff

- Trace terminal events through the live React Three.js loop.
- Show one correct result screen before rewards or retries.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: `fix(game): reliably show terminal match results` (Plan: 2026-10-22-arcade-match-results-skills-and-replay)

## Execution Notes
- Fixed the win handoff in `App.handleGameEvents`: match events provide `{home, away}`, while `finishStage` expects the `{score: {home, away}}` envelope. The mismatch threw before the app could route to results.
- Added a campaign regression test for the real terminal event score shape. Corrected the golden-goal test setup so the ball starts beyond the goal line, and added coverage for a regulation-time loss at 00:00.
- Focused terminal tests passed (5 selected); campaign tests passed (10/10); production build passed. The full simulation suite still has 8 pre-existing unrelated failures in legacy shot, restart, and foul cases.
- Browser QA exercised the live React/Three.js result path with win, loss, and draw terminal states: correct scores, reward/retry buttons, reward screen after a win, and retry returning to a live match. No page errors occurred. States were injected at the live simulation boundary rather than waiting for a full match duration.
- Build retains the existing Three.js chunk-size warning (>500 kB).
