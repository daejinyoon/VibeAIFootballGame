# Task: T02 경기 상태와 픽셀 경기장 렌더링

## Status: done

## Goal
6대6 경기의 시작 상태를 일관된 데이터 구조로 만들고, Canvas에 경기장·골대·12명의 선수·공을 탑다운 픽셀 스타일로 그린다.

## Decision Summary
- 필드 좌표는 `960 × 540` 게임 단위다. Canvas가 필드와 게임 스프라이트를 그리고 React가 주변 UI를 그린다.
- 팀 상태는 순수 JavaScript 객체이며, 경기 규칙 모듈은 DOM 없이 테스트할 수 있게 유지한다.

## Implementation

### I01. 공통 게임 상수와 데이터 모델
- Related Files:
  - `game/src/game/constants.js` :: 경기장, 팀, 포메이션 상수; new
  - `game/src/game/createInitialGameState.js` :: 시작 상태와 12인 팀 구성; new
  - `game/src/game/createInitialGameState.test.js` :: 모델 불변 조건; new
- **Signatures & Types**:
  ```js
  export const FIELD = { width: 960, height: 540, goalTop: 210, goalBottom: 330 };
  export function createInitialGameState({ stage = 1, loadout, opponentSkillIds = [] } = {});
  ```
- **Data & Schema Fields**:
  - `Player`: `{ id: string, team: "home"|"away", role: "goalkeeper"|"defender"|"midfielder"|"forward", x: number, y: number, vx: number, vy: number, facingX: -1|0|1, facingY: -1|0|1, stunnedSeconds: number, skillId: string|null }`.
  - `Ball`: `{ x: number, y: number, vx: number, vy: number, ownerId: string|null, height: number, flightKind: "ground"|"lob"|"shot"|"skill-shot", flightSeconds: number, lastTouchTeam: "home"|"away"|null }`.
  - `GameState`: `{ stage: 1|2|3, phase: "playing"|"overtime"|"goalPause"|"goalKick"|"finished", remainingSeconds: number, score: { home: number, away: number }, players: Player[], ball: Ball, controlledPlayerId: string, possessionTeam: "home"|"away"|null, skillGauge: { home: number, away: number }, charge: { action: "lobPass"|"groundPass"|"shot"|null, elapsedSeconds: number }, opponentSkillIds: string[] }`.
  - 6 home and 6 away players: each team has one goalkeeper, two defenders, two midfielders, one forward. Home attacks right; away attacks left. Initial home possession starts at midfield.
- **Execution Flow / Logic**:
  1. Validate `stage` is 1, 2, or 3; otherwise use 1.
  2. Construct stable IDs: `home-gk`, `home-def-1`, `home-def-2`, `home-mid-1`, `home-mid-2`, `home-fw`, and equivalent `away-*` IDs.
  3. Place players in the selected 2-2-1 plus goalkeeper formation mirrored around midfield. Clamp every position inside `FIELD`.
  4. Initialize score to 0-0, regulation time to 60 seconds, both team gauges to 0, ball at midfield owned by `home-fw`, controlled player to `home-fw`.
  5. Test exactly 12 unique IDs, role counts, valid coordinates, and initial ownership.
- **Error & Exception Handling**: Missing or partial `loadout` sets `skillId` to `null` until the loadout screen validates it; no invalid ID may crash state creation.

### I02. Canvas renderer
- Related Files:
  - `game/src/game/drawGameFrame.js` :: `drawGameFrame(ctx, state)`; new
  - `game/src/game/drawGameFrame.test.js` :: minimal mock-context draw calls; new
- **Signatures & Types**:
  ```js
  export function drawGameFrame(ctx, state);
  ```
- **Data & Schema Fields**:
  - Reads `GameState` and `FIELD` from I01; renderer does not modify state.
- **Execution Flow / Logic**:
  1. Clear a `960 × 540` canvas.
  2. Draw turf, boundary, halfway line, center circle, penalty boxes, and goal mouths at left/right edges with Canvas `fillRect`/`strokeRect` primitives.
  3. Draw players from role/team colors and simple pixel blocks; visually distinguish `controlledPlayerId` with an outline and stunned players with a marker.
  4. Draw ball after players; use `height` to lift lobbed balls visually.
  5. Do not use external image files or network-loaded assets.
- **Error & Exception Handling**: If `ctx` is absent, throw a descriptive `TypeError`; never mutate the passed `state`.

## Acceptance Criteria
- [x] Initial state contains exactly 12 players in the specified roles and a 0-0 kickoff state.
- [x] Canvas draws the entire pitch and all entities without external assets.
- [x] `drawGameFrame` leaves input state unchanged.

## Validation
- `cd game; npm test` — initial state and draw-call tests pass.
- `cd game; npm run build` — game modules bundle successfully.

## Commit Message
```text
feat(game): add football state and pixel pitch renderer

Plan: 2026-10-21-football-game
Phase: P01-local-game
Task: T02-game-state-pixel-rendering

- Define 6v6 game entities and kickoff state
- Render the pixel-style top-down pitch on Canvas
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
