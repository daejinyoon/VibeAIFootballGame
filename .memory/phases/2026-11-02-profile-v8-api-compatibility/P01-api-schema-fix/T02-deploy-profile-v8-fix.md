# Task: T02 Deploy Profile v8 Fix

## Status: done

## Goal
Publish the validated profile API fix to the production Azure Static Web App and confirm Azure's deployment workflow succeeds.

## Decision Summary
- Push the fix to `master`; the existing `azure-static-web-apps.yml` workflow deploys the Vite app and Functions API.
- Do not expose or print the Azure deployment token or Cosmos connection string.

## Implementation

### I01. Deploy and verify

- Related Files:
  - `.github/workflows/azure-static-web-apps.yml` :: existing deployment workflow; read-only.
  - `game/api/src/profileValidation.js` :: deployed API payload validation; read-only after T01.
- **Execution Flow / Logic**:
  1. Use the latest `origin/master` as the deployment base and include only the T01 API fix and its tests/memory artifacts.
  2. Push to `master` and wait for the Azure Static Web Apps Actions run to complete successfully.
  3. Confirm the deployed app URL returns HTTP 200 and `/api/profile` returns 401 without a bearer token (expected authentication guard, showing the route is present).
  4. Confirm the built API includes the v8 payload validator through T01 unit tests. Do not send a real user's profile or access token from automation.
- **Validation**:
  - GitHub Actions run for the fix commit — conclusion must be `success`.
  - `curl -I https://mango-rock-0a79acd00.3.azurestaticapps.net` — HTTP 200.
  - `curl -i https://mango-rock-0a79acd00.3.azurestaticapps.net/api/profile` without credentials — HTTP 401 expected.
- **Commit**:
  ```text
  docs(memory): record profile schema fix deployment

  Plan: 2026-11-02-profile-v8-api-compatibility
  Phase: P01-api-schema-fix
  Task: T02-deploy-profile-v8-fix
  ```

## Progress
- [x] T01 fix commit `563e3742fe00bf41d62d6b241f2a6db11a8477e7` was pushed to `master` from the clean deployment worktree.
- [x] GitHub Actions run [#20](https://github.com/daejinyoon/VibeAIFootballGame/actions/runs/41372666571) completed successfully.
- [x] Production app returned HTTP 200; `/api/profile` returned HTTP 401 without a token, as expected for the authenticated endpoint.
- User confirmation is still useful to verify an authenticated save from their browser; no real user token/profile was used in automation.
