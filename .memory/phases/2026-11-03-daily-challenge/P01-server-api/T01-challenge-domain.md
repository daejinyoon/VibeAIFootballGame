# Task: T01 Challenge Domain

## Status: done

## Goal
Create a deterministic server-side daily challenge domain module so every API instance maps a KST calendar date to the same match preset and ranks results using the confirmed win/draw/loss and goal-difference rules.

## Decision Summary
- Use a seven-entry preset cycle, fixed skill IDs `eagleShot`, `tornadoShot`, and `eulryongta`, KST date boundaries, and result ordering win > draw > loss > goal difference.
- This task defines pure rules only; persistence, HTTP handlers, and client behavior belong to T02 and P02.

## Implementation

### I01. Daily date and preset domain

- Related Files:
  - `game/api/src/dailyChallenge/dailyChallengeDomain.js` :: `getKstDate`, `getDailyChallenge`, `DAILY_CHALLENGE_PRESETS` — deterministic date and match contract; new
  - `game/api/src/dailyChallenge/dailyChallengeDomain.test.js` :: domain tests; new
  - `game/api/package.json` :: `scripts.check` — include the new production module in syntax validation; modify

#### Details
- **Signatures & Types**:
  ```javascript
  /** @typedef {{ date: string, challengeId: string, regulationSeconds: number, aiStage: number, skillIds: string[] }} DailyChallenge */
  /** @typedef {{ homeGoals: number, awayGoals: number, outcome: 'win'|'draw'|'loss', goalDifference: number }} DailyChallengeScore */

  export function getKstDate(now = new Date()) {} // -> string YYYY-MM-DD
  export function getDailyChallenge(now = new Date()) {} // -> DailyChallenge
  export function validateDailyChallengeScore(value) {} // -> DailyChallengeScore; throws DailyChallengeDomainError on invalid data
  export function compareDailyChallengeResults(left, right) {} // -> negative if left ranks ahead, 0 if tied, positive if behind
  export function buildDailyChallengeLeaderboard(records, limit = 100) {} // -> Array<PublicDailyChallengeRecord>
  ```
- **Data & Schema Fields**:
  - `DailyChallenge`: `date: string` in `YYYY-MM-DD` KST, `challengeId: string` formatted `${date}:${presetIndex}`, `regulationSeconds: integer`, `aiStage: integer`, `skillIds: exactly ['eagleShot','tornadoShot','eulryongta']`.
  - `DailyChallengeScore`: `homeGoals` and `awayGoals` are integers 0–99; `outcome` is derived by comparing the scores; `goalDifference = homeGoals - awayGoals`.
  - `PublicDailyChallengeRecord`: `rank: integer`, `displayName: string`, `homeGoals: integer`, `awayGoals: integer`, `outcome: 'win'|'draw'|'loss'`, `goalDifference: integer`. It must not contain tenant or object IDs.
- **Execution Flow / Logic**:
  1. Convert the supplied `Date` to `Asia/Seoul` with `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })`; normalize to `YYYY-MM-DD` using `formatToParts` so host timezone does not affect the result.
  2. Compute UTC epoch-day for the KST date string and select `epochDay % 7` from the immutable preset array: `{45,2}`, `{45,3}`, `{40,3}`, `{40,4}`, `{35,4}`, `{30,5}`, `{35,5}` where values are `{ regulationSeconds, aiStage }`.
  3. Return a new challenge object with the date, stable ID, selected settings, and a new copy of the fixed `skillIds` array.
  4. Validate score payloads as a non-array object with integer goals 0–99. Derive outcome as win when home > away, draw when equal, otherwise loss. Reject invalid values with an error carrying code `INVALID_SCORE`.
  5. Compare result tuples in order: outcome weight (`win: 2`, `draw: 1`, `loss: 0`) descending, then goal difference descending. Equal tuples are tied. Sort display names with Korean locale only for deterministic presentation inside tied ranks; rank numbers remain shared for equal tuples.
  6. Filter malformed records, sort best results first, cap to `limit` (default 100; clamp invalid limits to 100), and assign competition ranks (`1, 1, 3`) so exact ties share rank.
- **Error & Exception Handling**:
  - Export `DailyChallengeDomainError extends Error` with `code` and `status`; invalid dates/scores use `400` and `INVALID_DATE`/`INVALID_SCORE`.
  - Do not read date, outcome, or goal difference as trusted fields from a submitted result; only goal counts are validated and derived.

### I02. Domain tests

- Related Files:
  - `game/api/src/dailyChallenge/dailyChallengeDomain.test.js` :: deterministic domain cases; new

#### Details
- Verify a fixed UTC instant maps to the expected KST date, including instants immediately before and after KST midnight.
- Verify the same KST date produces identical challenge IDs/settings regardless of the input instant's represented timezone; verify seven consecutive dates cover all seven presets and the eighth repeats the first.
- Verify goal validation rejects strings, fractions, negatives, values above 99, arrays, and null; verify win/draw/loss derivation.
- Verify wins rank before draws and losses, goal difference breaks ties inside each outcome, exact ties share rank, malformed rows are omitted, and public records omit identity keys.

## Acceptance Criteria
- [x] KST date and challenge preset are deterministic and independent of server local timezone.
- [x] Only the agreed skill IDs and setting ranges are returned.
- [x] Result validation and leaderboard ordering match the confirmed decisions, including shared ranks and draws.
- [x] Domain module has no Cosmos, Azure Functions, browser, or network dependency.

## Validation
- `npm test -- src/dailyChallenge/dailyChallengeDomain.test.js` from `game/api` — all domain tests pass.
- `npm run check` from `game/api` — Node syntax check passes after the check script includes the new module.

## Commit Message
```text
feat(daily-challenge): define daily challenge rules

Plan: 2026-11-03-daily-challenge
Phase: P01-server-api
Task: T01-challenge-domain

- Derive shared KST challenge presets deterministically
- Validate scores and build shared-rank leaderboards
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: committed
