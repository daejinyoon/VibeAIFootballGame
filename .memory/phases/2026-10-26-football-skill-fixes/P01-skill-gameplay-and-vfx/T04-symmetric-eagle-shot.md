# Task: T04 Make Eagle Shot Trajectories Symmetric

## Status: done

## Goal
Mirror away Eagle Shot field paths around the field center and make projectiles glide down toward goal like an aircraft landing, instead of dropping sharply from above.

## Decision Summary
- Apply D04: mirror the complete path in field X/Y coordinates around `(FIELD.width / 2, FIELD.height / 2)` for opposite attack directions.
- Preserve launch timing, scoring, and Eagle Shot level behavior. Shape above-ground `height` to cruise early and descend smoothly over the latter portion of flight.

## Implementation

### I01. Mirror away volley goal targets
- Related Files:
  - `game/src/game/skills.js` :: `eagleTargetYs`, `launchEagleVolley`, `createEagleProjectile` — reflect away target positions around field center; modify
  - `game/src/game/stepGame.js` :: `advanceEagleVolley` — preserve rotational symmetry during cycloid interpolation; modify only if required

#### Details
- **Signatures & Types**:
  ```js
  function eagleTargetYs(level) // level: integer 1..3; returns number[] goal Y coordinates
  function createEagleProjectile(state, volley, targetY) // targetY: number in field Y units
  function launchEagleVolley(state, player, level) // initializes a volley for player.team
  function advanceEagleVolley(state, deltaSeconds) // advances projectile field position and above-ground height
  ```
- **Data & Schema Fields**:
  - `volley.team`: `'home' | 'away'`.
  - `volley.targetYs`: ordered numbers inside `[FIELD.goalTop + BALL_RADIUS, FIELD.goalBottom - BALL_RADIUS]`.
  - `projectile.x`, `projectile.y`, `projectile.targetY`: field-space coordinates; `projectile.height`: above-ground field units.
- **Execution Flow / Logic**:
  1. Keep `eagleTargetYs(level)` as the canonical home target ordering.
  2. For away volleys, reflect each target with `FIELD.height - targetY`, preserving index correspondence and reversing the lateral fan order.
  3. Preserve source-derived launch position, team-specific goal X plane, launch interval, scoring, and collision behavior.
  4. Ensure paired projectiles from rotationally mirrored launch positions satisfy `awayX = FIELD.width - homeX` and `awayY = FIELD.height - homeY` at equal flight progress. Keep paired above-ground `height` equal.
5. Keep Eagle Shot near its cruising height through the early flight, then smoothly reduce height across the latter portion until it reaches goal level; avoid a late vertical-looking drop.

### I02. Add rotational-symmetry regression coverage
- Related Files:
  - `game/src/game/skills.test.js` :: Eagle Shot volley tests — compare paired level 2 home and away projectiles; modify

#### Details
- Activate level 2 home and away volleys from source positions related by `(x, y) -> (FIELD.width - x, FIELD.height - y)` and opposing horizontal facing.
- Advance both states through ascent and into flight; compare matching projectile indices at equal elapsed flight progress.
- Assert paired X/Y coordinates sum to `FIELD.width`/`FIELD.height`, paired above-ground heights are equal, and away target Ys are reflections of corresponding home targets.
- Preserve existing home scoring, goal entry, cycloid field progression, and goalkeeper-bypass coverage. Add assertions that height cruises early and descends smoothly through the latter flight.

## Acceptance Criteria
- [x] Paired home/away projectile positions are 180-degree rotational counterparts at equal flight progress.
- [x] Away volley targets use the reflected lateral fan order.
- [x] Flight height cruises early and glides down smoothly toward goal; launch timing and scoring remain unchanged.

## Validation
- `node --test src/game/skills.test.js` from `game/` — Eagle Shot simulation and symmetry tests pass.

## Commit Message
```text
fix(skills): shape Eagle Shot as a mirrored landing glide

Plan: 2026-10-26-football-skill-fixes
Phase: P01-skill-gameplay-and-vfx
Task: T04-symmetric-eagle-shot

- Reflect away Eagle Shot targets and paths around field center
- Ease projectile height into a gradual late-flight landing glide
- Cover paired field positions and the descending height profile
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: recorded in Git history
