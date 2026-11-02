# Task: T01 Aim and Select Teammate

## Status: done

## Goal
Make the opening human kickoff pass reach an active teammate and allow directional input to aim the taker without moving players during the kickoff lock.

## Decision Summary
- Update only the taker's facing from directional input while locked; pressing S passes to a facing teammate or falls back to the nearest eligible field teammate.
- Preserve the kickoff lock, non-kicker freeze, half-line restriction, and ball-clear release condition.

## Implementation

### I01. Kickoff aim and safe teammate selection
- Related Files:
  - `game/src/game/stepGame.js` :: `advanceLockedKickoff`, `chooseReceiver`, `releasePass` — modify.
  - `game/src/game/stepGame.test.js` :: opening kickoff aiming and fallback receiver coverage — modify.
- Details
  - In `advanceLockedKickoff`, after `takerInput` is chosen and before checking S, if either `moveX` or `moveY` is nonzero, normalize the direction with the existing `unit` helper and write only `taker.facingX` / `taker.facingY`. Do not call `moveByInput` or alter player coordinates.
  - When a human taker presses S, first get the normal forward-only teammate from `chooseReceiver(state, taker, 'groundPass')`. If that is null, select `nearestPlayer(getTeammates(state, taker).filter((candidate) => candidate.role !== 'goalkeeper'), taker)` and pass it to `releasePass` as `receiverOverride`.
  - `getTeammates`, `nearestPlayer`, `chooseReceiver`, and `releasePass` are existing function declarations in `stepGame.js`. Function declaration hoisting permits the fallback in `advanceLockedKickoff`; do not duplicate receiver selection logic or include opponents.
  - Keep AI kickoffs automatic. Keep home user and PvP human takers using their team input. The fallback is only needed when the aimed direction has no eligible teammate.
  - Tests must cover: default opening direction has no forward teammate but S selects the nearest active field teammate; an aim input turns the taker without moving any player and S passes in the new direction; kickoff lock still releases only after the pass is taken and ball moves clear; teammates and receiver stay on the taker's team.

## Acceptance Criteria
- [x] Pressing S at the opening kickoff sends the ball to a teammate instead of into the opponent's half.
- [x] A directional input can aim the kickoff pass without moving the taker or other players before S.
- [x] Existing kickoff freeze, half-line lock and post-goal AI kickoff behavior remain intact.
- [x] The selected receiver is an active field teammate, never an opponent or goalkeeper.

## Validation
- `cd game; npm test -- src/game/stepGame.test.js` — kickoff receiver, aiming, freeze and lock-release cases pass.
- `cd game; npm run build` — game input and simulation changes compile.

## Commit Message
```text
fix(game): allow opening kickoff passes to teammates

Plan: 2026-11-02-opening-kickoff-teammate-pass
Phase: P01-kickoff-pass
Task: T01-aim-and-select-teammate

- Let directional input aim the locked kickoff taker without moving them
- Fall back to a nearby teammate when no forward receiver is available
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`node --test --test-name-pattern=kickoff src/game/stepGame.test.js`; `npm run build`)
- commit: pending
