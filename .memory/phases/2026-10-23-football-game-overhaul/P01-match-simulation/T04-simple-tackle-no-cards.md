# Task: T04 Simple Tackles Without Cards

## Status: done

## Goal
Simplify tackle outcomes to direct possession steals without foul stoppages, warnings, or dismissals.

## Decision Summary
- Follow [Simple Tackles Without Cards](../../../../decisions/2026-10-23-simple-tackle-no-cards.md).
- A valid tackle inside the existing range always wins the ball and retains the existing tackle and knockdown feedback.
- Keep the powered tackle range/effect; remove foul severity, card escalation, free-kick/penalty awards from tackle contacts, and the foul HUD notice.

## Implementation

### I01. Replace disciplinary contact handling
- Related Files:
  - `game/src/game/stepGame.js` :: `resolveTackle()`, foul-only helpers, `resetForKickoff()`, `stepGame()` — simplify tackle contact and remove unused disciplinary state; modify.
  - `game/src/game/createInitialGameState.js` :: player and match defaults — remove foul/card fields; modify.
  - `game/src/components/GameScreen.jsx` :: foul notice — remove; modify.
- Details
  - Remove `classifyFoulSeverity()`, `awardFoul()`, and foul-only rear/contact classification from tackle resolution.
  - On valid contact, retain the existing tackle event, ball ownership transfer, knockdown event, power-tackle effect, and contact range.
  - Remove foul/card state preservation across kickoffs and the match foul banner. Keep independent restart handling available.

### I02. Update simulation expectations
- Related Files:
  - `game/src/game/stepGame.test.js` :: replace card/foul tests with tackle-steal cases; modify.
- Details
  - Cover rear slide and powered contact, asserting continued play, no foul/card/dismissal events, and ball ownership by the tackler.
  - Preserve the existing normal tackle and AI tackle assertions.

## Acceptance Criteria
- [x] Valid rear, sliding, and powered tackles do not issue warnings or send players off.
- [x] Valid tackle contact transfers possession to the tackler without pausing for a foul restart.
- [x] Existing tackle/knockdown events and powered tackle effects still work.
- [x] No foul warning banner is shown in the active match HUD.

## Validation
- `cd game; npm test -- src/game/stepGame.test.js` — tackle, possession, knockdown, and restart behavior passes.
- `cd game; npm run build` — active match UI and simulation compile.

## Commit Message
```text
refactor(game): simplify tackles without card penalties

Plan: 2026-10-23-football-game-overhaul
Phase: P01-match-simulation
Task: T04-simple-tackle-no-cards

- Make valid tackles steal the ball directly
- Remove foul cards and tackle stoppages
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `7d349e7`
