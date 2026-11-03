# Task: T02 Verify Hosted Profile Sync

## Status: in_progress

## Goal
Confirm the deployed, Entra-authenticated profile API can load and save the signed-in account's cloud profile and restore it after refresh. The user authorized changing only the nickname to the new value provided in chat; preserve all other profile values.

## Decision Summary
- This is the previously deferred authenticated cloud read/write smoke check; the profile route's unauthenticated 401 routing check was already completed.
- Use the existing hosted game and the user-provided new nickname to trigger a save. Do not alter other profile fields, Cosmos resources, account settings, or secrets as part of this verification.
- The user explicitly authorized a new nickname. Apply only that nickname change; do not store the nickname text in memory files or alter other profile fields.

## Implementation

### I01. Hosted account read/write smoke verification

- Related Files:
  - `game/src/storage/profileRepository.js` :: `loadCloudProfile`, `saveCloudProfile`, `requestProfile` — read-only reference
  - `game/api/src/functions/profile.js` :: `createProfileHandler` — read-only reference
  - `game/api/src/storage/profileCosmos.js` :: `getProfile`, `putProfile` — read-only reference
  - Hosted game `https://mango-rock-0a79acd00.3.azurestaticapps.net` :: manual authenticated smoke verification
  - `.memory/phases/2026-11-03-daily-challenge/P03-hosted-integration/phase.md` :: record verification outcome; modify during task completion

#### Details
- **Signatures & Types**:
  ```text
  GET /api/profile
    Auth: X-Profile-Access-Token: Bearer <Entra API access token>
    Success: 200 { profile: Profile, updatedAt: ISO-8601 string|null }
    First login: 404 PROFILE_NOT_FOUND, followed by the existing client PUT migration path

  PUT /api/profile
    Body: { profile: Profile }
    Success: 200 { saved: true, updatedAt: ISO-8601 string }
  ```
- **Execution Flow / Logic**:
  1. Confirm the latest deployment is successful and `GET /api/profile` without credentials returns the profile function's JSON `401 AUTH_REQUIRED`, not a platform 404.
  2. Open the hosted game and sign in with the authorized DEX company account. Confirm the game finishes profile loading and displays the current team customization.
  3. Submit the user-provided new nickname through the nickname form's `별명 저장` action. Confirm this issues a PUT and changes only the nickname field.
  4. In browser developer tools, inspect only request URL, method, and status for `/api/profile`; never copy or display the authorization header, request body, response profile, tokens, or secret settings.
  5. Confirm GET and PUT return successful API responses. Refresh the game, sign in again if prompted, and verify the new nickname and unchanged team customization are restored from the cloud profile.
  6. If no PUT occurs, use the team customization Save button without changing any selection to trigger the existing profile save path; then return to the start screen and verify GET after refresh.
  7. Record only deployment run, HTTP status codes, whether profile loading succeeded, whether save succeeded, and whether values survived refresh in the Phase Progress section.
- **Error & Exception Handling**:
  - `401`: stop and report sign-in/token status; do not paste or decode tokens.
  - `403`: record the status and safe API error code, then route to the existing Entra audience/scope configuration follow-up; do not change app registration or permissions in this task.
  - `404` from platform rather than JSON function response: record the route regression and stop; do not alter routing as part of a verification-only task.
  - `503` or `500`: record HTTP status and safe API code only; do not expose connection strings, account keys, profile payloads, or full logs.
  - If the save changes any field other than the nickname, restore the prior unaffected values before ending the task.

### I02. Verification record

- Related Files:
  - `.memory/phases/2026-11-03-daily-challenge/P03-hosted-integration/phase.md` :: Progress notes; modify
  - `.memory/current.md` :: pointer advances only after the verification is complete; update through normal memory-execute flow

#### Details
- Append the UTC/KST test date, deployment run identifier, and pass/fail for anonymous route, authenticated GET, authenticated PUT, and post-refresh persistence.
- Do not store account names, profile content, tokens, Cosmos identifiers, or secrets in plan files.
- If any authenticated step fails, leave this Task pending and create a narrowly scoped follow-up Task with the observed safe status/error code; do not mark the verification complete.

## Acceptance Criteria
- [ ] Hosted profile route returns API 401 anonymously and authenticates the signed-in user.
- [ ] Authenticated GET loads the existing profile without resetting it.
- [ ] Authenticated PUT returns success with the requested nickname while preserving other profile fields.
- [ ] Refresh restores the requested nickname and the same other profile values from cloud storage.
- [ ] Verification notes contain only deployment/status/pass-fail evidence and no user data or secrets.

## Validation
- Manual hosted verification at `https://mango-rock-0a79acd00.3.azurestaticapps.net` — authenticated GET, nickname PUT, refresh, and value persistence all succeed.
- Inspect `.memory/phases/2026-11-03-daily-challenge/P03-hosted-integration/phase.md` — recorded result contains no account data or secrets.

## Commit Message
```text
chore(profile): verify hosted cloud save round trip

Plan: 2026-11-03-daily-challenge
Phase: P03-hosted-integration
Task: T02-verify-hosted-profile-sync

- Confirm authenticated profile GET and PUT on the hosted game
- Record refresh persistence without exposing profile data
```

## Progress
- [x] Deployment run #31 succeeded and a fresh anonymous `GET /api/profile` probe returned JSON `401 AUTH_REQUIRED`.
- [x] Source inspection confirms submitting a nickname calls `saveProfile` and exercises the normal PUT path.
- [x] Checked for a usable existing CLI login; Azure CLI did not have consent for this API scope (`AADSTS65001`), so no access token was issued and no profile data was read or changed.
- [ ] Authenticated GET, requested nickname PUT, preservation of other profile fields, and refresh persistence need verification in the user's signed-in company-account browser session.
- [ ] Verification complete
- commit: pending
