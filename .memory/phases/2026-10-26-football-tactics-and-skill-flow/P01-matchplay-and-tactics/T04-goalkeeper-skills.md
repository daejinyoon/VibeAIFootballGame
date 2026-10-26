# Task: T04 Goalkeeper Skills

## Status: done

## Goal
Allow home and away goalkeepers to activate all skills available to their team while leaving each skill's existing possession, status, cooldown, phase, and target requirements intact.

## Decision Summary
- Both teams' goalkeepers can use any team skill.
- Existing per-skill requirements remain authoritative; for example, Eagle Shot and Tornado Shot still require the caster to own the ball.

## Implementation

### I01. Remove role-wide skill exclusion
- Related Files:
  - `game/src/game/skills.js` :: `applySkill`; modify
  - `game/src/game/skills.test.js` :: goalkeeper eligibility cases; modify
  - `game/src/game/stepGame.js` :: `maybeUseAiSkill`; modify
  - `game/src/game/stepGame.test.js` :: goalkeeper home activation and away AI activation cases; modify

#### Details
- **Signatures & Types**:
  ```js
  applySkill(state, { team, sourcePlayerId, skillId, level = 1 }) -> SkillAttempt
  activateNextTeamSkill(state, team, sourcePlayerId) -> SkillAttempt
  maybeUseAiSkill(state, team, events) -> void
  ```
- **Data & Schema Fields**: Keep existing `Player.role`, team skill deck, cooldown, possession, and match-phase fields; no new state fields.
- **Execution Flow / Logic**:
  1. Remove the blanket `player.role === 'goalkeeper'` rejection in `applySkill`; preserve player existence/team/status, valid skill/level, active match phase, and per-skill validation.
  2. Include eligible goalkeepers in `maybeUseAiSkill` candidates. Continue preferring the current ball owner; otherwise choose the nearest eligible player to the ball with deterministic tie-breaking.
  3. Preserve the home F-key activation path for the currently controlled goalkeeper; do not change the opening clock gate.
  4. Keep all existing per-skill checks unchanged: shots require ball possession; Eulryongta requires a forward target; Vacuum Cleaner and Rainbow Reflect retain their respective state checks; cooldown and deck order remain team-scoped.
  5. Do not give the goalkeeper a separate skill deck or bypass normal cooldowns.
- **Error & Exception Handling**: Keep current failure result reasons for all non-role validation errors. Remove `goalkeeperExcluded` as a possible failure reason because role alone is no longer invalid.
- **State Transition & Return**: Successful goalkeeper casts use the same events, effects, cooldowns, and deck advancement as any other team player.

### I02. Focused regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: assert goalkeeper casts a target-eligible non-possession skill and possession-bound skill behavior; modify
  - `game/src/game/stepGame.test.js` :: home controlled GK F activation and away AI GK candidate cases; modify
#### Details
- Verify a goalkeeper can cast a skill when its normal requirements are met.
- Verify a goalkeeper cannot bypass a skill's ordinary `needBall`, `noTargetInFront`, or other existing conditions.
- Verify away AI can select a goalkeeper caster and that team cooldown/deck order remains unchanged.
- Verify pre-match clock gating still blocks both teams' goalkeeper casts.

## Acceptance Criteria
- [ ] `applySkill` no longer rejects players solely for `role === 'goalkeeper'`.
- [ ] Both home-controlled and away-AI goalkeepers can activate team skills when eligible.
- [ ] Skill-specific validation, cooldowns, team deck order, and pre-kickoff gating remain intact.

## Validation
- `npm test -- --test-name-pattern="goalkeeper|goalkeeperExcluded"` from `game/` — focused skill eligibility coverage passes (update obsolete exclusion assertions).
- `npm test` from `game/` — full game test suite passes.
- `npm run build` from `game/` — production build succeeds.

## Commit Message
```text
feat(skills): allow goalkeepers to use team skills

Plan: 2026-10-26-football-tactics-and-skill-flow
Phase: P01-matchplay-and-tactics
Task: T04-goalkeeper-skills

- Remove role-wide skill activation rejection
- Include goalkeepers in opponent AI skill selection
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
