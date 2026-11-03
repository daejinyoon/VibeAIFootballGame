# Task: T02 Client API

## Status: pending

## Goal
Add a browser API client that authenticates requests for today's challenge and posts bounded match scores while validating server responses before the UI uses them.

## Decision Summary
- Use the existing `getProfileApiToken` flow and `X-Profile-Access-Token` header convention; never send a local development identity to the company leaderboard.
- Server response and request shapes are those defined in `P01/T02-daily-challenge-api.md`.

## Implementation

### I01. Authenticated daily challenge client

- Related Files:
  - `game/src/dailyChallenge/dailyChallengeApi.js` :: `createDailyChallengeApi`, `DailyChallengeApiError`; new
  - `game/src/dailyChallenge/dailyChallengeApi.test.js` :: request and response contract tests; new

#### Details
- **Signatures & Types**:
  ```javascript
  export class DailyChallengeApiError extends Error {
    constructor(status, code, message) {}
  }
  export function createDailyChallengeApi({ acquireToken = getProfileApiToken, fetchImpl = fetch } = {}) {}
  // api.getDailyChallenge() -> Promise<{ challenge, myRecord, records }>
  // api.submitResult({ challengeId, displayName, homeGoals, awayGoals })
  //   -> Promise<{ record, records }>
  ```
- **Data & Schema Fields**:
  - `challenge`: `date`, `challengeId`, `regulationSeconds`, `aiStage`, `skillIds`.
  - `record`: `rank`, `displayName`, `homeGoals`, `awayGoals`, `outcome`, `goalDifference`.
  - `records`: array of validated public record objects, with no identity keys.
- **Execution Flow / Logic**:
  1. Acquire a fresh profile API token for every request; translate token failure or blank token to `401 AUTH_REQUIRED`.
  2. GET `/api/daily-challenge` with `X-Profile-Access-Token: Bearer ${token}` and `cache: 'no-store'`.
  3. POST `/api/daily-challenge/results` with JSON `{ challengeId, displayName, homeGoals, awayGoals }`, the same auth header, and JSON content type.
  4. Validate HTTP JSON response shape, challenge date/id/settings, skill IDs, score bounds, record result enum, and leaderboard rank integers before returning values.
  5. Convert malformed success responses to `500 INVALID_SERVER_RESPONSE`; convert HTTP errors using safe server `code`/`message`; network errors to `0 NETWORK_ERROR` with a Korean retry message.
- **Error & Exception Handling**:
  - Never retry a 401 anonymously and never expose internal fetch/network exception text.
  - Reject invalid client score input locally before sending a request.
  - A 409 `CHALLENGE_CHANGED` remains visible to App so it can refresh today's challenge.

### I02. Client tests

- Related Files:
  - `game/src/dailyChallenge/dailyChallengeApi.test.js` :: token, HTTP, validation, and error tests; new

#### Details
- Verify each call acquires a fresh token, uses the correct path/method/headers, uses `no-store`, and serializes only agreed request fields.
- Verify fetch errors, token errors, HTTP 401/409/503, non-JSON errors, malformed challenge objects, malformed rankings, and invalid local scores.
- Verify response mapping discards extra private fields even if the server returns them.

## Acceptance Criteria
- [ ] UI callers can fetch today's challenge and submit a result through one injectable client.
- [ ] Requests follow existing Entra API header conventions and avoid browser caching.
- [ ] Invalid responses and network/auth errors produce stable user-safe `DailyChallengeApiError` values.

## Validation
- `npm test -- src/dailyChallenge/dailyChallengeApi.test.js` from `game` — client contract tests pass.
- `npm run build` from `game` — Vite compiles the new client module.

## Commit Message
```text
feat(daily-challenge): add authenticated browser API client

Plan: 2026-11-03-daily-challenge
Phase: P02-gameplay-and-ui
Task: T02-client-api

- Fetch the current challenge and company ranking
- Submit scores with validated Entra-authenticated requests
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
