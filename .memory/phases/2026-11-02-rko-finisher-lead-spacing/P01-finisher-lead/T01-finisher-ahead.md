# Task: T01 Finisher Ahead

## Status: done

## Goal
Make the RKO finisher land farther forward than the target by extending only the finisher's post-impact glide and restoring the target's original stationary root offset.

## Decision Summary
- The target does not receive additional forward translation.
- The finisher eases farther forward during the slam, holds the lead while grounded, and returns during recovery.
- Preserve kick/contact timing and face-up orientation.

## Implementation

### I01. Adjust RKO root motion
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `getRkoPose` — modify the target and finisher slam, held, and recovery poses.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO choreography test — update relative motion assertions.

#### Details
- Replace `RKO_TARGET_LANDING_GLIDE` with `RKO_FINISHER_LANDING_GLIDE = 1.2`.
- Remove the target `rootGlide` additions from its slam, grounded, and recovery source poses so it remains at its prior position throughout.
- In the finisher slam branch (`1.25 <= time < 1.75`), interpolate `rootGlide` from the existing approach value `0.48` to `RKO_FINISHER_LANDING_GLIDE` using the existing `impact = smoothstep((time - 1.25) / 0.5)`.
- In the finisher grounded branch (`1.75 <= time < 2.1`), use `rootGlide: RKO_FINISHER_LANDING_GLIDE`.
- In the finisher recovery source pose, use the same constant so the existing blend returns the finisher's glide to zero.
- Do not change `rootPitch`, torso, limb poses, camera, player formation, or non-RKO motion.

### I02. Relative motion regression coverage
- Related Files:
  - `game/src/game/goalCelebrationMotion.test.js` :: `RKO requires a close kick before the target folds and drives the target forward/down` — modify.
- Assert target glide remains zero at slam, grounded, and recovery samples.
- Assert finisher glide increases during the slam, reaches 1.2 while grounded, remains greater than the target's glide, decreases during recovery, and returns to zero at the end.
- Preserve existing tests for contact order and the finisher's face-up landing.

## Acceptance Criteria
- [x] After impact, the finisher is farther forward than the target.
- [x] The target does not gain forward glide.
- [x] The finisher returns to the normal position during recovery.
- [x] Kick contact timing and face-up landing pose stay intact.

## Validation
- `cd game; node --test src/game/goalCelebrationMotion.test.js`
- `cd game; npm run build`

## Commit Message
```text
fix(game): put RKO finisher ahead of target

Plan: 2026-11-02-rko-finisher-lead-spacing
Phase: P01-finisher-lead
Task: T01-finisher-ahead

- Move the finisher farther forward after RKO impact
- Keep the target at its existing position and verify recovery
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`node --test src/game/goalCelebrationMotion.test.js`; `npm run build`)
- commit: pending
