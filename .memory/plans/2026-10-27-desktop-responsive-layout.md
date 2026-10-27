# Plan: Desktop Responsive Layout

## Goal
Use nearly the entire available desktop browser area on every post-login screen without clipping controls or the 3D pitch. At desktop viewports from 800x600 through 3440x1440, panels should have modest gutters, menu content should reflow into readable columns, and the match canvas should grow with viewport width and height while secondary skill information may scroll below it. Keep current mobile behavior and gameplay logic.

## Decisions
- [Confirmed requirements](../decisions/2026-10-27-desktop-responsive-layout.md)
- Scope: post-login UI plus the user-approved removal of unused legacy screen CSS; no touch controls, mobile redesign, API, or deployment work.
- Implementation layer: `game/src/styles.css`; reuse the aspect-aware camera in `game/src/components/TrackingCamera3D.jsx`.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | Desktop shell, menus, match viewport, HUD, and legacy CSS cleanup | [P01](../phases/2026-10-27-desktop-responsive-layout/P01-desktop-responsive-ui/phase.md) |

Implementation is complete. Authenticated start and live match visual checks remain outstanding before deployment.

## Completion checks
- At 800x600, 1280x720, 1920x1080, 2560x1440, and 3440x1440, post-login pages have no horizontal overflow or clipped primary actions.
- At 1920x1080 and above, the outer screen panel is no longer capped at 1100px; the match canvas uses the available width and most of the remaining viewport height.
- Pitch, players, scoreboard, audio button, and minimap remain visible when the desktop window is resized; detailed skill information may be below the fold on short windows.
- `npm --prefix game run build` succeeds after each Task; authenticated visual checks are recorded during execution.
- Obsolete landing/pitch/control CSS with no JSX/JS consumers is removed only after the new responsive rules are working; shared classes such as `.page-shell`, `.footer`, `.control-guide`, and the current match HUD remain intact.
