# Task: T02 Campaign Goal Flow

## Status: done

## Goal
Start one three-second ceremony per campaign goal activation, continue match time during it, then perform kickoff or show the overtime result.

## Decision Summary
- Resolve the preference once when campaign state is created. Non-campaign/PvP keeps its current one-second pause and immediate overtime finish.
- Eagle Shot starts one ceremony after its full volley. RKO roles are randomized without replacement per celebration.

## Implementation

### I01. Resolve campaign ceremony and initialize state
- Related Files:
  - game/src/game/campaignMatchState.js :: createCampaignMatchState — modify
  - game/src/game/createInitialGameState.js :: createInitialGameState — modify
  - game/src/game/goalCelebrations.js :: selectGoalCelebrationId, assignRkoRoles — modify
  - game/src/game/campaignMatchState.test.js :: deterministic selection tests; new

#### Details
- Signatures & Types:
  ```typescript
  export function createCampaignMatchState(
    campaign: CampaignSave,
    teamCustomization: TeamCustomization,
    goalCelebration: GoalCelebrationSettings = DEFAULT_GOAL_CELEBRATION_SETTINGS,
    random: () => number = Math.random
  ): GameState;
  export function createInitialGameState(options?: {
    stage?: number; opponentSkillIds?: string[];
    teamSkillDeck?: SkillDeckEntry[]; opponentSkillDeck?: SkillDeckEntry[];
    teamBranding?: TeamBranding; goalCelebrationId?: GoalCelebrationId | null;
  }): GameState;
  export function stepGame(state: GameState, inputFrame?: InputFrame, deltaSeconds?: number, options?: { pvpMode?: boolean; controlledTeams?: Team[]; random?: () => number }): GameEvent[];
  export function assignRkoRoles(
    participantIds: string[], random?: () => number
  ): { targetId: string; strikerId: string; finisherId: string } | null;
  ```
- Data & Schema Fields:
  - Generic state uses goalCelebrationId null; campaign match has one fixed ID.
  - Active state.goalCelebration is null or:
    ```typescript
    {
      ceremonyId: GoalCelebrationId; team: 'home' | 'away';
      elapsedSeconds: number; durationSeconds: 3;
      participantIds: string[];
      rkoRoles: { targetId: string; strikerId: string; finisherId: string } | null;
      finishMatchAfter: boolean;
    }
    ```
- Execution Flow / Logic:
  1. Normalize and resolve once in createCampaignMatchState; pass ID to createInitialGameState.
  2. assignRkoRoles requires exactly three distinct IDs, copies the list, performs Fisher-Yates selection without replacement, clamps injected random samples like I01, and returns null for invalid input. Allow participantIds to be a shorter string array in active state only when players are unavailable; roles remain null.
  3. Add beginGoalCelebration(state, team, points, random=Math.random) in stepGame.js. Pass options.random from stepGame into the helper so tests can assign deterministic RKO roles. Use this path for normal goals and completed Eagle Shot volleys. Gather the three active non-goalkeeper scoring-side players. For RKO, stage target at the current centroid, striker 24 game units behind target on the scoring team x-axis, and finisher 24 units ahead; clamp every position to FIELD bounds. For other ceremonies, use the same three-point line with stable participant ordering. Set goalPause/phaseSeconds=3, initialize active state, and emit one goalCelebrationStarted event containing team, ceremonyId, points, participantIds, rkoRoles.
  4. Normal goal retains its goal event and adds one start event. Eagle Shot retains one goal per projectile but starts one ceremony after all projectiles resolve, reporting total volley points.
  5. Null goalCelebrationId retains legacy one-second normal pause and immediate overtime result, with no ceremony state/event.
  6. During ceremony, elapsedSeconds rises as phaseSeconds falls by identical dt. Match clocks keep advancing. At three seconds clear celebration, then kickoff unless finishMatchAfter, which calls finishMatch.
  7. Overtime goal sets finishMatchAfter and cannot emit a result before three seconds. If regulation expires to a non-tied result during celebration, defer result to the end; a tie starts overtime and its clock continues.
  8. If fewer than three active field players exist, participantIds contains the remaining IDs, rkoRoles is null, and the pose timeline uses its group-pose fallback. Do not throw.

### I02. Simulation tests
- Related Files:
  - game/src/game/stepGame.test.js :: goals, clock, Eagle Shot, overtime, legacy behavior — modify
  - game/src/game/campaignMatchState.test.js :: deterministic selection/roles — modify
  - game/src/game/skills.test.js :: level-three Eagle Shot campaign volley — modify
  - game/src/game/goalCelebrations.test.js :: labels and role assignment — modify

#### Details
- Cover one fixed ID through a match, three field participants, unique deterministic roles, and fewer-than-three fallback.
- Assert regular goal emits one start event and kickoff waits 3s while clock falls.
- Assert overtime result only occurs after 3s.
- Assert null-ID state retains prior pause/overtime timing.
- Assert level-three Eagle Shot can emit three goal events but exactly one start event after volley resolution, points=3.

## Acceptance Criteria
- [x] Random mode does not reroll during a match.
- [x] Each campaign goal activation starts one three-second ceremony; Eagle Shot one per volley.
- [x] Clock continues; kickoff/result waits for ceremony completion.
- [x] PvP/non-campaign behavior is unchanged.

## Validation
- Set-Location game; npm test -- src/game/stepGame.test.js src/game/campaignMatchState.test.js src/game/skills.test.js src/game/goalCelebrations.test.js — T02-specific tests pass; three unrelated existing stepGame cases fail on both the current tree and HEAD baseline (opening skill grace, Eulryongta possession, and knockdown motion).
- Set-Location game; npm run build — match-state integration compiles.

## Commit Message
```text
feat(game): add timed campaign goal celebration flow

Plan: 2026-10-30-goal-celebrations
Phase: P01-goal-celebrations
Task: T02-campaign-goal-flow

- Select one ceremony per campaign match and stage the scoring team
- Defer kickoff and overtime result until the ceremony ends
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (T02-specific coverage and build pass; three baseline simulation failures noted above)
- commit: pending



