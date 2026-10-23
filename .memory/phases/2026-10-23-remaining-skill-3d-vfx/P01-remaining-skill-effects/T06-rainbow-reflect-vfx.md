# Task: T06 Rainbow Reflect VFX

## Status: pending

## Goal
Make Rainbow Reflect read as an actual reflection: a colorful shield appears at the user's position, the user's status effect visibly leaves, and a bright rainbow pulse travels to the last opposing caster before the same status cue appears there.

## Decision Summary
- Preserve F activation, valid-status precondition, and transfer to the last opposing skill caster using the original duration.
- Keep the existing no-camera-cut and live simulation source-position rules.

## Implementation

### I01. Shield and returning effect object
- Related Files:
  - `game/src/components/SkillEffects3D.jsx` :: `makeSlot`, rainbow arc/strand meshes, Rainbow Reflect branches in effect `useFrame`; modify or delegate
  - `game/src/components/RainbowReflect3D.jsx` :: new shield/return visual component if separation keeps the effect loop manageable
  - `game/src/game/skills.js` :: `applySkill` status transfer and `addSkillEffect`; read-only
  - `game/src/game/stepGame.js` :: reflected status/projectile updates and expiry; read-only
  - `game/src/components/PlayerMotionEffects3D.jsx` :: status indicators; read-only unless transferred knockdown tracking needs adjustment

#### Details
- **Signatures & Types**:
  ```js
  state.skillEffects[]: {
    skillId: 'rainbowReflect', team: 'home' | 'away',
    sourcePlayerId: string, targetPlayerId: string,
    position: { x: number, y: number }, returnTargetPosition: { x: number, y: number },
    transferredStatuses: Array<{ type: string, durationSeconds: number }>,
    cancellationPulse?: boolean, elapsedSeconds: number, durationSeconds: number
  }
  ```
- **Data & Schema Fields**: Reuse `targetPlayerId`, `position`, `returnTargetPosition`, and `transferredStatuses`; add no transfer state.
- **Execution Flow / Logic**:
  1. Build a segmented rainbow shield arc around the user at the reflection point; orient colored panels toward the return direction and pulse on activation.
  2. Animate a bright rainbow orb with six trailing colored ribbons from user to `targetPlayerId`/`returnTargetPosition`, interpolating by `elapsedSeconds / durationSeconds`.
  3. Time the user-side status fade and target-side arrival cue to the transfer event. Target's regular status cue, including Eulryongta stars for transferred knockdown, starts only after simulation applies the status.
  4. When reflecting a skill shot, follow the actual returned ball trajectory; do not draw a competing independent arc.
  5. Keep shield/pulse/ribbon geometry in bounded reusable slots and preserve team accents and no-camera-cut rule.
- **Error & Exception Handling**: If target disappears, stop at last finite endpoint and hide target arrival geometry; never create a transfer if simulation did not apply one.
- **State Transition & Return**: Visual state is read-only; status clear/apply and duration remain owned by `applySkill` and `stepGame.js`.

### I02. Preview validation
- Related Files:
  - `game/src/App.jsx` :: Rainbow preview status/last-caster setup; read-only after T01
  - `game/src/components/SkillEffects3D.jsx` or `game/src/components/RainbowReflect3D.jsx` :: return path; inspect visually
- Confirm controlled player loses the status cue, a colored connection travels to the last opposing caster, and the target gains the same cue using the simulation's status timer.

## Acceptance Criteria
- [ ] Rainbow Reflect has a distinctive segmented shield, traveling pulse, and multicolor ribbon.
- [ ] Animation connects actual user and last opposing caster; shot reflection follows the actual ball.
- [ ] Status source and duration are unchanged; target cue begins only after simulation applies status.
- [ ] No camera cut or second gameplay transfer is introduced.

## Validation
- `cd game; npm run build` — shield and return effect compile.
- Manual: preview `rainbowReflect`; trigger against knockdown and stun, then verify reflected-shot handling.

## Commit Message
```text
feat(vfx): show Rainbow Reflect shield and return

Plan: 2026-10-23-remaining-skill-3d-vfx
Phase: P01-remaining-skill-effects
Task: T06-rainbow-reflect-vfx

- Add a segmented shield and traveling rainbow pulse
- Follow live status transfer and reflected-shot positions
```

## Progress
- [ ] Implementation complete
- [ ] Validation passed
- commit: pending
