# Task: T01 Cosmos Profile Repository

## Status: done

## Goal

Replace the football API's Azure Table Storage client with a Cosmos DB for NoSQL repository while preserving the existing authenticated `/api/profile` contract, v7 profile payload, and Entra account isolation.

## Decision Summary

- Use `@azure/cosmos` with `COSMOS_CONNECTION_STRING`; target database `football`, container `profiles`, partition key `/tenantId`.
- Store `{ id: objectId, tenantId, profile, updatedAt }`, with tenant and object ID taken only from the verified access token.
- Leave frontend, Entra token validation, and HTTP routes unchanged.

## Implementation

### I01. Replace the profile storage adapter

- Related Files:
  - `game/api/src/storage/profileTable.js` :: repository currently exported as `getProfile` and `putProfile`; replace implementation and rename file to `game/api/src/storage/profileCosmos.js`.
  - `game/api/src/functions/profile.js` :: imports storage functions; update import path only.

#### Details

- **SDK/API**: Import `CosmosClient` from `@azure/cosmos`. Build/cache a client from `process.env.COSMOS_CONNECTION_STRING`; select `client.database('football').container('profiles')`. The database/container must be provisioned in Azure as specified by P02; do not auto-create database/container from request handlers.
- **Stored document schema**:
  ```typescript
  type FootballProfileDocument = {
    id: string;             // verified Entra objectId (oid)
    tenantId: string;       // verified Entra tenantId (tid), container partition key /tenantId
    profile: ProfileV7;     // allowlisted profile envelope from profileValidation.js
    updatedAt: string;      // ISO-8601 timestamp
  };
  ```
- **Repository signatures**: `getProfile({ tenantId, objectId }, env = process.env)` returns `{ profile, updatedAt } | null`; `putProfile({ tenantId, objectId, profile }, env = process.env)` returns `{ savedAt }`.
- **Read flow**: validate non-empty tenantId/objectId; call `container.item(objectId, tenantId).read()`; map Cosmos 404 to `null`; return the `resource` profile and updatedAt.
- **Write flow**: validate keys; set `savedAt = new Date().toISOString()`; `container.items.upsert({ id: objectId, tenantId, profile, updatedAt: savedAt })`; return `{ savedAt }`.
- **Configuration/error behavior**: missing/invalid connection string and non-404 Cosmos failures must throw `ProfileStorageError` with status 503; never include keys, connection string, endpoint secrets, or SDK internals in the API response. Keep the current HTTP handler's 503 mapping.
- Reuse a single Cosmos client/container handle per process after successful initialization; do not create a new network client on every request.

### I02. Update runtime dependencies and settings examples

- Related Files:
  - `game/api/package.json` :: replace `@azure/data-tables` with supported `@azure/cosmos` dependency; modify.
  - `game/api/package-lock.json` :: synchronize dependency lock; modify.
  - `game/api/local.settings.example.json` :: replace `TABLE_STORAGE_CONNECTION_STRING` with `COSMOS_CONNECTION_STRING`; modify.
  - `game/api/src/index.js` :: entry imports; read-only unless it directly imports the renamed repository module.

#### Details

- The API setting key is exactly `COSMOS_CONNECTION_STRING`. Do not add it to `.env.example` under `game/` or expose it to Vite.
- Retain `ENTRA_TENANT_ID` and `ENTRA_CLIENT_ID` in `local.settings.example.json`.
- Keep `@azure/functions` and `jose` dependencies unchanged.

## Acceptance Criteria

- [ ] Existing GET/PUT behavior and v7 profile envelope are unchanged.
- [ ] An absent document returns `null` (HTTP handler then returns 404); a PUT upserts and returns the saved timestamp.
- [ ] The item ID and partition key are derived only from verified `{ objectId, tenantId }` supplied by the Entra middleware.
- [ ] Storage configuration and service failures map to 503 without leaking sensitive values.
- [ ] The repository no longer imports or depends on `@azure/data-tables`.

## Validation

- `npm run check` (working directory: `game/api`).
- `npm run build` (working directory: `game`).
- Azure-hosted data round-trip and account-isolation checks are deferred to P02-T01 after the user configures the Cosmos resources and connection string.

## Commit Message

```text
feat(profile): move cloud saves to Cosmos DB

Plan: 2026-10-26-cosmos-profile-storage
Phase: P01-cosmos-api
Task: T01-cosmos-profile-repository

- Replace Azure Tables client with Cosmos DB for NoSQL
- Preserve Entra account-scoped profile API behavior
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: pending
