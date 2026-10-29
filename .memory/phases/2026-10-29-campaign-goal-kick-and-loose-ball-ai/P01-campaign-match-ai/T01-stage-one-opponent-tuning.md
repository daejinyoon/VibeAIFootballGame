# Task: T01 Stage 1 Opponent Tuning

## Status: done

## Goal
Make stage 1 campaign opponents decide slightly sooner and press from a little farther away, while keeping home AI teammates and every PvP AI-support path at the current baseline.

## Decision Summary
- Campaign away AI at stage 1 uses `thinkIntervalSeconds: 0.94` and `pressingDistance: 104`; `teammateSupportRadius` remains 125.
- Home tuning, stages 2??, and PvP remain unchanged. Keep `getAiTuning(stage)` backward-compatible.

## Implementation

### I01. Make AI tuning side-aware

- Related Files:
  - `game/src/game/constants.js` :: `AI_TUNING`, `getAiTuning` ??hold baseline and campaign opponent tuning; modify
  - `game/src/game/stepGame.js` :: `updateSupportPlayer`, `updateHomeSupportAi`, `homeSupportTarget`, `updateAwayDefense`, `targetForRole`, `updateAi`, `stepGame` ??pass team and PvP context to tuning reads; modify

#### Details
- **Signatures & Types**:
  ```js
  // Team is 'home' or 'away'; pvpMode defaults to false.
  export function getAiTuning(stage, { team = 'home', pvpMode = false } = {})
  function updateSupportPlayer(state, player, deltaSeconds, { pvpMode = false } = {})
  function targetForRole(state, player, possessionTeam, ball, ballCarrier, { pvpMode = false } = {})
  ```
- **Data & Schema Fields**:
  - No persistent state fields are added.
  - Tuning remains `{ thinkIntervalSeconds: number, teammateSupportRadius: number, pressingDistance: number }`.
  - Stage 1 baseline remains `{ thinkIntervalSeconds: 1, teammateSupportRadius: 125, pressingDistance: 95 }`.
  - Campaign away stage 1 becomes `{ thinkIntervalSeconds: 0.94, teammateSupportRadius: 125, pressingDistance: 104 }`.
  - Stages 2?? retain all existing values.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Retain `getAiTuning` stage sanitization: integer stages clamp to 1??; invalid stage uses stage 1. Unknown team falls back to baseline.
  2. Core Processing: Return adjusted values only when `team === 'away' && pvpMode === false`; otherwise return baseline tuning. An omitted context preserves the current `getAiTuning(stage)` behavior.
  3. Context propagation: `updateSupportPlayer` passes `{ team: player.team, pvpMode }` to tuning reads and forwards `pvpMode` to `targetForRole`. Campaign calls from `updateAi` and `updateHomeSupportAi` use `false`; the two-team `stepGame` PvP loop calls it with `{ pvpMode: true }`. `homeSupportTarget` explicitly uses home tuning. `updateAwayDefense` passes `defendingTeam` and is called only in campaign flow. Away attack cooldown reads in `updateAi` use away campaign tuning.
  4. State Transition & Return: No state-schema changes. Campaign away stage 1 timers/cooldowns use 0.94 and away pressing uses 104; friendly behavior remains 1.00/125/95.
  5. Error & Exception Handling: Do not mutate frozen entries or add new exceptions. Invalid stage/team inputs use existing baseline behavior.

### I02. Add tuning regression coverage
- Related Files:
  - `game/src/game/stepGame.test.js` :: AI tuning tests ??modify
#### Details
- Assert `getAiTuning(1)` remains baseline; away campaign context returns 0.94/125/104; home and PvP-away context return 1/125/95.
- Assert stage 2?? values are unchanged and the existing progression test still passes.
- Exercise a campaign frame to confirm an away decision timer/cooldown uses 0.94 while home support still uses 1.00.

## Acceptance Criteria
- [ ] Campaign stage 1 opponent tuning is 0.94 seconds and 104 units; support radius remains 125.
- [ ] Friendly AI and PvP tuning are unchanged.
- [ ] Stages 2?? and existing one-argument tuning callers remain unchanged.

## Validation
- `node --test --test-name-pattern="AI difficulty tuning rises steadily from stage one through the boss|stage-one tuning increases campaign opponent pressure without changing home or PvP tuning|stage-one campaign opponents press from the adjusted 104-unit distance|the stage-five boss presses from farther away than a regular opponent|the stage-five boss makes attack decisions sooner than a regular opponent" src/game/stepGame.test.js` (run from `game/`) - all 5 relevant tuning tests pass.
- `npm run build` (run from `game/`) - production build succeeds.
- `npm test -- src/game/stepGame.test.js` (run from `game/`) - 94/97 tests pass; 3 unrelated tests also fail on clean baseline commit `e6312ed`: opening-clock skill activation, Eulryongta possession handoff, and knockdown animation recovery. Do not expand T01 to change those behaviors.

## Commit Message
```text
feat(ai): tune stage one opponents only

Plan: 2026-10-29-campaign-goal-kick-and-loose-ball-ai
Phase: P01-campaign-match-ai
Task: T01-stage-one-opponent-tuning

- apply the moderate stage one increase to campaign away AI
- preserve friendly and PvP tuning
```

## Progress
- [x] Implementation complete
- [x] Relevant validation and production build passed
- commit: committed

