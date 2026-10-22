# Task: T03 경기 시간 HUD와 무승부 재도전 화면

## Status: pending

## Goal
3D 경기 중 점수와 정규/골든골 남은 시간을 상단 고정 HUD로 표시하고, 무승부 결과를 승리·패배와 구분해 현재 단계 재도전 또는 메인 화면으로 이동하게 한다.

## Decision Summary
- HUD는 Canvas/3D 카메라와 분리된 React DOM 레이어로 렌더링해 화면 상단에 고정한다.
- 시간 표기는 `MM:SS`; 골든골에는 `GOLDEN GOAL` 레이블과 30초부터 감소하는 표시를 함께 둔다.

## Implementation

### I01. Fixed scoreboard and phase-aware time formatting
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen`, time formatting helper — modify
  - `game/src/components/Match3DCanvas.jsx` :: canvas wrapper and overlay slot — modify only if overlay layering needs a wrapper
  - `game/src/styles.css` :: match HUD rules — modify

#### Details
- **Signatures & Types**:
  ```typescript
  type HudState = { score:{home:number;away:number}; phase:string; remainingSeconds:number; overtimeRemainingSeconds:number|null };
  function formatMatchClock(seconds:number): string; // ceil and clamp, MM:SS
  function getMatchClockLabel(state:HudState): { mode:'REGULATION'|'GOLDEN GOAL'; time:string };
  ```
- **Data & Schema Fields**: consume P01 `remainingSeconds` and `overtimeRemainingSeconds`; do not maintain duplicate timer state in React.
- **Execution Flow / Logic**:
  1. `formatMatchClock` uses `Math.ceil`, clamps negative/nonfinite to 0, pads minutes and seconds to two digits. Regular 60 displays `01:00`; golden goal 30 displays `00:30`.
  2. Render score, team labels, mode and clock in DOM overlay with `position:absolute` within game viewport, high z-index, `pointer-events:none`; pause button/menu remain interactive.
  3. Keep state snapshot updates throttled as existing `GameScreen` does; update view state when phase/clock second changes so displayed timer does not wait behind coarse snapshot throttling.
  4. Keep bright mint/coral team styling, readable contrast, responsive scaling; HUD follows viewport size, never camera transform.
- **Error & Exception Handling**: missing state displays `--:--`; nonfinite seconds produce `00:00`; phase unknown falls back to regulation label.
- **State Transition & Return**: presentation-only; no changes to game/campaign time.

### I02. Draw result actions
- Related Files:
  - `game/src/components/ResultsScreen.jsx` :: `ResultsScreen` win/draw/loss presentation — modify
  - `game/src/App.jsx` :: `handleGameEvents`, `retryStage`, result action props — verify/modify only if T01 left callback routing incomplete
  - `game/src/styles.css` :: result outcome styles — modify

#### Details
- Outcome discriminant is `'win'|'loss'|'draw'|'campaignComplete'`. `won` must be true only for `win|campaignComplete`; draw title is `{stage}단계 무승부`, explanatory text says no reward and same stage can be retried, primary action says `같은 단계 다시 도전` and invokes current `onRetry`; secondary action returns home.
- Draw result displays score and never shows stale leaderboard place as an updated rank; App passes `leaderboardPlace={null}` for draw. Do not offer skill draft for draw.
- Loss UI remains retry; win UI remains reward/continue.

## Acceptance Criteria
- [ ] Match HUD stays fixed while camera follows ball and shows `01:00` at kickoff, `00:30` at golden-goal start and zero at expiry.
- [ ] Draw is visually distinct and has a working retry-current-stage and home action; no win reward or ranking claim appears.
- [ ] Small viewport keeps the scoreboard and pause/menu controls usable and legible.

## Validation
- `npm run build` — JSX/CSS integration compiles.
- `npm test` — existing suite passes.
- Manual desktop and narrow mobile browser review of regulation, golden goal, draw and pause overlay; save screenshots/observations to `.memory/qa/2026-10-22-unified-football-hud.md`.

## Commit Message
```text
feat(ui): show match clock and draw retry state

Plan: 2026-10-22-unified-3d-arcade-football
Phase: P02-3d-game-feel
Task: T03-timer-and-draw-ui

- Add a fixed phase-aware match scoreboard overlay
- Present draws separately with same-stage retry
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
