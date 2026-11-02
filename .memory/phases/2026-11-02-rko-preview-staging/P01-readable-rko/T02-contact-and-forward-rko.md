# Task: T02 Contact and Forward RKO

## Status: done

## Goal
Correct the shared RKO motion so the striker closes the gap before kicking the target's abdomen, and the finisher jumps from the front to drive the bent target forward/down.

## Decision Summary
- The target must not react or bend before the striker reaches contact range and kicks the abdomen.
- The finisher's RKO is a forward/down slam with the target; do not animate them falling backward together.
- Keep the five-second timeline and use the same role poses in match and preview.

## Implementation

### I01. Role approach, kick contact, and forward/down slam
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `getRkoPose`, role timing and root translations — modify.
  - `game/src/game/goalCelebrationMotion.test.js` :: contact-before-reaction, kick, approach and forward/down impact assertions — modify.
  - `game/src/game/goalCelebrationPreview.js` :: RKO role staging positions — modify if needed to place striker and finisher on visible approach paths.
  - `game/src/components/Customization3DPreview.jsx` :: shared RKO role/camera selection — inspect, modify only if positions/camera need adjustment to show front-side slam.
  - `game/src/components/MiiPlayerModel.jsx` :: pose root translation already supports `rootShiftX`; inspect, modify only if forward/down transform needs a distinct rendered axis.
- Details
  - Preserve the stable roles: target=center, striker=left role ID, finisher=right role ID. Preserve `rootShiftX` support from T01 and keep it a presentation transform; do not mutate player simulation positions.
  - In choreography time (0–3 seconds, mapped from the five-second celebration):
    1. 0–0.35: striker approaches target using positive `rootShiftX` toward center and positive `rootGlide`; target pose stays neutral (no head drop or body bend).
    2. 0.35–0.62: striker's right leg and foot visibly kick forward into the target's abdomen. The target's flinch begins only at contact time 0.35; bend follows after contact.
    3. 0.62–1.0: target folds forward with head lowered and arms drawing toward the abdomen. Striker retracts the kick and releases approach translation.
    4. 0.8–1.25: finisher closes the remaining gap along the forward/attacking direction using negative `rootShiftX`, positive `rootGlide`, and a visible two-arm head/neck hook; avoid a full turn away from the camera.
    5. 1.25–1.75: finisher jumps/lunges forward and down onto the target. Use positive `rootPitch` to pitch the finisher forward, a temporary positive `rootLift` during the leap, then a low impact pose. The target folds/falls forward with positive `rootPitch`; do not assign negative backward-fall pitch to either RKO participant.
    6. Hold the forward/down impact through choreography time 2.1; recover both target and finisher between 2.1–2.7, returning `rootShiftX`, `rootGlide`, and `rootPitch` to zero. Striker celebrates after contact.
  - Add/adjust role-specific `rightLegPitch` and `rightFootPitch` on the striker so the kick is visibly a leg strike, not an arm punch. Ensure the target's pre-contact pose is neutral and contact is temporally observable.
  - Keep all fields in `neutralPose()` and every returned role pose finite. Keep other ceremonies' `rootShiftX` zero and their motion untouched. Preserve RKO's safe group fallback when role assignments are missing.
  - Tests must prove: before contact target is upright; after contact target bends; striker kick leg/foot extends; striker translation closes the distance; finisher translates into the target and pitches forward/down; target pitches forward/down in the impact window; neither target nor finisher enters a negative backward fall; the hold/recovery resets transforms; all non-RKO motions remain valid.

## Acceptance Criteria
- [x] Striker visibly closes the gap before the kick; target does not bend before contact.
- [x] The abdomen kick is expressed by leg/foot motion, followed by the target folding forward.
- [x] Finisher jumps/drives forward-down; no paired backward fall remains.
- [x] T01's separated, readable preview formation and camera remain visible; shared match poses stay simulation-independent.
- [x] Five-second duration, other ceremonies, audio and random-choice behavior remain unchanged.

## Validation
- `cd game; npm test -- src/game/goalCelebrationMotion.test.js` — contact timing, leg kick, forward/down impact, return-to-neutral and other ceremony tests pass.
- `cd game; npm run build` — preview and shared model integration compile.

## Commit Message
```text
fix(game): make RKO a contact-led forward slam

Plan: 2026-11-02-rko-preview-staging
Phase: P01-readable-rko
Task: T02-contact-and-forward-rko

- Require a close abdominal kick before the target reacts
- Drive the target forward and down with the RKO finisher
```

## Progress
- [x] Implementation complete
- [x] Validation passed (10 motion tests and production build; existing large-chunk advisory remains)
- commit: pending
