# Task: T02 In-Match Kit Rendering

## Status: done

## Goal
Make the home team's saved kit palette and selected logo appear in the 3D match after the user saves team customization and starts a new match. Keep opponent stage palettes and logos unchanged.

## Decision Summary
- The nine selected home palettes and one of DEX/SAMSUNG/APPLE/GOOGLE must apply to all home players and the keeper.
- Opponent kit/logo remains derived from the campaign stage; stage 5 keeps its black kit.
- The preview is correct, but a different selected palette still renders as the default cyan kit in a new match. Existing code appears to pass branding through the match state, so verify the actual render boundary rather than assuming persistence is the cause.

## Implementation

### I01. Trace and make kit selection explicit at the render boundary
- Related Files:
  - `game/src/App.jsx` :: `makeMatchState`, `startStage`; read-only unless trace finds a lost value
  - `game/src/game/teamBranding.js` :: `getTeamBranding`; read-only unless trace finds a normalization defect
  - `game/src/components/Match3DGame.jsx` :: `initialState` to `Match3DCanvas`; modify
  - `game/src/components/Match3DCanvas.jsx` :: props and `FootballPlayer3D` mapping; modify
  - `game/src/components/FootballPlayer3D.jsx` :: `getPlayerKit`, `FootballPlayer3D`; modify
  - `game/src/components/MiiPlayerModel.jsx` :: kit material props; modify only if the render trace identifies a material issue
  - `game/src/game/playerKit.js` :: new pure palette resolver if needed for node-testable resolution
  - `game/src/game/playerKit.test.js` :: pure resolver regression tests; new
  - `game/src/game/teamBranding.test.js` :: stage rules; modify only if required

#### Details
- **Signatures & Types**:
  ```ts
  type TeamBranding = {
    home: { logoId: 'dex'|'samsung'|'apple'|'google'; displayName: string; kit: KitPalette },
    away: { logoId: string; displayName: string; kit: KitPalette }
  };
  function getPlayerKit(player: Player, teamBranding: TeamBranding): KitPalette & KeeperColors
  ```
- **Data & Schema Fields**: Preserve `paletteId` and `logoId` profile fields, `teamBranding.home/away`, palette `jersey/trim/shorts/boots`, and keeper fallback mapping. No profile version bump or saved-campaign schema change.
- **Execution Flow / Logic**:
  1. Verify `App.makeMatchState` passes `getTeamBranding(campaign.currentStage, profile.teamCustomization)` and that `createInitialGameState` retains the exact object.
  2. Pass `initialState.teamBranding` explicitly from `Match3DGame` to `Match3DCanvas`; pass that stable object to every `FootballPlayer3D`, rather than depending on a render-time read from a mutable simulation ref.
  3. Extract the pure `getPlayerKit` resolver into `game/src/game/playerKit.js` if necessary so the exact color resolution is testable without importing JSX. It must merge the team's selected palette over team fallback and preserve keeper jersey/glove behavior.
  4. Confirm `MiiPlayerModel` receives `kit.jersey`, `kit.trim`, `kit.shorts`, `kit.boots`, `logoId`, and `isKeeper`; fix the first broken boundary found. Do not hard-code a selected palette or duplicate colors in the renderer.
  5. Keep away branding from `getOpponentBranding(stage, homeCustomization)` and verify the stage-five `boss-black` palette remains unchanged.
- **Error & Exception Handling**: Invalid IDs continue normalizing to `DEFAULT_TEAM_CUSTOMIZATION`; missing branding continues to use existing fallback kits/logos, so practice/demo renders remain possible.
- **State Transition & Return**: Saving team settings persists the same profile data as today. A fresh match receives updated branding; changes apply at match creation and do not mutate an already-running match.

### I02. Kit rendering tests
- Related Files:
  - `game/src/game/playerKit.test.js` :: home/away/keeper palette cases; new
  - `game/src/game/teamBranding.test.js` :: selected home and stage-five away rules; modify if needed
#### Details
- Use a non-default palette (e.g. `royal-gold`) and assert resolved home jersey/trim/shorts/boots match its hex colors; assert a keeper uses the documented keeper accent; assert the away kit remains stage-derived and stage 5 is black.
- Build the application after changing the component prop flow to ensure the 3D render path accepts the explicit branding prop.

## Acceptance Criteria
- [x] A non-default saved home palette reaches the 3D field-player and goalkeeper models in a newly created match.
- [x] The selected company logo reaches the home chest logo texture.
- [x] Opponent stage colors/logo behavior and black stage-five kit are unchanged.
- [x] A missing branding object still displays the existing defaults.

## Validation
- `cd game; npm test -- --test-name-pattern="kit|branding|stage five"` — palette and opponent rules pass.
- `cd game; npm run build` — Vite build succeeds.

## Commit Message
```text
fix(match): render the saved home kit in 3D

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P02-match-state-fixes
Task: T02-in-match-kit-rendering

- Pass match branding explicitly to player models
- Verify selected home palette and chest logo resolution
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`npm test`, 148/148; focused kit tests; `npm run build`)
- commit: `a003b5f`
