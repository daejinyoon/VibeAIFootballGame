# Task: T01 Gate Skills Before the Match Clock

## Status: done

## Goal
Keep both the away AI and player-controlled home team from activating any team skill during the opening kickoff while the 60-second clock has not started, so the match can start normally.

## Decision Summary
- Apply D01: both away AI attempts and player-controlled home skill activation are allowed only when `state.hasMatchClockStarted === true`.

## Implementation

### I01. Gate home input and away AI skill attempts
- Related Files:
  - `game/src/game/stepGame.js` :: `maybeUseAiSkill`, `stepGame` — block both away AI and home input activation before the opening clock starts; modify

#### Details
- **Signatures & Types**:
  ```js
  function maybeUseAiSkill(state, team, events) // team: 'home' | 'away'; mutates state and appends successful skill events
  export function stepGame(state, inputFrame = {}, deltaSeconds = 0) // processes home F input and away AI skill attempts
  ```
- **Data & Schema Fields**:
  - `state.hasMatchClockStarted`: boolean, initialized false and set true when the opening kickoff taker kicks the ball.
  - Preserve `teamSkillDecks`, cooldowns, actor selection, and successful activation behavior after the opening clock starts.
- **Execution Flow / Logic**:
  1. Before calling `activateNextTeamSkill` for the player-controlled home `F` input, require `state.hasMatchClockStarted === true`.
  2. Before selecting an away actor or calling `activateNextTeamSkill`, return when `!state.hasMatchClockStarted`.
  3. Once the clock has started, continue both current activation flows unchanged.
  4. Do not block later kickoffs; the clock remains started after a goal restart.

### I02. Add both-team opening-kickoff regression coverage
- Related Files:
  - `game/src/game/stepGame.test.js` :: opening kickoff, player input, and AI skill tests — verify both-team suppression before clock start and activation after start; modify

#### Details
- Create legal pre-kickoff skill setups for both sides: an away Eulryongta caster with a valid home target, and a home skill activation setup using the controlled player and `F` input.
- Before `hasMatchClockStarted`, step the game and assert neither side emits `skillUsed`, the Eulryongta target is not knocked down, the home skill's gameplay state is unchanged, and `remainingSeconds === 60`.
- Set `hasMatchClockStarted = true`, repeat each activation setup, and assert both the away AI and home input can use their valid skills.
- Keep the existing test that only the opening taker starts the clock passing; also retain post-goal kickoff behavior.

## Acceptance Criteria
- [ ] Neither team can activate a skill before `hasMatchClockStarted` becomes true.
- [ ] Both away AI and home input can use a valid skill after the clock starts.
- [ ] The regression test confirms the timer remains at 60 seconds before the opening kick.

## Validation
- `node --test --test-name-pattern="both teams wait for the opening kickoff to start the clock before using skills" src/game/stepGame.test.js` from `game/` — the T01 both-team regression passes directly.
- `node --test --test-name-pattern="only the opening kickoff taker can start the clock, and later kickoffs preserve the started clock" src/game/stepGame.test.js` from `game/` — existing opening and later kickoff timer behavior passes.

### Existing baseline failure
- The unfiltered `node --test src/game/stepGame.test.js` currently fails `the away AI advances toward the home goal and takes a shot in range` because the ball ends with `home-gk` instead of `null`. The same failure reproduces with both T01 guards removed, so it is independent of this task and remains out of scope.

## Commit Message
```text
fix(match): gate both teams' skills until kickoff starts

Plan: 2026-10-26-football-skill-fixes
Phase: P01-skill-gameplay-and-vfx
Task: T01-gate-skills-before-clock

- Gate home input and away AI skill activation on the started match clock
- Cover both-team opening kickoff suppression and post-start activation
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
