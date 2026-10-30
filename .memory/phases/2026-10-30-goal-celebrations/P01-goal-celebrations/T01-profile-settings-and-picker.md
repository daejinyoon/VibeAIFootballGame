# Task: T01 Profile Settings and Ceremony Picker

## Status: done

## Goal
Persist a valid ceremony preference and let the user choose random mode or one specific ceremony in TeamCustomizationScreen.

## Decision Summary
- Add root profile field goalCelebration: { mode: 'random' | 'specific', ceremonyId: GoalCelebrationId | null }.
- Upgrade profile schema v7 to v8. Missing or invalid settings default to random without losing other profile data.

## Implementation

### I01. Ceremony identifiers and normalization
- Related Files:
  - game/src/game/goalCelebrations.js :: GOAL_CELEBRATION_IDS, GOAL_CELEBRATION_OPTIONS, DEFAULT_GOAL_CELEBRATION_SETTINGS, normalizeGoalCelebrationSettings, selectGoalCelebrationId — new authoritative values/helpers
  - game/src/game/goalCelebrations.test.js :: normalization and deterministic-selection tests; new

#### Details
- Signatures & Types:
  ```typescript
  type GoalCelebrationId = 'siuuu' | 'moonwalk' | 'takeTheL' | 'slickback' | 'rko';
  type GoalCelebrationSettings = { mode: 'random' | 'specific'; ceremonyId: GoalCelebrationId | null };
  export const GOAL_CELEBRATION_IDS: readonly GoalCelebrationId[];
  export const GOAL_CELEBRATION_OPTIONS: readonly { id: GoalCelebrationId; label: string }[];
  export const DEFAULT_GOAL_CELEBRATION_SETTINGS: GoalCelebrationSettings;
  export function normalizeGoalCelebrationSettings(value: unknown): GoalCelebrationSettings;
  export function selectGoalCelebrationId(value: unknown, random?: () => number): GoalCelebrationId;
  ```
- Data & Schema Fields:
  - IDs in display order: siuuu/SIUUU, moonwalk/문워크, takeTheL/L을 가져가, slickback/슬릭백, rko/RKO.
  - Random mode stores ceremonyId null; specific mode requires a known ID.
- Execution Flow / Logic:
  1. Normalize plain objects only. Missing/invalid mode or invalid specific ID returns a fresh default random object.
  2. Specific mode returns its saved ID. Random mode selects floor(clamp(random(), 0, 0.999999) * 5); treat non-finite values as zero.
  3. Only match creation calls the selector, never component render.
  4. Cover defaults, malformed values, all IDs, and random boundaries 0, midpoint, and 1.

### I02. Profile v8 migration and persistence
- Related Files:
  - game/src/storage/localProfile.js :: PROFILE_VERSION, createEmptyProfile, migrateProfileV7, readProfile, writeProfile — modify
  - game/src/storage/localProfile.test.js :: migration and round-trip coverage — modify
  - game/src/storage/profileRepository.test.js :: cloud setting round-trip — modify
  - game/src/storage/profileRepository.js :: cloud serializer — verify preservation; read-only

#### Details
- Signatures & Types:
  ```typescript
  type UserProfile = {
    schemaVersion: 8;
    nickname: string;
    campaignSave: CampaignSave | null;
    bestRecord: BestRecord | null;
    teamCustomization: TeamCustomization;
    goalCelebration: GoalCelebrationSettings;
  };
  export function migrateProfileV7(value: unknown): UserProfile;
  ```
- Data & Schema Fields:
  - Set PROFILE_VERSION to 8 and add root goalCelebration.
- Execution Flow / Logic:
  1. Add random default to createEmptyProfile.
  2. Migrate v7 while preserving valid nickname, campaignSave, bestRecord, and normalized teamCustomization; initialize random settings.
  3. Route schema v7 through migration. Existing v1-v6 paths must return schema 8 and random settings.
  4. Normalize on v8 read/write; invalid settings cannot discard valid fields.
  5. Update v7 test assertions. Cover preserved progress, specific round-trip, malformed/absent default, and confirm cloud serialization uses same normalizer without API changes.

### I03. Picker UI and save integration
- Related Files:
  - game/src/components/TeamCustomizationScreen.jsx :: TeamCustomizationScreen draft and save props — modify
  - game/src/App.jsx :: handleTeamCustomizationSave, screen props, both createCampaignMatchState callers — modify
  - game/src/styles.css :: ceremony selector and responsive styles — modify

#### Details
- Signatures & Types:
  ```typescript
  type TeamCustomizationScreenProps = {
    customization: TeamCustomization;
    goalCelebration: GoalCelebrationSettings;
    onSave: (customization: TeamCustomization, goalCelebration: GoalCelebrationSettings) => void;
    onBack: () => void;
    errorMessage?: string;
  };
  ```
- Data & Schema Fields:
  - Keep kit draft unchanged; add a separate normalized ceremony draft.
  - Radio choices are random and all five IDs. Specific gives {mode:'specific', ceremonyId:id}; random gives {mode:'random', ceremonyId:null}.
- Execution Flow / Logic:
  1. Initialize both drafts from props without mutating profile.
  2. Submit both normalized values through existing profile-save behavior and preserve existing success/error handling.
  3. Pass profile.goalCelebration to screen and both campaign state call sites.
  4. Use labels from GOAL_CELEBRATION_OPTIONS, not duplicated identifiers.
  5. Preserve keyboard radio navigation, visible focus, selected styling, and mobile visibility.

## Acceptance Criteria
- [ ] New and migrated profiles default to random.
- [ ] Choices survive local/cloud profile round trips.
- [ ] Kit and ceremony settings save together.
- [ ] Picker exposes random and exactly five ceremonies.

## Validation
- Set-Location game; npm test -- src/game/goalCelebrations.test.js src/storage/localProfile.test.js src/storage/profileRepository.test.js — helper and profile cases pass.
- Set-Location game; npm run build — profile and UI integration compiles.

## Commit Message
```text
feat(profile): add saved goal celebration preference

Plan: 2026-10-30-goal-celebrations
Phase: P01-goal-celebrations
Task: T01-profile-settings-and-picker

- Add validated v8 preferences and legacy migration
- Add random and specific choices to team customization
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
