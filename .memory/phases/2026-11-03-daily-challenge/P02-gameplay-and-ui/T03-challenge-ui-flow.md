# Task: T03 Challenge UI Flow

## Status: done

## Goal
Let signed-in company users open today's challenge, review its conditions and current leaderboard, play or retry one match, submit the final score, and see the updated daily rank without changing campaign progress.

## Decision Summary
- Show only today's leaderboard; retries are unlimited and update one best result per account/date. No campaign or cosmetic reward is granted.
- Local development accounts do not enter a company-wide ranked challenge. Existing campaign, result, and PvP screens remain separate.

## Implementation

### I01. Start screen and App orchestration

- Related Files:
  - `game/src/App.jsx` :: `App`, `openDailyChallenge`, `startDailyChallenge`, `handleDailyChallengeEvents`, `submitDailyChallengeResult`; modify
  - `game/src/components/StartScreen.jsx` :: `StartScreen`; add challenge entry prop/button
  - `game/src/App.test.js` :: pure challenge flow/state transition cases; modify
  - `game/src/dailyChallenge/dailyChallengeFlow.js` :: terminal event mapping and result retry helpers; new
  - `game/src/dailyChallenge/dailyChallengeFlow.test.js` :: flow tests; new

#### Details
- **Signatures & Types**:
  ```javascript
  export function getDailyChallengeTerminalResult(events) {}
  // -> { homeGoals, awayGoals, outcome, goalDifference } | null

  // App state additions:
  // dailyChallengeData: { challenge, myRecord, records } | null
  // dailyChallengeResult: { homeGoals, awayGoals, outcome, goalDifference, rank|null } | null
  // screens: 'dailyChallenge', 'dailyMatch', 'dailyResult'
  ```
- **Data & Schema Fields**:
  - Do not add daily values to `profile`, `campaignSave`, or `bestRecord`.
  - `dailyChallengeData` stores only the validated response from `dailyChallengeApi`.
  - Use `account.name || account.username` for the display name sent with a result; account/tenant IDs are never sent.
- **Execution Flow / Logic**:
  1. Add a `오늘의 챌린지` entry button on StartScreen, shown with the existing company PvP actions only when `!localDevelopmentMode`.
  2. On entry, fetch `/api/daily-challenge`, show loading/error states, and open the lobby only when a valid challenge response arrives.
  3. On start, call `createDailyChallengeMatchState` with the server challenge and profile customization/celebration, clear any previous daily result, and set screen to `dailyMatch`.
  4. Render the existing `GameScreen` for `dailyMatch`; add `simulationMode='dailyChallenge'` label behavior and suppress the campaign save-and-exit pause action. The DEX header remains an exit-to-home path.
  5. On the first terminal event among `matchWon`, `matchLost`, `matchDraw`, derive score/outcome, guard duplicate events with a per-match ref, submit the result once, update `dailyChallengeData`, and show `dailyResult`.
  6. If POST returns `CHALLENGE_CHANGED`, fetch current day again and explain that the challenge reset; do not attach the old score to the new day. If POST fails for a network/storage error, preserve the result locally in React state and expose `결과 다시 제출` using the same idempotent API call.
  7. Retry returns to today's lobby and starts a fresh match with full one-use counters. Home exits without writing campaign data. No reward screen is entered.
  8. Do not show prior dates; when the lobby is re-opened or refreshed, load the server's current date and ranking.
- **Error & Exception Handling**:
  - Loading and submission failures are displayed in the challenge screen with retry controls; do not silently claim a score was saved.
  - A duplicate game terminal callback cannot create multiple submissions because the per-match guard and server best-record key are both idempotent.

### I02. Challenge lobby, results, and leaderboard UI

- Related Files:
  - `game/src/components/DailyChallengeScreen.jsx` :: `DailyChallengeScreen`; new
  - `game/src/components/StartScreen.jsx` :: challenge action placement; modify
  - `game/src/styles.css` :: `.daily-challenge-*` styles and responsive rules; modify
  - `game/src/components/GameScreen.jsx` :: daily match label and skill-use visibility support is completed in P02/T01; read-only here

#### Details
- **Signatures & Types**:
  ```javascript
  export default function DailyChallengeScreen({
    data, loading, errorMessage, result, saving, submitError,
    onRefresh, onStart, onRetrySubmit, onRetryMatch, onHome,
  }) {}
  ```
- **Execution Flow / Logic**:
  1. Lobby view shows KST date, regulation seconds, AI stage, fixed skills, the caller's best result/rank if present, and today's top-100 list.
  2. Result view shows the submitted match score/outcome and the returned rank; if not saved, show the retry-submit action and pending-save message.
  3. Provide explicit refresh, play/retry, and return-home buttons. The current day's leaderboard remains available after the match.
  4. Use semantic heading/list markup, accessible loading/status/error roles, visible keyboard focus, and mobile layout at the existing `760px` breakpoint.
  5. Do not display account IDs, tenant IDs, hidden dates, campaign rewards, or fake rank values while the API is loading or submission has failed.
- **Error & Exception Handling**:
  - Empty leaderboard uses a clear first-challenge message.
  - Loading, API error, no personal record, unsaved result, and populated leaderboard are distinct states.

### I03. UI and flow validation

- Related Files:
  - `game/src/dailyChallenge/dailyChallengeFlow.test.js` :: terminal event/result tests; new
  - `game/src/dailyChallenge/dailyChallengeApi.test.js` :: API retry contract already added in P02/T02; read-only
  - `game/src/App.test.js` :: challenge flow cases; modify

#### Details
- Verify only terminal match events create results; duplicate terminal events are ignored; draw stays a draw; a failed submit remains retryable.
- Verify challenge actions are hidden for local development mode, campaign profile fields are untouched, and retry creates a fresh match rather than resuming old state.
- Verify the result screen never claims server success before a successful response and handles the day-change conflict by refreshing.
- Use the Vite build as the component/JSX compilation check because this repository has no DOM component-testing dependency.

## Acceptance Criteria
- [x] Signed-in company users can enter, play, retry, and inspect today's challenge leaderboard from the start screen.
- [x] Each completed match produces at most one submission; failed submissions can be retried without losing the local result.
- [x] Only server-confirmed best records appear as saved, and all UI shows the current KST day's data.
- [x] Daily play does not alter campaign saves, campaign records, or reward flow.
- [x] Mobile and keyboard-accessible loading, empty, error, lobby, and result states render correctly.

## Validation
- `npm test -- src/dailyChallenge/dailyChallengeFlow.test.js src/dailyChallenge/dailyChallengeApi.test.js` from `game` — flow and API client tests pass.
- `npm test -- src/App.test.js` from `game` — existing and new pure App flow tests pass.
- `npm run build` from `game` — all JSX, styles, and client imports compile.

## Commit Message
```text
feat(daily-challenge): add daily challenge player flow

Plan: 2026-11-03-daily-challenge
Phase: P02-gameplay-and-ui
Task: T03-challenge-ui-flow

- Add challenge entry, match completion, and retry handling
- Show today's challenge rules, result, and company ranking
```

## Progress
- [x] 구현 완료
- [x] 플로우/API 테스트, App 순수 로직 테스트, Vite production build 통과
- commit: `4a32cd8`
