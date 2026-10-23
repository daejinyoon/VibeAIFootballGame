# Task: T04 Skill 3D Effects and Audio

## Status: done

## Goal

Render simulation skill effects clearly in the active 3D match, show the supplied Eulryongta photo as a short cut-in, play a slap-like impact sound, and show the team skill/cooldown state in the HUD.

## Decision Summary

- The supplied soccer image is the Eulryongta cut-in image.
- Eulryongta plays a brief slap-like impact sound at activation.
- Tornado lift, fractured-earth barrier, Eagle shot, Vacuum pull, knockdowns, and Rainbow cancellation need legible 3D feedback.
- This is desktop gameplay; do not add mobile-specific controls or responsive UI work.

## Implementation

### I01. Render transient effects and player states in 3D

- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: effect instances/renderers; modify.
  - `game/src/components/Match3DCanvas.jsx` :: `<SkillEffects3D>` and player/ball projection; modify.
  - `game/src/components/GameLoop3D.jsx` :: simulation-to-render frame sync; modify.
  - `game/src/components/FootballPlayer3D.jsx` and `game/src/components/MiiPlayerModel.jsx` :: airborne/launch/knockdown pose; modify.
  - `game/src/styles.css` :: effect overlays/cut-in styling; modify if required.

#### Details

- Consume T03 state fields without introducing a second gameplay timer. Convert simulation field coordinates to existing 3D pitch coordinates through the same coordinate transform used for players and ball.
- Tornado: render a pooled vortex around affected players and place them visibly above pitch height while `airborneSecondsRemaining > 0`; rotate around vertical axis and return to normal ground height at zero. Keep the caster grounded and preserve stable player identity/position.
- Power wall: render the simulated barrier at its defined segment endpoints with fractured earth, dust, and restrained blue/orange energy accents. It must disappear exactly when `remainingSeconds` reaches zero or Rainbow Reflect removes it. The visual collider must match the simulation geometry closely enough that blocked movement looks fair.
- Eagle Shot: strengthen the existing shot trail/impact to communicate its level without obscuring the goal; show the resulting 1/2/3 score in HUD after goal.
- Vacuum Cleaner: show a short suction trail from the ball's previous position to caster even though simulation position changes immediately; use a render-only transition that does not alter collision or timing state.
- Eulryongta: render a brief activation burst around selected targets and a readable downed pose for the 10-second simulation knockdown.
- Rainbow Reflect: render a global shield/pulse and a clear cancellation burst at the opposing effect. Remove opposing wall meshes/effect particles when the state is canceled.
- Reuse pooled objects/materials where current `SkillEffects3D` already pools comparable particles; avoid allocating unbounded objects per frame.

### I02. Add cut-in image, sound, and HUD feedback

- Related Files:
  - `game/public/images/skills/eulryongta-cutin.jpg` :: supplied user photo; new asset.
  - `game/src/components/SkillCutInOverlay.jsx` :: skill-specific cut-in image handling; modify.
  - `game/src/game/skillAudio.js` :: `playEulryongtaImpact` Web Audio effect; new.
  - `game/src/components/GameLoop3D.jsx` or existing activation event boundary :: one-shot sound trigger; modify.
  - `game/src/components/GameScreen.jsx` :: ordered team skill names/levels and cooldown HUD; modify.
  - `game/src/styles.css` :: photo cut-in and cooldown meter; modify.
  - `game/src/game/skillAudio.test.js` :: audio trigger safety; new if existing Node test environment supports AudioContext mocking.

#### Details

- **Photo**: Copy the soccer photo already supplied in the conversation to `game/public/images/skills/eulryongta-cutin.jpg`. The existing `eulryongta.png` remains the card/icon art. If the conversation attachment is unavailable to the implementation environment, stop this asset substep and ask the user to reattach the same photo; do not substitute a different player image.
- **Cut-in**: Reuse `SkillCutInOverlay` timing and the current skill activation event. For Eulryongta display the supplied photo for a short 1.2-second cut-in, then clear it; keep existing cut-ins for other skills. Repeated render frames must not restart the overlay.
- **Sound**: Implement `playEulryongtaImpact()` with Web Audio oscillators/noise envelope (short 100–180 ms broadband transient plus low body), perceived as a sharp slap. Invoke once on successful Eulryongta activation, not on target updates or replayed state frames. Create/resume AudioContext from the user input event path to satisfy browser gesture policy; catch unavailable/blocked audio without interrupting gameplay.
- **HUD**: Show active deck in order, each skill's level, passive label for Rainbow Reflect, and one team-wide 10-second cooldown meter/status. Human sees home deck; opponent indicator can show cooldown without exposing hidden deck details. Do not display per-player stock or usage counts.
- **Accessibility/clarity**: Keep text legible over gameplay and effects. Cut-in must not cover the whole match longer than 1.2 seconds; respect existing pause overlay order.

### I03. Presentation regression checks

- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: visual projection; modify.
  - `game/src/components/SkillCutInOverlay.jsx` :: photo mapping; modify.
  - `game/src/components/GameScreen.jsx` :: deck/cooldown labels; modify.
  - `game/src/game/skillAudio.test.js` :: call count and fallback behavior; new if supported.

#### Details

- Verify each simulation effect renders only while its state exists and disappears on timeout/cancellation.
- Verify the cut-in appears once per Eulryongta activation and sound triggers once, with no thrown error when Web Audio is absent.
- Verify cooldown display tracks the simulation's team timer and does not reset from React rerenders.
- If automated WebGL/audio UI tests are not available, use build plus a manual desktop match walkthrough; do not introduce a new browser automation dependency.

## Acceptance Criteria

- [ ] Tornado visibly lifts and spins all non-caster characters; they return to ground after the simulation duration.
- [ ] Power Tackle displays a solid-looking fractured-earth barrier matching its collision and removal state.
- [ ] Eagle Shot, Vacuum Cleaner, Eulryongta, and Rainbow Reflect each have recognizable feedback.
- [ ] The supplied photo appears for Eulryongta and a short slap-like sound plays once per successful activation.
- [ ] HUD reflects the team deck, skill levels, passive Rainbow Reflect, and shared cooldown without per-player stock.

## Validation

- `npm test -- --test-name-pattern="skill|effect|audio"` from `game` — available simulation/audio regressions.
- `npm run build` from `game` — 3D component and asset integration.
- Manual desktop walkthrough: use every skill, wait through the cooldown, verify expiry/cancellation, and confirm image/audio behavior.

## Commit Message

```text
feat(presentation): add 3d skill effects and eulryongta cut-in

Plan: 2026-10-23-football-game-controls-kits-skills
Phase: P01-team-controls-and-skills
Task: T04-skill-3d-effects-and-audio

- Render skill-specific 3D states and team cooldown feedback
- Add the supplied photo cut-in and slap-like impact sound
```

## Progress

- [x] Implementation complete
- [x] Automated validation passed (`npm test`, 129 tests; `npm run build`)
- [x] Supplied photo copied to `game/public/images/skills/eulryongta-cutin.jpg`; source and built asset hashes match.
- [x] Headless Edge opened the local app shell successfully. Interactive skill walkthrough could not be run in this environment.
