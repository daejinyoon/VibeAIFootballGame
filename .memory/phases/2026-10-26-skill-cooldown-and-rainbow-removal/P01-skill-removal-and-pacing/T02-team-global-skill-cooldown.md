# Task: T02 Team Global Skill Cooldown

## Status: done

## Goal
Prevent a team from chaining different skills after rapid input by enforcing a three-second shared cooldown for that team after each successful activation. Keep home and away timers independent and retain all per-skill cooldowns.

## Decision Summary
- A successful activation starts a three-second cooldown shared by every skill on the activating team.
- A failed activation does not start or extend the shared cooldown.
- Home and away cooldowns are independent, and the existing individual skill cooldown remains active.

## Implementation

### I01. Add shared per-team cooldown state and gate activations
- Related Files:
  - `game/src/game/constants.js` :: skill cooldown constants; modify
  - `game/src/game/createInitialGameState.js` :: initial match skill state; modify
  - `game/src/game/skills.js` :: `activateNextTeamSkill`; modify
  - `game/src/game/stepGame.js` :: `stepGame`, `resetForKickoff`; modify
  - `game/src/game/createInitialGameState.test.js` :: initial skill cooldown state; modify
  - `game/src/game/skills.test.js` :: ordered skill and cooldown behavior; modify
  - `game/src/game/stepGame.test.js` :: rapid F-key and kickoff preservation cases; modify

#### Details
- **Signatures & Types**:
  ```js
  export const TEAM_SKILL_GLOBAL_COOLDOWN_SECONDS = 3;
  createInitialGameState(options) -> GameState
  activateNextTeamSkill(state, team, sourcePlayerId) -> SkillAttempt
  stepGame(state, inputFrame, deltaSeconds) -> GameEvent[]
  ```
- **Data & Schema Fields**:
  - Add runtime-only `state.teamSkillGlobalCooldownRemaining: { home: number, away: number }`, initialized to `{ home: 0, away: 0 }`.
  - Do not change saved campaign/profile schema. Keep `state.skillCooldownRemaining[team][skillId]` unchanged.
- **Execution Flow / Logic**:
  1. Export `TEAM_SKILL_GLOBAL_COOLDOWN_SECONDS` with value `3` from `constants.js`.
  2. Initialize each team's shared timer at `0` in `createInitialGameState`.
  3. In `activateNextTeamSkill`, return a failed result with reason `teamCooldown` before scanning the deck if that team's shared timer is greater than `0`. Do not advance `skillQueueIndex` or mutate per-skill cooldowns on this failure.
  4. Preserve existing deck order, eligibility checks, and per-skill cooldown checks. Only after `applySkill` succeeds, advance the queue, set the individual skill cooldown as today, and set the casting team's shared timer to exactly `TEAM_SKILL_GLOBAL_COOLDOWN_SECONDS`.
  5. If every skill fails its ordinary requirements, return the existing `noUsableSkill` result and leave the shared timer unchanged.
  6. Decrease both timers by clamped simulation `dt` in `stepGame`, next to the existing per-skill cooldown decrement, clamping each at `0`.
  7. Preserve the current shared timer in `resetForKickoff` just as the existing per-skill cooldowns are preserved. A new match created by `createInitialGameState` starts both at zero.
  8. Both the home F-key path and away `maybeUseAiSkill` already call `activateNextTeamSkill`; keep these call paths unchanged so both teams use the same gate.
- **Error & Exception Handling**:
  - A timer missing on older in-memory test states is treated as `0`.
  - Unknown teams do not gain a timer entry; normal supported teams are `home` and `away`.
  - Invalid skill attempts, no-ball shots, missing Eulryongta targets, and empty decks never start the shared timer.
- **State Transition & Return**: On successful activation only, set the casting team's shared timer to `3`, preserve the opponent team's timer, and preserve the existing per-skill cooldown and queue transition.

### I02. Regression coverage for activation pacing
- Related Files:
  - `game/src/game/skills.test.js` :: ordered activation and skill cooldown tests; modify
  - `game/src/game/stepGame.test.js` :: controlled F-key and team independence tests; modify
#### Details
- Assert that a successful skill blocks a different skill from the same team immediately and that the activation queue does not advance while blocked.
- Assert the timer counts down to zero and skills become usable again at the end of three seconds.
- Assert a failed skill requirement does not start the shared cooldown.
- Assert a home cooldown does not block away activation and an away cooldown does not block home activation.
- Assert rapid distinct F-key presses cannot trigger another skill during the three-second interval, while ordinary per-skill cooldown values still update on successful casts.
- Assert goal kickoff preserves both team timers consistently with existing per-skill cooldown behavior.

## Acceptance Criteria
- [x] Successful skill activation starts exactly three seconds of cooldown for that team.
- [x] No skill from the same team activates during its shared cooldown; the other team remains independent.
- [x] Failed attempts do not start or extend the timer; existing per-skill cooldown behavior remains intact.

## Validation
- `npm test -- --test-name-pattern="team global cooldown"` from `game/` — focused activation pacing tests pass.
- `npm test` from `game/` — full suite passes.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
feat(skills): add team-wide three-second cooldown

Plan: 2026-10-26-skill-cooldown-and-rainbow-removal
Phase: P01-skill-removal-and-pacing
Task: T02-team-global-skill-cooldown

- Gate each team's skill deck after successful casts
- Keep cooldown timers independent between teams
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm test -- --test-name-pattern="team global cooldown"`, `npm test`, `npm run build`)
- commit: pending
