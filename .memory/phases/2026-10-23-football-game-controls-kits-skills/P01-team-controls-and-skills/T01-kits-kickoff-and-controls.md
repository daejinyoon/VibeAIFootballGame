# Task: T01 Kits, Kickoff, and Controls

## Status: done

## Goal

Make home kit selection easier to scan with nine preset palettes, ensure the home forward is controlled at a home kickoff after conceding, and make the start-screen keyboard guide match the confirmed desktop controls.

## Decision Summary

- Keep the four existing logo choices and existing opponent contrast/stage branding behavior.
- Display nine named, ready-made combinations with jersey, trim, shorts, and boots colors.
- Arrow keys are the only movement shown; `E` sprint appears on the movement row. Remove the separate SPRINT and AERIAL rows.
- On a home kickoff reset, select the home kickoff taker. Do not change control until a pass; a successful home pass continues to select the intended receiver.
- Preserve Stage 1 as the new-campaign starting stage; its current implementation is already correct.

## Implementation

### I01. Expand palette data and selection cards

- Related Files:
  - `game/src/game/teamBranding.js` :: `KIT_PALETTES`, `normalizeTeamCustomization`, `getOpponentBranding`; modify.
  - `game/src/game/teamBranding.test.js` :: palette and opponent contrast cases; modify if present, otherwise new.
  - `game/src/components/TeamCustomizationScreen.jsx` :: palette-card rendering and `KitPreview`; modify.
  - `game/src/styles.css` :: palette grid/card/swatch selectors; modify.

#### Details

- **Types and fields**: Preserve the existing palette object contract `{ id: string, name: string, jersey: string, trim: string, shorts: string, boots: string }`; every color is a CSS hex string. Keep the current selected `paletteId` persistence contract.
- **Palette contents**: Retain the current six IDs and add exactly three new unique IDs. Ensure all nine jerseys are distinct enough to visually compare and every palette has sufficient trim contrast. Use the current four logo choices without changing their IDs.
- **Rendering**: Render all nine presets as keyboard-accessible radio cards with name, four color swatches, and the existing kit preview. Ensure selected and focus states remain visible at desktop widths and cards wrap without overlap at narrow widths.
- **Opponent contrast**: Preserve deterministic stage opponent selection and stage 5 black-kit behavior. Update any assumptions tied to the former six-item count.
- **Validation errors**: `normalizeTeamCustomization` must continue falling back to a valid default when the ID is missing or unknown.

### I02. Correct kickoff and control guide

- Related Files:
  - `game/src/game/stepGame.js` :: `resetForKickoff`, `releasePass`; modify.
  - `game/src/game/stepGame.test.js` :: kickoff and pass handoff tests; modify.
  - `game/src/components/StartScreen.jsx` :: control guide; modify.
  - `game/src/game/createInputController.js` :: `createInputController`; read-only, verify arrow/E mappings only.
  - `game/src/game/campaign.js` :: `createCampaign`, `getUnlockedStage`; read-only, preserve stage 1.

#### Details

- **Kickoff state**: On a home-team kickoff, set `controlledPlayerId` to the actual home kickoff taker after player positions are reset. Determine the taker from the same player/role selected to hold the kickoff ball; do not hard-code a second, potentially divergent player choice.
- **Transition**: Keep kickoff lock/rules that prevent switching before the ball is passed. On a successful home pass, keep `releasePass` assigning the receiver ID. Away kickoffs must not force a home controlled-player change.
- **Guide copy**: The movement row must read arrow keys and show `E` sprint alongside it. Remove standalone `SPRINT` and `AERIAL` rows. Keep other current action rows accurate.
- **Stage regression**: Do not modify campaign start defaults: new campaigns start with `currentStage: 1`, and initial unlock remains stage 1.

### I03. Regression coverage

- Related Files:
  - `game/src/game/stepGame.test.js` :: new/updated tests; modify.
  - `game/src/game/teamBranding.test.js` :: new/updated tests; modify or new.
  - `game/src/game/campaign.test.js` :: stage-one assertion; modify only if absent.

#### Details

- Cover nine unique palette IDs, valid color fields, normalizing each ID, and unchanged stage 5 contrast behavior.
- Cover conceded-goal kickoff selecting the kickoff taker, no switch before pass, successful pass switching to receiver, and away kickoff not changing home control.
- Cover start guide text and absence of standalone SPRINT/AERIAL labels where practical with existing test setup; otherwise acceptance is verified by source review/build.
- Assert a fresh campaign starts at stage 1.

## Acceptance Criteria

- [ ] Team customization shows nine selectable presets and retains the existing four logos.
- [ ] Rival kits remain distinguishable from the home kit, with stage 5 still black-based.
- [ ] Home kickoff control starts on the kickoff taker and passes transfer control to the intended receiver.
- [ ] The start screen presents arrow keys and E sprint in the movement row and has no SPRINT/AERIAL rows.
- [ ] A new campaign still starts at Stage 1.

## Validation

- `npm test -- --test-name-pattern="team branding|kickoff|campaign"` from `game` — palette, kickoff, and stage regression coverage.
- `npm run build` from `game` — confirms UI and CSS integration compiles.

## Commit Message

```text
feat(controls): expand kit choices and fix kickoff control

Plan: 2026-10-23-football-game-controls-kits-skills
Phase: P01-team-controls-and-skills
Task: T01-kits-kickoff-and-controls

- Add nine home kit presets and keep stage rival contrast
- Select the home kickoff taker and align the keyboard guide
```

## Progress

- [x] Implementation complete
- [x] Validation passed
