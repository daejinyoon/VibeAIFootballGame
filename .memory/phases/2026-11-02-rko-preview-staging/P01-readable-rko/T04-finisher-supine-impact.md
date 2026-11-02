# Task: T04 Finisher Supine Impact

## Status: pending

## Goal
Show the RKO finisher landing on their back with their face/body toward the sky while the target lands face-down, preserving the finisher's forward lunge over the target.

## Decision Summary
- Finisher impact/hold pitch is `-Math.PI / 2` (front-facing normal points straight up); target impact/hold pitch stays positive and face-down.
- Restore the prior `rootGlide: 0.7` impact/hold spacing; change orientation only.

## Implementation

### I01. Separate impact orientation and regression coverage
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: finisher and target branches of `getRkoPose` — modify.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO orientation, forward travel, impact hold and recovery assertions — modify.
  - `game/src/components/MiiPlayerModel.jsx` :: Euler application of `rootPitch` — read-only; it applies negative X pitch as a face-up/back landing.
- Details
  - Keep the target's face-down forward impact: positive `rootPitch` during slam/hold (currently `1.35`).
  - Restore the prior finisher position: `rootGlide` ramps from `0.48` to `0.7` during the launch/impact, with `rootShiftX: -0.72` through the hold. Do not retain T03's additional travel to `1.05`.
  - During finisher flight, let the body pitch forward briefly after launch, then rotate into a supine landing by the impact hold: compute `forwardPitch = 1.1 * smoothstep((time - 1.25) / 0.15)` and `faceUp = smoothstep((time - 1.4) / 0.28)`, then `rootPitch = mix(forwardPitch, -Math.PI / 2, faceUp)`. At time 1.75 and through hold time 2.1, set `rootPitch: -Math.PI / 2` exactly.
  - At recovery from 2.1–2.65, blend from the fixed `-Math.PI / 2` impact pitch to neutral using `blendToVictory`; retain the existing translation reset.
  - Tests must assert at time 1.6 the target has positive pitch and finisher has negative pitch, at 1.8 finisher pitch equals `-Math.PI / 2` and target pitch stays positive, `rootGlide` reaches only the prior `0.7` through impact, and all finisher transforms return to zero by the five-second endpoint. Keep the kick-before-bend and other ceremony tests.

## Acceptance Criteria
- [x] The finisher faces directly upward at impact and throughout the hold.
- [x] The target alone lands face-down; its forward/down pitch remains positive.
- [x] The finisher retains the previous target spacing without T03's extra forward translation.
- [x] Recovery resets the finisher to neutral; no simulation position changes occur.
- [x] Other ceremonies and five-second timing remain unchanged.

## Validation
- `cd game; npm test -- src/game/goalCelebrationMotion.test.js` — role-specific impact orientations, forward travel, recovery and non-RKO behavior pass.
- `cd game; npm run build` — shared model and preview compile.

## Commit Message
```text
fix(game): land the RKO finisher face-up

Plan: 2026-11-02-rko-preview-staging
Phase: P01-readable-rko
Task: T04-finisher-supine-impact

- Turn the finisher onto their back while the target lands face-down
- Restore the previous impact spacing and reset the pose during recovery
```

## Progress
- [x] Implementation complete
- [x] Validation passed (10 motion tests and production build; existing large-chunk advisory remains)
- commit: pending
