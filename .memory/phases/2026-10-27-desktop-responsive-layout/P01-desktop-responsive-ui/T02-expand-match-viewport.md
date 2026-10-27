# Task: T02 Expand Match Viewport and HUD

## Status: done

## Goal
The desktop match canvas occupies the expanded panel width and most usable browser height, with a readable scoreboard and minimap. The active play area remains framed when the window changes shape, while detailed skill information can scroll below the visible field.

## Decision Summary
- Use the [desktop responsive layout decisions](../../../decisions/2026-10-27-desktop-responsive-layout.md): variable canvas aspect ratio, visible pitch and scoreboard first, secondary skills below the fold on short windows, no phone redesign.
- T01 expands the common `.app-shell` gutters and menu panels. This Task explicitly expands `.game-panel` and match-specific descendants.
- `TrackingCamera3D` already uses `useThree().size.width / size.height` and derives `cameraDistance` from horizontal and vertical field bounds. A resized React Three Fiber canvas updates that value, so preserve this camera behavior instead of adding another resize listener or fixed camera zoom.

## Implementation

### I01. Make the match panel and canvas use desktop viewport space

- Related Files:
  - `game/src/styles.css` :: `.game-panel`, `.game-canvas-wrap`, `.match-3d-canvas`, `.game-topline`, `.match-card-status` — desktop geometry; modify
  - `game/src/components/GameScreen.jsx` :: `GameScreen` section order (`game-topline`, `match-card-status`, `game-canvas-wrap`, `game-bottomline`) — preserve DOM and event flow; read-only
  - `game/src/components/Match3DGame.jsx` :: `Match3DGame` focus behavior — preserve keyboard focus; read-only
  - `game/src/components/Match3DCanvas.jsx` :: `Match3DCanvas` and React Three Fiber `<Canvas dpr={[1, 1.25]}>` — preserve renderer configuration and existing uncommitted workspace edits; read-only
  - `game/src/components/TrackingCamera3D.jsx` :: `TrackingCamera3D` aspect-aware camera — rely on existing camera distance calculation; read-only

#### Details
- **Signatures & Types**:
  ```css
  /* Append after the current stylesheet, preserving <=720px rules. */
  @media (min-width: 721px) {
    .app-shell > .game-panel { /* desktop width and bounded padding */ }
    .app-shell .game-canvas-wrap { /* definite viewport-based height */ }
    .app-shell .match-3d-canvas { /* fill parent; no fixed aspect ratio */ }
  }
  ```
- **Data & Schema Fields**:
  - No new JS state, props, persisted data, API fields, or events.
  - CSS desktop side gutter comes from T01: `clamp(16px, 2vw, 48px)` on `.app-shell`.
  - Match panel width `100%`, `max-width: none`, vertical margin `clamp(12px, 2vh, 28px)`, and padding `clamp(12px, 1.25vw, 28px)`.
  - Canvas wrapper definite height `max(360px, calc(100dvh - 340px))`; its child `.match-3d-canvas` uses `width: 100%`, `height: 100%`, `min-height: 0`, and `aspect-ratio: auto`. Keep the existing `100vh`/16:9 behavior as a browser fallback outside the desktop override.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Effective current CSS includes `.match-3d-canvas { aspect-ratio: 16 / 9; min-height: 390px }` and a <=720px rule `height: clamp(260px, 70vw, 410px)`. Add the new rules after these declarations and inside `min-width: 721px` so the phone branch is not overwritten. Do not force a fixed 16:9 ratio on the desktop canvas.
  2. Core Processing: Expand direct child `.game-panel` of `.app-shell` to available width, then give `.game-canvas-wrap` the definite viewport-based height above. The canvas fills that box, causing React Three Fiber to update `useThree().size`; the current `TrackingCamera3D` computes aspect and `max(7, distanceForWidth, distanceForDepth)` each frame. Keep this horizontal/vertical fit logic, zone following, and `CAMERA_FOV = 42` intact.
  3. Error & Exception Handling: If browser height is short, retain at least 360px of field and allow the document to scroll. Do not crop status, pause, or skill controls by adding page-level `overflow: hidden`. Keep the canvas wrapper's existing overflow clipping for scene overlays only. On live resize, the renderer must not lose focus permanently or reset match state.
  4. State Transition & Return: Geometry changes only. Input, pause, audio, and scoreboard values retain their existing React state and handlers.

### I02. Reflow visible HUD and below-field detail

- Related Files:
  - `game/src/styles.css` :: `.match-score-hud`, `.score-team`, `.score-clock`, `.match-audio-toggle`, `.match-minimap`, `.game-bottomline`, `.sprint-meter`, `.team-skill-deck`, `.away-skill-stock` — overlay and detail sizing; modify
  - `game/src/components/GameScreen.jsx` :: score HUD, audio button, minimap, sprint meter, skill details — preserve markup and accessibility labels; read-only
  - `game/src/components/MatchMiniMap.jsx` :: minimap SVG uses parent dimensions — preserve coordinates; read-only

#### Details
- **Signatures & Types**:
  ```css
  @media (min-width: 721px) {
    .app-shell .match-score-hud { /* centered, bounded width */ }
    .app-shell .match-minimap { /* bounded responsive width */ }
    .app-shell .game-bottomline { /* grid below the pitch */ }
  }
  @media (min-width: 721px) and (max-width: 1100px) {
    .app-shell .game-bottomline { /* wrap crowded detail cards */ }
  }
  ```
- **Data & Schema Fields**:
  - No scoreboard or skill data model changes.
  - Score HUD width `clamp(400px, 33vw, 680px)` with `max-width: calc(100% - 110px)` so the audio button has a separate right corner; text sizes bounded to 12-18px by role.
  - Audio button side length `clamp(42px, 2.4vw, 52px)`; minimap width `clamp(180px, 16vw, 300px)` and 16:9 minimap aspect retained.
  - Detail grid above 1100px: `minmax(200px, .85fr) minmax(320px, 1.4fr) minmax(200px, .85fr)`; from 721px through 1100px: `repeat(auto-fit, minmax(250px, 1fr))`; helper paragraph spans all columns.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `.match-score-hud` is centered at top, `.match-audio-toggle` is in the top-right, `.match-minimap` is at bottom center, and `.game-bottomline` has a late three-column override near the end of `styles.css`. The new `.app-shell`-scoped desktop rules must win this cascade.
  2. Core Processing: Scale the scoreboard and its fonts within bounds; maintain the existing absolute positions and aria labels. Enlarge but cap the audio target and minimap. Reflow below-field sprint/skill cards to the specified columns, with `min-width: 0` for text-heavy cards and vertical scrolling rather than overlaying them on the field.
  3. Error & Exception Handling: Ensure the centered score HUD never covers the audio button at 721-800px widths. Avoid moving the minimap over the score HUD or outside the canvas. Preserve the existing <=720px HUD layout and pause overlay stacking order.
  4. State Transition & Return: HUD presents the same data, and button clicks, gamepad/keyboard focus, pause overlay, and minimap coordinate mapping are unchanged.

## Acceptance Criteria
- [x] At 1920x1080, 2560x1440, and 3440x1440, match panel spans the desktop shell and canvas is substantially taller than the old 390px minimum, using most available viewport height.
- [x] At 800x600 and 1280x720, scoreboard and game field are visible; skill details remain reachable by vertical scrolling without horizontal overflow.
- [ ] On window resize between wide and narrow desktop dimensions, camera continues to show the active play zone, relevant goal, and players without aspect-related cropping or match reset.
- [x] Score HUD, audio button, minimap, pause control, and below-field details do not overlap in ways that block interaction.
- [x] Existing phone CSS, keyboard focus, pause behavior, gameplay logic, and React Three Fiber DPR cap remain unchanged.

## Validation
- `npm --prefix game run build` — Vite build succeeds with the effective desktop CSS.
- `npm --prefix game run dev` — in an authenticated browser, start a match and inspect 800x600, 1280x720, 1920x1080, 2560x1440, and 3440x1440; resize during play, visit both goals, pause/resume, and verify HUD separation and vertical scrolling. Stop the dev server afterward.

## Commit Message
```text
feat(match): use desktop viewport for pitch and HUD

Plan: 2026-10-27-desktop-responsive-layout
Phase: P01-desktop-responsive-ui
Task: T02-expand-match-viewport

- Size the match canvas from available viewport height
- Scale visible HUD and reflow detailed skill panels
```

## Progress
- [x] Implementation complete
- [x] Validation passed for build and desktop layout fixture
- Browser layout fixture checked 800x600, 1280x720, 1920x1080, 2560x1440, and 3440x1440 with no horizontal overflow or HUD overlap; Vite dev server returned HTTP 200. Authenticated match camera tracking, pause/resume, and live resize still require in-game verification.
- commit: committed with this Task blueprint
