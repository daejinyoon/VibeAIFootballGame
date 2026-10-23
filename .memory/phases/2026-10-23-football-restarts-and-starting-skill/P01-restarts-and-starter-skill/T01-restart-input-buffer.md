# Task: T01 Restart Input Buffer

## Status: pending

## Goal

Ensure home throw-ins, corner kicks, and goal kicks cannot appear stuck when the correct action is pressed during the restart's 0.35-second setup period.

## Decision Summary

- Preserve soccer-style restart types and current team award rules.
- Queue the first valid home action pressed during setup; execute it after `readySeconds` reaches zero.
- Away AI restarts remain automatic.

## Implementation

### I01. Queue early restart actions

- Related Files:
  - `game/src/game/stepGame.js` :: `advanceManualRestart`, `releaseRestart`, and restart object created in `beginManualRestart`; modify.
  - `game/src/game/stepGame.test.js` :: manual restart tests; modify.

#### Details

- Restart object fields:
  - `type`: `'throwIn' | 'cornerKick' | 'goalKick'`.
  - `team`: `'home' | 'away'`.
  - `takerId`: selected restart player ID.
  - `spot`: existing `{ x: number, y: number }` restart coordinate.
  - `readySeconds`: existing number countdown, initialized to `0.35`.
  - `queuedAction`: optional one of `'throwIn' | 'cornerCross' | 'shortPass' | 'longKick'`.
- In `advanceManualRestart`, map valid `input.pressed` keys before the `readySeconds > 0` return:
  - throw-in: S -> `throwIn`.
  - corner kick: A -> `cornerCross`; S -> `shortPass`.
  - goal kick: A -> `longKick`; S -> `shortPass`.
- Preserve the first valid queued action (`queuedAction ??= mappedAction`) so repeated frames or later keys cannot replace a committed early choice.
- Keep updating taker facing from nonzero direction input while the restart is waiting.
- After decrementing readiness, if away, use the existing `launchAutomaticRestart` path and ignore queued home actions.
- For home, once ready, execute the queued action through `releaseRestart`. If none is queued, retain current behavior and wait for a fresh valid key press.
- Clear restart state through the existing `releaseRestart` transition; do not change ball collision, boundary decisions, awards, scores, or clock behavior.

### I02. Verify restart input behavior

- Related Files:
  - `game/src/game/stepGame.test.js` :: restart regression coverage; modify.
  - `game/src/components/GameScreen.jsx` :: `restartControls` text; modify.

#### Details

- For each restart type, set up a home restart with positive `readySeconds`, press a valid action, and assert the restart remains in its setup phase until ready.
- Advance beyond readiness with no new press and assert one `restartTaken` event, `restart === null`, and play resumes.
- Assert invalid keys do not queue an action.
- Assert pressing different valid actions after the first queued action does not replace it.
- Assert away-team restarts still auto-launch after readiness.
- Add a concise UI hint that the correct restart key may be pressed during setup.

## Acceptance Criteria

- [x] Valid home restart keys pressed early execute after the setup delay without needing a second press.
- [x] Existing restart type, taker, award, and AI behavior remains correct.
- [x] Restart UI explains that the key can be pressed during setup.

## Validation

- `npm test` from `game` — all simulation regressions pass.
- `npm run build` from `game` — app compiles.

## Commit Message

```text
fix(match): buffer early restart inputs

Plan: 2026-10-23-football-restarts-and-starting-skill
Phase: P01-restarts-and-starter-skill
Task: T01-restart-input-buffer

- Queue valid restart actions while the setup timer runs
- Preserve automatic away-team restarts
```

## Progress

- [x] Implementation complete
- [x] Validation passed (`npm test`, `npm run build`)
- commit: pending
