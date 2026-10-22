# Task: T05 Arcade Presentation

## Status: done

## Goal
Replace the stiff local start and campaign screens with a consistent bright, fresh comic-action arcade presentation while retaining all local-play controls and accessibility.

## Decision Summary
- Apply the visual direction to start, leaderboard, match HUD, pause, result, skill reward, and loadout screens.
- Use bright sky-blue and mint surfaces, bold comic headline typography, energetic impact accents, chunky arcade buttons/cards, and clear readable contrast.
- Create original football-themed poster art; do not reuse the submitted reference image as a product asset. Keep Entra ID and online-play behavior out of scope.

## Implementation

### I01. Original start-screen poster and local nickname flow
- Related Files:
  - game/src/components/StartScreen.jsx :: StartScreen; modify
  - game/public/images/arcade-football-poster.svg :: original hero poster; new
  - game/src/styles.css :: start-panel, start-copy, start-preview, nickname-form, actions; modify
- Details
  - Create a self-contained SVG poster with original fictional football players in opposing kits, dynamic diagonal action poses, bright sky/mint base colors, and comic impact bursts. Do not include text inside the SVG; render all game copy as accessible HTML.
  - Keep the existing local nickname save form, saved-campaign continue action, new-campaign action, and leaderboard action. Keep disabled states when no valid nickname exists.
  - Arrange poster and copy responsively: poster is prominent on desktop and precedes the form/actions on small viewports. Preserve keyboard focus visibility and semantic labels.
- Acceptance details
  - Start screen still reads/writes the same local profile and campaign save.
  - Poster is original, crisp at high DPI, and does not overflow on mobile widths.

### I02. Arcade styling across screens and game HUD
- Related Files:
  - game/src/components/GameScreen.jsx :: game-topline, match-score-hud, game-bottomline; modify
  - game/src/components/ResultsScreen.jsx :: result-panel; modify
  - game/src/components/SkillRewardScreen.jsx :: reward-panel, reward-card-grid, reward-assignment; modify
  - game/src/components/LoadoutScreen.jsx :: loadout-panel, loadout-layout; modify
  - game/src/components/LeaderboardScreen.jsx :: leaderboard-panel; modify
  - game/src/components/PauseMenu.jsx :: PauseMenu; modify
  - game/src/styles.css :: app-shell, topbar, screen-panel, game-panel, match-score-hud, buttons, card, loadout, leaderboard, pause, responsive selectors; modify
- Details
  - Use a shared palette and type scale: sky blue #62c9f5, mint #63d9b4, cream #fff3cf, deep navy #15334f for text/outline, and coral #ff765e for impact accents. Keep pitch/canvas dominant during play.
  - Apply comic panel borders, offset shadows, halftone/radial burst accents, angled label tabs, and large arcade-style action buttons consistently, without making body text hard to read.
  - Make victory state celebratory with a clear win banner and score emphasis. Make loss/draw visually distinct but still readable. Reward selection should present three cards clearly; assignment screen must highlight the chosen card and available field players.
  - Keep in-match HUD compact and high contrast; do not cover the ball, selected player, or goal area. Preserve all existing text labels, click targets, keyboard behavior, and responsive layout.
  - Do not alter authentication, local profile storage schema, campaign reward rules, or game controls.
- Acceptance Criteria
  - Start, leaderboard, match, pause, result, reward, and loadout screens share the bright comic-action identity.
  - Local nickname/profile and all existing campaign actions work unchanged.
  - Result and reward CTA are visually obvious; HUD remains legible and does not obstruct play.
  - Layout remains usable at desktop and phone widths; keyboard focus and form labels remain visible.
- Validation
  - npm run build
  - Manually review all seven screens at desktop and narrow viewport sizes.
- Commit Message
  feat(ui): add bright comic arcade presentation

  Plan: 2026-10-22-arcade-3d-match-polish
  Phase: P01-arcade-match-polish
  Task: T05-arcade-presentation

  - Add an original football-action poster and arcade-style start screen.
  - Apply a shared bright comic visual system across campaign screens and HUD.
- Progress
- [x] Implementation complete
- [x] Production build passed and poster SVG is valid/copied to the build output
- [ ] Manual review of all seven screens at desktop and narrow viewport (no browser executable is available in this environment)
- commit: 4b5e4f3

## Execution Notes
- Added original self-contained football-action poster artwork and placed it before the nickname form on narrow screens.
- Reworked the start, leaderboard, pause, reward, and loadout copy while preserving their existing local campaign actions and keyboard-accessible controls.
- Applied a shared sky/mint/cream/navy/coral comic arcade style to the app shell, match HUD, results, reward cards, and setup screens.
- `npm run build` passed; SVG XML validation passed and Vite copied the poster to `dist/images/arcade-football-poster.svg`.
- Manual visual review could not be performed because the environment has no browser executable. The production build still reports the existing 745.90 kB Three.js vendor chunk warning.

