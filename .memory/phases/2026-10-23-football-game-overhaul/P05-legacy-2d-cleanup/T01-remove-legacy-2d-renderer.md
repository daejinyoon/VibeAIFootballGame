# Task: T01 Remove Legacy 2D Match Renderer

## Status: done

## Goal
Delete the unused Canvas 2D match renderer and its renderer-only styles and tests after the 3D overhaul is complete, while preserving shared simulation modules used by the active match.

## Decision Summary
- The application runs matches through `Match3DGame` and `Match3DCanvas`; `PitchCanvas` and `drawGameFrame` have no application call sites.
- Remove only the orphaned drawing path. Keep shared game state, physics, input, campaign, and active 3D files unchanged.

## Implementation

### I01. Remove isolated renderer and references
- Related Files:
  - `game/src/components/PitchCanvas.jsx` :: `PitchCanvas()` ??delete unused Canvas 2D component.
  - `game/src/game/drawGameFrame.js` :: `drawGameFrame()` and renderer helpers ??delete unused 2D drawing module.
  - `game/src/game/drawGameFrame.test.js` :: renderer-only tests ??delete tests for removed module.
  - `game/src/styles.css` :: `.pitch-canvas`, `.pitch-canvas:focus-visible`, `.game-canvas-wrap .pitch-canvas` ??remove renderer-only selectors; modify.
- Details
  - Before deletion, confirm `rg -n "PitchCanvas|drawGameFrame" game/src` finds no remaining application imports/usages outside the legacy component, renderer module, and their tests.
  - Delete the three legacy source/test files listed above.
  - Remove only `.pitch-canvas` rules and the `.game-canvas-wrap .pitch-canvas` rule from `styles.css`. Preserve `.game-canvas-wrap` rules used to contain the active 3D canvas and `.game-bottomline` styles used by `GameScreen`.
  - Do not delete or rewrite `game/src/game/constants.js`, `createInputController.js`, `stepGame.js`, game-state modules, or their active tests. They are shared by the 3D match.
  - Confirm all remaining `Match3DGame`, `Match3DCanvas`, and `FootballPitch3D` imports and active 3D styles remain intact.

## Acceptance Criteria
- [ ] No application import or runtime reference to `PitchCanvas` or `drawGameFrame` remains.
- [ ] The legacy renderer, its dedicated test, and its canvas-specific CSS selectors are removed.
- [ ] Shared simulation, input, campaign, and 3D match files remain present and unchanged by this cleanup task.
- [ ] The active 3D match still builds and all remaining game tests pass.

## Validation
- `rg -n "PitchCanvas|drawGameFrame" game/src` ??no matches remain.
- `cd game; npm test` ??remaining full test suite passes.
- `cd game; npm run build` ??Vite production build succeeds with the active 3D match.

## Commit Message
```text
chore(game): remove unused canvas match renderer

Plan: 2026-10-23-football-game-overhaul
Phase: P05-legacy-2d-cleanup
Task: T01-remove-legacy-2d-renderer

- Delete orphaned Canvas 2D match rendering code
- Keep shared simulation and active 3D modules intact
```

## Progress
- [x] Implementation complete
- [x] Validation passed (
pm test: 117 passed; 
pm run build: passed)
- commit: a78c829
