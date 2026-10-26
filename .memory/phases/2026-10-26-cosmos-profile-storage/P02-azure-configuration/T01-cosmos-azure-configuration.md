# Task: T01 Cosmos Azure Configuration

## Status: pending

## Goal

Configure the existing Cosmos DB account and football Static Web App so the deployed profile API can store and retrieve each signed-in DEX account's save without touching existing game data.

## Decision Summary

- Cosmos account: existing `maze-rescue-ms-b7af62a9` for API for NoSQL.
- New namespace: database `football`, container `profiles`, partition key `/tenantId`.
- Use the account's lowest-cost supported capacity mode; preserve all existing account/database/container settings.
- Store the Cosmos connection string only in the production Static Web App backend environment variables.

## Implementation

### I01. Provision isolated football namespace

- Related Files:
  - Azure Cosmos DB account `maze-rescue-ms-b7af62a9` :: Data Explorer configuration; user-operated Azure portal resource.
  - Azure Cosmos DB database `football` :: create only if absent.
  - Azure Cosmos DB container `profiles` :: create in `football` only if absent.

#### Details

- In Data Explorer, create database ID `football`; create container ID `profiles` with partition key path `/tenantId`.
- If the account is serverless, do not configure provisioned throughput. If provisioned throughput is required, select only the lowest throughput Azure offers for this new football database/container. Do not enable a throughput change for `maze-rescue`, `fac-man`, or other existing databases.
- Do not copy, rename, edit, or delete existing containers or records. Do not create a database/container named after another game.
- Obtain the account's primary connection string from the Cosmos DB account's **Settings > Keys** page (not from an Azure Storage Account's Table keys). Do not share it in chat or source.

### I02. Configure the production Static Web App API

- Related Files:
  - Static Web App `swa-grill-us-prod-d0d6` :: production **Settings > Environment variables**; user-operated Azure portal resource.
  - API setting `COSMOS_CONNECTION_STRING` :: new secret setting.
  - API settings `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID` :: retain existing settings and confirm they match the Entra app registration.

#### Details

- Add or replace `COSMOS_CONNECTION_STRING` with the full Cosmos DB account connection string; select the Production environment and apply changes.
- Remove the obsolete `TABLE_STORAGE_CONNECTION_STRING` setting if it was added for this football API; do not remove existing `LEADERBOARD_*` or other unrelated settings.
- Do not place the connection string in GitHub repository variables, Vite `VITE_*` values, workflows, browser storage, or chat.
- Push the API change to `master` and verify the GitHub Actions deployment succeeds before retesting the hosted game.

### I03. Verify the hosted save flow

- Related Files:
  - `https://orange-desert-016c45400.3.azurestaticapps.net` :: hosted football game; manual smoke verification.
  - GitHub Actions run for the deployment commit :: deploy evidence.

#### Details

- Sign in with the DEX Consulting account and confirm profile loading succeeds.
- Confirm the first-login browser profile is written to `football/profiles`; refresh and verify GET returns the same profile.
- Confirm one account cannot read another account's document and the existing `maze-rescue` database remains unchanged.
- If sync still fails, inspect the API status and Azure Static Web App/Application Insights logs without exposing connection strings or bearer tokens.

### I04. Compare Entra tenant GUIDs safely

- Related Files:
  - `game/api/src/auth/entra.js` :: `requireEntraCaller`

#### Details

- Normalize the configured tenant ID and token `tid` GUIDs to lowercase before comparison, since GUID comparisons must not depend on hexadecimal letter casing.
- Keep rejecting tokens issued by a different tenant; this change only makes equivalent GUID casing compare correctly.
- Re-run the API syntax check, deploy, then repeat the hosted login and profile-sync verification.

### I05. Diagnose the live tenant mismatch

- Related Files:
  - `game/api/src/auth/entra.js` :: `EntraAuthError`, `requireEntraCaller`
  - `game/api/src/functions/profile.js` :: `errorResponse`

#### Details

- For a tenant mismatch only, include the token `tid` and configured `ENTRA_TENANT_ID` in the API response so the production configuration can be compared without exposing a bearer token or Cosmos secret.
- Remove this temporary diagnostic after resolving the mismatch.
- Re-run the API syntax check and deploy before checking the response body in the browser Network panel.

### I06. Separate the Entra bearer from SWA auth context

- Related Files:
  - `game/src/storage/profileRepository.js` :: `requestProfile`
  - `game/api/src/auth/entra.js` :: `readBearerToken`

#### Details

- Send the SPA's Entra access token in `X-Profile-Access-Token` and validate only that dedicated header in the API. This avoids treating any platform-provided `Authorization` value as the Entra API token.
- Confirm an unauthenticated direct API request returns `401 AUTH_REQUIRED`; then use the signed-in game to verify profile GET/PUT.
- After a successful hosted sync, remove the temporary tenant mismatch details from the public error response.

### I07. Accept supported Entra access-token versions

- Related Files:
  - `game/api/src/auth/entra.js` :: `getJwks`, `requireEntraCaller`

#### Details

- Select the v1.0 or v2.0 issuer and signing-key discovery endpoint using the token's `ver` claim, then verify the signature against that version's tenant-specific keys.
- Keep the configured tenant check before verification and continue validating the API audience, object ID, and delegated `access_as_user` scope.
- For v1.0 tokens, accept only the API client ID, its default `api://{clientId}` URI, or an explicitly configured `ENTRA_API_AUDIENCE`; v2.0 tokens must target the API client ID.
- Include only a non-secret JOSE error code/name in temporary `INVALID_TOKEN` diagnostics to distinguish issuer, expiration, and signing-key failures. Remove this diagnostic after hosted sync succeeds.
- Deploy the API update and repeat the hosted profile GET/PUT smoke check.

### I08. Diagnose Cosmos failures without exposing secrets

- Related Files:
  - `game/api/src/storage/profileCosmos.js` :: `createStorageError`, Cosmos request catches
  - `game/api/src/functions/profile.js` :: `errorResponse`

#### Details

- Return safe storage error category/status/substatus fields in every 503 response; never include exception messages, connection strings, account keys, or bearer tokens.
- Identify a missing `COSMOS_CONNECTION_STRING` explicitly.
- Use the returned diagnostic to correct the production setting or isolated database/container configuration, then remove temporary diagnostics after hosted sync succeeds.

## Acceptance Criteria

- [ ] `football/profiles` exists with partition key `/tenantId`, or has been safely created by the user in the portal.
- [ ] Production API settings include matching Entra IDs and `COSMOS_CONNECTION_STRING`.
- [ ] Successful GitHub Actions deployment includes the Cosmos-backed API.
- [ ] API accepts the configured tenant GUID regardless of letter casing and continues to reject a different tenant.
- [ ] Hosted sign-in, first-login migration, repeat load/save, and account separation succeed.
- [ ] No existing non-football database/container was modified and no secret was committed or shared.

## Validation

- GitHub Actions deployment for the API change concludes `success`.
- Manual hosted GET/PUT profile synchronization and account-isolation smoke checks described in I03.
- Azure portal Data Explorer confirms football documents are isolated in `football/profiles` and `maze-rescue` remains untouched.

## Commit Message

```text
fix(storage): always include safe diagnostics

Plan: 2026-10-26-cosmos-profile-storage
Phase: P02-azure-configuration
Task: T01-cosmos-azure-configuration

- Return safe storage failure categories in every 503 response
- Continue hosted profile-sync verification
```

## Progress

- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
