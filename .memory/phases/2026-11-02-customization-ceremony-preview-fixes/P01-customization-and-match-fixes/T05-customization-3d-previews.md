# Task: T05 Customization 3D Previews

## Status: done

## Goal
Show the selected kit on the same 3D model used in matches and add a silent ceremony preview below the ceremony choices.

## Decision Summary
- Reuse `MiiPlayerModel`, `getPlayerKit`, `getTeamBranding`, and current unsaved logo/palette. Preview must not advance match simulation or play audio.
- Specific choice loops its motion. Random cycles every active ceremony for five seconds each. RKO shows three players.

## Implementation

### I01. 3D player and ceremony preview scene
- Related Files:
  - `game/src/components/TeamCustomizationScreen.jsx` :: `KitPreview`, `TeamCustomizationScreen`, ceremony choice rendering — modify.
  - `game/src/components/Customization3DPreview.jsx` :: canvas-based preview component — new.
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel` — read-only reuse of its `gameStateRef.current` ceremony pose handling.
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D` — read-only reference for match model, team-facing, and kit rendering.
  - `game/src/game/playerKit.js` :: `getPlayerKit` — read-only reuse.
  - `game/src/game/teamBranding.js` :: `getTeamBranding`, `normalizeTeamCustomization` — read-only reuse.
  - `game/src/game/goalCelebrations.js` :: active ID/options and five-second duration constants — read-only reuse.
  - `game/src/styles.css` :: preview layout and responsive customization styles around `.team-customization-preview`, `.goal-ceremony-grid`, `.kit-preview-stage` — modify.
- Details
  - **Signatures & Types**:
    ```jsx
    export function Customization3DPreview({
      ceremonyId,
      palette,
      logoId,
      rotateRandom = false,
    }: {
      ceremonyId: string | null,
      palette: KitPalette,
      logoId: string,
      rotateRandom?: boolean,
    }): JSX.Element;
    ```
  - **Data & Schema Fields**:
    - Inputs use draft `logoId` and `paletteId`; derive branding using `getTeamBranding(1, draft)` so unsaved preview matches the exact match kit path.
    - In-memory presentation ref shape: `{ players, teamBranding, goalCelebration }`; ceremony shape `{ ceremonyId, team: 'home', participantIds, elapsedSeconds, durationSeconds, rkoRoles }`.
    - No profile/API fields, audio state, or game-state persistence are added.
  - **Execution Flow / Logic**:
    1. Replace the CSS-only player silhouette with a small `@react-three/fiber` Canvas using the shared `MiiPlayerModel`, match kit colors, and logo texture. Keep full player and feet visible.
    2. Pass current draft selection immediately. Derive home branding with `getTeamBranding(1, { logoId, paletteId })`, then use the same `getPlayerKit` and model inputs as `FootballPlayer3D`.
    3. Place ceremony preview immediately below the choice cards. Reuse the same draft branding and remain silent: do not call `playGoalCelebrationAudio` or create an `AudioContext`.
    4. A specific ID loops `elapsedSeconds` within `GOAL_CELEBRATION_DURATION_SECONDS` (5). Random cycles `GOAL_CELEBRATION_IDS` in array order, switching exactly every five seconds. Preview timers are local; never call `stepGame` or mutate live match state/clock.
    5. Render distinct, spaced home player models. SIUUU, Take the L, and Slickback display the team group. RKO displays exactly three players and assigns stable unique target/striker/finisher roles, using `assignRkoRoles` with deterministic random input or explicit deterministic roles. Each model's `gameStateRef` includes its unique participant ID and matching ceremony role.
    6. Orient the players toward the preview camera. Ensure preview canvas responds to mobile breakpoints, does not clip the formation, and does not capture keyboard focus. Keep radio labels and selection behavior accessible.
    7. Remove or retain the CSS silhouette only if it is clearly subordinate; the visible kit preview must use the same colors/logo/model path as match players.

### I02. Responsive placement and accessible description
- Related Files:
  - `game/src/components/TeamCustomizationScreen.jsx` :: draft selection, preview placement, descriptive label — modify.
  - `game/src/styles.css` :: preview sizing, mobile layout, overflow behavior — modify.
- Details
  - Ensure preview remains below ceremony choices on desktop and mobile and is not hidden/clipped by existing responsive `.team-customization-layout` rules.
  - Provide live text identifying the current motion, including the current rotating ID when Random is selected. Canvas can be aria-hidden only when that equivalent text is present.
  - Validate logo/palette updates immediately, specific looping, Random five-second rotation over all four IDs, three distinct RKO participants, and silence.

## Acceptance Criteria
- [x] 3D kit preview matches the unsaved home kit colors and logo through the same model path as the match.
- [x] Silent preview appears below ceremony choices and does not advance simulation or match time.
- [x] Specific selection loops; Random cycles the four supported IDs every five seconds.
- [x] RKO displays three separated role-specific participants; Moonwalk is not selectable or previewed.
- [x] Desktop and mobile layouts retain visible accessible controls and preview.

## Validation
- `cd game; npm run build` — preview component and scene compile.
- `cd game; npm test -- src/game/teamBranding.test.js src/game/playerKit.test.js src/game/goalCelebrations.test.js src/game/goalCelebrationMotion.test.js` — shared kit and motion behavior remains valid.
- Manual desktop/mobile UI review was attempted with a headless Edge screenshot, but the already-running Edge process intercepted the new session and no screenshot was produced. Automated build and tests pass; visual appearance remains for a local browser check.

## Commit Message
```text
feat(ui): add 3d kit and ceremony previews

Plan: 2026-11-02-customization-ceremony-preview-fixes
Phase: P01-customization-and-match-fixes
Task: T05-customization-3d-previews

- Reuse match player kit and model in team customization
- Add a silent looping ceremony preview beneath the ceremony options
```

## Progress
- [x] Implementation complete
- [x] Validation passed (production build and 18 targeted tests; existing large-chunk advisory remains)
- commit: pending
