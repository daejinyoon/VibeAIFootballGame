# Task: T02 Cloud Profile Sync

## Status: pending

## Goal

Make the complete v7 profile account-scoped across devices, migrating the existing local save to the first signed-in account once and treating cloud data as canonical on later devices/logins.

## Decision Summary

- Profile fields are exactly `schemaVersion`, `nickname`, `campaignSave`, `bestRecord`, and `teamCustomization`.
- A browser's pre-auth local save is claimed by its first successfully signed-in Entra `{tid, oid}`; after that, it must never be silently imported into another account.
- Existing cloud data overwrites the local cache only after a successful GET. A missing cloud profile imports the unclaimed local profile and preserves that local copy until PUT succeeds.

## Implementation

### I01. Implement the authenticated profile repository

- Related Files:
  - `game/src/storage/profileRepository.js` :: fetch/migrate/save/signout cache operations; new
  - `game/src/storage/localProfile.js` :: existing validation and local profile normalization; read-only unless a narrowly scoped helper is required
  - `game/src/storage/localProfile.test.js` :: existing profile behavior references; read-only
  - `game/src/auth/entraAuth.js` :: token acquisition from T01; read-only

#### Details

- **Repository signatures:** `loadCloudProfile({ account, acquireToken, storage = window.localStorage })`, `saveCloudProfile({ account, profile, acquireToken, storage = window.localStorage })`, and `getCachedProfileForAccount(account, storage)`.
- **Endpoints:** same-origin `GET /api/profile` returns `{ profile, updatedAt }` or 404; `PUT /api/profile` sends `{ profile }`. Attach `Authorization: Bearer ${accessToken}` from `getProfileApiToken()` and `Content-Type: application/json` on PUT.
- **Account cache keys:** preserve legacy `dex-pixel-football:v1` for first-account migration. Add `dex-pixel-football:owner:v1` containing only `{ tenantId, objectId }`; after claim, store per-account cache keys `dex-pixel-football:v1:${tenantId}:${objectId}`. Do not put email in the key.
- **First account:** if no owner marker exists, GET cloud first. On 200, normalize via existing `writeProfile(profile, tempStorage)` and cache the cloud result; then set owner marker. On 404, use normalized legacy local profile (or `createEmptyProfile()`), PUT it, and only after success write the per-account cache and owner marker. On fetch/upload failure, retain existing local data and return the retryable error state.
- **Other account on same browser:** when an owner marker exists for a different verified account and that new account returns 404, create/upload an empty profile for the new account; never copy the previous account's per-account cache into it.
- **Existing cloud profile:** normalize with existing `writeProfile()` against an isolated in-memory storage adapter before caching so current schema validation and removed-skill migration remain in force. Cloud remains canonical even if a different local cache has data.
- **Writes:** write the normalized profile to that account's local cache immediately, then PUT to the API; return `{ profile, synced: true }` on success. Surface any failed PUT to App as a visible retryable `profileError`; do not claim it synced. Keep the failed local cache intact. All users' cloud profiles remain server-isolated.
- **Required response classes:** 401 triggers auth reinitialization/sign-in; 403 displays tenant/scope configuration guidance; 404 has first-login migration semantics; 5xx/network errors show retry and keep the app out of initial ready state.

### I02. Route all App profile mutations through the repository

- Related Files:
  - `game/src/App.jsx` :: initialization and functions `persistCampaign`, `startNewCampaign`, `handleNicknameSave`, `handleTeamCustomizationSave`, `handleGameEvents`, `chooseSkill`, `moveTeamSkill`, `equipCampaignSkill`, `unequipCampaignSkill`, `saveAndExit`, `leaveCompletedCampaign`; modify
  - `game/src/components/SignInScreen.jsx` :: loading, API retry, and account identity text; modify
  - `game/src/components/StartScreen.jsx` :: remove local-only identity assumptions if present; modify only if required

#### Details

- Initialize `profile` only from `loadCloudProfile()` after auth is confirmed; render gameplay screens only after the repository returns ready.
- Replace direct `writeProfile()` callsites with a shared async `saveProfile()` that updates local account cache and PUTs to Azure. Preserve each current mutation's business behavior and only change persistence timing/error display.
- Ensure nickname, campaign checkpoints/results, skill awards/loadout, best record, and team customization all pass through the same account-scoped writer.
- Do not clear the legacy key or account cache until the first-account PUT succeeds. Keep the legacy key untouched for the initial migration's successful path unless there is a safe post-success cleanup that preserves a recovery copy.
- While the initial GET/migration is pending, show `profileLoading`; retry repeats the server operation without launching a campaign. After initial load, failed saves show a retry action and leave the last local cache intact.

## Acceptance Criteria

- [ ] A valid account with cloud profile gets exactly that profile on a clean device; local data is replaced only after GET succeeds.
- [ ] A first account with no cloud profile receives the complete current local profile, and local data remains if upload fails.
- [ ] A second account on the same browser cannot inherit the first account's local cache.
- [ ] All existing profile write paths synchronize through the API and keep local cache keyed by `{tid, oid}`.
- [ ] Azure load/migration failure prevents game entry and offers retry; no anonymous profile initialization occurs.

## Validation

- `npm --prefix game run build`
- `npm --prefix game test`
- Manual browser flow with two test tenant accounts: legacy-save first login, cloud overwrite on another browser profile, second-account isolation, profile saves from nickname/team customization/campaign/skills, API unavailable retry, and refresh after each save.

## Commit Message

```text
feat(profile): synchronize account saves through Azure API

Plan: 2026-10-26-entra-login-cloud-save
Phase: P02-frontend-auth-and-sync
Task: T02-cloud-profile-sync

- Add first-login local save claim and per-account cache
- Route profile mutations through authenticated cloud persistence
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
