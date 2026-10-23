# Task: T02 Team Customization Screen

## Status: done

## Goal
Let the player open a team customization screen from the start screen at any time, preview one of four company marks and six uniform palettes, and save the choice to the local profile.

## Decision Summary
- Start defaults are DEX plus cyan/lime. The settings persist between visits and are independent of campaign progress.
- This screen customizes only the home team; opponent colors/logos are selected by the stage branding model.

## Implementation

### I01. Customization screen
- Related Files:
  - `game/src/components/TeamCustomizationScreen.jsx` :: `TeamCustomizationScreen({ customization, onSave, onBack, errorMessage })` — selector and preview; new.
  - `game/src/game/teamBranding.js` :: exported logo/palette/default/normalizer — read-only.
  - `game/src/styles.css` :: `.team-customization*`, `.brand-option*`, `.kit-palette*` — selector/preview styling; modify.
- Details
  - Show four logo choices in a `role="radiogroup"` or native radio group, with accessible names DEX, SAMSUNG, APPLE, GOOGLE.
  - Show six palette cards with jersey, trim, shorts, and boots swatches, accessible `aria-pressed` or native radio state, and a live uniform preview using the current selected logo.
  - Keep logo selection independent of kit selection. The preview uses original logo colors and the chosen palette colors.
  - `onSave(nextCustomization)` emits exactly `{ logoId, paletteId }` after `normalizeTeamCustomization`; `onBack()` returns to start without writing.
  - Add a visible save state and inline error message; do not block access based on nickname or campaign save.

### I02. Start-screen and profile flow
- Related Files:
  - `game/src/components/StartScreen.jsx` :: props and action buttons — add customization entry; modify.
  - `game/src/App.jsx` :: screen state, `handleTeamCustomizationSave`, render branch — persist and navigate; modify.
- Details
  - Add StartScreen prop `onOpenTeamCustomization: () => void` and a visible “팀 꾸미기” button.
  - Add App screen value `'teamCustomization'`. Render `TeamCustomizationScreen` with `profile.teamCustomization`, a back handler to `'start'`, and a save handler.
  - Save by calling `writeProfile({ ...profile, teamCustomization: nextCustomization })`; update React profile with normalized return value and keep existing `campaignSave`/`bestRecord` untouched.
  - On storage exception, stay on screen and display `profileError`; on success, return to start. Do not modify campaign state or clear a saved campaign.

## Acceptance Criteria
- [x] Start screen can open team customization regardless of whether a campaign save or nickname exists.
- [x] All four logos and six palettes are selectable and preview together.
- [x] Logo and uniform palette can be changed independently.
- [x] Save persists settings and returns to start; Back discards unsaved changes.
- [x] Existing nickname, campaign progress, and best record survive save.

## Validation
- `cd game; npm run build` — new screen and App navigation compile.
- `cd game; npm test -- src/storage/localProfile.test.js` — persisted customization does not change existing profile behavior.
- Both validation commands passed. Manual browser check was unavailable in this environment; reload and visual interaction remain to be checked in a browser.

## Commit Message
```text
feat(ui): add persistent team customization screen

Plan: 2026-10-23-football-game-overhaul
Phase: P04-persistent-team-identity
Task: T02-team-customization-screen

- Add logo and uniform palette previews
- Save home-team choices from the start screen
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `ed49e39`
