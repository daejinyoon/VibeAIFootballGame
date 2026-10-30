# Task: T04 Ceremony Audio

## Status: done

## Goal
Play supplied ceremony clips on ceremony start, honoring global mute and browser failures.

## Decision Summary
- User supplies audio for local play only; do not deploy or redistribute these clips. Do not download, extract, or substitute recordings.
- Trigger audio on the single goalCelebrationStarted event, not each goal event; Eagle Shot sounds once after its volley.
- Moonwalk has no audio clip; keep its ceremony silent.
- One supplied RKO file contains both the slam effect and announcer commentary.

## Implementation

### I01. Add supplied audio files
- Related Files:
  - game/public/audio/celebrations/siuuu.mp3 :: genuine SIUUU shout; new, user-provided
  - game/public/audio/celebrations/take-the-l.mp3 :: Fortnite Take the L audio; new, user-provided
  - game/public/audio/celebrations/slickback-a-pimp-named-slickback.mp3 :: short LAKIM clip; new, user-provided
  - game/public/audio/celebrations/rko.mp3 :: RKO slam effect and announcer commentary in one clip; new, user-provided

#### Details
- Data & Schema Fields:
- Five ceremonies map to four MP3 files; Moonwalk remains silent and the RKO clip contains both requested sounds.
- Execution Flow / Logic:
  1. Add supplied clips incrementally. Complete T04 after all four required files exist; do not add placeholders or substitute recordings.
  2. Confirm exact names and MP3 format. Vite serves public files at /audio/celebrations/{filename}.

### I02. Playback and event integration
- Related Files:
  - game/src/game/matchAudio.js :: audio cache, mute subscription, prepareMatchAudio, new playGoalCelebrationAudio — modify
  - game/src/components/GameLoop3D.jsx :: event loop — trigger once; modify
  - game/src/game/goalCelebrationAudio.test.js :: mapping/replay/mute/failure/RKO tests — new
  - game/src/game/audioSettings.js :: isGameAudioEnabled, subscribeGameAudio — read-only
  - game/src/game/stepGame.js :: event contract from T02 — read-only

#### Details
- Signatures & Types:
  ```typescript
  export async function playGoalCelebrationAudio(ceremonyId: GoalCelebrationId): Promise<boolean>;
  ```
- Data & Schema Fields:
  - siuuu -> /audio/celebrations/siuuu.mp3
  - moonwalk -> silent
  - takeTheL -> /audio/celebrations/take-the-l.mp3
  - slickback -> /audio/celebrations/slickback-a-pimp-named-slickback.mp3
  - rko -> /audio/celebrations/rko.mp3
- Execution Flow / Logic:
  1. Cache window.Audio with the existing crowd-audio guard; preload all clips in prepareMatchAudio.
  2. Subscribe instances to existing global audio setting.
  3. Return false if muted, unsupported, ID unknown, or playback rejects. Reset currentTime to zero on replay.
  4. RKO starts its combined clip from time zero; other IDs start exactly one clip.
  5. GameLoop3D invokes only for goalCelebrationStarted. Preserve crowd playback on goal.
  6. Test URLs, preload, replay, mute, unavailable Audio, rejected play, and RKO pair. Never download assets.

## Acceptance Criteria
- [x] Each supplied ceremony clip plays once per start event; Moonwalk remains silent.
- [x] Global audio toggle mutes/unmutes ceremony clips.
- [x] Missing/unsupported/rejected audio never interrupts match.
- [x] All four supplied files are present; RKO clip includes its slam and commentary.

## Validation
- Set-Location game; npm test -- src/game/goalCelebrationAudio.test.js src/game/matchAudio.test.js — audio cases pass.
- Set-Location game; npm run build — integration compiles.
- Get-ChildItem game/public/audio/celebrations/*.mp3 — four clips are present.

## Commit Message
```text
feat(audio): add goal ceremony sound cues

Plan: 2026-10-30-goal-celebrations
Phase: P01-goal-celebrations
Task: T04-ceremony-audio

- Map ceremony IDs to user-supplied local clips
- Trigger cues once and respect global audio toggle
```

## Progress
- [x] SIUU, Take the L, Slickback, and combined RKO clips added and connected.
- [x] Targeted tests and production build pass.
- [x] 전체 구현 완료.
- commit: feat(audio): add goal ceremony sound cues
