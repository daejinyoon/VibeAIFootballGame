# Task: T03 경기 조작과 기본 축구 규칙

## Status: pending

## Goal
사용자가 방향키와 A/S/D로 6대6 경기를 플레이하고, 패스·슛·태클·압박·세이브·골·60초 종료·골든골까지 한 경기 규칙을 완성한다.

## Decision Summary
- 공 소유권으로 공격/수비 기능이 자동 전환된다. 홈은 오른쪽, 상대는 왼쪽 골문을 공격한다.
- 시뮬레이션과 화면 렌더링은 분리하고 `requestAnimationFrame`의 프레임 시간을 `0.05초` 이하로 제한한다.

## Implementation

### I01. 키보드 입력과 경기 업데이트
- Related Files:
  - `game/src/game/createInputController.js` :: 키 입력 상태와 정리; new
  - `game/src/game/stepGame.js` :: 경기 1프레임 업데이트; new
  - `game/src/game/stepGame.test.js` :: 이동·공·시간 규칙; new
- **Signatures & Types**:
  ```js
  export function createInputController(targetWindow = window);
  // returns { readFrame(): InputFrame, destroy(): void }
  export function stepGame(state, inputFrame, deltaSeconds);
  // returns GameEvent[] and updates state in place
  ```
- **Data & Schema Fields**:
  - `InputFrame`: `{ moveX: -1|0|1, moveY: -1|0|1, down: Set<string>, pressed: Set<string>, released: Set<string> }`; keys normalized to `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `a`, `s`, `d`, `f`, `Escape`.
  - `GameEvent`: `{ type: "goal"|"keeperCatch"|"matchWon"|"matchLost", team?: "home"|"away", score?: { home: number, away: number } }`.
- **Execution Flow / Logic**:
  1. Arrow keys move the controlled home player in four directions; normalize diagonal movement and clamp to pitch bounds. Starting speeds: user player 160 field units/sec, AI field player 125, goalkeeper 95.
  2. Prevent browser scrolling for game keys only while the match screen is focused. On blur or unmount, clear key state and remove all listeners.
  3. Implement home/away AI: non-carriers return to role positions or support the carrier; the away carrier moves toward the left goal and shoots when within 180 units; the home carrier AI supports the user.
  4. Implement dribbling when the active player is within 18 units of a loose ball. A defender's A press creates a 40-unit slide over 0.25 sec; contact with an opposing carrier transfers possession. D press makes the controlled defender pursue the carrier. S press during defense cycles through all six home players, including the goalkeeper.
  5. During home possession, A/S select a teammate in the arrow direction; A releases a lob that travels over field defenders and S releases a ground pass. On release, set `controlledPlayerId` to the selected receiver. D release shoots toward the right goal. Charge reaches maximum after 1 second; charged velocity scales linearly from 55% to 100%.
  6. Use initial ball speeds: ground pass 330, lob pass 300, normal shot 500, away shot 430 units/sec. Ball friction is `exp(-2.4 * deltaSeconds)`. Apply out-of-bounds reset to center kickoff.
  7. Goal mouth is `y=210..330` at each end. A goal increments score, enters `goalPause` for 1 second, resets all players and ball, then the conceding team kicks off. Goalkeeper shot contact catches if ball is within 12 horizontal and 14 vertical units of the keeper center; otherwise it rebounds. A catch enters `goalKick` for 1 second, then keeper kicks toward midfield. Ordinary goalkeepers cannot stop Eagle Shot; special shot exceptions are completed in T04.
  8. Regulation starts at 60 seconds. If time reaches zero while tied, set `phase="overtime"` with no timer; the first goal emits the match result and ends the stage. Otherwise emit win/loss for the stage.
  9. Return events to the React caller so it can advance campaign or show results; engine does not render UI.
- **Error & Exception Handling**: Clamp `deltaSeconds` to `[0, 0.05]`; ignore non-finite input values; cleanup event listeners on `destroy()`; do not advance a finished match.

### I02. Canvas game loop component
- Related Files:
  - `game/src/components/PitchCanvas.jsx` :: Canvas lifecycle, input and animation loop; new
  - `game/src/components/PitchCanvas.test.js` :: no-DOM exports only if loop helpers are extracted; new
- **Signatures & Types**:
  ```js
  export default function PitchCanvas({ initialState, onGameEvents, paused = false });
  ```
- **Execution Flow / Logic**:
  1. Create state and input controller in refs; do not put every player coordinate in React state.
  2. On each animation frame, compute clamped delta, call `stepGame`, call `drawGameFrame`, and send only non-empty event batches to `onGameEvents`.
  3. Cancel animation frame and destroy the input controller on unmount or pause.
  4. Keep canvas backing dimensions at `960 × 540`; CSS scales the canvas while preserving the 16:9 ratio and pixelated rendering.

## Acceptance Criteria
- [ ] All selected controls work in attack and defense modes without page scroll.
- [ ] Pass direction chooses a teammate and transfers control to the receiver.
- [ ] Goal, keeper rebound/catch, goal kick, kickoff, timer, and golden-goal states follow D05.
- [ ] AI can attack either goal and returns to formation when it loses possession.

## Validation
- `cd game; npm test` — movement, input cleanup, possession, pass/shot, keeper, goal, regulation and overtime tests pass.
- `cd game; npm run build` — Canvas screen compiles.
- `cd game; npm run dev` — manually play one match with keyboard and verify no page scrolling.

## Commit Message
```text
feat(game): implement 6v6 match controls and rules

Plan: 2026-10-21-football-game
Phase: P01-local-game
Task: T03-match-controls-rules

- Add keyboard-driven movement and football actions
- Implement AI, keeper, goals and golden-goal matches
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
