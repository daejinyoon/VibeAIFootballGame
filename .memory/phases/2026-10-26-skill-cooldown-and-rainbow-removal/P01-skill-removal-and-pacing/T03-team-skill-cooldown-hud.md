# Task: T03 Team Skill Cooldown HUD

## Status: done

## Goal
Show the remaining shared skill cooldown for both teams in the match HUD so players can tell why their team's next skill is temporarily unavailable.

## Decision Summary
- Show the home and away teams' independent shared cooldowns in their existing skill HUD sections.
- Display a concise one-decimal countdown while the timer is above zero; omit the shared-cooldown message when ready.

## Implementation

### I01. Display shared cooldown countdowns for both teams
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen`, skill deck status rendering; modify

#### Details
- **Signatures & Types**:
  ```jsx
  GameScreen({ gameState, paused, errorMessage, onPause, onResume, onSaveAndExit, onGameEvents }) -> JSX.Element
  // Input: gameState.teamSkillGlobalCooldownRemaining?: { home?: number, away?: number }
  ```
- **Data & Schema Fields**:
  - Read the runtime `viewState.teamSkillGlobalCooldownRemaining.home` and `.away` numeric seconds introduced by T02.
  - No persistent fields, callbacks, screen states, or new dependencies.
- **Execution Flow / Logic**:
  1. Add a local helper in `GameScreen` that reads the selected team's global timer, treats missing/non-finite values as `0`, and clamps negative values to `0`.
  2. In the existing home skill section, show `팀 공통 대기 {seconds.toFixed(1)}초` while the home timer is greater than `0`.
  3. In the existing away skill section, show the equivalent `상대 팀 공통 대기 {seconds.toFixed(1)}초` while the away timer is greater than `0`.
  4. When a timer reaches `0`, remove its shared-cooldown message and retain the existing per-skill readiness/cooldown labels and next-skill text.
  5. Do not disable or reorder skill cards in the HUD; activation gating remains in the simulation from T02.
  6. Use the existing `viewState` snapshot so the display follows the simulation's timer updates; avoid adding a separate timer or state store.
- **Error & Exception Handling**: Missing timer fields from an older in-memory state display as ready (`0`) and never render `NaN` or a negative countdown.
- **State Transition & Return**: Presentation-only. It reads the two runtime timers and does not mutate game or campaign state.

### I02. Verify cooldown HUD and integration
- Related Files:
  - `game/src/components/GameScreen.jsx` :: home and away skill HUD; modify
  - No UI test harness currently exists under `game/src`; use the production build and simulation tests from T02 for integrated validation.
#### Details
- Review both HUD sections at cooldown `3`, a fractional remainder such as `2.4`, `0`, and a missing timer value.
- Confirm each team's label reads only its own timer and existing individual skill cooldown text remains available.
- Do not add a UI testing dependency or browser harness as part of this task.

## Acceptance Criteria
- [x] Home and away each show their own one-decimal shared cooldown while it is active.
- [x] The shared message disappears at zero; missing timer values render as ready.
- [x] Existing per-skill cooldown and next-skill labels remain intact.

## Validation
- `npm test -- --test-name-pattern="team global cooldown"` from `game/` — simulation cooldown regressions still pass.
- `npm test` from `game/` — full suite passes.
- `npm run build` from `game/` — production UI build succeeds.

## Commit Message
```text
feat(ui): show team skill cooldown countdown

Plan: 2026-10-26-skill-cooldown-and-rainbow-removal
Phase: P01-skill-removal-and-pacing
Task: T03-team-skill-cooldown-hud

- Display each team's shared skill wait time
- Keep existing per-skill cooldown indicators
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm test -- --test-name-pattern="team global cooldown"`, `npm test`, `npm run build`)
- commit: pending
