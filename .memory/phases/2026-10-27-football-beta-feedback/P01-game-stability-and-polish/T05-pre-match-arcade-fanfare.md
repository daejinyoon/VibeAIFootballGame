# Task: T05 Pre-Match Arcade Fanfare

## Status: done

## Goal
Create a short original arcade entrance cue and play it only while the team-customization or stage-selection screen is active, looping across those screens and fading out on entry to a match or any other screen.

## Decision Summary
- Do not use or imitate the identifiable UEFA Champions League/Europa League melody. Do not embed or hide YouTube playback.
- Generate an original instrumental cue with the browser's Web Audio API; use the shared audio context prepared for game audio. The tune is an 8-second four-bar C-major arcade fanfare, not an external asset.
- Team customization and stage selection share one continuous music session; navigating between them must not restart the loop.

## Implementation

### I01. Implement the original scheduled fanfare

- Related Files:
  - `game/src/game/audioContext.js` :: `getAudioContext`, `prepareAudioContext` — shared context created by T04; read-only.
  - `game/src/game/menuMusic.js` :: `startMenuMusic`, `stopMenuMusic` — schedule, loop, and fade the original theme; new.

#### Details
- **Signatures & Types**:
  ```typescript
  export function startMenuMusic(): boolean;
  export function stopMenuMusic(): void;
  ```
- **Composition Data**:
  - Tempo: 120 beats per minute; meter: 4/4; key center: C major; phrase length: 16 quarter-note beats (8 seconds).
  - Use MIDI note numbers and beat lengths below; each item is a simultaneous chord, with its highest note as the melody.
  ```typescript
  const FANFARE_PHRASE = [
    { midi: [60, 64, 67, 72], beats: 2 }, { midi: [79], beats: 1 }, { midi: [84], beats: 1 },
    { midi: [62, 65, 69, 74], beats: 2 }, { midi: [81], beats: 1 }, { midi: [86], beats: 1 },
    { midi: [55, 59, 62, 67], beats: 2 }, { midi: [79], beats: 1 }, { midi: [83], beats: 1 },
    { midi: [60, 64, 67, 72], beats: 2 }, { midi: [76], beats: 1 }, { midi: [84], beats: 1 },
  ];
  ```
- **Execution Flow / Logic**:
  1. Convert MIDI pitch to frequency with `440 * 2 ** ((midi - 69) / 12)` and beat count to seconds with `beats * 0.5`.
  2. Schedule all nodes against `AudioContext.currentTime`, never with frame-by-frame React state. For each chord's highest note use a low-volume sawtooth lead; use triangle oscillators for the lower chord tones. Apply a 30 ms attack and 120 ms release per note through GainNodes.
  3. Route the phrase through one master GainNode. Start at gain `0.12`; loop the exact 8-second sequence while active.
  4. Make `startMenuMusic()` idempotent: repeated calls while the phrase is active must not create a second loop. If the context is suspended, request `resume()` and safely handle rejection.
  5. `stopMenuMusic()` cancels future phrase scheduling, ramps master gain to zero over 0.6 seconds, stops/disconnects scheduled oscillators, and releases timer/node references. A later start creates one clean loop.
  6. Keep the melody original as specified; do not quote, copy, or transform any UEFA theme melody, recording, sample, or YouTube audio.

### I02. Bind music lifetime to the two selected screens

- Related Files:
  - `game/src/App.jsx` :: `App`, `openTeamCustomization`, `startNewCampaign` — start/retain/stop menu music based on screen transitions; modify.
  - `game/src/game/menuMusic.js` :: `startMenuMusic`, `stopMenuMusic` — called by App; modify.

#### Details
- **Execution Flow / Logic**:
  1. Treat `teamCustomization` and `stageSelect` as one music-active screen group.
  2. Entering either screen from another group starts music from the explicit user navigation action and resumes the prepared audio context.
  3. Moving between `teamCustomization` and `stageSelect` leaves the existing phrase and loop running without restart.
  4. Leaving the group for `match`, `pause`, `start`, `loadout`, `results`, `leaderboard`, `skillReward`, or any other screen calls `stopMenuMusic()` once.
  5. Ensure unmount/route cleanup also calls `stopMenuMusic()`; never leave a scheduled loop after leaving the group.

## Acceptance Criteria
- [x] The generated cue follows the specified 8-second note sequence and contains no recognizable UEFA melody.
- [x] It loops once on either selected screen and does not restart between team customization and stage selection.
- [x] It fades out over 0.6 seconds when leaving those screens, especially before kickoff.
- [x] No external music file, YouTube player, second AudioContext, or accumulating scheduler is introduced.

## Validation
- `npm run build` from `game/` — production build completes.
- `npm test` from `game/` — existing audio and application tests pass.
- Manual browser navigation — verify playback starts from user navigation, continues across the two screens, stops/fades on match entry, and does not resume on match/pause/results screens.
- Check browser console after repeated screen transitions — no suspended-context rejection, duplicate loop, or retained scheduled timer errors.

## Commit Message
```text
feat(audio): add original arcade entrance fanfare

Plan: 2026-10-27-football-beta-feedback
Phase: P01-game-stability-and-polish
Task: T05-pre-match-arcade-fanfare

- Generate an original looping Web Audio fanfare
- Limit playback to team setup and stage selection screens
```

## Progress
- Added the specified original 16-beat C-major phrase in Web Audio; it schedules against the shared AudioContext and repeats on an 8-second grid.
- App starts/retains music for team customization and stage selection, stops it on other screens, and fades it over 0.6 seconds before match audio starts.
- Validation passed: `npm test` (174/174) and `npm run build`.
- Manual browser navigation and console review remain unverified in this environment.
- Commit: `feat(audio): add original arcade entrance fanfare`