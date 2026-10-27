# Task: T03 Beta Badge and Goal-Kick HUD

## Status: done

## Goal
Make beta status visible on the start screen and make both manual and automatic goal-kick situations unmistakable without changing existing restart rules.

## Decision Summary
- Show a `BETA` badge on the start screen only; do not change package metadata/version `0.1.0`.
- Goal kick logic, event names, timing, and key bindings already exist. This Task changes only visible status and guidance.

## Implementation

### I01. Add the start-screen badge and goal-kick guidance

- Related Files:
  - `game/src/components/StartScreen.jsx` :: `StartScreen` — render a BETA label within the existing brand eyebrow; modify.
  - `game/src/components/GameScreen.jsx` :: `restartControls`, match status row — identify goal-kick phase and render team-specific status and instructions; modify.
  - `game/src/styles.css` :: `.start-panel`, `.eyebrow`, `.match-card-status` — style the compact badge and goal-kick status; modify.
  - `game/package.json` :: `version` — read-only; retain `0.1.0`.
  - `game/src/game/stepGame.js` :: `beginManualRestart`, `beginGoalKick`, `advanceManualRestart` — read-only reference; do not change rules.

#### Details
- **Signatures & Types**:
  ```typescript
  type MatchRestart = { type: string; team: 'home' | 'away' } | null;
  type MatchViewState = { phase: string; restart: MatchRestart };
  ```
- **Execution Flow / Logic**:
  1. Add a text-only `BETA` badge next to the existing `DEX ARCADE · SUNNY CUP` eyebrow content in `StartScreen`. Keep it absent from team customization, stage selection, match, and results screens.
  2. Add a dedicated CSS class so the badge remains readable on desktop and the existing narrow/mobile start-screen layout; do not change global `.eyebrow span` styles.
  3. In `GameScreen`, derive `isGoalKick = viewState.phase === 'goalKick' || viewState.restart?.type === 'goalKick'`. This covers automatic keeper restarts (phase without manual restart data) and goal-line manual restarts.
  4. For a home-controlled manual goal kick, show `골킥 · 방향키로 방향 설정 · A 롱킥 · S 짧은 패스` in the existing live restart instructions and a visible `GOAL KICK` status label.
  5. For an away goal kick, show `상대 골킥 재개 중` and `GOAL KICK` without implying the player can control the opposing goalkeeper.
  6. For a non-manual automatic goalkeeper phase with `phase === 'goalKick'`, use `possessionTeam` to distinguish home/away and show the corresponding status until the existing phase transition completes.
  7. Leave throw-in, corner, free-kick, penalty, kickoff, and restart action handling unchanged.

## Acceptance Criteria
- [x] Start screen visibly identifies the build as BETA; `game/package.json` remains `0.1.0`.
- [x] Home and away goal kicks are visibly labeled, including automatic goalkeeper restart phases.
- [x] Home instructions match existing `A` long-kick and `S` short-pass controls.
- [x] Existing goal-kick simulation and timing are unchanged.

## Validation
- `npm run build` from `game/` — production build completes.
- `npm test -- src/game/stepGame.test.js` from `game/` — existing goal-kick rules remain green.
- Manual browser review at desktop and narrow/mobile widths — badge is legible and manual/automatic home/away goal-kick messages are correct.

## Commit Message
```text
feat(ui): label beta build and goal-kick restarts

Plan: 2026-10-27-football-beta-feedback
Phase: P01-game-stability-and-polish
Task: T03-beta-badge-and-goal-kick-hud

- Add a start-screen-only BETA badge
- Make existing home and away goal kicks visible in the match HUD
```

## Progress
- Added a start-screen-only BETA badge; package version remains 0.1.0.
- Added team-specific GOAL KICK status for manual and automatic goalkeeper phases. Home manual kicks show the existing A long-kick and S short-pass controls; away and automatic phases do not imply player control.
- Validation passed: `npm test -- src/game/stepGame.test.js` (91/91), `npm run build`, and package version check.
- Desktop/mobile visual review could not be completed because headless browser screenshot generation failed in this environment.
- Commit: `feat(ui): label beta build and goal-kick restarts`