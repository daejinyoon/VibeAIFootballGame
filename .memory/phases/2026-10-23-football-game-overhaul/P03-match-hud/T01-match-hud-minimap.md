# Task: T01 Match HUD and Minimap

## Status: done

## Goal
Replace the plain match labels with an angular sports HUD, show the controlled player's skill and sprint stamina, and add a lower-center minimap with every player and the ball.

## Decision Summary
- Keep score/time readable at the top of the active 3D canvas. The HUD uses angular sports panels and lightning accents; the home accent is a dynamic value supplied by team branding in P04, and away uses a contrasting red-family accent.
- Minimap is desktop-first, lower-center, and shows both teams, ball, and a distinct controlled-player marker.

## Implementation

### I01. Minimap component
- Related Files:
  - `game/src/components/MatchMiniMap.jsx` :: `MatchMiniMap({ players, ball, controlledPlayerId })` — project match state to field markers; new.
  - `game/src/game/constants.js` :: `FIELD` — use existing dimensions; read-only.
  - `game/src/components/GameScreen.jsx` :: overlay mount — pass `viewState`; modify.
- Details
  - Render a `role="img"` region with an accessible label and a `viewBox` ratio of `960:540` (or CSS aspect ratio `16 / 9`). Do not use Canvas or add a package.
  - Convert player coordinates to percent using `x / FIELD.width` and `y / FIELD.height`. Render every active player as a dot: home cyan/dynamic home accent, away red, keeper with an outer ring. Render the ball as a white/yellow dot with a dark outline. Controlled player gets a larger double ring.
  - Keep markers clipped to the map; do not render dismissed players. If a coordinate is invalid, omit that marker.
  - Place map at the lower center of `.game-canvas-wrap`; on narrow desktop canvas widths, scale its width to `min(190px, 34vw)` and preserve field ratio.

### I02. Sports HUD and sprint/skill status
- Related Files:
  - `game/src/components/GameScreen.jsx` :: score HUD, skill cards, `viewState` — add stamina and dynamic branding inputs; modify.
  - `game/src/styles.css` :: `.match-score-hud`, `.score-team*`, `.game-bottomline`, `.skill-stock`, new `.sprint-meter` — restyle; modify.
  - `game/src/components/Match3DGame.jsx` :: branding/view props only if needed — modify in P04 integration, not in this task.
- Details
  - Retain score and match clock values and labels. Make team panels angular with blue/red-derived accent borders, lightning-shaped decorative pseudo-elements, readable white text, and high-contrast score digits.
  - Add a compact home-team sprint meter displaying controlled player's `sprintStamina` as a percentage and fill width. Clamp to `0..100`; use `aria-label` and `<progress>` or `role="progressbar"` with `aria-valuemin=0`, `aria-valuemax=100`, `aria-valuenow`.
  - Keep the existing active skill name/uses and away skill count. Add team-logo slots as empty optional props for P04 to fill; with no `teamBranding` supplied, retain “DEX FC” and “AI RIVALS” fallbacks.
  - Mount `MatchMiniMap` within `.game-canvas-wrap`, outside the R3F canvas but above its background, with `pointer-events: none`.
  - Add focus-visible and responsive desktop styles. Do not remove existing `@media` rules; mobile support is out of scope, but current layouts must not regress.

## Acceptance Criteria
- [x] Score, time, skill counts, and sprint stamina appear without obscuring the center action.
- [x] Home/away player markers, keeper rings, ball, and controlled-player marker match live `viewState`.
- [x] Minimap stays lower-center, scales with canvas width, and omits dismissed/invalid players.
- [x] HUD remains legible against the 3D canvas and does not intercept match input.
- [x] Default labels work until P04 passes brand data.

## Validation
- `cd game; npm run build` — React components and CSS compile.
- Build passed. Manual browser preview was unavailable in this environment, so live visual behavior still needs a browser check.

## Commit Message
```text
feat(ui): add match minimap and sports HUD

Plan: 2026-10-23-football-game-overhaul
Phase: P03-match-hud
Task: T01-match-hud-minimap

- Restyle score and skill status for the match view
- Add live stamina meter and lower-center minimap
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`npm run build`)
- commit: pending
