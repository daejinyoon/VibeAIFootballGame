# Task: T03 Preserve Ceremony After Goal

## Status: done

## Goal
Keep the match-selected ceremony ID when a goal reset creates the next kickoff state, so second and later goals still start a ceremony.

## Decision Summary
- `createCampaignMatchState` selects one ID at match start; kickoff resets retain that ID and do not re-randomize it.
- Preserve existing score, clock, skill, branding, and control reset behavior.

## Implementation

### I01. Carry ID through kickoff state rebuild
- Related Files:
  - `game/src/game/stepGame.js` :: `resetForKickoff` — modify.
  - `game/src/game/campaignMatchState.js` :: `createCampaignMatchState` — read-only; the match-level selection point.
  - `game/src/game/stepGame.test.js` :: repeated-goal reset regression — modify.
- Details
  - **Signatures & Types**:
    ```js
    function resetForKickoff(state: GameState, kickoffTeam: 'home' | 'away'): void;
    export function stepGame(state: GameState, inputFrame?: InputFrame, deltaSeconds?: number, options?: StepOptions): GameEvent[];
    ```
  - **Data & Schema Fields**: Keep `GameState.goalCelebrationId: string | null`; pass its current value into `createInitialGameState` inside `resetForKickoff`.
  - **Execution Flow / Logic**:
    1. Pass the old state's `goalCelebrationId` to the fresh state constructor before `Object.assign` overwrites the old state.
    2. Never call `selectGoalCelebrationId` from a goal/kickoff reset.
    3. Preserve all currently restored state fields in `Object.assign`.
    4. Add a regression: start with ID `siuuu`, trigger and complete a goal ceremony, advance through kickoff reset, assert ID remains `siuuu`, then trigger another goal and assert a second `goalCelebrationStarted` event with `ceremonyId: 'siuuu'`, fresh elapsed time zero, and correct participants.
    5. Include a null-ID case to prove matches without configured ceremony still do not create one.

### I02. Repeated-goal test
- Related Files:
  - `game/src/game/stepGame.test.js` :: reuse fixture and goal trigger pattern from `campaign goals stage three players and wait five seconds before kickoff while the clock runs` — modify.
- Details
  - Assert the same selected ID after first goal pause and reset, then assert next goal emits the same ID.
  - Ensure Random sampling remains solely in `createCampaignMatchState`; no extra random calls during reset.

## Acceptance Criteria
- [ ] The chosen ID survives every post-goal `resetForKickoff`.
- [ ] Second and later goals emit a ceremony with the same match-selected ID.
- [ ] Random remains selected once at match creation.

## Validation
- `cd game; npm test -- src/game/stepGame.test.js src/game/campaignMatchState.test.js` — repeated-goal and selection-once tests pass.

## Commit Message
```text
fix(game): preserve celebrations across goal resets

Plan: 2026-11-02-customization-ceremony-preview-fixes
Phase: P01-customization-and-match-fixes
Task: T03-preserve-ceremony-after-goal

- Carry the match-selected ceremony through kickoff state resets
- Cover repeated goals without changing random-per-match selection
```

## Progress
- [x] Implementation complete
- [x] Repeated-goal and campaign selection tests passed; full suite retains the two previously recorded unrelated failures
- commit: pending
