# Decisions: Opening Kickoff Teammate Passing

- Date: 2026-11-02
- Status: Confirmed

## D01. Kickoff aiming and receiver fallback
- **Chosen**: During the kickoff lock, directional input rotates the taker without moving them. On S, pass to a teammate in that direction; if no teammate is in the selected forward direction, pass to the nearest eligible teammate instead of clearing the ball forward.
- **Rationale**: The opening taker faces the opponent's goal by default while all home teammates are behind, so the current forward-only receiver filter returns no teammate and sends the ball into the opposing half.

## D02. Preserve kickoff rules
- **Chosen**: Keep non-kickers frozen, keep the half-line restriction, and release the lock only after the kickoff pass is taken and the ball moves clear. The fallback receiver must be an active field teammate, never an opponent or goalkeeper.
- **Rationale**: The fix must make the requested pass possible without changing the recently confirmed kickoff freeze behavior.
