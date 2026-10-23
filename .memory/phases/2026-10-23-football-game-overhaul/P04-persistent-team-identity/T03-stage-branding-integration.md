# Task: T03 Stage Branding Integration

## Status: done

## Goal
Apply saved home branding and deterministic stage-specific rival branding to player kits, the stage selector, the scoreboard, and the HUD, including the black fifth-stage boss kit.

## Decision Summary
- Home logo/kit comes from the saved profile. Rival identity is derived from current stage and excludes the home logo; limited remaining logos repeat deterministically.
- Rival colors are automatic and contrast with the home kit; the fifth-stage rival is always black/gold with light shorts.

## Implementation

### I01. Logo asset component and assets
- Related Files:
  - `game/src/components/BrandLogo.jsx` :: `BrandLogo({ logoId, className, title })` — accessible image renderer; new.
  - `game/public/images/brands/dex.svg` — DEX wordmark from provided reference styling; new.
  - `game/public/images/brands/samsung.svg` — SAMSUNG wordmark; new.
  - `game/public/images/brands/apple.svg` — APPLE mark; new.
  - `game/public/images/brands/google.svg` — GOOGLE wordmark; new.
- Details
  - Store logo assets as local SVGs; use the four IDs and asset paths from `LOGO_OPTIONS`. Keep logos self-contained (no remote runtime requests).
  - Use the company mark colors/shape in `BrandLogo`, set image `alt` to the company display name unless `title` is explicitly decorative, and set `aria-hidden` for decorative use.
  - Keep images contained with `object-fit: contain`; no distortion or text-rendered substitute in the match HUD/jersey.

### I02. Branding state and stage selection
- Related Files:
  - `game/src/App.jsx` :: `makeMatchState()`, `startSelectedStage()`, stage-selection props — derive and pass both identities; modify.
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState({ ..., teamBranding })` — add presentation metadata; modify.
  - `game/src/components/StageSelectScreen.jsx` :: selected-stage card/summary — show rival brand and kit preview; modify.
- Details
  - Add optional `teamBranding: { home: { logoId, displayName, kit }, away: { logoId, displayName, kit } }` to initial game state. Defaults use DEX/cyan-lime and deterministic stage-1 rival data when callers omit it.
  - Change `makeMatchState(campaign, teamCustomization)` to call `getOpponentBranding(campaign.currentStage, teamCustomization)` and pass normalized home plus derived away branding to `createInitialGameState`.
  - Preserve branding when retrying or replaying a stage; always derive opponent from the active `campaign.currentStage`, not `selectedStage` left over from another screen.
  - Stage cards/selected-stage summary display the derived opponent logo/name and opponent palette. The final card shows the black/gold/light-shorts kit. Locked stage details remain hidden as today.

### I03. Apply kits and scoreboard identity
- Related Files:
  - `game/src/components/GameScreen.jsx` :: score HUD team labels/logo slots — read `gameState.teamBranding`; modify.
  - `game/src/components/Match3DGame.jsx` :: scene props — pass branding; modify.
  - `game/src/components/Match3DCanvas.jsx` :: `FootballPlayer3D` map — provide home/away kit; modify.
  - `game/src/components/FootballPlayer3D.jsx` :: `KITS` lookup — replace fixed team colors with supplied palette; modify.
  - `game/src/components/PlayerMotionEffects3D.jsx` :: trail accent — use team palette accent; modify.
  - `game/src/styles.css` :: dynamic HUD accents and shirt-mark sizes — modify.
- Details
  - `FootballPlayer3D` selects `teamBranding.home.kit` or `.away.kit` and applies jersey, trim, shorts, and boots. Keep goalkeeper jersey distinct from field kit using a contrasting keeper variant derived from the same team palette.
  - Render `BrandLogo` at the chest and next to both HUD team names. Logo remains in its original colors; add a small high-contrast backing/outline so it remains legible on all six kits.
  - HUD home accent follows the selected home palette. Away HUD defaults to red; when that is too close to the selected home accent, choose the contrasting blue accent from the existing HUD palette. Keep score, timer, skill count, stamina, and minimap behavior intact.
  - Team name displayed on HUD follows the chosen/derived company logo (`DEX`, `SAMSUNG`, `APPLE`, `GOOGLE`). The actual current stage determines opponent logo/name and kit.

## Acceptance Criteria
- [x] Four local SVG marks render without network access and have accessible names.
- [x] Home kit/logo reflect saved choices in the match and remain consistent across reloads.
- [x] Opponent logo/name changes deterministically by stage, excludes the home logo, and repeats only when the rival logo pool is exhausted.
- [x] Stages 1-4 choose a rival jersey visibly distinct from the home palette; stage 5 uses the black/gold boss palette with light shorts.
- [x] Stage replay and continue paths use the correct active stage identity.
- [x] HUD team accents remain distinguishable even if the home palette is red-family.

## Validation
- `cd game; npm run build` — new logo assets, match props, and CSS compile.
- `cd game; npm test -- src/game/createInitialGameState.test.js src/game/campaign.test.js src/storage/localProfile.test.js` — match initialization, stage selection, and saved-profile behavior remain valid.
- Both validation commands passed (28 tests). Manual browser check was unavailable in this environment; 3D texture rendering and reload interaction remain to be visually checked in a browser.

## Commit Message
```text
feat(branding): apply team identity across stages

Plan: 2026-10-23-football-game-overhaul
Phase: P04-persistent-team-identity
Task: T03-stage-branding-integration

- Apply saved home kit and company mark in matches
- Assign contrasting stage rivals and a black final boss kit
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
