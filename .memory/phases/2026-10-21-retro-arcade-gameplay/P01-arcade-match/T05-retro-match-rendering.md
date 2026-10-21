# Task: T05 ?덊듃濡??먭렐 寃쎄린 ?붾㈃

## Status: done

## Goal
湲곗〈 ?됰㈃ ?묐떎??罹붾쾭?ㅻ? 愿以묒꽍쨌?먭렐 ?붾뵒쨌??댁긽???좎닔 ?ㅽ봽?쇱씠?멸? ?덈뒗 ?꾩??대뱶 寃쎄린 ?붾㈃?쇰줈 諛붽씀怨? 寃쎄린 ?먯닔? ?쒓컙? 罹붾쾭???꾩そ??怨좎젙?쒕떎.

## Decision Summary
- ?붾뱶 臾쇰━??湲곗〈 `FIELD` 960횞540 X/Y 醫뚰몴瑜??좎??섍퀬 ?뚮뜑留??④퀎?먯꽌 源딆씠 ?먭렐怨?怨?異붿쟻 移대찓?쇰? ?곸슜?쒕떎.
- 寃쎄린?? ?몃Ъ, 愿以묒? Canvas 2D ?꾪삎?쇰줈 濡쒖뺄 ?앹꽦?섎ŉ ?먮낯 ?곹몴/?ㅽ겕由곗꺑 ?대?吏瑜?蹂듭젣?섏? ?딅뒗?? 湲곗〈 寃쎄린 議곗옉쨌?곹깭???쒓컖 ?④낵留뚯쑝濡?諛붾뚯? ?딅뒗??

## Implementation

### I01. ?먭렐 ?ъ쁺, 寃쎄린?? ?ㅽ봽?쇱씠?몄? 移대찓??- Related Files:
  - `game/src/game/drawGameFrame.js` :: `drawPlayer`, `drawPitch`, `drawBall`, `drawGameFrame` ??蹂?섎맂 醫뚰몴쨌源딆씠蹂??ш린 ?뚮뜑留? modify
  - `game/src/components/PitchCanvas.jsx` :: `PitchCanvas` ??蹂꾨룄 camera ref? ?쒓컙 湲곕컲 ?꾨쭔??異붿쟻; modify
  - `game/src/game/drawGameFrame.test.js` :: ?ъ쁺쨌?붾㈃ 怨좎젙 HUD쨌遺덈? ?곹깭 寃利? modify
  - `game/src/game/constants.js` :: `FIELD` ???붾뱶 醫뚰몴 API ?좎?; read-only

#### Details
- **Signatures & Types**:
  ```js
  // internal projectPoint(x, y, camera) -> { x:number, y:number, scale:number }
  // internal drawPitch(ctx, camera) -> void
  // internal drawPlayer(ctx, player, isControlled, camera) -> void
  // public drawGameFrame(ctx, state, renderOptions = {}) -> void
  // renderOptions: { cameraX:number, cameraY:number, score?:{home:number, away:number}, timeLabel?:string }
  // internal updateCamera(camera, ball, deltaSeconds) -> camera
  ```
- **Data & Schema Fields**:
  - Renderer camera (not game state): `{ x:number, y:number }`, kept in `PitchCanvas` `useRef`; world target follows ball and screen target eases toward it at `min(1, deltaSeconds*4)` per frame.
  - Canvas remains 960횞540. Reserve screen y 0??2 for stadium crowd and fixed scoreboard. Project field world y `0..FIELD.height` to screen y `92..535` with smooth nonlinear depth curve `t^1.22`; x maps to `-camera.x + worldX * scaleAtY`, with `scaleAtY = 0.72 + 0.28*t`; clamp visible projection to canvas through clipping.
  - Player sprite width/height: base 18횞24 world-equivalent pixels times projection scale; goalkeeper 22횞26. Draw shadow, body colors, shirt stripe, facing marker, selected outline, skill/stun indicators; painter order sorted by projected screen y so nearer players draw over farther players.
  - Crowd is deterministic rows of small colored rectangles generated from a fixed local seed; no external image/file dependency.
  - `renderOptions.score` and `timeLabel` are optional for existing test/preview callsites. When supplied, top scoreboard shows home/away score and regulation seconds or `怨⑤뱺怨?.
- **Execution Flow / Logic**:
  1. Precondition & Validation: retain drawGameFrame TypeErrors for missing 2D context or invalid state. Ignore non-finite render camera values and treat them as zero. Renderer must not mutate `state`.
  2. Core Processing: each animation frame update camera ref toward ball using frame dt; call `drawGameFrame` with camera and latest `state.score`, `remainingSeconds`, `phase`. Draw stadium/crowd first, projected pitch and markings second, projected players in depth order third, ball and skill effects fourth, fixed scoreboard last. Use `ctx.save/restore` around camera/clip transforms. Scoreboard stays at constant canvas y independent of camera.
  3. Error & Exception Handling: canvas context loss/missing context follows current no-op effect cleanup; rendering functions do not throw for absent optional render options. `projectPoint` clamps depth scale to `[0.72,1]` and never returns NaN for valid bounded world coordinates.
  4. State Transition & Return: only the local camera ref changes per render frame. `stepGame`, player positions, ball, scores and timers are read-only to renderer.

### I02. Match HUD and responsive styling
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen` ??pass score/time/phase to canvas; remove duplicate external scoreboard only after in-canvas HUD works; modify
  - `game/src/components/PitchCanvas.jsx` :: `PitchCanvas` props ??receive score/time label; modify
  - `game/src/styles.css` :: `.game-canvas-wrap`, `.pitch-canvas`, `.match-hud` ??responsive arcade frame and preserve image pixelation; modify
- **Details**:
  - `GameScreen` derives `timeLabel = phase==='overtime' ? '怨⑤뱺怨? : String(Math.ceil(remainingSeconds))`; passes current score and label to canvas on each frame via refs or props without restarting the simulation effect each render.
  - Remove the separate score/time blocks only after the fixed canvas scoreboard is visible, avoiding duplicated score display.
  - Keep canvas aspect ratio 16:9 and mobile width behavior. CSS keeps `image-rendering: pixelated` and keyboard focus outline.

## Acceptance Criteria
- [x] Distant rows of pitch and players are smaller than near rows; movement/collision world coordinates are unchanged.
- [x] Canvas contains a deterministic crowd, striped perspective field, recognizable goals/lines, low-resolution team sprites, and scoreboard.
- [x] Scoreboard stays in the top HUD while the camera follows the ball smoothly.
- [x] Drawing the same state/options twice produces the same canvas call sequence and never mutates the state.
- [x] Existing skill effects, controlled-player marker, charge HUD, and mobile canvas sizing remain visible.

## Validation
- `cd game; npm test -- --test-name-pattern="draw|render|canvas|projection"` ??rendering behavior passes
- `cd game; npm test` ??full Node test suite passes
- `cd game; npm run build` ??Vite production bundle succeeds
- Browser smoke check using `npm run dev`: verify 960횞540 gameplay canvas at desktop and narrow viewport, keyboard focus and scoreboard visibility

## Commit Message
```text
feat(ui): render retro perspective football match

Plan: 2026-10-21-retro-arcade-gameplay
Phase: P01-arcade-match
Task: T05-retro-match-rendering

- Project the existing 2D field into a retro arcade perspective
- Add deterministic stadium crowd, player sprites, camera, and fixed scoreboard
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 2026-10-21
