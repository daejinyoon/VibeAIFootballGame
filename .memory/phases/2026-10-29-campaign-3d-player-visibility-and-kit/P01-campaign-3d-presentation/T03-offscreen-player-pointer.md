# Task: T03 Off-screen Controlled Player Pointer

## Status: done

## Goal
When the controlled campaign player is outside the ball-tracking camera's viewport, display a screen-edge arrow that points toward that player and stays visible until the player enters the viewport.

## Decision Summary
- Keep `TrackingCamera3D`'s existing ball-centered zone, zoom, and smoothing behavior unchanged.
- Project the selected player's live 3D actor into the canvas viewport and place a matching white/dark/lime DOM arrow at the nearest inset screen edge. Hide it automatically when the player is visible.
- This is a campaign-only cue; preserve the existing minimap and PvP marker behavior.

## Implementation

### I01. Project the controlled player and calculate a stable edge position

- Related Files:
  - `game/src/game/playerSelectionIndicator.js` :: `getPlayerEdgeIndicatorPlacement` — pure NDC-to-edge layout function; new
  - `game/src/game/playerSelectionIndicator.test.js` :: viewport, inset, angle, and behind-camera cases; new
  - `game/src/components/TrackingCamera3D.jsx` :: `TrackingCamera3D` — publish active camera ref to `actorsRef`; modify
  - `game/src/components/GameLoop3D.jsx` :: selected player ID publication — publish campaign-selected ID to `actorsRef`; modify
  - `game/src/components/Match3DGame.jsx` :: `actorsRef` shape — include active camera and selected ID; modify

#### Details
- **Signatures & Types**:
  ```js
  export function getPlayerEdgeIndicatorPlacement({
    ndcX, ndcY, ndcZ, behindCamera, width, height, inset = 20,
  })
  ```
  Return `null` when the target is in the visible camera frustum. Otherwise return `{ left, top, rotationDeg }` in CSS pixels/degrees, clamped inside the viewport by `inset`.
- **Data & Schema Fields**:
  - Extend `actorsRef.current` with `camera: Camera | null` and `selectedPlayerId: string | null`.
  - Reuse `actorsRef.current.players: Map<string,Object3D>`; do not add player position copies or persistent game-state fields.
  - `getPlayerEdgeIndicatorPlacement` input `ndcX/ndcY/ndcZ` and viewport dimensions are finite numbers; `behindCamera` is boolean; `inset` defaults to 20 CSS pixels.
  - Return fields `left:number`, `top:number`, `rotationDeg:number`; return `null` for visible, missing, or invalid target inputs.
- **Execution Flow / Logic**:
  1. In `TrackingCamera3D`, publish the existing R3F camera instance to `actorsRef.current.camera`; do not change its follow target or camera parameters.
  2. In campaign `GameLoop3D`, publish the selected local player ID after simulation updates; do not publish a PvP selection to this cue.
  3. Add a DOM sibling overlay component `PlayerSelectionEdgeIndicator` inside the `.match-3d-canvas` container. It reads the latest camera, selected ID, and actor map from refs.
  4. On each `requestAnimationFrame`, get the actor's world position, project it with the current camera, and call `getPlayerEdgeIndicatorPlacement`. If placement is non-null, update `left`, `top`, and rotation on the overlay element directly; otherwise hide it. Do not set React state every frame.
  5. Convert NDC to viewport pixels using `x=(ndcX+1)*width/2` and `y=(1-ndcY)*height/2`. For a target behind the camera, invert its projected direction before intersecting the ray from viewport center with the inset rectangle. Compute the edge point from the smaller positive scale that intersects either horizontal or vertical boundary.
  6. Set arrow rotation to face toward the projected target. The arrow uses the same white fill, dark outline, and lime accent as the overhead selection marker; it contains no text.
  7. Hide the edge arrow if the match is paused, there is no valid selected actor/camera, or the player is in view. Cancel the animation frame on unmount and resume updates when unpaused.
- **Error & Exception Handling**:
  - Return `null` for non-finite dimensions or projected coordinates; hide the element instead of rendering `NaN` CSS.
  - Clamp inset to at most `(min(width,height)/2)-1` so narrow/mobile viewports still have a valid target rectangle.
  - Keep `pointer-events:none`; the indicator must not intercept canvas input or clicks.
- **State Transition & Return**: The edge arrow appears immediately when the selected actor projects outside the viewport and remains while off-screen. Once the actor projects inside the viewport, the edge arrow hides and the persistent overhead marker from T02 is the only field cue.

### I02. Add the DOM overlay without changing the 3D camera or user's canvas settings

- Related Files:
  - `game/src/components/PlayerSelectionEdgeIndicator.jsx` :: RAF-based projection overlay; new
  - `game/src/components/Match3DCanvas.jsx` :: `.match-3d-canvas` overlay mount and `TrackingCamera3D` props; modify
  - `game/src/styles.css` :: `.controlled-player-edge-indicator` visual/position styles; modify

#### Details
- The overlay is `position:absolute`, centered on its calculated point with `transform-origin:center`, above the canvas, `pointer-events:none`, and hidden with the HTML `hidden` attribute when inactive.
- Its arrow's unrotated CSS direction points upward; `rotationDeg` rotates it toward the projected actor. Use a 20px default inset and keep the whole marker within the canvas rectangle.
- Preserve the existing `.match-3d-canvas` dimensions and responsive sizing.
- **Workspace preservation requirement**: `Match3DCanvas.jsx` currently has a user-owned uncommitted performance change: `<Canvas shadows={false}>` and a directional light without `castShadow`. Preserve both while adding refs/overlay; do not restore shadow rendering.

## Acceptance Criteria
- [x] An off-screen campaign-controlled player produces a clear edge arrow that points toward that player.
- [x] The arrow remains until the player is in view, then hides and leaves the overhead marker visible.
- [x] The arrow stays within 20px of the canvas edge (or the clamped inset on small viewports), rotates toward the player, and never renders invalid CSS.
- [x] Pausing/unmounting hides the arrow and cancels the animation frame; resume restarts it.
- [x] Camera motion, minimap display, canvas interactions, PvP behavior, and the user's `shadows={false}` change remain intact.

## Validation
- `npm --prefix game test -- src/game/playerSelectionIndicator.test.js src/game/playerSelectionPresentation.test.js` — projection and pulse tests pass.
- `npm --prefix game run build` — overlay and 3D integration compile.
- Manual campaign check: move the ball camera away from the selected player, confirm the arrow points to that player, enter the camera view, resize to a narrow viewport, pause/resume, and confirm the edge arrow hides/returns correctly.

## Commit Message
```text
feat(game): guide players to off-screen controlled teammate

Plan: 2026-10-29-campaign-3d-player-visibility-and-kit
Phase: P01-campaign-3d-presentation
Task: T03-offscreen-player-pointer

- Project the selected player to a bounded screen-edge arrow
- Preserve ball tracking and canvas controls
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- Manual in-game visual check not performed in this turn; projection boundaries, behind-camera direction, narrow viewport clamping, and production build were validated.
- commit: recorded in git history
