# Task: T02 Freeze Until Kickoff

## Status: done

## Goal
Keep all non-dismissed players at their arranged kickoff positions until the kickoff taker actually kicks, on both opening and post-goal kickoffs.

## Decision Summary
- Home kickoff starts only from user S; away kickoff starts from the existing automatic AI kick.
- Dribbling away from center cannot unlock play. Half-line and circle restrictions last until the kick moves clear.

## Implementation

### I01. Kickoff lock transition and movement gating
- Related Files:
  - `game/src/game/stepGame.js` :: `stepGame`, `releaseKickoffLockIfBallCleared`, `enforceKickoffCircle`, home/away control flow — modify.
  - `game/src/game/stepGame.test.js` :: opening and post-goal kickoff cases — modify.
- Details
  - **Signatures & Types**:
    ```js
    export function stepGame(state: GameState, inputFrame?: InputFrame, deltaSeconds?: number, options?: StepOptions): GameEvent[];
    function releaseKickoffLockIfBallCleared(state: GameState): void;
    function enforceKickoffCircle(state: GameState): void;
    ```
  - **Data & Schema Fields**: Keep existing `kickoffLocked`, `kickoffTakerId`, `ball.ownerId`, ball velocity/flight state, and `hasMatchClockStarted`; add no profile fields.
  - **Execution Flow / Logic**:
    1. Gate regular movement and AI steering while `kickoffLocked`: no controlled-player movement, support-player movement, defensive chase, tackle, keeper reposition, or loose-ball chase for non-kickers.
    2. Home taker remains centered and can execute only the current S kickoff pass/kick action. Directional input alone must not move any player or start play.
    3. Away taker remains centered until its existing AI kickoff decision takes the automatic kick. Allow the kickoff action, freeze everyone else throughout, and require no user key.
    4. Delete the `takerCarriedClear` unlock shortcut from `releaseKickoffLockIfBallCleared`. Unlock only when an actual kick/possession release has occurred and the ball has left the existing center-clearance radius; clear `kickoffTakerId` in the same transition.
    5. Keep own-half and kickoff-circle enforcement active throughout the lock. Release both after the ball has been kicked and moved clear.
    6. Preserve kickoff events, receiver selection, clock-start rules, and away AI kickoff action.
  - **Regression Scenarios**:
    - Fresh kickoff: idle and directional-input frames keep every player fixed and clock stopped.
    - Home S: kick occurs; lock remains until ball leaves center radius.
    - Away: deterministic empty-input steps allow AI kick; no teammate/opponent moves before kick and lock clears only after ball clears.
    - Repeat after a goal for both kickoff teams; no player crosses half-line early.

### I02. Engine regression cases
- Related Files:
  - `game/src/game/stepGame.test.js` :: existing tests near `kickoff circle keeps non-kickers outside`, `kickoff lock holds non-kickers wholly in their own half`, and post-goal kickoff — modify.
- Details
  - Replace old directional-input-unlocks-lock assertion with S-kick assertion.
  - Snapshot every player's x/y across idle and directional input; allow movement only for an actual away AI taker kick action.
  - Assert carrying the ball a short distance cannot clear the lock; actual ball play plus center clearance does.

## Acceptance Criteria
- [ ] No player drifts from kickoff formation before the kick.
- [ ] Home S and away AI each start kickoff through their respective existing paths.
- [ ] Half-line and circle restrictions release only after actual kick and ball clearance.
- [ ] Opening and post-goal score, clock, and kickoff events remain correct.

## Validation
- `cd game; npm test -- src/game/stepGame.test.js` — all kickoff tests pass, including home and away cases.

## Commit Message
```text
fix(game): hold players until kickoff is played

Plan: 2026-11-02-customization-ceremony-preview-fixes
Phase: P01-customization-and-match-fixes
Task: T02-freeze-until-kickoff

- Freeze players in kickoff formation until the actual home or AI kick
- Release half-line and center-circle restrictions only after the ball clears
```

## Progress
- [x] Implementation complete
- [x] Kickoff behavior validation passed; full suite retains the two previously recorded unrelated failures
- commit: pending
