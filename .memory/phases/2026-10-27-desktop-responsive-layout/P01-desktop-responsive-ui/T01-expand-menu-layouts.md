# Task: T01 Expand Desktop Shell and Menu Layouts

## Status: done

## Goal
Every post-login menu and information screen uses nearly all available desktop browser width, fills short pages vertically, and keeps text, buttons, and cards readable at 800x600 through 3440x1440. Remove the effective 1100px desktop limit without changing the sign-in screen or the current phone layout.

## Decision Summary
- Apply [desktop responsive layout decisions](../../../decisions/2026-10-27-desktop-responsive-layout.md): all post-login screens, modest desktop gutters, multi-column wide menus, bounded text/button growth, and no mobile-specific redesign.
- `App.jsx` renders post-login content under `<main className="page-shell app-shell">`; `SignInScreen.jsx` also uses `.page-shell` but is outside scope. Scope new layout rules to `.app-shell`.
- Make this a CSS-only Task. No React props, persistence, API, or game state changes are needed.

## Implementation

### I01. Remove the desktop shell width limit

- Related Files:
  - `game/src/styles.css` :: `.page-shell`, `.app-shell`, `.screen-panel`, `.start-panel`, `.stage-select-panel`, `.team-customization-panel` — desktop width, height, gutter, and panel spacing; modify
  - `game/src/App.jsx` :: `App` return containing `.page-shell.app-shell` and screen selection — identify the post-login scope; read-only
  - `game/src/components/SignInScreen.jsx` :: `.page-shell.auth-shell` — ensure sign-in layout is unaffected; read-only

#### Details
- **Signatures & Types**:
  ```css
  /* Add effective rules after the current stylesheet rules. */
  @media (min-width: 721px) {
    .app-shell { /* desktop viewport and gutters */ }
    .app-shell > .screen-panel { /* width, minimum viewport height, margins, padding */ }
  }
  ```
- **Data & Schema Fields**:
  - No JavaScript models, fields, or props change.
  - CSS lengths: desktop side gutter `clamp(16px, 2vw, 48px)`; screen panel outer width `100%` with `max-width: none`; panel vertical margin `clamp(12px, 2vh, 28px)`; padding `clamp(24px, 2.2vw, 56px)`; panel minimum height `max(0px, calc(100dvh - 178px))` with the existing `100vh` shell as fallback.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Inspect the effective cascade in `styles.css`: `.screen-panel, .game-panel` has `width: min(1100px, 100%)` near line 135, `.page-shell` has later 4vw side padding near line 289, and `.stage-select-panel` / `.team-customization-panel` have later 34px/48px margins. Keep the new desktop overrides after those rules, and use `.app-shell` specificity so they win without altering `.auth-shell`.
  2. Core Processing: For desktop widths at least 721px, set `.app-shell` to `min-height: 100dvh` and the bounded gutter above. Set direct child `.screen-panel` to `width: 100%`, `max-width: none`, `flex: 1 0 auto`, the stated minimum height, margins, and padding. Let content increase page height naturally; do not set `overflow: hidden` or a fixed `height` on these panels.
  3. Error & Exception Handling: At 800px width or a 600px-tall window, content may extend below the fold but must remain reachable by vertical scrolling. Prevent horizontal overflow with `min-width: 0` on grid children that contain long labels. Keep existing <=720px media rules authoritative.
  4. State Transition & Return: All post-login screens inherit the expanded shell; sign-in page and app state remain unchanged.

### I02. Reflow menu content and scale small controls

- Related Files:
  - `game/src/styles.css` :: `.start-panel`, `.start-copy`, `.start-visual`, `.control-guide`, `.nickname-form`, `.stage-card-grid`, `.stage-card`, `.loadout-layout`, `.skill-card-grid`, `.skill-player-grid`, `.reward-card-grid`, `.team-customization-layout`, `.record-list`, `.result-panel`, button and label rules — desktop layout and readability; modify
  - `game/src/components/StartScreen.jsx` :: `.start-copy`, `.start-visual`, `.control-guide`, nickname form — preserve content order; read-only
  - `game/src/components/StageSelectScreen.jsx` :: five `.stage-card` items and actions — preserve stage selection semantics; read-only
  - `game/src/components/TeamCustomizationScreen.jsx` :: controls plus sticky `.team-customization-preview` — preserve preview and actions; read-only
  - `game/src/components/LoadoutScreen.jsx` :: `.loadout-layout` — preserve inventory and player controls; read-only
  - `game/src/components/SkillRewardScreen.jsx` :: `.reward-card-grid` — preserve choice controls; read-only
  - `game/src/components/LeaderboardScreen.jsx` :: `.record-list` — preserve record columns; read-only
  - `game/src/components/ResultsScreen.jsx` :: `.result-panel` — preserve result actions; read-only

#### Details
- **Signatures & Types**:
  ```css
  @media (min-width: 721px) {
    .app-shell .start-panel { /* two columns on wide desktops */ }
    .app-shell .stage-card-grid { /* auto-fit cards */ }
    .app-shell .loadout-layout { /* two columns */ }
    .app-shell .team-customization-layout { /* controls and preview */ }
    .app-shell .skill-card-grid,
    .app-shell .skill-player-grid,
    .app-shell .reward-card-grid { /* content-sized columns */ }
  }
  @media (min-width: 721px) and (max-width: 1040px) {
    .app-shell .start-panel,
    .app-shell .team-customization-layout,
    .app-shell .loadout-layout { grid-template-columns: minmax(0, 1fr); }
  }
  ```
- **Data & Schema Fields**:
  - No component or API schema changes. CSS breakpoints are `721px` for desktop overrides and `1040px` for collapsing crowded two-column menus.
  - Wide start columns: `minmax(0, .9fr) minmax(0, 1.1fr)`, gap `clamp(24px, 3vw, 72px)`; control guide: `repeat(auto-fit, minmax(140px, 1fr))` (there are four guide items, despite an existing five-column rule).
  - Stage cards: `repeat(auto-fit, minmax(180px, 1fr))`; skill/reward cards: `repeat(auto-fit, minmax(230px, 1fr))`; loadout columns: `minmax(0, .9fr) minmax(0, 1.1fr)`; customization columns: `minmax(0, 1.25fr) minmax(320px, .75fr)`.
  - Text bounds: body descriptions `clamp(14px, .9vw, 18px)`; primary and secondary button labels `clamp(13px, .8vw, 16px)` with minimum 44px clickable height; small menu labels `clamp(11px, .68vw, 14px)`; headings `clamp(38px, 3.4vw, 72px)` where appropriate. Use selector-specific rules rather than increasing all text in the 3D HUD.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `.start-panel` is already a grid, `.stage-card-grid` has a five-column rule and <=900px three-column rule, `.loadout-layout` and `.team-customization-layout` are two-column grids, and card grids use three fixed columns. Later stylesheet blocks override earlier definitions; append the effective desktop rules after line 835 rather than editing a non-effective early declaration alone.
  2. Core Processing: Keep StartScreen content order; widen description to at most 65ch, allow the nickname form up to 500px, let its input grow to 320px, and size the poster within its column without fixed pixel width. Reflow stages/cards with the values above. On 721-1040px windows, stack start, loadout, and customization columns instead of squeezing controls. Keep the customization preview sticky only while two-column layout is active; use `position: static` when stacked.
  3. Error & Exception Handling: Long nicknames, team names, card labels, and leaderboard values must wrap or truncate inside their grid cells rather than widen the page. Do not hide primary actions. Existing max-width 720px rules remain unchanged. Use `min-width: 0` on nested grid children where text could force overflow.
  4. State Transition & Return: Screen behavior and click handlers are unchanged. Only CSS sizes and placement change.

## Acceptance Criteria
- [ ] At 1920x1080 and 2560x1440, the outer post-login panels span browser width minus bounded gutters; no 1100px ceiling is visible.
- [ ] At 800x600 and 1280x720, start, stage, loadout, customization, results, reward, and leaderboard controls remain reachable without horizontal scrolling.
- [ ] The four control-guide items use available columns; stage and skill cards reflow rather than becoming unreadably narrow.
- [ ] Common 9-12px menu labels become bounded readable sizes; buttons remain keyboard-focusable and clickable.
- [ ] Sign-in screen and <=720px layout are not intentionally redesigned.

## Validation
- `npm --prefix game run build` — Vite build succeeds with no CSS parsing errors.
- `npm --prefix game run dev` — with a signed-in local session, inspect each post-login screen at 800x600, 1280x720, 1920x1080, 2560x1440, and 3440x1440; confirm no horizontal overflow, clipped controls, or 1100px desktop panel cap. Stop the dev server after inspection.

## Commit Message
```text
feat(ui): expand desktop shell and menu layouts

Plan: 2026-10-27-desktop-responsive-layout
Phase: P01-desktop-responsive-ui
Task: T01-expand-menu-layouts

- Use full desktop width across post-login menus
- Reflow cards and scale controls for readability
```

## Progress
- [x] Implementation complete
- [x] Validation passed: production build and headless Chrome layout checks of seven actual React screens at desktop widths; signed-in end-to-end interaction was not exercised.
- commit: committed with this Task blueprint
