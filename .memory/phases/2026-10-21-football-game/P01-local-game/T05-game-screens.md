# Task: T05 게임 화면 흐름

## Status: done

## Goal
사용자가 시작 화면부터 선수 스킬 설정, 경기, 일시정지, 결과, 랭킹까지 React UI로 이동하고 Canvas 경기 화면을 사용할 수 있게 한다.

## Decision Summary
- React는 화면 이동과 오버레이 UI를 관리하고 `PitchCanvas`는 경기 루프와 그리기를 담당한다.
- PC 우선 레이아웃이며 모바일 터치 조작은 이 계획 범위에 없다.

## Implementation

### I01. 화면 컴포넌트
- Related Files:
  - `game/src/App.jsx` :: 화면 흐름과 캠페인 조정; modify
  - `game/src/components/StartScreen.jsx` :: 조작법·시작·이어 하기·랭킹 버튼; new
  - `game/src/components/LoadoutScreen.jsx` :: 선수별 스킬 배정; new
  - `game/src/components/GameScreen.jsx` :: 점수·시간·게이지·Canvas; new
  - `game/src/components/PauseMenu.jsx` :: 계속·저장 후 나가기; new
  - `game/src/components/ResultsScreen.jsx` :: 승패/캠페인 완료/다시하기; new
  - `game/src/components/LeaderboardScreen.jsx` :: 별명 순위표; new
  - `game/src/styles.css` :: 화면별 픽셀 UI 스타일; modify
- **Signatures & Types**:
  ```js
  export default function StartScreen({ hasSave, nickname, onStart, onContinue, onOpenLeaderboard });
  export default function LoadoutScreen({ playerRows, loadout, onAssign, onConfirm, onBack });
  export default function GameScreen({ gameState, onPause, onGameEvents });
  export default function PauseMenu({ onResume, onSaveAndExit });
  export default function ResultsScreen({ result, leaderboardPlace, onRetry, onContinue, onHome });
  export default function LeaderboardScreen({ records, onBack });
  export default function App();
  ```
- **Data & Schema Fields**:
  - `App.screen`: `start | loadout | match | pause | results | leaderboard`.
  - `playerRows`: 6 rows `{ playerId, role, displayName, skillId }`.
  - `result`: `{ stage, homeGoals, awayGoals, outcome: "win"|"loss"|"campaignComplete", stageReached, goalDifference }`.
- **Execution Flow / Logic**:
  1. `start` shows keyboard instructions: arrows move; attack A lob/S ground/D shoot; defense A tackle/S switch/D pressure; F skill.
  2. New campaign opens `loadout`. Show all six home roles. The user assigns six unique skills, any skill to any role. Disable “경기 시작” until `validateLoadout` passes.
  3. `match` shows Canvas, score, regulation seconds or “골든골”, both gauges, current possession, skill setting, pause button. On `goal`, show brief score overlay then return to match; on stage result show `results`.
  4. `pause` freezes engine and exposes “계속” and “저장 후 나가기” callbacks; persistence is wired in T06.
  5. `results` offers stage retry after loss, loadout and next stage after win, or campaign summary/restart after boss win.
  6. `leaderboard` lists nickname, reached stage, goal difference, sorted by stage descending then goal difference descending, with nickname ascending for exact ties.
  7. Buttons and menus use semantic `<button>` elements; focus indicators remain visible.
- **Error & Exception Handling**: Keep input listeners disabled outside `match`; when loadout is invalid, keep user on setup screen and show a Korean inline reason rather than starting with duplicate skills.

### I02. Visual integration
- Related Files:
  - `game/src/components/PitchCanvas.jsx` :: use inside match layout; modify
  - `game/src/styles.css` :: 16:9 playfield scaling and overlay z-order; modify
- **Execution Flow / Logic**:
  1. Keep canvas logical size at 960×540 and preserve its aspect ratio in CSS.
  2. Render score, timer, skill meter, and menu in HTML so text stays sharp and accessible.
  3. Implement all core panels as responsive within desktop widths; if viewport is smaller, scale the fixed play area to fit without cropping goals.

## Acceptance Criteria
- [x] Every screen transition is reachable by buttons and the back path returns to the expected screen.
- [x] Loadout screen prevents duplicate/missing skills and allows any skill on any role.
- [x] Pause stops simulation; resuming continues the same in-memory match.
- [x] All controls and score/time indicators are visible during play.

## Validation
- `cd game; npm test` — 43 engine, campaign and skill tests pass.
- `cd game; npm run build` — all React screens compile in the Vite production build.
- `cd game; npm run dev` — Vite root and transformed `App.jsx` return HTTP 200. Full browser-only interaction review remains a manual check.

## Commit Message
```text
feat(game): add campaign screens and skill setup UI

Plan: 2026-10-21-football-game
Phase: P01-local-game
Task: T05-game-screens

- Add start, loadout, match, pause and result screens
- Show controls, scores and leaderboard UI
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `feat(game): add campaign screens and skill setup UI`
