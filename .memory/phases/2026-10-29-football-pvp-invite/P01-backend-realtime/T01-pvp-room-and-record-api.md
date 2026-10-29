# Task: T01 PvP Room and Record API

## Status: done

## Goal
Provide authenticated server APIs that create and manage one-guest invite rooms, accept PvP result confirmations, and return a tenant-scoped wins leaderboard. Identity must always come from the verified Entra access token; request JSON must never choose an account ID.

## Decision Summary
- Keep PvP state in Cosmos DB, separate from the existing profile and campaign document. Use the existing `football` database and `COSMOS_CONNECTION_STRING`.
- The tenant is the Cosmos partition key. Room codes are six uppercase characters; a room has one host and at most one guest. There is no waiting-room TTL.
- PvP skill IDs are any three distinct values in `SKILL_IDS`; store IDs only and normalize them to level 1 when creating the match. Identity keys use verified `objectId`; display names are presentation labels from the authenticated client.
- Store one match document only after both normal-result submissions match. Forfeit documents are created by the trusted disconnect handler in T02. The leaderboard derives totals from confirmed match documents, so retries cannot increment a counter twice.

## Implementation

### I01. PvP persistence and pure domain validation

- Related Files:
  - `game/api/src/storage/pvpCosmos.js` :: `createPvpRepository`, `createRoom`, `getRoom`, `replaceRoom`, `createMatchOnce`, `listMatches` — Cosmos access; new
  - `game/api/src/pvp/pvpDomain.js` :: `PvpError`, `generateRoomCode`, `validateSkillIds`, `publicRoom`, `buildConfirmedMatch`, `buildForfeitMatch`, `buildLeaderboard` — deterministic validation and projections; new
  - `game/api/src/pvp/pvpDomain.test.js` :: domain validation and projections; new
  - `game/api/src/storage/pvpCosmos.test.js` :: repository behavior with injected container; new
  - `game/api/package.json` :: `scripts.test`, `scripts.check` — make API validation cover new files; modify

#### Details
- **Signatures & Types**:
  ```js
  export class PvpError extends Error {
    constructor(status, code, message);
  }
  export function generateRoomCode(randomBytes = randomBytesFromNodeCrypto);
  export function validateSkillIds(skillIds);
  export function publicRoom(room, viewerObjectId);
  export function buildConfirmedMatch(room, homeGoals, awayGoals, recordedAt);
  export function buildForfeitMatch(room, disconnectedObjectId, recordedAt);
  export function buildLeaderboard(matches, limit = 100);

  export function createPvpRepository({ container } = {});
  // repository methods: createRoom(room), getRoom(tenantId, code),
  // findPlayingRoom(tenantId, objectId), replaceRoom(room, etag), getMatch(tenantId, code),
  // createMatchOnce(match), listMatches(tenantId)
  ```
- **Data & Schema Fields**:
  - Cosmos container: `pvp`, partition key `/tenantId`, database `football`.
  - Room document: `{ id: 'room:<CODE>', tenantId: string, kind: 'room', code: string, hostObjectId: string, hostDisplayName: string, guestObjectId: string|null, guestDisplayName: string|null, status: 'waiting'|'ready'|'playing'|'awaitingResults'|'disputed'|'completed'|'cancelled'|'forfeit', hostSkillIds: string[]|null, guestSkillIds: string[]|null, hostReady: boolean, guestReady: boolean, hostResultVote: {homeGoals:number,awayGoals:number}|null, guestResultVote: {homeGoals:number,awayGoals:number}|null, createdAt: ISO string, updatedAt: ISO string }`.
  - Match document: `{ id: 'match:<CODE>', tenantId: string, kind: 'match', roomCode: string, homeObjectId: string, homeDisplayName: string, awayObjectId: string, awayDisplayName: string, outcome: 'homeWin'|'awayWin'|'draw', homeGoals: integer|null, awayGoals: integer|null, source: 'normal'|'forfeit', recordedAt: ISO string }`. Forfeit score fields are null because the disconnect event does not guarantee a final score snapshot.
  - Do not store user-supplied object IDs. Do not add PvP fields to profile schema version 7 or campaign documents.
  - Loadout validation requires exactly three unique strings from `game/src/game/skills.js` `SKILL_IDS`. The room stores IDs; match state creation later maps each to `{skillId, level: 1}`.
- **Execution Flow / Logic**:
  1. Precondition & Validation: normalize room code to uppercase and require `/^[A-HJ-NP-Z2-9]{6}$/`; require verified `tenantId` and `objectId`; validate `displayName` as a nonempty string of at most 100 characters; validate loadouts with `SKILL_IDS`.
  2. Core Processing: require a pre-created `pvp` container with partition key `/tenantId`; missing container is reported as storage unavailable. Generate a code using alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; create the room with Cosmos `create` (never `upsert`) and retry a 409 collision at most five times. Room operations read then conditionally replace using the Cosmos document ETag; map 409/412 races to `409 ROOM_CHANGED`. A second distinct user may join only `waiting` rooms; host cannot join its own room. Loadout changes are allowed only while that member is not ready; Ready=true requires a saved loadout, and toggling Ready=false resets room status to `waiting`. Start is host-only and requires two members, both loadouts, and both ready flags. Cancel is host-only and allowed before `playing`.
  3. Result & leaderboard: each member submits `{homeGoals, awayGoals}` as nonnegative integers <= 99. Save the first vote to the room. When the second vote arrives, identical scores create exactly one `match:<CODE>` document and set `completed`; unequal scores set `disputed` and create no match. Repeated submissions after completion return the existing result without another record. The leaderboard reads only `kind='match'` documents for the verified tenant, counts wins/losses/draws per object ID, sorts by wins descending then display name ascending, and assigns shared rank `1 + number of users with more wins`.
  4. Error & Exception Handling: return JSON `{code,message}` with 400 for malformed payload/code, 401 for missing/invalid Entra token, 403 for nonmember/role violation, 404 for unknown code, 409 for full/closed/changed room, 413 for oversized payload, 503 for Cosmos unavailable, and 500 for unexpected errors. Never return Cosmos diagnostics or object IDs to clients.
  5. State Transition & Return: all endpoints return `{room: publicRoom}` or `{match: publicMatch}`; public room projection includes code, status, both display names, both skill ID arrays, both ready flags, and `isHost`, but excludes `tenantId`, object IDs, ETags, and private Cosmos metadata.
- **HTTP Contract**:
  - `POST /api/pvp/rooms` body `{displayName}` -> 201 `{room}`.
  - `GET /api/pvp/rooms/{code}` -> 200 `{room}`.
  - `GET /api/pvp/rooms/{code}/result` -> 200 `{status:'awaitingResults'|'disputed'|'completed'|'forfeit',match?}`; member-only, used by both clients to observe mutual confirmation.
  - `POST /api/pvp/rooms/{code}/join` body `{displayName}` -> 200 `{room}`.
  - `PUT /api/pvp/rooms/{code}/loadout` body `{skillIds:[string,string,string]}` -> 200 `{room}`.
  - `POST /api/pvp/rooms/{code}/ready` body `{ready:boolean}` -> 200 `{room}`; status becomes `ready` only when both flags are true.
  - `POST /api/pvp/rooms/{code}/start` -> 200 `{room}`; host-only and requires status `ready`; transitions to `playing`.
  - `DELETE /api/pvp/rooms/{code}` -> 200 `{cancelled:true}`; host-only and pre-match only.
  - `POST /api/pvp/rooms/{code}/result` body `{homeGoals,awayGoals}` -> 200 `{status:'awaitingResults'|'disputed'|'completed',match?}`.
  - `GET /api/pvp/leaderboard` -> 200 `{records:[{rank,displayName,wins,losses,draws,matchesPlayed}]}`; limit to top 100 after shared-rank calculation.

### I02. HTTP handlers and validation
- Related Files:
  - `game/api/src/functions/pvp.js` :: `createPvpHandler`, route registrations — authenticated REST contract; new
  - `game/api/src/index.js` :: import PvP function registrations; modify
  - `game/api/src/functions/pvp.test.js` :: endpoint authorization and state transitions; new
- **Signatures & Types**:
  ```js
  export function createPvpHandler({ authenticate, repository, now, makeCode } = {});
  // Uses authenticate(request) from ../auth/entra.js and repository methods from ../storage/pvpCosmos.js.
  ```
- **Execution Flow / Logic**:
  1. Call the existing `requireEntraCaller(request)` before parsing any command body; it returns `{tenantId, objectId}`.
  2. Register the HTTP routes listed in I01 with `authLevel:'anonymous'` because application authorization is the verified `x-profile-access-token` header.
  3. Use the room ETag from repository reads for compare-and-set transitions. Call `createMatchOnce` only after both normal result votes match.
  4. Return stable `{code,message}` errors and set `Cache-Control: no-store` on every response, matching `functions/profile.js`.
- **Acceptance Criteria**:
  - [ ] A room can be created, joined by exactly one other verified tenant user, configured, readied, started by its creator, and cancelled before start.
  - [ ] All room actions reject nonmembers, wrong roles, invalid skill arrays, stale transitions, and cross-tenant room codes.
  - [ ] A normal result is recorded once only when both authenticated room members submit the same score; disagreement creates no leaderboard entry.
  - [ ] Leaderboard totals derive only from match documents and equal-win users share rank.
  - [ ] Existing profile API behavior and profile schema remain unchanged.

## Validation
- `npm --prefix game/api test` — API domain, storage, handler tests pass.
- `npm --prefix game/api run check` — all registered API modules parse.

## Commit Message
```text
feat(pvp): add invite room and result APIs

Plan: 2026-10-29-football-pvp-invite
Phase: P01-backend-realtime
Task: T01-pvp-room-and-record-api

- Persist tenant-scoped rooms and completed matches in Cosmos
- Add verified room lifecycle, result confirmation, and wins leaderboard endpoints
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: specified in git history
