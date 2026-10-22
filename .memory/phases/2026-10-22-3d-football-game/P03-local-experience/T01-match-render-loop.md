# Task: T01 3D 경기 렌더 루프 연결

## Status: done

## Goal
순수 JavaScript 경기 상태·입력·`stepGame`을 R3F 장면에 연결해 4대4 AI 경기가 실시간으로 움직이고 정지·재개 이벤트를 전달하게 한다.

## Decision Summary
- R3F 렌더 루프에서 `stepGame`을 호출하고 Three mesh ref를 직접 갱신한다. 매 프레임 React state를 갱신하지 않는다.
- React HUD에는 기존처럼 약 100ms 간격으로만 상태 snapshot을 전달한다.

## Implementation

### I01. R3F match loop
- Related Files:
  - `game/src/components/Match3DGame.jsx` :: `Match3DGame` — Canvas 경기 wrapper; new
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D` — input·simulation·mesh sync; new
  - `game/src/components/Match3DCanvas.jsx` :: Canvas scene root — teams/models/camera props; modify
  - `game/src/components/FootballPlayer3D.jsx` :: mesh ref registration; modify
  - `game/src/components/FootballBall3D.jsx` :: mesh ref registration; modify
- Details
  - **Signatures & Types**:
    ```js
    export default function Match3DGame({ initialState, paused, onGameEvents, onStateChange })
    export function GameLoop3D({ initialState, paused, onGameEvents, onStateChange, actorsRef })
    ```
  - **Data & Schema Fields**:
    - Props: `initialState:GameState`, `paused:boolean`, `onGameEvents:(GameEvent[])=>void`, `onStateChange:(GameState)=>void`.
    - `gameStateRef.current:GameState` is the mutable simulation source; `actorRefs.current.players:Map<PlayerId,THREE.Group>` and `.ball:THREE.Group` point to rendered actors.
    - Callback refs update every React render so R3F loop never closes over stale callbacks.
  - **Execution Flow / Logic**:
    1. On `initialState` change, clone into `gameStateRef`; do not restart on HUD state updates.
    2. When active, `createInputController` listens on `window`; keyboard is enabled only while the Canvas wrapper is focused. On pause/blur/unmount, clear keys and destroy listeners.
    3. R3F `useFrame` clamps delta to `0.05s`, calls `stepGame(state,input.readFrame(),dt)`, writes each nondismissed player transform and ball transform into refs, and updates the tracking camera.
    4. Forward events immediately via callback ref. Forward `structuredClone(state)` to HUD every 6 frames.
    5. When `paused`, no simulation step runs; scene is rendered once with existing state.

### I02. Existing GameScreen contract
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen` — new renderer/HUD/pause wiring; modify
  - `game/src/components/PitchCanvas.jsx` :: legacy canvas — no longer imported by GameScreen; read-only or remove runtime import
- Details
  - Keep React props `gameState`, `paused`, `errorMessage`, `onPause`, `onResume`, `onSaveAndExit`, `onGameEvents`.
  - `GameScreen` passes `initialState`, `paused`, and callbacks to `Match3DGame`; HUD uses snapshots for score, timer, possession, active count, foul notice and card/restart status.
  - Remove team skill-gauge bars from HUD. Show active player's skill kind and `skillUsesRemaining / skillCopies`, plus Space jump control hint.

## Acceptance Criteria
- [x] Renderer transforms reflect simulation player/ball positions and ball/jump heights without per-frame React rerender.
- [x] Pause freezes simulation; resume continues; save-and-exit still invokes existing callback.
- [x] Events and HUD state reach `App` at correct times without stale callback values.
- [x] 3D match displays 8 players before dismissals.

## Validation
- `npm test` — complete simulation and input suite passes
- `npm run build` — JSX and R3F runtime compile

## Commit Message
```text
feat(game): connect match simulation to 3d render loop

Plan: 2026-10-22-3d-football-game
Phase: P03-local-experience
Task: T01-match-render-loop

- Run match simulation from the R3F frame loop
- Connect keyboard controls HUD pause and match events
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: cdf501f
