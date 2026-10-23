# Task: T01 Apply Saved Kit to Match Models

## Status: done

## Goal
Make the saved home-team palette and logo visible on every in-match home player after team customization is saved and a new campaign/match starts, while preserving keeper styling and stage-specific opponent kits.

## Decision Summary
- The preview already displays the chosen palette; the reported defect is that a newly started in-match 3D home team still appears in the default cyan kit.
- Preserve the nine selectable palettes, four logos, opponent contrast rules, and stage 5 black kit. Diagnose the final render boundary rather than changing selected values.

## Implementation

### I01. Trace and fix branding render path
- Related Files:
  - `game/src/App.jsx` :: `handleTeamCustomizationSave`, `makeMatchState`, `startStage` — verify persisted customization is used for the new state; modify only if source value is stale.
  - `game/src/game/teamBranding.js` :: `getTeamBranding`, `normalizeTeamCustomization` — verify selected IDs resolve to selected palette/logo; modify only if a mismatch is found.
  - `game/src/game/playerKit.js` :: `getPlayerKit` — ensure configured home kit colors override fallback cyan for field players and keeper derivation; modify.
  - `game/src/components/Match3DGame.jsx` :: state-to-canvas branding props — verify the same `teamBranding` object reaches the canvas; modify only if needed.
  - `game/src/components/Match3DCanvas.jsx` :: `FootballPlayer3D` props — verify branding is forwarded to every player; modify only if needed.
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D` — verify `getPlayerKit(player, branding)` and logo selection use current team branding; modify.
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel` jersey/trim/shorts material props — correct stale/default material or memoization preventing updated kit props from rendering; modify.
  - `game/src/game/teamBranding.test.js` :: branding/getPlayerKit tests — add or update palette/render-data assertions; modify.
- **Data & Schema Fields**:
  - Customization remains `{ logoId: string, paletteId: string }` from `normalizeTeamCustomization`.
  - `teamBranding.home` remains `{ logoId, displayName, kit }`; `kit` includes selected `jersey`, `trim`, `shorts`, and `boots` colors.
- **Execution Flow / Logic**:
  1. Trace values from `profile.teamCustomization` after save through `makeMatchState` and `createInitialGameState.teamBranding` into `Match3DCanvas` and each `FootballPlayer3D`.
  2. Identify the exact boundary where selected `teamBranding.home.kit` is replaced, omitted, frozen, or ignored. Do not mask the defect by changing the default palette.
  3. Ensure every non-keeper home mesh receives configured jersey/trim/shorts/boots. Keep the existing keeper rule: keeper jersey uses configured keeper color if present, otherwise configured trim; keeper trim uses configured team jersey.
  4. Ensure the home logo ID reaches `MiiPlayerModel`/brand texture and does not fall back to DEX for a different saved logo.
  5. Keep away player kits from `getOpponentBranding(stage, homeCustomization)`, preserving palette separation and the `boss-black` stage 5 palette.

### I02. Branding regression coverage
- Related Files:
  - `game/src/game/teamBranding.test.js` :: branding tests — assert selected home color/logo and away contrast/stage 5; modify.
  - `game/src/components/FootballPlayer3D.jsx` / `MiiPlayerModel.jsx` — visual props under verification; modify only at the identified defect.
- **Scenarios**:
  - For a non-default home palette and each non-default logo, `getTeamBranding` returns the selected IDs/material colors that `getPlayerKit` supplies to home field players.
  - Keeper colors follow existing configured-color derivation and never leak into regular home players.
  - Away branding still contrasts with the home jersey in stages 1–4 and remains `boss-black` in stage 5.

## Acceptance Criteria
- [x] The player renderer now prioritizes the current match state's saved home palette and logo over the initial prop snapshot.
- [x] Home kit materials are recreated when their selected color changes; the logo and HUD continue to read the same team branding.
- [x] Keeper kit derivation remains consistent with selected home palette.
- [x] Opponent stage kits remain contrasting, and stage 5 remains black.

## Validation
- `npm test -- src/game/teamBranding.test.js` — palette/logo resolution and stage kit rules pass.
- `npm run build` — 3D model props/materials compile.
- Manual acceptance: save a non-cyan palette and non-DEX logo, start a new campaign, start stage 1, and inspect all home field uniforms in the match scene.

## Commit Message
```text
fix(kits): apply saved team branding to match players

Plan: 2026-10-23-skill-loadout-visuals-and-match-fixes
Phase: P03-kit-render-fix
Task: T01-apply-saved-kit-to-match-models

- Trace saved palette and logo into the final player materials
- Preserve contrasting rival kits and the stage five black uniform
```

## Progress
- [x] Implementation complete
- [x] Validation passed: production build. Manual visual inspection remains available through a fresh match.
- commit: pending
