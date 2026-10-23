# Task: T04 Skill Audio

## Status: pending

## Goal
Give each of the six skills a distinct sound generated locally through Web Audio, while retaining keyboard gesture audio preparation and avoiding downloaded sound assets.

## Decision Summary
- Add separate sound identities for Eagle Shot, Tornado Shot, World Split (stored ID `powerTackle`), Eulryongta, Vacuum Cleaner, and Rainbow Reflect.
- Eulryongta keeps a short slap-like hit sound; no audio file download is required.

## Implementation

### I01. Skill-specific sound synthesis and event routing
- Related Files:
  - `game/src/game/skillAudio.js` :: `prepareSkillAudio`, `playEulryongtaImpact`, new `playSkillAudio`; modify
  - `game/src/components/GameLoop3D.jsx` :: `skillUsed` audio routing; modify
  - `game/src/game/skillAudio.test.js` :: Web Audio mocks and cue tests; modify

#### Details
- **Signatures & Types**:
  ```js
  export function prepareSkillAudio(): boolean
  export function playSkillAudio(skillId: string): boolean
  // supported IDs: eagleShot, tornadoShot, powerTackle, eulryongta, vacuumCleaner, rainbowReflect
  ```
- **Data & Schema Fields**: No persisted schema. Use existing shared `AudioContext`, user-gesture preparation on F in `createInputController`, and simulation event `{type:'skillUsed', skillId, automatic?, playerId?}`.
- **Execution Flow / Logic**:
  1. Extract/reuse existing `playEulryongtaImpact` implementation as the `eulryongta` branch; retain its short palm-like noise/body impact.
  2. Add distinct Web Audio envelopes: Eagle Shot rising tonal sweep; Tornado filtered noise/rotating modulation; World Split low crack/impact; Vacuum Cleaner descending suction sweep; Rainbow Reflect bright multi-tone chime.
  3. Use oscillators/noise/filter/gain nodes created per cue with bounded durations (each <= 1.2 seconds), connect to `context.destination`, and stop/disconnect nodes after playback.
  4. Return `false` for unsupported IDs, absent Web Audio, or construction errors without interrupting the game. Resume a suspended context after `prepareSkillAudio` or the skill key gesture as today.
  5. In `GameLoop3D`, call audio once for every accepted `skillUsed` event, including `automatic` Rainbow Reflect. Never play audio for rejected skill attempts or duplicate render snapshots.
- **Error & Exception Handling**: Catch Web Audio errors, retain silent fallback behavior, and avoid creating unbounded oscillators. Do not throw into the Three Fiber frame loop.
- **State Transition & Return**: Sound is cosmetic; no skill cooldown, event, or simulation timer changes.

### I02. Audio regression coverage
- Related Files:
  - `game/src/game/skillAudio.test.js` :: all skill IDs and unsupported-ID cases; modify
#### Details
- Mock AudioContext nodes and assert each supported skill schedules at least one source, all six have a distinct cue signature/frequency envelope, Eulryongta retains its short impact, unsupported IDs return false, and absent Web Audio does not throw.

## Acceptance Criteria
- [ ] All six skills have distinct recognizable sound envelopes.
- [ ] Eulryongta's cue remains slap-like and short.
- [ ] Rainbow Reflect auto-use makes a sound once when it reflects an opponent skill.
- [ ] Audio failure degrades silently and never stops frame simulation.

## Validation
- `cd game; npm test -- --test-name-pattern="audio|impact|skill cue"` — Web Audio tests pass.
- `cd game; npm run build` — event/audio imports compile.

## Commit Message
```text
feat(audio): add a distinct cue for every skill

Plan: 2026-10-23-six-skill-effects-and-match-fixes
Phase: P03-skill-presentation
Task: T04-skill-audio

- Synthesize six unique skill sounds with Web Audio
- Route accepted and automatic skill events safely
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
