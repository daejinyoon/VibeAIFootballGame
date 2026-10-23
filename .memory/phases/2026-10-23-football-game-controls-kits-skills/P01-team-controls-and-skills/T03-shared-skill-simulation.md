# Task: T03 Shared Skill Simulation

## Status: pending

## Goal

Make ordered team skills usable by every team member and AI under one 10-second team cooldown, then implement the confirmed level-based skill outcomes in the deterministic match simulation.

## Decision Summary

- Human and AI teams use the same deck-order and cooldown rules; uses are unlimited.
- F skips active skills whose conditions fail, but advances the queue only after a successful activation.
- Rainbow Reflect is a passive automatic skill and is excluded from the manual activation queue.
- Skill levels drive Eagle Shot score, Tornado duration, Power Tackle wall duration, and Eulryongta target count.

## Implementation

### I01. Add team deck, cooldown, and queue to match state

- Related Files:
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState`, player/team state construction; modify.
  - `game/src/game/createInitialGameState.test.js` :: default and supplied deck state tests; modify.
  - `game/src/game/constants.js` :: shared cooldown constants if needed; modify.
  - `game/src/App.jsx` :: `makeMatchState`, opponent deck construction; modify.
  - `game/src/game/campaign.js` :: opponent deck mapping helper if needed; modify.

#### Details

- **State schema**: Initialize `teamSkillDecks: {home: TeamSkill[], away: TeamSkill[]}`, `skillCooldownRemaining: {home:number, away:number}`, and `skillQueueIndex: {home:number, away:number}`. `TeamSkill` is `{skillId: SkillId, level:1|2|3}`. Initialize each cooldown and index to 0. Home deck comes from campaign `teamSkillDeck`; away deck comes from current stage opponent IDs at level 1.
- **Validation/defaults**: Unknown IDs, duplicate IDs, malformed levels, and missing arrays are filtered from supplied decks. An absent/empty deck is valid. Do not recreate per-player uses or decrementable stock.
- **Reset semantics**: Match kickoff/goal resets preserve team decks but reset queue index to 0 only if the design's match lifecycle requires it; cooldown timers continue to tick through ordinary play and are cleared on a fresh match. Document and test the chosen reset function behavior; goals must not duplicate uses.
- **Constants**: Define `TEAM_SKILL_COOLDOWN_SECONDS = 10` in `constants.js` and use it from both sides.

### I02. Select and activate next usable ordered skill

- Related Files:
  - `game/src/game/skills.js` :: `applySkill`, `launchSkillShot`, `applyAutomaticRainbowReflect`; modify.
  - `game/src/game/stepGame.js` :: manual F input, `maybeUseAiSkill`, cooldown timer advancement, skill effect cleanup; modify.
  - `game/src/game/stepGame.test.js` :: input/AI queue and cooldown tests; modify.
  - `game/src/game/skills.test.js` :: level outcomes and activation validation; modify.

#### Details

- **Activation API**: Change skill activation to receive `{state, team, sourcePlayerId, skillId, level}` or an equivalent explicit context. Return `{ok:boolean, reason?:string}`. It must not mutate queue/cooldown on failure.
- **Queue algorithm**: For a team's ordered deck, iterate from its current queue index, wrap at the end, skip Rainbow Reflect, and test each active skill's preconditions. Activate the first passing skill. On success set index to the following deck slot and cooldown to 10. If none is usable, do not change index/cooldown. Only the controlled home player can manually request F. AI can request only for its current ball carrier/eligible actor, and at most one successful activation occurs per team cooldown.
- **Conditions**: Preserve each skill's existing meaningful field/ball preconditions where compatible: shot skills require the ball carrier and valid goal direction; Vacuum Cleaner requires no possession and pulls the ball to its user; Power Tackle can activate without first pressing tackle; Eulryongta requires one or more valid opponents in range; Rainbow Reflect is never an F activation.
- **Cooldown advancement**: Decrease each team's timer by `deltaSeconds` once per simulation frame, clamp at zero, and apply before processing activation so a timer that reaches zero this frame can be reused. Prevent multiple activations in one team in the same frame.
- **Eagle Shot**: Store `skillId`, `skillLevel`, and `scoreValue=level` on the launched shot/ball scoring event. On goal, add that point value to the scoring team's score. Do not alter normal shot scoring. Eagle Shot goalkeeper collision/save logic must allow it through regardless of keeper position.
- **Tornado Shot**: Launch the ball as before. Apply `airborneSecondsRemaining` to every player other than caster (all teams and keepers): 5/6/7 seconds. While airborne, disable movement, tackle, pass, shot, interception, and keeper saves. Decrement to zero and restore normal control without moving players out of field bounds.
- **Power Tackle**: F activation immediately creates a `powerBarrier` effect/state with `{team, sourcePlayerId, x, y, facingX, facingY, length, thickness, remainingSeconds}`. Use a field-relative fixed geometry: a 220-unit segment extending forward from caster, 28 units thick; duration 3/4/5 seconds by level. Treat the wall as solid for all character movement and ball motion. Characters intersecting the rising wall receive an outward launch velocity/knockdown impulse; reset the launch state when their normal recovery completes. Create at most one active wall per team because of the team cooldown.
- **Eulryongta**: Select up to `level` closest valid opponents in the existing forward arc/range (140 units); exclude teammates and self. Set each target's knockdown duration to exactly 10 seconds. If no target qualifies, activation fails and does not consume queue/cooldown.
- **Vacuum Cleaner**: On success, set ball position to caster's current position immediately, clear velocity/airborne impulse, and set possession to caster regardless of distance. No range limit or travel animation in simulation.
- **Rainbow Reflect**: When active on a defending team, cancel the opposing team's current skill effect regardless of position, including an opposing `powerBarrier`, tornado lift, knockdown, and skill-shot effect if cancellation reaches it. Clear only opposing effect records; keep normal ball state unless that ball is part of the canceled skill shot. Reflection does not require a manually selected player.

### I03. Add simulation regression cases

- Related Files:
  - `game/src/game/stepGame.test.js` :: ordered skill and gameplay regression cases; modify.
  - `game/src/game/skills.test.js` :: pure activation/level cases; modify.
  - `game/src/game/createInitialGameState.test.js` :: deck/cooldown shape; modify.

#### Details

- Cover wraparound order, skipping unavailable skills, no index advance on failure, active cooldown blocking both human/AI, and unlimited reuse after cooldown.
- Cover all levels for Eagle scoring/keeper pass-through, Tornado duration/caster exclusion/disabled actions, Power Tackle geometry/solid collision/launch/duration, and Eulryongta target count/10-second duration.
- Cover full-field immediate Vacuum Cleaner and global Rainbow cancellation of wall and timed effects without canceling own effects.
- Cover goal reset and match end so transient states/effects are cleaned and cooldown/deck data does not become corrupt.

## Acceptance Criteria

- [ ] Home and away teams share the same activation/cooldown semantics and can use the ordered deck indefinitely after each 10-second cooldown.
- [ ] F selects the next usable active skill and only advances on success; the passive reflect never occupies an active-use action.
- [ ] All six skill outcomes match the confirmed decisions at levels 1–3 or, for non-upgradeable skills, base level.
- [ ] Player/ball collision with a power wall and airborne/knockdown recovery are stable across normal ticks, goals, and match end.

## Validation

- `npm test -- --test-name-pattern="skill|tackle|goal|keeper|knockdown"` from `game` — simulation and skill rule coverage.
- `npm run build` from `game` — state and UI consumers still compile.

## Commit Message

```text
feat(gameplay): add shared skill order and level effects

Plan: 2026-10-23-football-game-controls-kits-skills
Phase: P01-team-controls-and-skills
Task: T03-shared-skill-simulation

- Enforce one ten-second cooldown per team and ordered activation
- Implement level-based skill outcomes and global reflection
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
