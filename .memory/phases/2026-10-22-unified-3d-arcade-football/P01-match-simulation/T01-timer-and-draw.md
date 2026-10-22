# Task: T01 정규 시간·골든골·무승부 결과 전이

## Status: done

## Goal
60초 정규 시간과 30초 골든골을 모든 경기 재개 상태에서 일관되게 차감하고, 동점으로 끝나면 보상·랭킹 없이 같은 캠페인 단계를 재도전할 수 있도록 시뮬레이션과 캠페인 결과 경로를 완성한다.

## Decision Summary
- `remainingSeconds`는 정규 시간, `overtimeRemainingSeconds`는 골든골 시간으로 둔다. pause는 `stepGame`이 호출되지 않으므로 시간도 흐르지 않는다.
- 결과 이벤트는 `matchWon`, `matchLost`, `matchDraw` 중 하나이며 모두 `{type, score}`를 가진다. 무승부는 캠페인과 최고 기록을 수정하지 않는다.

## Implementation

### I01. Match clock and terminal events
- Related Files:
  - `game/src/game/constants.js` :: `REGULATION_SECONDS`, `GOLDEN_GOAL_SECONDS` — 경기 제한 상수; modify
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` — 시계 필드 초기화; modify
  - `game/src/game/stepGame.js` :: `finishMatch`, `scoreGoal`, `beginKickoff`, `beginGoalKick`, `beginSetPiece`, `stepGame` — phase/time/outcome 전이; modify
  - `game/src/game/stepGame.test.js` :: timer/result tests — 경계 조건; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type MatchPhase = 'playing' | 'overtime' | 'goalPause' | 'goalKick' | 'freeKick' | 'penaltyKick' | 'finished';
  type MatchEndEvent = { type: 'matchWon' | 'matchLost' | 'matchDraw'; score: { home: number; away: number } };
  // stepGame(state: GameState, inputFrame?: InputFrame, deltaSeconds?: number): MatchEvent[]
  ```
- **Data & Schema Fields**:
  - `REGULATION_SECONDS: number = 60`, `GOLDEN_GOAL_SECONDS: number = 30`.
  - Game state `remainingSeconds: number` starts at `60`; `overtimeRemainingSeconds: number | null` starts `null`, becomes `30` on tied regulation expiry, and is `0` after tied golden-goal expiry.
  - Match events: `overtime` with `{type: 'overtime'}`, terminal event with copied score `{home:number, away:number}`.
- **Execution Flow / Logic**:
  1. For any live phase except `finished`, subtract clamped `dt` once from the active clock before phase-specific early returns. Use `remainingSeconds` during regulation and `overtimeRemainingSeconds` during golden goal. Do not subtract twice during transitions.
  2. Regulation reaching zero with a leader calls `finishMatch`, immediately returning `matchWon` or `matchLost`. At a tie set phase to `overtime`, initialize 30 seconds, append `overtime`, then continue simulation.
  3. A goal in `overtime` ends immediately through `finishMatch`; expiry at a tie sets `finished` and emits `matchDraw`. No tie goes through win/loss fallback.
  4. Goal pause, goal kick, free kick, penalty, and kickoff transition countdowns still run while the active match clock decreases. `finished` and `dt === 0` remain no-ops.
  5. `finishMatch` returns one terminal event only and selects `matchDraw` iff score is tied, otherwise compares home/away.
- **Error & Exception Handling**: preserve `stepGame` state validation and `[0, MAX_DELTA]` clamp; missing/null overtime field in a legacy state initializes to 30 only on transition into overtime.
- **State Transition & Return**: terminal phase is `finished`; emitted terminal event carries a fresh score object; `scoreGoal` emits goal then terminal event for golden-goal scores.

### I02. Campaign and result routing
- Related Files:
  - `game/src/game/campaign.js` :: `finishStage` — tie retry without progression; modify
  - `game/src/game/campaign.test.js` :: `finishStage` tie case — state preservation; modify
  - `game/src/App.jsx` :: `handleGameEvents` — outcome branch and save/record routing; modify

#### Details
- `finishStage(campaign, result, rng)` keeps its current score validation and win/loss behavior. If `homeGoals === awayGoals`, return a shallow campaign copy with `currentStage`, `clearedStageResults`, `playerSkillStacks`, `skillInventory`, `pendingSkillOffer`, `status`, and opponent skill sets unchanged; do not throw and do not draw an offer.
- `handleGameEvents` accepts `matchWon|matchLost|matchDraw`. For draw: do not call `updateBestRecord`; call tie-safe `finishStage` only if its no-op behavior is covered, persist the unchanged campaign, set `outcome:'draw'`, set `goalDifference` to the previous cleared-stage total, and show results. For win/loss retain existing record rules.
- T01 UI is intentionally in P02 T03; this implementation only routes a stable `draw` outcome and retry callback through existing App state.

## Acceptance Criteria
- [ ] 60 seconds are consumed in playing, goal pause, goal kick, free kick and penalty phases; pause/finished simulation does not consume time.
- [ ] Tied regulation starts exactly 30 seconds; golden-goal score ends immediately; a second tie ends with exactly one `matchDraw` event.
- [ ] Draw leaves stage, cleared results, card inventory/loadout, best record and ranking unchanged and supports retrying current stage.

## Validation
- `node --test src/game/stepGame.test.js src/game/campaign.test.js` — clock boundary, restart-clock and no-reward draw cases pass.
- `npm run build` — App event routing bundles.

## Commit Message
```text
feat(game): add finite match clock and draw outcome

Plan: 2026-10-22-unified-3d-arcade-football
Phase: P01-match-simulation
Task: T01-timer-and-draw

- Count regulation and golden-goal time across match restarts
- Route draws to same-stage retry without campaign rewards
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: see repository history for Task T01 commit
