# Task: T01 Use Existing Profile Container for Daily Results

## Status: in_progress

## Goal
Make daily challenge reads and writes use the existing Cosmos `football/profiles` container so the hosted challenge no longer depends on unprovisioned PvP storage.

## Decisions
- Store daily results as separate tenant-partitioned documents with the existing `daily:${challengeDate}:${objectId}` ID format and `kind: 'dailyChallengeResult'`.
- Keep existing profile documents (`id: objectId`, `profile`, `updatedAt`) unchanged.
- Do not create or configure Azure resources for this task.

## Implementation

### I01. Daily challenge Cosmos repository
- `game/api/src/storage/dailyChallengeCosmos.js` :: new `createDailyChallengeRepository`, Cosmos container cache, `DailyChallengeStorageError`, and `DailyChallengeConcurrencyError`.
- `game/api/src/storage/dailyChallengeCosmos.test.js` :: new fake-container tests for container target, tenant-keyed read/query/create/replace, missing records, and Cosmos conflict mapping.
- Use `CosmosClient(connectionString).database('football').container('profiles')` and preserve errors as safe 503s. Query with partition key `{ partitionKey: tenantId }` and filters on `kind` plus KST challenge date.
- Read daily rows by `id = daily:${challengeDate}:${objectId}` and `tenantId`; create with `items.create`; replace with the existing ETag `IfMatch` condition.

### I02. Remove daily route's PvP dependency
- `game/api/src/functions/dailyChallenge.js` :: replace `createPvpRepository` with `createDailyChallengeRepository`; replace PvP request/storage/concurrency imports with daily challenge-specific errors and name validation.
- `game/api/src/functions/dailyChallenge.test.js` :: use daily challenge-specific concurrency/storage errors in injected fake repository tests; keep existing authorization, ranking, retry, and safe-error behavior.
- `game/api/package.json` :: include the new production repository in syntax checks.
- `game/PVP_AZURE_SETUP.md` :: clarify daily records use the existing `profiles` container and do not require a PvP container.

### I03. Validation and deployment
- Run `npm test` and `npm run check` from `game/api`; run `npm run build` from `game`.
- Confirm source imports for the daily route do not require `functions/pvp.js`, `storage/pvpCosmos.js`, or PvP error classes.
- Deploy through the existing Static Web Apps workflow after local checks; verify deployment success and anonymous daily route remains JSON 401.
- Authenticated challenge read/write verification is performed only through the user's signed-in company session; do not expose tokens or profile contents.

## Acceptance Criteria
- [ ] Daily challenge repository targets `football/profiles` and uses `/tenantId` for all operations.
- [ ] Daily result IDs and `kind` keep result records distinct from profile documents.
- [ ] Daily challenge route no longer depends on the PvP Cosmos container/repository.
- [ ] API tests, syntax checks, frontend build, and deployment pass.
- [ ] Anonymous daily challenge route returns application JSON 401 after deployment.
- [ ] No PvP or other Azure resource is created or modified.

## Validation
- `npm test` from `game/api`.
- `npm run check` from `game/api`.
- `npm run build` from `game`.
- Hosted `GET /api/daily-challenge` without credentials returns JSON `401 AUTH_REQUIRED`.
- Signed-in hosted daily challenge loads without `DAILY_CHALLENGE_STORAGE_UNAVAILABLE`; authenticated results persist in the shared daily ranking.

## Commit Message
```text
fix(daily-challenge): use existing profile container

Plan: 2026-11-03-daily-challenge-storage-recovery
Phase: P01-existing-profile-container
Task: T01-use-existing-profile-container

- Store challenge results separately in the profiles container
- Remove the runtime dependency on PvP Cosmos storage
```

## Progress
- [x] Implementation complete: daily API now uses an independent repository against the existing `profiles` container and imports no PvP repository/domain modules.
- [x] Validation passed: API tests 44/44, `npm run check`, frontend build, and `git diff --check`.
- [ ] Deployment and hosted route verification recorded
- commit: pending
