# Task: T02 Reduce Eulryongta to Five Seconds

## Status: done

## Goal
Make Eulryongta knockdown last five seconds consistently in direct activation, emitted events, and reflected knockdown status.

## Decision Summary
- Apply D02: replace the current ten-second Eulryongta knockdown with five seconds at every skill level.
- Keep target selection, level-based target count, impact presentation, and other knockdown durations unchanged.

## Implementation

### I01. Use one five-second duration throughout Eulryongta status handling
- Related Files:
  - `game/src/game/skills.js` :: `SKILLS.eulryongta`, `getTransferableStatuses`, `applySkill` — update description, timer, status metadata, event, and Rainbow Reflect fallback; modify

#### Details
- **Signatures & Types**:
  ```js
  export const SKILLS // immutable skill definitions; eulryongta.description is a string
  function getTransferableStatuses(player) // derives active status duration and metadata for Rainbow Reflect
  export function applySkill(state, { team, sourcePlayerId, skillId, level = 1 } = {}) // returns { ok, skillId, team, reason, events }
  ```
- **Data & Schema Fields**:
  - `player.knockdownSeconds`: number; set to `5` for Eulryongta.
  - `player.statusDurationSeconds.knockdown`: number; set to `5` for Eulryongta.
  - `player.knockdownSkillId`: literal `'eulryongta'`; preserve for reflection behavior.
  - `playerKnockedDown.durationSeconds`: number; emit `5`.
- **Execution Flow / Logic**:
  1. Update the Eulryongta description to say five seconds.
  2. In `applySkill`, set the target knockdown timer and status duration to `5`, and emit `durationSeconds: 5`.
  3. In `getTransferableStatuses`, change only the fallback for a knockdown with `knockdownSkillId === 'eulryongta'` to `5`; explicit status metadata remains authoritative.
  4. Leave Power Tackle's 0.8-second knockdown, generic knockdowns, target filtering, and level-based target count unchanged.

### I02. Update duration regression tests
- Related Files:
  - `game/src/game/skills.test.js` :: Eulryongta target test and Rainbow Reflect status tests — assert five-second values and fallback; modify

#### Details
- At levels 1, 2, and 3, assert each `playerKnockedDown.durationSeconds`, target `knockdownSeconds`, and target `statusDurationSeconds.knockdown` equal `5`.
- Cover an Eulryongta status with no explicit duration metadata and confirm Rainbow Reflect's fallback transfer duration is `5`.
- Preserve target ordering, goalkeeper eligibility, source exclusion, and unrelated status durations.
- For existing `stepGame` skill activation tests in this file, set `hasMatchClockStarted = true` so their fixtures represent active play under T01's kickoff gate.

## Acceptance Criteria
- [ ] Eulryongta uses five seconds at all levels in state and emitted events.
- [ ] Reflected Eulryongta knockdown retains five seconds, including the fallback path.
- [ ] Other knockdown durations and target selection remain unchanged.

## Validation
- `node --test src/game/skills.test.js` from `game/` — skill simulation tests pass.

## Commit Message
```text
fix(skills): reduce Eulryongta knockdown to five seconds

Plan: 2026-10-26-football-skill-fixes
Phase: P01-skill-gameplay-and-vfx
Task: T02-eulryongta-five-seconds

- Set Eulryongta status and event durations to five seconds
- Keep reflected duration and player-facing text consistent
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
