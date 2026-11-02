# Task: T01 Remove Moonwalk

## Status: done

## Goal
Remove Moonwalk from player-facing and in-game ceremony choices, while old profiles selecting Moonwalk load as Random and cloud saves remain compatible.

## Decision Summary
- Active ceremonies are exactly `siuuu`, `takeTheL`, `slickback`, and `rko`; the API keeps accepting legacy `moonwalk`.
- Do not alter audio assets or match-level Random selection.

## Implementation

### I01. Active ceremony model and motion
- Related Files:
  - `game/src/game/goalCelebrations.js` :: `GOAL_CELEBRATION_IDS`, `GOAL_CELEBRATION_OPTIONS`, `normalizeGoalCelebrationSettings`, `selectGoalCelebrationId` — modify active choices.
  - `game/src/game/goalCelebrationMotion.js` :: `getGoalCelebrationPose` — remove Moonwalk choreography.
  - `game/src/game/goalCelebrations.test.js` :: ID, label, normalization, random selection tests — update.
  - `game/src/game/goalCelebrationMotion.test.js` :: pose enumeration and motion tests — update.
- Details
  - **Signatures & Types**:
    ```js
    export const GOAL_CELEBRATION_IDS: readonly string[];
    export const GOAL_CELEBRATION_OPTIONS: readonly { id: string; label: string }[];
    export function normalizeGoalCelebrationSettings(value: unknown): { mode: 'random'; ceremonyId: null } | { mode: 'specific'; ceremonyId: string };
    export function selectGoalCelebrationId(value: unknown, random?: () => number): string;
    export function getGoalCelebrationPose(ceremonyId: string, elapsedSeconds: number, role?: string | null): object | null;
    ```
  - **Data & Schema Fields**:
    - Active IDs, in order: `['siuuu', 'takeTheL', 'slickback', 'rko']`.
    - Labels, in order: `['SIUUU', 'L을 가져가', '슬릭백', 'RKO']`.
    - Keep persisted `goalCelebration.mode` and `goalCelebration.ceremonyId`; no schema-version change.
  - **Execution Flow / Logic**:
    1. Remove Moonwalk from IDs/options. Normalizing `{ mode: 'specific', ceremonyId: 'moonwalk' }` must return a fresh default `{ mode: 'random', ceremonyId: null }`.
    2. Remove its branch from `getGoalCelebrationPose`; unsupported IDs follow the existing null-return path.
    3. Update tests to enumerate only the four active IDs, labels, and motions; add explicit Moonwalk-to-Random normalization.
    4. Remove Moonwalk-only simulation expectations in `game/src/game/stepGame.test.js`; preserve the audio test's assertion that Moonwalk has no playable clip.
  - **Error & State**: Do not change fallback behavior for malformed profile settings or the one-random-selection-per-match behavior.

### I02. Legacy profile compatibility
- Related Files:
  - `game/src/storage/localProfile.js` :: `readProfile`, `writeProfile` — read-only inspection; existing normalization should convert legacy data.
  - `game/src/storage/localProfile.test.js` :: profile normalization coverage — modify if direct regression coverage is missing.
  - `game/api/src/profileValidation.js` :: `SUPPORTED_GOAL_CELEBRATION_IDS`, `isGoalCelebration` — read-only; retain Moonwalk acceptance.
  - `game/api/src/profileValidation.test.js` :: schema v8 compatibility case — retain or clarify existing assertion.
- Details
  - Load schema v8 profile containing specific Moonwalk, assert client returns Random, then save and assert persisted normalized setting is Random.
  - API must continue accepting schema v8 `{ mode: 'specific', ceremonyId: 'moonwalk' }` so stale clients do not receive cloud-save 400.

### I03. Active ceremony consumer fixtures
- Related Files:
  - `game/src/game/campaignMatchState.test.js` — verify legacy specific Moonwalk now normalizes to Random and match-level random selection remains one draw.
  - `game/src/game/stepGame.test.js` — replace Moonwalk-only match-end fixture with an active ceremony ID.
  - `game/src/storage/profileRepository.test.js` — verify legacy Moonwalk payloads normalize to Random on client save and cloud load.
- Details
  - Keep legacy Moonwalk literals only in migration/compatibility assertions and the audio no-clip assertion; they must not be active game IDs or animation branches.

## Acceptance Criteria
- [ ] `campaignMatchState` resolves a legacy specific Moonwalk profile through Random selection, not as a ceremony ID.
- [ ] Picker and in-game active ID set contain only SIUUU, Take the L, Slickback, and RKO.
- [ ] Existing Moonwalk profile loads and saves as Random.
- [ ] API still accepts legacy Moonwalk; four audio clips and match-level random behavior are unchanged.

## Validation
- `cd game; npm test -- src/game/goalCelebrations.test.js src/game/goalCelebrationMotion.test.js src/storage/localProfile.test.js` — targeted client tests pass.
- `cd game/api; npm test -- src/profileValidation.test.js` — legacy acceptance remains passing.
- `cd game; npm test -- src/game/goalCelebrationAudio.test.js` — supplied audio behavior remains unchanged and Moonwalk has no playable audio.
- `cd game; npm test -- src/game/campaignMatchState.test.js src/storage/profileRepository.test.js` — match selection and cloud/profile fixtures use only active ceremony IDs and normalize legacy data.
- `cd game; npm test -- --test-name-pattern='regulation result waits for an active campaign ceremony to finish' src/game/stepGame.test.js` — the retained match-end ceremony fixture passes. The full stepGame suite also has two separately recorded unrelated failures.

## Commit Message
```text
feat(game): remove unsupported moonwalk ceremony

Plan: 2026-11-02-customization-ceremony-preview-fixes
Phase: P01-customization-and-match-fixes
Task: T01-remove-moonwalk

- Remove Moonwalk from active ceremony selection and choreography
- Normalize legacy client profiles to Random while retaining API compatibility
```

## Progress
- [x] Implementation complete
- [x] Targeted validation passed; full stepGame run retains two unrelated failures below
- commit: pending
