# Task: T01 Campaign Saved Kit Rendering

## Status: done

## Goal
Make the campaign match-state builder preserve the successfully saved profile logo and kit palette through to all four home-team 3D player models, while keeping rival colors stage-specific. The reported company-site behavior must be traced to a specific persistence, match-state, or render boundary before changing production behavior.

## Decision Summary
- Keep profile schema version 7 and the existing `{ logoId, paletteId }` customization model; do not add Azure resources or alter Cosmos schemas.
- Extract the campaign match-state builder to a testable game module, preserve all skill-preview setup behavior, and verify profile payload round-trip plus home and rival model kits.
- A passing local test alone does not explain a hosted-site failure. Include the company-site smoke check and record whether the first failing boundary is profile load/save, match-state creation, or the 3D player model.

## Implementation

### I01. Make campaign match-state construction testable and preserve customization

- Related Files:
  - `game/src/App.jsx` :: `makeMatchState`, authenticated profile load, `startStage`, `startSelectedStage` — replace the private builder with the testable helper; modify
  - `game/src/game/campaignMatchState.js` :: `createCampaignMatchState` — pure campaign match-state builder; new
  - `game/src/game/campaignMatchState.test.js` :: campaign branding and preview regression cases; new
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` — existing recipient of `teamBranding`; read-only
  - `game/src/game/teamBranding.js` :: `getTeamBranding`, `normalizeTeamCustomization` — palette/logo resolution; read-only
  - `game/src/game/playerKit.js` :: `getPlayerKit` — final per-player kit resolver; read-only

#### Details
- **Signatures & Types**:
  ```js
  /**
   * @param {Campaign} campaign
   * @param {{ logoId: string, paletteId: string } | null | undefined} teamCustomization
   * @returns {GameState}
   */
  export function createCampaignMatchState(campaign, teamCustomization)
  ```
  `Campaign` supplies `currentStage`, `ownedTeamSkills`, `equippedTeamSkillIds`, `opponentSkillSets`, and optional `isSkillPreview`. Return the same state shape as `createInitialGameState`.
- **Data & Schema Fields**:
  - Keep profile schema version `7` and `teamCustomization:{logoId,paletteId}` unchanged.
  - `GameState.teamBranding.home` must equal `getTeamBranding(campaign.currentStage, teamCustomization).home`.
  - Each home outfield player's kit uses the selected jersey/trim/shorts/boots; the goalkeeper jersey/glove uses the selected trim as defined by `getPlayerKit`.
  - `GameState.teamBranding.away` remains the stage-derived rival branding, including `boss-black` at stage 5.
- **Execution Flow / Logic**:
  1. Move the existing `makeMatchState` body from `App.jsx` into `createCampaignMatchState`; do not change semantics while extracting it.
  2. Build the owned-skill map from `campaign.ownedTeamSkills`, construct the equipped home deck from `campaign.equippedTeamSkillIds`, and the opponent deck from the current stage's `campaign.opponentSkillSets`.
  3. Resolve branding with `getTeamBranding(campaign.currentStage, teamCustomization)` and pass it to `createInitialGameState`.
  4. Preserve all `isSkillPreview` behavior exactly: source facing, Eulryongta target placement/orientation, Vacuum Cleaner ball placement/ownership, and preview skill application/level.
  5. Update both the authenticated skill-preview load path and normal `startStage` path in `App.jsx` to call `createCampaignMatchState` with the loaded/current profile customization.
  6. Tests must cover a visibly non-default selection (`logoId:'google'`, `paletteId:'royal-gold'`), all four home roles through `getPlayerKit`, unchanged stage rival kit, invalid/missing customization fallback, and unchanged skill-preview state setup.
- **Error & Exception Handling**:
  - Delegate invalid IDs to existing `normalizeTeamCustomization`; do not introduce a second palette allowlist.
  - If a campaign is invalid, preserve the current `createInitialGameState` fallback behavior; do not add profile/API failures that block starting a match.
  - Do not log profile data, account identifiers, or access tokens to diagnose the hosted issue.
- **State Transition & Return**: `App.jsx` receives the same `GameState` currently produced by its local helper; the only intended behavior is that the exact saved customization is testably preserved.

### I02. Verify profile payload persistence at client and API boundaries

- Related Files:
  - `game/src/storage/profileRepository.js` :: `saveCloudProfile`, `loadCloudProfile` — client profile serialization/cache path; read-only unless a regression is found
  - `game/src/storage/profileRepository.test.js` :: account-scoped customization round-trip tests; new
  - `game/api/src/profileValidation.js` :: `readProfilePayload` — schema-v7 API allowlist; read-only unless a regression is found
  - `game/api/src/profileValidation.test.js` :: team customization request preservation; new
  - `game/api/src/storage/profileCosmos.js` :: `putProfile`, `getProfile` — existing profile document persistence; read-only

#### Details
- Client test fixture: account claims contain GUID-like `tid` and `oid`; fake storage implements `getItem`, `setItem`, and `removeItem`; mock `fetch` returns success for PUT and a GET payload containing `{logoId:'google',paletteId:'royal-gold'}`.
- Verify `saveCloudProfile` sends the chosen values in `body.profile.teamCustomization`, and a following `loadCloudProfile` preserves the same two IDs after normalization and account cache handling.
- API test fixture: schema-version-7 `{profile:{nickname,campaignSave,bestRecord,teamCustomization}}` request with the chosen IDs. Verify `readProfilePayload` returns the exact customization unchanged.
- Restore global `fetch` after every client test. Never assert/log a real account, token, or connection string.
- If tests expose a dropped value, fix only that first lossy boundary and add a focused regression. Do not change schema version, Cosmos partitioning, or unrelated profile fields.

## Acceptance Criteria
- [x] Campaign match-state construction is exported from a testable module and both App call sites use it.
- [x] Saved non-default logo/palette survives client PUT/cache/GET and API profile validation.
- [x] All home roles render the chosen palette, the keeper uses its established contrasting accent, and rival kits remain stage-specific.
- [x] Existing skill-preview setup behavior remains unchanged.
- [ ] Company-site manual check after the code is deployed: choose a visibly distinct kit such as Royal Gold + Google, save, start a campaign match, verify all home players and the keeper, reload the site, repeat, and confirm the stage rival is unchanged. Record only the first failing boundary if the issue persists.

## Execution Notes
- Local tracing found no dropped customization in save/load or API validation. The campaign match-state now has direct regressions for the client PUT/cache/GET flow, API schema-v7 validation, team branding, and each home player role. `FootballPlayer3D` reads `teamBranding` from the game state and resolves the kit with `getPlayerKit`.
- The reported hosted-site failure could not be reproduced from the local code path. The company-site smoke check remains pending because this task does not deploy code; the production boundary can only be confirmed after deployment and a browser check.
- The pre-existing Eulryongta preview puts its target at the same x-coordinate as the source at the field edge, so the skill may find no target. This extraction preserves that behavior; correcting the preview placement is outside this task.

## Validation
- `npm --prefix game test -- src/game/campaignMatchState.test.js src/storage/profileRepository.test.js src/game/playerKit.test.js` — campaign match state, client profile round-trip, and per-role kit tests pass.
- `npm --prefix game/api test -- src/profileValidation.test.js` — API accepts and preserves schema-v7 team customization.
- `npm --prefix game run build` — production client build succeeds.
- Manual company-site check described in Acceptance Criteria — chosen home kit survives save, match start, and reload; rival kit remains unchanged.

## Commit Message
```text
fix(campaign): preserve saved kit in 3D matches

Plan: 2026-10-29-campaign-3d-player-visibility-and-kit
Phase: P01-campaign-3d-presentation
Task: T01-campaign-kit-rendering

- Trace saved logo and palette through profile and campaign state
- Add regressions for home player kits and stage-specific rivals
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in git history
