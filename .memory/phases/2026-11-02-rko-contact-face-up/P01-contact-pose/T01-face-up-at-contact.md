# Task: T01 Face-Up at Contact

## Status: done

## Goal
Keep the RKO finisher upright before contact, turn them face-up at the moment they overlap the target, and keep them face-up through landing.

## Decision Summary
- Contact onset is choreography time 1.2 seconds.
- Keep the existing approach pose upright before 1.2 seconds.
- Set face-up pitch immediately at 1.2 seconds and through slam/grounded poses; preserve recovery.

## Implementation

### I01. Contact-timed face-up pose
- Related Files:
  - `game/src/game/goalCelebrationMotion.js` :: `getRkoPose` — modify finisher approach pitch and lift at contact.
  - `game/src/game/goalCelebrationMotion.test.js` :: RKO choreography test — assert pre-contact and contact samples.

#### Details
- Add `RKO_FINISHER_FACE_UP_TIME = 1.2` alongside existing RKO timing constants.
- In the finisher approach branch (`0.8 <= time < 1.25`), set `rootPitch` to `-Math.PI / 2` only if `time >= RKO_FINISHER_FACE_UP_TIME`; otherwise set it to `0`.
- Set `rootLift` to `0.035` only when face-up has begun; otherwise use `0`.
- Keep the slam (`1.25 <= time < 1.75`), grounded, and recovery source pose face-up as they are now.
- Test that time 1.0 and 1.19 remain upright; time 1.2 and 1.3 are face-up. Test that the recovery still returns to pitch zero.
- Do not change translations, limb poses, target motion, contact, or any other ceremony.

## Acceptance Criteria
- [x] Finisher remains upright before overlapping the target.
- [x] Finisher turns face-up at the overlap/contact sample.
- [x] Finisher stays face-up during slam/landing and returns upright during recovery.
- [x] Forward landing spacing and other choreography remain unchanged.

## Validation
- `cd game; node --test src/game/goalCelebrationMotion.test.js`
- `cd game; npm run build`

## Commit Message
```text
fix(game): turn RKO finisher face-up at contact

Plan: 2026-11-02-rko-contact-face-up
Phase: P01-contact-pose
Task: T01-face-up-at-contact

- Keep the finisher upright before reaching the target
- Turn face-up at contact and hold through landing
```

## Progress
- [x] Implementation complete
- [x] Validation passed (`node --test src/game/goalCelebrationMotion.test.js`; `npm run build`)
- commit: pending
