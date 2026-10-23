# Task: T03 Skill Cut-In and Brief Slow Motion

## Status: done

## Goal
Show a dramatic Mii-player cut-in for active special skills, with a colored anime-style background and a short, readable gameplay slow-motion beat.

## Decision Summary
- Trigger only for manually activated skills; the automatic `rainbowReflect` passive does not create a cut-in.
- Reuse the field player’s Mii appearance variant and skill artwork/color metadata. Normal match flow returns immediately after the cut-in.

## Implementation

### I01. Skill event identity and game time scale
- Related Files:
  - `game/src/game/skills.js` :: `applySkill()`, skill-used events — include source player ID; modify.
  - `game/src/game/stepGame.js` :: `stepGame()` or event-to-presentation state — maintain cut-in timing; modify.
  - `game/src/components/GameLoop3D.jsx` :: `useFrame()` — apply presentation time scale to simulation delta; modify.
  - `game/src/game/createInitialGameState.js` :: presentation state defaults — initialize; modify.
- Details
  - Add `playerId` to every manual `{ type: 'skillUsed', skillId, team }` event created by `applySkill()` and AI active-skill use. Keep existing fields unchanged.
  - Add top-level state field `skillCutIn: null | { playerId: string, team: 'home'|'away', skillId: SkillId, elapsedSeconds: number, durationSeconds: number }`, default `null`.
  - When an active non-automatic skill starts, set duration to `0.72` seconds. `GameLoop3D` uses `simulationDelta = delta * 0.4` while this state is active, otherwise `delta`; update the cut-in timer with real frame delta so it ends after `0.72` real seconds.
  - Prevent a second cut-in from replacing an active one; queue no extra events. Do not slow the outer UI, timer display, or CSS overlay animation.

### I02. Mii cut-in overlay and skill graphics
- Related Files:
  - `game/src/components/SkillCutInOverlay.jsx` :: `SkillCutInOverlay({ cue, player })` — dramatic overlay; new.
  - `game/src/components/MiiPlayerModel.jsx` :: reusable `pose='cutIn'` model; modify.
  - `game/src/components/GameScreen.jsx` :: match event handling and overlay mount — modify.
  - `game/src/components/SkillEffects3D.jsx` :: colors/anchoring for matching skill cues — modify only as needed.
  - `game/src/styles.css` :: `.skill-cut-in*` overlay styles — modify.
- Details
  - `GameScreen` owns `cutInCue` state, maps `playerId` to the latest `viewState.players` item, and clears the cue when `durationSeconds` ends or the component unmounts. Continue forwarding all game events to the existing `onGameEvents` prop.
  - Build the overlay with a temporary lightweight R3F `Canvas` that renders the shared `MiiPlayerModel` in `pose='cutIn'`; use the same deterministic appearance as the field player, a team-colored radial/vertical light background, and large skill name/artwork. Do not create a separate raster portrait.
  - Use `SKILLS[skillId].name` and the existing `/images/skills/*.png` artwork. Make attacking and defensive skill cues distinguishable with the existing skill/team color table.
  - Overlay must be `aria-live="polite"`, pointer-events disabled, and mounted above the match canvas but below pause/result dialogs. At `0.72s`, fade/scale out and return to the normal match view.

## Acceptance Criteria
- [x] Every manual active skill shows its source player’s matching Mii cut-in; automatic rainbow reflection does not.
- [x] Simulation runs at `0.4x` only while the cut-in is active and returns to `1x` within `0.72s` real time.
- [x] Skill title/art and team color match the emitted skill event; overlay never blocks keyboard input.
- [x] Existing skill consumption, trajectory, result events, and effects are unchanged.
- [x] No new raster character art or external animation package is added.

## Validation
- `cd game; npm test -- src/game/skills.test.js src/game/stepGame.test.js` — active skill events retain existing semantics and include source identity.
- `cd game; npm run build` — overlay and secondary Canvas compile.
- Manual browser check: activate each manual skill and confirm cut-in ends while the match resumes at full speed.

## Commit Message
```text
feat(visuals): add skill cut-ins and slow motion

Plan: 2026-10-23-football-game-overhaul
Phase: P02-three-dimensional-presentation
Task: T03-skill-cutin

- Add source-aware Mii skill cut-ins
- Briefly slow match simulation during activation
```

## Progress
- [x] Implementation complete
- [x] Targeted tests and production build passed.
- Manual browser preview unavailable in this session (no browser executable or automation tool).
- commit: pending
