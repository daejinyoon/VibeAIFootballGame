# Task: T01 Challenge Match

## Status: done

## Goal
Create a daily challenge match state that uses the server-provided duration and AI stage, gives both teams the same fixed level-one three-skill deck, and allows each skill to succeed at most once during that match.

## Decision Summary
- Fixed deck: `eagleShot`, `tornadoShot`, `eulryongta`; all at level 1, shared by home and AI teams, one successful use per skill per team per match.
- Campaign and PvP matches must keep their current unlimited-by-match skill behavior and default 60-second regulation time.

## Implementation

### I01. Match state factory and duration override

- Related Files:
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` — optional regulation duration and skill-use cap state; modify
  - `game/src/game/dailyChallengeMatchState.js` :: `createDailyChallengeMatchState` — construct challenge state; new
  - `game/src/game/dailyChallengeMatchState.test.js` :: challenge state tests; new
  - `game/src/game/createInitialGameState.test.js` :: preserve default state tests; modify

#### Details
- **Signatures & Types**:
  ```javascript
  export function createInitialGameState({
    stage = 1, opponentSkillIds = [], teamSkillDeck = [], opponentSkillDeck,
    teamBranding, goalCelebrationId = null,
    regulationSeconds = REGULATION_SECONDS,
    skillUsesPerEntry = null,
  } = {}) {}

  export function createDailyChallengeMatchState(challenge, teamCustomization, goalCelebration) {}
  // -> GameState | null for an invalid challenge payload
  ```
- **Data & Schema Fields**:
  - Daily `GameState.teamSkillUsesRemaining`: `{ home: Record<SkillId, 0|1>, away: Record<SkillId, 0|1> }`; absent for campaign/PvP states when `skillUsesPerEntry` is `null`.
  - Each daily deck is exactly `[{skillId:'eagleShot',level:1},{skillId:'tornadoShot',level:1},{skillId:'eulryongta',level:1}]` in that order.
  - `challenge` must have `challengeId: string`, `regulationSeconds` integer 30–45, `aiStage` integer 2–5, and exactly the fixed three skill IDs.
- **Execution Flow / Logic**:
  1. Extend `createInitialGameState` with `regulationSeconds` defaulting to `REGULATION_SECONDS`; accept only integer 30–60, otherwise use the existing 60-second default. Set `state.remainingSeconds` from this validated value.
  2. If `skillUsesPerEntry` is a positive integer, initialize remaining-use counters from the sanitized home and away decks. If omitted/null, do not add a counter field so existing campaign/PvP behavior is unchanged.
  3. Validate incoming challenge shape in `createDailyChallengeMatchState`; return `null` on missing/invalid fields rather than starting with altered defaults.
  4. Create initial state with `stage: challenge.aiStage`, both decks set to the fixed trio at level 1, `regulationSeconds: challenge.regulationSeconds`, `skillUsesPerEntry: 1`, user customization applied through `getTeamBranding(challenge.aiStage, teamCustomization)`, and celebration selected with existing `selectGoalCelebrationId` behavior.
  5. AI strength continues to use existing `state.stage` / `getAiTuning` behavior. A tie follows existing regulation plus 30-second golden-goal overtime and may produce `matchDraw`.
- **Error & Exception Handling**:
  - Invalid optional `regulationSeconds` in the general factory falls back to the current default, preserving existing callers.
  - Invalid challenge objects return `null`; App must display a challenge configuration error and not launch a campaign match.

### I02. One-successful-use skill counters

- Related Files:
  - `game/src/game/skills.js` :: `applySkill`, `activateNextTeamSkill` — respect and decrement optional counters; modify
  - `game/src/game/skills.test.js` :: one-use tests and existing unrestricted skill tests; modify
  - `game/src/components/GameScreen.jsx` :: `GameScreen` skill stock — show remaining uses when the counter exists; modify

#### Details
- **Signatures & Types**:
  ```javascript
  // Existing exported signatures remain unchanged:
  export function applySkill(state, { team, sourcePlayerId, skillId, level }) {}
  export function activateNextTeamSkill(state, team, sourcePlayerId) {}
  ```
- **Data & Schema Fields**:
  - Only states with `teamSkillUsesRemaining` are capped. Each mapped skill value is an integer >= 0.
- **Execution Flow / Logic**:
  1. In `applySkill`, before mutating gameplay, return `{ ok:false, reason:'noUsesRemaining' }` if the selected team's counter for that skill is zero.
  2. Decrement that counter exactly once only after the skill succeeds; failed preconditions do not consume a use.
  3. In `activateNextTeamSkill`, skip deck entries whose counter is zero, continue checking later skills, and return the existing no-usable result if none are available.
  4. In `GameScreen`, when a team's counter map exists, show `남은 1회` or `사용 완료` beside each skill; for legacy states render the current cooldown/readiness text unchanged.
- **Error & Exception Handling**:
  - Missing counter key means no cap for that skill, preserving compatibility for partial legacy state objects.
  - Counters never go below zero; failed or blocked casts never consume a use.

### I03. Match mechanic validation

- Related Files:
  - `game/src/game/createInitialGameState.test.js` :: defaults and duration override; modify
  - `game/src/game/skills.test.js` :: capped/uncapped skill behavior; modify
  - `game/src/game/dailyChallengeMatchState.test.js` :: validated fixed setup; new

#### Details
- Verify default campaign/PvP state remains at 60 seconds with no `teamSkillUsesRemaining` field.
- Verify valid daily challenges select the returned AI stage, 30–45 seconds, three ordered level-one skills on both teams, branding, and one use each.
- Verify invalid stages, durations, challenge IDs, and skill arrays do not produce a playable state.
- Verify one successful activation decrements only its team/skill counter, a second attempt fails without side effects, another skill remains usable, and uncapped states can continue using skills after cooldown as before.
- Verify AI uses the same one-use counter through `activateNextTeamSkill`.

## Acceptance Criteria
- [x] Daily match uses server settings and the same skill deck for both sides.
- [x] Each skill can activate once per team in a daily match and its remaining use is visible in the HUD.
- [x] Existing 60-second campaign/PvP setups and their skill behavior remain unchanged.
- [x] Draws continue through the existing overtime behavior and produce the existing terminal event.

## Validation
- `npm test -- src/game/createInitialGameState.test.js src/game/skills.test.js src/game/dailyChallengeMatchState.test.js` from `game` — match setup and skill cap tests pass.
- `npm test -- src/game/stepGame.test.js` from `game` — existing match simulation tests pass after state changes.

## Commit Message
```text
feat(daily-challenge): configure fair challenge matches

Plan: 2026-11-03-daily-challenge
Phase: P02-gameplay-and-ui
Task: T01-challenge-match

- Apply daily time and AI settings to the shared match engine
- Add one-use skill counters for challenge matches only
```

## Progress
- [x] 구현 완료
- [x] 신규 및 대상 기능 검증 통과; 지정 전체 검증에는 기존 kickoff/시뮬레이션 기대치 실패 포함
- commit: `5b382f5`
