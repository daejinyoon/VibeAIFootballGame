# Decisions: Football Skill Fixes

- Date: 2026-10-26
- Status: Confirmed

## D01. Skill activation before the match clock starts
- **Chosen**: Neither the away AI nor the player-controlled home team may activate skills until `hasMatchClockStarted` is true. Both may use skills once the opening kickoff starts the 60-second clock.
- **Rationale**: A skill used by either team before kickoff can interrupt the home kickoff taker and prevent normal match start.
- **Code finding**: `maybeUseAiSkill` runs during the opening kickoff, and the home `F` activation path is also available before the clock starts. `applySkill` accepts the `playing` phase while `hasMatchClockStarted` is false.

## D02. Eulryongta duration
- **Chosen**: Reduce Eulryongta's knockdown duration from 10 seconds to 5 seconds.
- **Rationale**: Five seconds is still a clear interruption while reducing the time the affected player cannot act.

## D03. World Split wall height
- **Chosen**: Set the World Split barrier height to 72, half its current value of 144. Keep gameplay collision and rendered wall height driven by the same value.
- **Rationale**: A shorter wall makes it easier to see play happening on the other side.

## D04. Eagle Shot trajectory symmetry
- **Chosen**: Rotate the away-team Eagle Shot field path 180 degrees around field center, and shape its above-ground path like an aircraft landing: cruise at height during the early flight, then descend smoothly over the latter portion to the goal.
- **Rationale**: The user wants both attack directions mirrored and the shot to glide down toward goal instead of dropping sharply from above.
- **Code finding**: Field X/Y already follow a cycloidal progression. Above-ground height was a separate oscillating formula that added a late crest and could read visually as a steep drop.

## D05. Tornado Shot funnel orientation
- **Chosen**: Adjust the cone and wind bands together so the tornado silhouette narrows to a point at the ground and widens above it. Keep the moving tornado attached to the ball path.
- **Rationale**: The current cone's tip points upward; the user wants its point facing the ground.
