# Task: T02 Daily Challenge API

## Status: done

## Goal
Expose an authenticated company API that returns today's KST challenge and leaderboard, accepts bounded client results, and keeps one best result per account per date in the existing Cosmos PvP container.

## Decision Summary
- Use Entra identity from `requireEntraCaller`, the existing `football/pvp` container partitioned by `tenantId`, and one Cosmos document per `{tenantId, KST date, objectId}`.
- Register only the new daily challenge routes in the managed API entry point; do not re-enable the separately disabled PvP routes.

## Implementation

### I01. Cosmos repository support

- Related Files:
  - `game/api/src/storage/pvpCosmos.js` :: `createPvpRepository` — add daily record operations using the existing container; modify
  - `game/api/src/storage/pvpCosmos.test.js` :: fake Cosmos and repository tests; modify

#### Details
- **Signatures & Types**:
  ```javascript
  // Extend the object returned by createPvpRepository:
  getDailyChallengeRecord(tenantId, challengeDate, objectId)
    // -> Promise<{ document: DailyChallengeRecord|null, etag: string|null }>
  listDailyChallengeRecords(tenantId, challengeDate)
    // -> Promise<DailyChallengeRecord[]>
  createDailyChallengeRecord(record)
    // -> Promise<{ document: DailyChallengeRecord, etag: string|null }>
  replaceDailyChallengeRecord(record, etag)
    // -> Promise<{ document: DailyChallengeRecord, etag: string|null }>
  ```
- **Data & Schema Fields**:
  - Stored `DailyChallengeRecord`: `id = daily:${challengeDate}:${objectId}`, `tenantId`, `kind: 'dailyChallengeResult'`, `challengeDate`, `objectId`, `displayName`, `homeGoals`, `awayGoals`, `outcome`, `goalDifference`, and server-generated ISO `recordedAt`.
  - Keep the existing Cosmos `football/pvp` container and `/tenantId` partition key. Do not expose `_etag`, `_rid`, `tenantId`, or `objectId` in public API records.
- **Execution Flow / Logic**:
  1. Use existing `getContainer`, `resolveContainer`, `readDocument`, `applicationFields`, and Cosmos error mapping; do not create a second Cosmos client or container.
  2. Read/write records by the deterministic ID and tenant partition key.
  3. Query daily rows with parameterized SQL `c.kind = @kind AND c.challengeDate = @challengeDate`, passing `{ partitionKey: tenantId }`.
  4. Create a missing result with `items.create`; map Cosmos 409 to the existing concurrency error so the handler can reread and retry.
  5. Replace an existing result with the supplied ETag `IfMatch`; map 409/412 to the existing concurrency error and other failures to `PvpStorageError`.
  6. The container has `defaultTtl: -1`; retain prior daily rows but query only the current challenge date.
- **Error & Exception Handling**:
  - Preserve the repository's existing `PvpStorageError` and `PvpConcurrencyError` behavior.
  - A missing document returns `{ document: null, etag: null }`; it is not a storage error.

### I02. Authenticated daily challenge HTTP contract

- Related Files:
  - `game/api/src/functions/dailyChallenge.js` :: `createDailyChallengeHandler`, HTTP route registration; new
  - `game/api/src/functions/dailyChallenge.test.js` :: handler contract and concurrency tests; new
  - `game/api/src/index.js` :: import the new function module; modify
  - `game/api/package.json` :: include new files in `check`; modify

#### Details
- **Signatures & Types**:
  ```javascript
  export function createDailyChallengeHandler({
    authenticate = requireEntraCaller,
    repository = createPvpRepository(),
    now = () => new Date(),
  } = {}) {}
  // GET /api/daily-challenge
  // -> { challenge: DailyChallenge, myRecord: PublicDailyChallengeRecord|null,
  //      records: PublicDailyChallengeRecord[] }
  // POST /api/daily-challenge/results
  // body: { challengeId: string, displayName: string, homeGoals: integer, awayGoals: integer }
  // -> { record: PublicDailyChallengeRecord, records: PublicDailyChallengeRecord[] }
  ```
- **Data & Schema Fields**:
  - Caller identity comes only from `authenticate(request)` and supplies `tenantId` and `objectId`.
  - `displayName` is trimmed, must be 1–100 characters, and must not contain C0/DEL control characters. Use the same normalization rules as `normalizeDisplayName` in `pvpDomain.js`.
  - Public records contain only `rank`, `displayName`, `homeGoals`, `awayGoals`, `outcome`, and `goalDifference`.
- **Execution Flow / Logic**:
  1. Authenticate before parsing a request body. Return `Cache-Control: no-store` and JSON on every response, following `functions/pvp.js` conventions.
  2. GET computes the current KST challenge from the injected `now`, reads caller's record and all records for that date in the tenant, builds the top-100 public ranking, and returns the challenge, caller record, and records.
  3. POST limits the body to 8 KiB; validates the JSON object, `challengeId`, display name, and score using T01 domain functions. Recompute today's challenge on the server and return `409 CHALLENGE_CHANGED` if the supplied ID does not match.
  4. Derive `outcome` and `goalDifference` on the server. Never accept caller-provided account IDs, tenant IDs, date, outcome, or goal difference.
  5. Use a maximum of three optimistic concurrency attempts: read the caller/date row; if absent, create it; if present, replace it only when the new result ranks strictly higher; if tied or lower, preserve the stored result. On conflict, reread and retry.
  6. Reread current-date records and return the public leaderboard after the write/no-op. This makes repeated submits idempotent and returns the latest rank.
  7. Register `GET /daily-challenge` and `POST /daily-challenge/results` with `authLevel: 'anonymous'` plus application Entra authentication, as in `functions/profile.js`. Import `./functions/dailyChallenge.js` from `src/index.js`; do not import `functions/pvp.js`.
- **Error & Exception Handling**:
  - `401/403`: propagate `EntraAuthError`.
  - `400`: malformed JSON/body, invalid display name, or invalid scores (`INVALID_JSON`, `INVALID_BODY`, `INVALID_DISPLAY_NAME`, `INVALID_SCORE`).
  - `409`: stale challenge ID (`CHALLENGE_CHANGED`) or exhausted concurrency retries (`ROOM_CHANGED`-style conflict code `DAILY_RESULT_CHANGED`).
  - `503`: map repository failures to a safe `DAILY_CHALLENGE_STORAGE_UNAVAILABLE` response; do not leak Cosmos details.
  - Do not claim server-side score verification: the server validates bounded submitted scores only, as confirmed.

### I03. API tests and syntax coverage

- Related Files:
  - `game/api/src/functions/dailyChallenge.test.js` :: authenticated endpoint tests; new
  - `game/api/src/storage/pvpCosmos.test.js` :: daily record storage/concurrency tests; modify

#### Details
- Verify auth occurs before JSON parsing; unauthenticated invalid JSON returns 401.
- Verify GET returns identical server-computed date/settings to all callers in a tenant, only that date's records, caller's own record, and no private identifiers.
- Verify POST rejects invalid score, untrusted extra identity fields, over-size body, invalid display name, and stale `challengeId`.
- Verify new result create, better retry replace, worse/tied retry preserve, concurrent create conflict retry, ETag replacement, tenant isolation, and safe 503 errors.
- Verify route module is imported by `src/index.js` and `npm run check` syntax-checks the new domain, repository, handler, and tests' production modules.

## Acceptance Criteria
- [x] Authenticated users can fetch the same current-day challenge and tenant-wide top-100 ranking.
- [x] At most one best result exists per account/date/tenant, including concurrent retry submissions.
- [x] Server derives the date, preset, outcome, and goal difference; API never returns account or tenant IDs.
- [x] Hosted Functions entry point registers daily challenge routes without registering the disabled PvP routes.
- [x] Prior dates are not included in the current leaderboard response.

## Validation
- `npm test -- src/functions/dailyChallenge.test.js src/storage/pvpCosmos.test.js src/dailyChallenge/dailyChallengeDomain.test.js` from `game/api` — handler, storage, and domain tests pass.
- `npm run check` from `game/api` — all registered production modules pass syntax checks.

## Commit Message
```text
feat(daily-challenge): add authenticated daily leaderboard API

Plan: 2026-11-03-daily-challenge
Phase: P01-server-api
Task: T02-daily-challenge-api

- Store one best score per tenant, account, and KST date
- Register authenticated challenge and leaderboard endpoints
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: committed
