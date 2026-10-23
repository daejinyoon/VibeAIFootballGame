# Task: T04 Knockdown and Rainbow Reflect

## Status: pending

## Goal
Keep Eulryongta's confirmed level-scaled ten-second knockdown behavior, and change Rainbow Reflect from deleting opponent skills to redirecting their gameplay effect back to the original caster or toward the opponent side.

## Decision Summary
- Eulryongta hits the nearest 1/2/3 eligible opponents in front within the existing 140-unit radius; the opposing goalkeeper is eligible. Knockdown and dizzy state last 10 seconds at every level.
- Rainbow Reflect is automatic and global. It reflects shots toward the opponent goal, returns player effects to the original caster, and reverses terrain direction toward the opponent side.
- Keep Vacuum Cleaner as an instant full-field ball pull. Its level remains capped at 1 and its pull ignores World Split; its moving visual is handled in P03.

## Implementation

### I01. Eulryongta regression contract and reflection outcomes
- Related Files:
  - `game/src/game/skills.js` :: `findEulryongtaTargets`, `applySkill`, `applyAutomaticRainbowReflect`; modify
  - `game/src/game/stepGame.js` :: `advancePlayerRecovery`, `advanceSkillEffects`, transient cleanup; modify if needed
  - `game/src/game/skills.test.js` :: Eulryongta, Vacuum Cleaner, Rainbow Reflect tests; modify
  - `game/src/game/stepGame.test.js` :: status timer and reflected shot outcome tests; modify

#### Details
- **Signatures & Types**:
  ```js
  applyAutomaticRainbowReflect(state, defendingTeam = 'home'): null | {
    type: 'skillReflected', skillId: 'rainbowReflect', team: 'home'|'away',
    automatic: true, reflectedSkillId: string, sourcePlayerId: string|null
  }
  ```
- **Data & Schema Fields**:
  - Preserve Eulryongta target selection: enemy team, not dismissed, not already knocked down/stunned, forward projection >= 0, distance <= 140, sorted nearest first, `slice(0, level)`.
  - Preserve `knockdownSeconds=10`; add/retain `knockdownFromTeam`, direction fields, and target `motionAction='knockdown'` so the later presentation task can track the full status.
  - Keep `vacuumCleaner` level cap 1, immediate ownership of a ball anywhere on the field, ground ball state, and deletion of old shot metadata.
  - Add `reflectedByTeam`/`reflected` processing to transient skill entities as needed so one opponent activation reflects once and cannot ping-pong on subsequent frames.
- **Execution Flow / Logic**:
  1. Treat Eulryongta's current level-based target selector and 10-second knockdown as the canonical contract; make only changes required to keep status provenance available to reflection and visuals.
  2. In `applyAutomaticRainbowReflect`, inspect active opponent `skillEffects`, `powerBarriers`, tornado lifts, and Eagle/Tornado shots globally; do not use distance-to-reflector as a filter.
  3. For an opposing Eagle/Tornado shot, reassign possession/last-touch to `defendingTeam`, direct its velocity toward that team's attacking goal at skill-shot speed, clear source team's scoring/flight metadata, and let the ordinary shot/keeper/barrier rules resolve the returned ball.
  4. For player-targeted effects, clear the original affected status and apply the same status to its `sourcePlayerId` (Eulryongta knockdown = 10 seconds; Tornado lift = 5 seconds). Do not reflect onto the passive team's own players.
  5. For World Split, reverse `facingX/facingY`, transfer ownership to `defendingTeam`, and keep the wall anchored to its original cast origin so it grows toward the original caster's side. Preserve the 3-second lifetime and level length.
  6. Emit one automatic `skillReflected` event per reflected opposing activation and add one cancellation/reflection cue at the contact location. Do not reflect effects already marked with the same defending team.
  7. Leave Vacuum Cleaner pull behavior unchanged; explicitly test that an active World Split never prevents the instant pull.
- **Error & Exception Handling**: If the source player was dismissed or removed, preserve global shot/barrier reflection where possible and skip only the source-targeted status. Ignore stale effect IDs and ensure each effect can be reflected once.
- **State Transition & Return**: Rainbow Reflect remains passive, not manually activated, does not consume the shared active-skill queue, and does not start an active-skill cooldown.

### I02. Skill logic regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: Eulryongta and Vacuum tests; modify
  - `game/src/game/skills.test.js` :: Rainbow Reflect tests; modify
#### Details
- Test Eulryongta level target count, front/range ordering, keeper eligibility, 10-second duration, and caster exclusion.
- Test global reflection from distant source/effect positions for skill shots, knockdown/lift effects, and World Split direction; ensure one event per skill and no ping-pong.
- Preserve test that Vacuum Cleaner claims a ball at the opposite field corner, including when a wall is active.

## Acceptance Criteria
- [ ] Eulryongta applies the confirmed 1/2/3 target rule and fixed ten-second fall status.
- [ ] Rainbow Reflect applies at any field position and returns each opposing skill's gameplay effect to its source/opposite direction once.
- [ ] Vacuum Cleaner remains an instant full-field pull and ignores barriers.
- [ ] Passive reflection does not enter the ordered active-skill queue or alter the ten-second active team cooldown.

## Validation
- `cd game; npm test -- --test-name-pattern="Eulryongta|Rainbow Reflect|Vacuum Cleaner"` — skill logic tests pass.
- `cd game; npm test -- --test-name-pattern="reflected|goalkeeper"` — reflected outcomes and goalkeeper cases pass.

## Commit Message
```text
feat(skills): reflect passive skill effects to their source

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P01-skill-simulation
Task: T04-knockdown-and-rainbow-reflect

- Preserve ten-second Eulryongta knockdowns
- Redirect reflected shots, status effects, and World Split
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
