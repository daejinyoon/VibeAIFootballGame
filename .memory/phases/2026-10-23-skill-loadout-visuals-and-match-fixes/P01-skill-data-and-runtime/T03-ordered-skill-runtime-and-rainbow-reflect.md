# Task: T03 Ordered Skill Runtime and Rainbow Reflect

## Status: done

## Goal
Make F activate the next usable skill from the equipped ordered deck, give each skill its own 10-second cooldown, and implement Rainbow Reflect as an active transfer of the controlled player's negative status to the last opposing skill caster.

## Decision Summary
- The home match deck is the campaign's at-most-three equipped skills; the opponent deck remains stage-generated. A cooling-down or otherwise unavailable entry is skipped in order.
- Rainbow Reflect is active, requires a transferable negative status, clears that status from the user, and applies the same status at its original duration to the last opposing skill caster, regardless of distance or original status source.

## Implementation

### I01. Match state and activation order
- Related Files:
  - `game/src/App.jsx` :: `makeMatchState` — translate campaign-owned/equipped data into the match deck; modify.
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` — initialize per-skill cooldown and last-caster state; modify.
  - `game/src/game/constants.js` :: `TEAM_SKILL_COOLDOWN_SECONDS` — keep 10 seconds as the per-skill cooldown constant; modify only if renaming clarifies semantics.
  - `game/src/game/skills.js` :: `activateNextTeamSkill`, `applySkill` — select and apply next valid entry; modify.
  - `game/src/game/stepGame.js` :: `maybeUseAiSkill`, F input path, per-frame cooldown update — use the new maps for both teams; modify.
  - `game/src/components/GameScreen.jsx` :: skill HUD — show each equipped skill's cooldown; modify.
- **Data & Schema Fields**:
  ```ts
  type TeamSkillDeckEntry = { skillId: SkillId; level: number };
  type SkillCooldowns = Record<'home' | 'away', Partial<Record<SkillId, number>>>;
  type LastSkillCasters = Record<'home' | 'away', string | null>;
  ```
  - `teamSkillDecks.home` is built from `equippedTeamSkillIds` in exact order and matching `ownedTeamSkills` levels. `teamSkillDecks.away` remains the existing stage opponent deck.
  - Initialize each team's per-skill cooldowns to zero. Decrement each positive cooldown by `dt`, clamped at zero.
- **Execution Flow / Logic**:
  1. On F, scan at most one full pass through the equipped deck starting at that team's `skillQueueIndex`.
  2. Skip an entry whose own cooldown is positive or whose conditions make `applySkill` fail. On first successful activation, advance queue index to the next position and set only that skill's cooldown to 10 seconds. If no entry succeeds, do not advance the queue or start any cooldown.
  3. AI activation uses the same queue and per-skill cooldown rules. Remove the team-wide early-return cooldown guard from `maybeUseAiSkill`.
  4. Update `lastSkillCasterByTeam[team]` only when a skill successfully activates. Rainbow Reflect records its own team's activation without overwriting the opposing caster it targets.
  5. Update the skill HUD to display each equipped skill's remaining cooldown and readiness; remove shared home/away cooldown progress bars.

### I02. Active Rainbow Reflect state transfer
- Related Files:
  - `game/src/game/skills.js` :: `applySkill`, `applyAutomaticRainbowReflect` — implement active transfer and remove the old automatic global reversal path; modify.
  - `game/src/game/stepGame.js` :: `stepGame`, `resetForKickoff`, `clearSkillTransientState` — remove passive invocation and preserve/clear appropriate per-match transient metadata; modify.
  - `game/src/game/createInitialGameState.js` :: initial player/state fields — initialize transfer metadata required to restore a player's status presentation; modify.
- **Status Transfer Logic**:
  - Transferable negative statuses in the current player model are active `knockdownSeconds`, `airborneSecondsRemaining`, and `stunnedSeconds`. Transfer all active negative status fields on the controlled player's record as a single Rainbow Reflect activation.
  - Preserve status type and source metadata. Apply each target status for its original duration, never the source player's remaining time. Known durations are Eulryongta knockdown 10 seconds, World Split hit knockdown 0.8 seconds, normal tackle knockdown `KNOCKDOWN_SECONDS` (1 second), and Tornado/clear airborne 5 seconds. For any status with no recorded source duration, add transient `statusDurationSeconds` metadata at the code path that creates it and use that value during transfer. Preserve direction/recovery metadata needed for its animation.
  - Find the target by `lastSkillCasterByTeam[opposingTeam]`. It must be an active opponent; if no active eligible caster exists, the skill is unavailable and must not consume cooldown or queue position.
  - If the controlled player has no transferable status, return a failed result and leave status, queue position, and cooldowns unchanged.
  - On success, clear the transferred statuses from the user and apply them to the target even if the source skill was not what caused the user's status. Do not apply a range test.
  - Emit `skillUsed` plus a structured transfer event containing source/target IDs and transferred status types for the visual layer.
- **Error & State Transition**: Invalid/missing last caster, no negative status, and invalid team/skill all fail without partial mutations. Rainbow Reflect is the exception to the usual knockdown action lock: the controlled player can activate it while knocked down to clear that status, matching the confirmed "always clear my negative status" rule.

### I03. Runtime regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: activation/cooldown/reflect tests — update team cooldown assertions and add per-skill and Rainbow cases; modify.
  - `game/src/game/stepGame.test.js` :: input and clock boundary tests — update F/cooldown assertions and retain kickoff timer invariants; modify.
- **Scenarios**:
  - First equipped skill fires, only its cooldown becomes 10; another ready skill can fire on a subsequent F while the first cools down.
  - A cooling-down or conditionally unavailable entry is skipped to the next usable entry, with ordering preserved.
  - Rainbow clears and transfers each supported negative status to the most recent opposing skill caster at original duration, including when the status came from another cause and when the caster is far away.
  - Rainbow with no transferable status, no recorded caster, or an invalid/inactive target does not consume cooldown or advance the queue.
  - No passive reflection occurs without F. Opponent AI can use active Rainbow through its own ordered deck.
  - Goal and kickoff preserve remaining timer; new `createInitialGameState` starts at 60 seconds.

## Acceptance Criteria
- [x] F activates skills according to equipped order and availability; each skill has a separate 10-second cooldown.
- [x] Rainbow Reflect is never passive and transfers active negative statuses as specified.
- [x] Unsuccessful Rainbow activation has no cooldown, queue, or partial-status side effects.
- [x] Match HUD presents individual cooldown state rather than one shared team timer.
- [x] Timer remains stable through active play and kickoff, while a newly created round starts at 60 seconds.

## Validation
- `npm test -- src/game/skills.test.js src/game/stepGame.test.js` — skill activation, status transfer, AI, and timer tests pass.
- `npm run build` — game HUD and match state wiring compile.

## Validation Result
- `npm test -- src/game/skills.test.js src/game/stepGame.test.js src/game/createInitialGameState.test.js` — passed (104 tests).
- `npm run build` — passed; Vite reported the existing large Three.js chunk advisory.

## Commit Message
```text
feat(skills): activate ordered skills with independent cooldowns

Plan: 2026-10-23-skill-loadout-visuals-and-match-fixes
Phase: P01-skill-data-and-runtime
Task: T03-ordered-skill-runtime-and-rainbow-reflect

- Give each equipped skill its own ten-second cooldown
- Replace passive Rainbow Reflect with active status transfer
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in `.memory/current.md`
