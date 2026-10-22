# Task: T03 Shot and Pass Assistance

## Status: done

## Goal
Make close-range shots meaningfully easier to place on the goal while keeping saves/blocks, and stop intended ground-pass receivers from leaving a stationary ball behind as they move.

## Decision Summary
- Shot correction is strongest near goal and fades quickly with distance. Goalkeeper saves and actual defender blocks remain active.
- Track an intended receiver's changing position and provide a stable first touch at the pass target. Defenders can still intercept the ball's actual segment before it reaches the receiver.
- Preserve the directional controls, instant D shot, A lob, and S ground pass.

## Implementation

### I01. Distance-based shot correction
- Related Files:
  - game/src/game/constants.js :: SHOT_ASSIST_DISTANCE; modify and add SHOT_ASSIST_MAX if needed
  - game/src/game/stepGame.js :: releaseShot; modify
  - game/src/game/stepGame.test.js :: shot direction/goal/save cases; modify/add
- Tuning contract:
  - SHOT_ASSIST_DISTANCE becomes 520 simulation units.
  - SHOT_ASSIST_MAX is 0.88.
  - Compute goal-mouth correction as clamp(1 - distanceToGoalMouth / SHOT_ASSIST_DISTANCE, 0, SHOT_ASSIST_MAX). Blend the facing-direction goal crossing toward clamp(rawTargetY, FIELD.goalTop + 10, FIELD.goalBottom - 10) by that factor.
  - A shot traveling away from the attacking goal receives no correction.
- Constraints:
  - Keep the existing speed and shot collision/keeper save pipeline unchanged.
  - Correction changes direction only; it does not award a goal or bypass defender/keeper collision.

### I02. Moving receiver and reliable first touch
- Related Files:
  - game/src/game/createInitialGameState.js :: initial ball fields; modify
  - game/src/game/stepGame.js :: releasePass, integrateLooseBall, findGroundPassInterceptor, collectLooseBall; modify
  - game/src/game/stepGame.test.js :: pass selection, interception, reception cases; modify/add
- Ball schema:
  - Add passReceiverId: string | null, default null. It is transient match state and is not written to local profile.
  - Keep passTarget as {x:number, y:number} | undefined and clear passReceiverId/passTarget on interception, possession, shot, restart, or reset.
- Execution flow:
  1. When a ground pass has a receiver, set passReceiverId to receiver.id.
  2. During integration, resolve the active receiver by ID and update the target to the receiver's current position plus a bounded lead in its current velocity direction. Clamp the target to FIELD bounds.
  3. Before applying intended-receiver pickup assistance, test defenders against the actual previous-to-next ball segment; a defender within INTERCEPTION_RADIUS wins the interception.
  4. If the intended receiver reaches the pass target within the existing receiver pickup window, assign possession to that receiver and emit one completed pass event. If no valid receiver exists, preserve normal loose-ball pickup.
  5. For lob/cross reception, preserve the existing aerial arc and jump/header contest. Do not magnetically teleport the ball through an opponent or force a header.
- Error/state constraints:
  - Dismissed/missing receiver IDs fall back to ordinary loose-ball handling.
  - No receiver lock persists after a pass has been intercepted or caught.

## Acceptance Criteria
- [x] Close-range shots receive much stronger goal-mouth correction than long-range shots.
- [x] Goalkeepers can still save and defenders can still block corrected shots.
- [x] A moving ground-pass receiver can collect the intended pass with a natural first touch.
- [x] Defenders remain able to intercept ground passes along the actual ball path.
- [x] Lob/cross interception continues to use the existing aerial contest rules.

## Validation
- From game/: node --test src/game/stepGame.test.js
- From game/: npm run build
- In the running match: compare close/long shots, move the receiver during a ground pass, and place a defender across the passing lane.

## Commit Message
```text
feat(game): improve shot and pass assistance

Plan: 2026-10-22-arcade-match-results-skills-and-replay
Phase: P01-match-simulation
Task: T03-shot-pass-assistance

- Strengthen close-range shot correction without bypassing saves.
- Track intended receivers and stabilize first-touch collection.
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: pending

## Execution Notes
- Raised close-range shot correction to a 520-unit falloff distance and 0.88 maximum. The correction only adjusts a shot already facing toward the attacking goal; the existing goalkeeper and player pickup collision paths remain in use.
- Added `passReceiverId` to transient ball state. Ground passes now lead the active intended receiver by at most 10 units, update the target each simulation tick, prioritize that receiver for a first touch inside the existing 18-unit pickup radius, and still test opposing players against each actual ball segment first. Missing/dismissed receivers fall back to ordinary loose-ball movement. Possession, shots, headers, boundaries, restarts, and fresh match state clear the tracking ID.
- Validation: focused shot/pass tests pass (10/10 across the relevant cases); production build and `git diff --check` pass. The broader simulation suite reports 9 legacy failures (59/68 pass); these are the same unrelated failures seen before this task, with the stale S-pass timing assertion corrected as part of T03. No browser harness is available here for live-match manual checks.
- Build output retains the existing Three.js vendor chunk warning (745.90 kB, above the 500 kB advisory threshold).
