# Task: T02 Account Profile Table API

## Status: in_progress

## Goal

Expose authenticated `GET /api/profile` and `PUT /api/profile` endpoints that read and write only the signed-in Entra user's complete game profile in the dedicated Azure Table Storage table `footballprofiles`.

## Decision Summary

- Entity keys are derived from verified Entra claims: `PartitionKey = tenantId`, `RowKey = objectId` (`oid`).
- The profile is the existing v7 envelope: `schemaVersion`, `nickname`, `campaignSave`, `bestRecord`, and `teamCustomization`.
- API requests are same-origin through Static Web Apps `/api`; there is no browser-supplied user key and no cross-origin CORS configuration.

## Implementation

### I01. Implement the account-scoped Table Storage repository

- Related Files:
  - `game/api/src/storage/profileTable.js` :: Table client and profile entity operations; new
  - `game/api/src/profileValidation.js` :: request profile envelope validation; new
  - `game/api/package.json` :: Azure Tables dependency from T01; modify only if needed

#### Details

- **Storage client:** use `TableClient.fromConnectionString(process.env.TABLE_STORAGE_CONNECTION_STRING, 'footballprofiles')`; fail with a server error if the setting is absent. Create the table if it does not exist.
- **Stored entity:** `{ partitionKey: tenantId, rowKey: objectId, profileJson: JSON.stringify(profile), updatedAt: new Date().toISOString() }`.
- **Repository signatures:** `getProfile({ tenantId, objectId })` returns `{ profile, updatedAt }` or `null`; `putProfile({ tenantId, objectId, profile })` upserts the entity and returns `{ savedAt }`.
- **Payload size:** reject serialized profile bodies larger than 48 KiB with 413 before calling Table Storage. Reject malformed JSON or invalid envelope with 400.
- **Envelope checks:** require a plain object, `schemaVersion === 7`, string `nickname` of at most 16 characters, `campaignSave` either null or plain object, `bestRecord` either null or plain object, and plain-object `teamCustomization`. Store only those five allowlisted fields. Existing client-side schema validation remains the canonical detailed campaign validation.
- **Data isolation:** keys are always passed from `requireEntraCaller()`; never take `tenantId`, `objectId`, email, or nickname as a storage key. Use the same key for GET and PUT.

### I02. Register profile HTTP handlers

- Related Files:
  - `game/api/src/functions/profile.js` :: `GET` and `PUT` profile route; new
  - `game/api/src/index.js` :: route import; modify

#### Details

- Register `app.http('profile', { route: 'profile', methods: ['GET', 'PUT'], authLevel: 'anonymous', handler })`. `authLevel: 'anonymous'` is required because Entra bearer authorization is enforced by `requireEntraCaller()` inside the handler.
- `GET /api/profile`: 200 `{ profile, updatedAt }` if found; 404 `{ code: 'PROFILE_NOT_FOUND' }` if this account has no row.
- `PUT /api/profile`: accept `{ profile }`; validate caller before body handling; 200 `{ saved: true, updatedAt }` after upsert.
- Return `application/json` and `Cache-Control: no-store` for success and error responses. Map Table Storage unavailable/configuration errors to 503, without exposing connection strings or SDK error internals.

## Acceptance Criteria

- [ ] GET for an account without a row returns 404; PUT then GET round-trips the v7 profile.
- [ ] Two verified `{tenantId, objectId}` pairs address separate entities; a request cannot choose another account's keys.
- [ ] Invalid/oversized profile payloads are rejected before storage writes.
- [ ] API deployment has no custom CORS requirement and does not expose storage credentials in responses.

## Validation

- `npm run check` (working directory: `game/api`)
- In-memory HTTP-handler smoke check: GET empty profile gives 404, PUT a v7 profile then GET returns it, another verified object ID cannot read the row, invalid bearer gives 401, invalid envelope gives 400, and oversized body gives 413.
- Azure Functions Core Tools and Azurite are not installed in the current environment. Live Azure Table/API integration is therefore deferred to P03-T02 hosted smoke verification.

## Commit Message

```text
feat(profile): persist Entra profiles in Azure Table Storage

Plan: 2026-10-26-entra-login-cloud-save
Phase: P01-profile-api
Task: T02-profile-table-api

- Add account-keyed profile table repository
- Expose authenticated profile GET and PUT routes
```

## Progress

- [x] Implementation complete
- [x] Validation passed
- commit: recorded in Git history
