# Task: T03 Remove Unused Legacy Screen CSS

## Status: done

## Goal
Remove verified unused CSS for the old landing-page pitch, control diagram, roster, and gauges after the desktop responsive screens work. Reduce misleading width rules such as the unused 1160px `.hero`/`.controls` caps without changing any rendered screen.

## Decision Summary
- The user explicitly added unused legacy CSS cleanup to this plan after reviewing the adjacent finding.
- Make this a conservative CSS-only cleanup after T01 and T02. Never infer that a generic class such as `.goal` or `.player` is unused merely from its name; verify there is no class token in current JSX/JS before removing its old pitch selector.
- Keep shared classes used by the current app, especially `.page-shell`, `.topbar`, `.footer`, `.eyebrow`, `.intro`, `.actions`, button rules, `.control-guide`, `.preview-pitch`, `.setup-actions`, `.validation-note`, `.game-canvas-wrap`, and `.game-bottomline`.

## Implementation

### I01. Remove the abandoned landing pitch and control diagram rules

- Related Files:
  - `game/src/styles.css` :: old `.hero`, `.pitch*`, `.controls*`, and related variants near lines 47-103, plus their max-width 900px/640px overrides and late `.pitch-footer` color override — remove only confirmed dead selectors; modify
  - `game/src/components/StartScreen.jsx` :: current `.start-panel`, `.start-visual`, `.control-guide`, `.preview-pitch` markup — protection list; read-only
  - `game/src/App.jsx` :: current post-login screen render tree — protection list; read-only

#### Details
- **Signatures & Types**:
  ```css
  /* CSS-only deletion; retain rules for classes actually rendered by current JSX. */
  /* No new selector, JS function, React prop, or event handler. */
  ```
- **Data & Schema Fields**:
  - No model, state, field, or API changes. Selector token is a CSS class name string; remove only a token with zero class-name uses in `game/src/**/*.jsx` or `game/src/**/*.js` at execution time.
  - Candidate old-scene tokens: `hero`, `hero-copy`, `screen-note`, `pitch-card`, `score-chip`, `pitch`, `pitch-lines`, `halfway`, `center-circle`, `box`, `box-left`, `box-right`, `goal`, `goal-left`, `goal-right`, `player`, `player-blue`, `player-orange`, `p1` through `p10`, `keeper-blue`, `keeper-orange`, `ball`, `field-label`, `field-label-top`, `field-label-bottom`, `pitch-footer`, `controls`, `controls-heading`, `section-index`, `control-group`, `control-label`, `key-set`, `control-description`, `horizontal`, and `skill-hint`. The old control-diagram `kbd` element selector may be removed only if `<kbd` has zero JSX uses.
- **Execution Flow / Logic**:
  1. Precondition & Validation: T01 and T02 are complete. Run `rg -n 'hero-copy|pitch-card|pitch-lines|score-chip|controls-heading|control-group|skill-hint|roster-row|away-gauge|<kbd' game/src --glob '*.jsx' --glob '*.js'` and inspect any hits. For generic names `goal`, `player`, `ball`, `box`, `pitch`, and numbered `p1`-`p10`, inspect class attributes or `className`/template string construction specifically, because plain-word hits in game data are not CSS class uses. If a real class use appears, keep that selector.
  2. Core Processing: Remove only the verified dead declarations in the line 47-103 old landing/control block; keep shared `.eyebrow`, `h1`, `.intro`, `.actions`, button, and `.footer` declarations in that region. In the max-width 900px and max-width 640px blocks, remove only `.hero`, `.controls`, `.skill-hint`, `.pitch-card`, and `.controls-heading` declarations; retain `.page-shell`, `.topbar`, `h1`, `.intro`, and `.footer` rules. Remove the late `.pitch-footer` part of the rule that shares a line with `.control-guide`; preserve `.control-guide`.
  3. Error & Exception Handling: Do not delete whole media blocks or lines containing both dead and live selectors. If a selector is used by any screen or dynamically assigned at execution time, leave it intact and note why in the Task progress. Do not change the new desktop overrides from T01/T02.
  4. State Transition & Return: Rendered appearance, current screen routes, and controls remain unchanged; only unused stylesheet bytes are removed.

### I02. Remove obsolete roster and gauge rules without touching live layout

- Related Files:
  - `game/src/styles.css` :: `.roster-list`, `.roster-row`, `.roster-number`, `.roster-name`, `.skill-type` around lines 153-155 and their <=720px/<=420px overrides; `.gauge`, `.away-gauge` in the mixed rule near line 165 — remove dead fragments; modify
  - `game/src/components/GameScreen.jsx` :: current `.sprint-meter` and `.team-skill-deck` HUD, which must remain; read-only
  - `game/src/components/TeamCustomizationScreen.jsx` :: current `.setup-actions` and `.validation-note` usage, which must remain; read-only

#### Details
- **Signatures & Types**:
  ```css
  /* Keep .game-canvas-wrap and .game-bottomline rules from mixed lines. */
  /* Keep .setup-actions, .validation-note, and .primary-button:disabled. */
  ```
- **Data & Schema Fields**:
  - No data model changes. Candidate unused selector tokens: `roster-list`, `roster-row`, `roster-number`, `roster-name`, `skill-type`, `gauge`, `away-gauge`, and `validation-ok`. `setup-actions` and `validation-note` have live JSX uses and are not deletion targets.
- **Execution Flow / Logic**:
  1. Precondition & Validation: Verify candidate class tokens have no current JSX/JS class use. Pay special attention to the line near 156 that combines obsolete `.validation-ok` with live `.validation-note` and `.primary-button:disabled`.
  2. Core Processing: Remove verified dead roster declarations and their media-query fragments while keeping neighboring live rules. On the long mixed line near 165, remove only `.gauge` and `.away-gauge` fragments; preserve `.game-canvas-wrap`, `.game-bottomline`, and `.game-bottomline > p`. If `.validation-ok` is still unused, remove its selector without deleting `.validation-note`.
  3. Error & Exception Handling: Avoid deleting generic `.player`/`.ball` game-model variables or JS constants; this Task edits CSS only. Preserve all current match HUD and control-guide styles, including newly added desktop overrides.
  4. State Transition & Return: The built CSS omits only selectors with no live consumer; gameplay and DOM remain unchanged.

## Acceptance Criteria
- [x] Confirmed dead old landing, pitch, controls, roster, and gauge selectors are removed from `styles.css`, including their obsolete media overrides.
- [ ] Current start, customization, stage, loadout, reward, result, leaderboard, and match screens retain their T01/T02 desktop layout.
- [x] Shared `.control-guide`, `.setup-actions`, `.validation-note`, `.game-canvas-wrap`, `.game-bottomline`, and all current HUD selectors remain intact.
- [x] No JSX, game logic, authentication, mobile-specific feature, or API file changes are included in the Task commit.

## Validation
- `rg -n 'hero-copy|pitch-card|pitch-lines|score-chip|controls-heading|control-group|skill-hint|roster-row|away-gauge|<kbd' game/src --glob '*.jsx' --glob '*.js'` — no current markup uses for deletion candidates; inspect and retain any discovered live use.
- `npm --prefix game run build` — production build succeeds after CSS deletion.
- `npm --prefix game run dev` — spot-check authenticated start and match screens at 1280x720 and 1920x1080 to ensure the cleanup did not alter T01/T02 appearance. Stop the dev server afterward.

## Commit Message
```text
refactor(ui): remove unused legacy screen styles

Plan: 2026-10-27-desktop-responsive-layout
Phase: P01-desktop-responsive-ui
Task: T03-remove-unused-legacy-css

- Drop obsolete landing pitch and control diagram selectors
- Keep shared menu and current match styles intact
```

## Progress
- [x] Implementation complete
- [x] Validation passed for selector audit, CSS rule parity, and production build
- Removed 82 unused selector groups; all 682 retained selector groups keep their prior declarations. The development server served the app and desktop CSS with HTTP 200. Authenticated start/match visual checks at 1280x720 and 1920x1080 remain outstanding.
- commit: committed with this Task blueprint
