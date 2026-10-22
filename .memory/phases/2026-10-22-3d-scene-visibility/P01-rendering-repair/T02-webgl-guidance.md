# Task: T02 Unsupported WebGL Guidance

## Status: done

## Goal
Replace a blank match scene with a clear Korean support message when the browser cannot initialize the WebGL 2 renderer required by the installed Three.js version, or when the active WebGL context is lost.

## Decision Summary
- Do not silently switch to a 2D game.
- Preserve the match screen layout and show concise browser guidance inside the game canvas area.
- Treat successful renderer creation as supported; do not mislabel an ordinary render or camera defect as an unsupported browser.

## Implementation

### I01. Track renderer availability and failure state
- Related Files:
  - `game/src/components/Match3DCanvas.jsx` :: `Match3DCanvas`; modify
  - `game/src/components/GameScreen.jsx` :: `GameScreen`; modify only if status presentation belongs at the screen boundary
  - `game/src/styles.css` :: `.match-3d-canvas` and new `.match-3d-unavailable` rules; modify
  - `game/package.json` :: installed versions of `three` and `@react-three/fiber`; read-only
- Details
  - **State shape**:
    ```ts
    type RendererStatus = 'loading' | 'ready' | 'unsupported' | 'context-lost' | 'error';
    type Match3DCanvasProps = {
      children?: React.ReactNode;
      className?: string;
      players?: Array<object>;
      ball?: object;
      selectedPlayerId?: string;
      actorsRef?: React.MutableRefObject<object>;
      gameStateRef?: React.MutableRefObject<object>;
      containerRef?: React.Ref<HTMLDivElement>;
      onFocusCapture?: React.FocusEventHandler<HTMLDivElement>;
      onBlurCapture?: React.FocusEventHandler<HTMLDivElement>;
      onClick?: React.MouseEventHandler<HTMLDivElement>;
    };
    ```
  - Confirm the installed Three.js renderer requirement from `three` version `0.186.1`: it requires WebGL 2. The availability check must request `webgl2`, not only `webgl`/WebGL 1.
  - Track renderer state locally in `Match3DCanvas`. Start at `loading`; set `ready` from R3F Canvas `onCreated` after a renderer has been created; distinguish unsupported context creation from a lost context and a caught renderer error.
  - Add a small React error boundary around the R3F `Canvas` subtree so initialization/render errors replace the canvas with a local fallback. Keep its reset behavior tied to remounting/retrying the match screen; do not swallow errors from the surrounding application.
  - Listen for `webglcontextlost` on the renderer's actual DOM canvas. Prevent the default browser teardown only if Three.js context restoration is supported; show the `context-lost` state and avoid leaving an apparently playable blank field.
  - Show a Korean status panel within the match canvas area, with this meaning: “이 브라우저에서는 3D 경기를 표시할 수 없습니다. 최신 Chrome 또는 Edge에서 WebGL 2를 켜고 다시 접속해 주세요.” Do not imply that switching to 2D is available.
  - Keep the score HUD outside the Canvas and visible as it is today. The support message must fit the canvas on desktop and mobile and use the existing light arcade palette.
- **Execution Flow / Logic**:
  1. On Canvas mount, show the existing loading treatment until `onCreated` confirms a renderer.
  2. On successful WebGL 2 context creation, show the 3D scene and set status to `ready`.
  3. On missing WebGL 2, Canvas initialization error, or lost context, render the in-canvas support panel and hide the blank renderer output.
  4. Clear the error boundary/status only when the Canvas is mounted again and renderer initialization succeeds.

### I02. Style support status for arcade screens
- Related Files:
  - `game/src/styles.css` :: `.match-3d-canvas`, mobile media rules, new `.match-3d-unavailable`; modify
- Details
  - Keep the fallback centered over the full match canvas, above its background and below the score HUD where possible.
  - Use readable text, adequate contrast, and responsive padding at existing narrow-screen breakpoints.
  - Do not hide pause controls, the external score HUD, or the match page navigation.

## Acceptance Criteria
- [x] With working WebGL 2, the normal 3D canvas remains visible and no unsupported message appears.
- [x] When WebGL 2 context creation is blocked, the blue blank scene is replaced by the Korean browser-support guidance.
- [x] When the context is lost during play, the canvas shows the same guidance rather than remaining blank.
- [x] A renderer error does not remove the score HUD or break the rest of the React app.
- [x] Guidance remains readable at desktop and narrow viewport sizes.

## Validation
- `cd game; npm run build` — production bundle compiles.
- Manual Chrome check with normal WebGL 2 — 3D scene starts and no warning is shown.
- Manual browser check with WebGL 2 disabled — support guidance appears in the canvas; no uncaught React error or empty blue play area remains.

## Commit Message
```text
feat(game): explain unsupported webgl browsers

Plan: 2026-10-22-3d-scene-visibility
Phase: P01-rendering-repair
Task: T02-webgl-guidance

- Detect WebGL 2 initialization and context loss.
- Show responsive Korean browser support guidance instead of a blank scene.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending
## Execution Notes
- Added a WebGL 2 preflight check before mounting R3F. The temporary probe context is released through `WEBGL_lose_context` so it does not occupy a browser context slot.
- Added a local React error boundary for Canvas initialization/render errors, plus `webglcontextlost`/`webglcontextrestored` listeners on the renderer canvas. Unsupported, lost, or restored renderer states stay separate from ordinary scene visibility problems.
- The fallback is an in-canvas Korean support panel; it does not switch to the legacy 2D pitch. Score/time HUD remains outside and visible.
- `npm run build` passed. Manual browser checks covered working WebGL 2, blocked WebGL 2, a simulated renderer initialization error, context loss, and narrow-screen readability. The existing Three.js chunk-size warning remains.
