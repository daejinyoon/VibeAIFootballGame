# Task: T03 PvP Match Results and Leaderboard

## Status: done

## Goal
Connect ready rooms to the real-time match, show a correct PvP result without invoking campaign rewards, collect both normal-result confirmations, and display the company-wide total-wins leaderboard.

## Decision Summary
- Use the T02 backend contract and T02 simulation modes. `@azure/web-pubsub-client` connects clients using a fresh `/api/pvp/negotiate` URL.
- Host is home and simulates; guest is away and sends input. Host sends snapshots to the room group; a guest input is upstreamed and relayed by the server.
- Normal results count only after both matching score submissions; server-confirmed disconnect forfeits count automatically. PvP result handling never saves or advances campaign state.

## Implementation

### I01. Web PubSub browser connection and PvP state construction

- Related Files:
  - `game/src/pvp/pvpConnection.js` :: `createPvpConnection` — negotiate, subscribe, send input/snapshot, lifecycle; new
  - `game/src/pvp/pvpConnection.test.js` :: connection messages and close handling; new
  - `game/src/pvp/pvpApi.js` :: `submitResult`, `getRoom`, `getLeaderboard` — result and ranking calls; modify
  - `game/src/App.jsx` :: connect after `ready`, build match, route host/guest role; modify
  - `game/package.json` :: `@azure/web-pubsub-client` dependency; modify
  - `game/package-lock.json` — lock browser client SDK; modify
- **Signatures & Types**:
  ```js
  export function createPvpConnection({ api, WebPubSubClientClass = WebPubSubClient,
    onInput, onSnapshot, onForfeit, onStatus } = {});
  // methods: start(code), sendInput(frame, sequence), sendSnapshot(state, sequence), stop()
  ```
- **Execution Flow / Logic**:
  1. After `/api/pvp/rooms/{code}` reports `playing`, call `POST /api/pvp/negotiate` for a role-bound URL; instantiate `WebPubSubClient` from `@azure/web-pubsub-client` and register callbacks before `start()`.
  2. Host consumes only `input` events and writes them to the away input buffer; guest consumes only `snapshot` and `forfeit` events. Ignore messages with invalid JSON, wrong type, invalid sequence, or unexpected state shape.
  3. Host sends authoritative snapshots at 20 Hz through its group permission. Guest sends `pvp-input` frames at 20 Hz/edge changes; never allow a guest-provided state snapshot to mutate the host or guest render state.
  4. Create initial state with `createInitialGameState({stage:1,teamSkillDeck:hostDeck,opponentSkillDeck:guestDeck})` where both decks map the room's ordered skill IDs to `{skillId,level:1}`. Use one fixed default team branding object for the whole match so both clients render identical teams.
  5. `stop()` must remove callbacks, close the SDK client, clear timers, and be safe to call more than once on unmount, result screen, cancel, or route change.
- **Data & Schema Fields**:
  - Client connection states: `connecting | connected | disconnected | failed`.
  - Host and guest roles come from the authenticated public room projection, not URL query parameters or client-provided role values.
- **Acceptance Criteria**:
  - [x] Only host can send group snapshots; guest input reaches host through validated upstream forwarding.
  - [x] Both users receive the same room skill decks and deterministic initial score/clock state.
  - [x] Unmount and all terminal paths close the connection and clear every interval/listener.

### I02. Separate PvP results and leaderboard screens
- Related Files:
  - `game/src/components/PvpResultsScreen.jsx` :: `PvpResultsScreen` — normal result, pending confirmation, disputed result, and forfeit display; new
  - `game/src/components/PvpLeaderboardScreen.jsx` :: `PvpLeaderboardScreen` — company ranking by wins; new
  - `game/src/components/StartScreen.jsx` :: PvP leaderboard entry; modify
  - `game/src/App.jsx` :: PvP terminal state, result submit/poll, leaderboard navigation; modify
  - `game/src/styles.css` :: result and ranking styles/responsive behavior; modify
  - `game/src/App.test.jsx` :: no campaign writes in PvP and matching-result state; modify
- **Signatures & Types**:
  ```js
  PvpResultsScreen({ result, confirmationStatus, errorMessage, onLeaderboard, onHome });
  PvpLeaderboardScreen({ records, loading, errorMessage, onRefresh, onBack });
  // GET /api/pvp/rooms/{code}/result -> {status, match?}
  // GET /api/pvp/leaderboard -> {records:[{rank,displayName,wins,losses,draws,matchesPlayed}]}
  ```
- **Data & Schema Fields**:
  - Normal result: `{kind:'normal',homeGoals:number,awayGoals:number,localOutcome:'win'|'loss'|'draw'}`.
  - Forfeit result: `{kind:'forfeit',loser:'home'|'away',localOutcome:'win'|'loss'}`; no fabricated score.
  - Confirmation status: `submitting | awaitingOpponent | recorded | disputed | notRecorded`.
- **Execution Flow / Logic**:
  1. On authoritative `matchWon`, `matchLost`, or `matchDraw`, stop simulation and submit `{homeGoals,awayGoals}` once for the current room. Do not invoke `finishStage`, `updateBestRecord`, `createCampaignSave`, `awardSkillCard`, or `saveProfile`.
  2. While API returns `awaitingResults`, poll `GET /api/pvp/rooms/{code}/result` every 2 seconds. Stop when status becomes `completed` or `disputed`; a completion page may load the leaderboard using a separate action.
  3. On `{type:'forfeit'}`, show the forfeit outcome and do not submit a normal score. The server already recorded it.
  4. Display `기록 확인 중` while awaiting the other user, `전적에 기록됨` when confirmed, and `결과 불일치로 기록되지 않음` when disputed. A normal score is shown from the shared authoritative state.
  5. Leaderboard shows rank, Entra display name, wins, losses, draws, and games played; sort by wins descending and display same rank for ties. Do not show object IDs or campaign best records in the PvP table.
  6. Add an explicit PvP leaderboard action on the start screen, separate from the existing local campaign hall of fame. Handle empty response, retry, and loading states.
- **Acceptance Criteria**:
  - [x] PvP endings never show campaign skill rewards or mutate campaign profile data.
  - [x] Both clients submit one normal result; records are shown only after server confirmation.
  - [x] A forfeit is displayed and ranked without waiting for confirmation from the disconnected player.
  - [x] Disputed results are not presented as ranked wins.
  - [x] Company leaderboard displays account names and all four totals and shares rank when wins tie.

## Validation
- `npm --prefix game test` — connection, result confirmation, and existing app tests pass.
- `npm --prefix game run build` — complete PvP screens and SDK imports compile.

## Commit Message
```text
feat(pvp): connect matches and show verified records

Plan: 2026-10-29-football-pvp-invite
Phase: P02-game-client
Task: T03-pvp-match-results-and-leaderboard

- Connect host and guest to room-scoped Web PubSub messages
- Add isolated PvP results and company total-wins leaderboard
```

## Progress
- [x] Implementation complete
- Focused PvP/API tests: 16/16 pass; production build succeeds.
- Full game suite: 212/215 pass; the same three campaign regression tests already present before T03 remain failing (opening skill grace, Eulryongta handoff, knockdown input/AI movement).
- commit: recorded in Git history
