# Decisions: Goal Celebration Motion Polish

- Date: 2026-10-30
- Status: Confirmed

## D01. Motion quality target
- **Chosen**: Keep the low-poly character style and add elbow and foot articulation so each requested ceremony reads clearly at match camera distance.
- **Rationale**: The user wants to inspect every movement before deployment and selected the rig extension over angle-only adjustments.

## D02. Existing ceremony contract
- **Chosen**: Preserve the five ceremony IDs, three-second shared clock, three scoring-side field participants, and randomized RKO roles. Keep Moonwalk's audio silent.
- **Rationale**: These are already confirmed and implemented game rules; this pass improves their presentation without changing match flow.

## D03. Choreography landmarks
- **Chosen**:
  - SIUUU: anticipation, jump, half-turn, landing, arms-wide hold.
  - Moonwalk: smooth backward glide with alternating toe/heel foot articulation.
  - Take the L: raised L-shaped arm gesture by the head, counterposed arm, and a clear bouncing step.
  - Slickback: alternating lifted-foot shuffle, visible glide, and upper-body counter-sway.
  - RKO: striker punches the target's abdomen; target clutches stomach, bends and lowers head; finisher hooks and takes the target backward to the ground; brief hold and recovery.
- **Rationale**: Each movement needs its own readable silhouette and timing, and the RKO must visibly follow the user's specified sequence.

## D04. Delivery scope
- **Chosen**: Complete a local motion-quality pass and let the user inspect it before any deployment. Do not deploy as part of this motion task.
- **Rationale**: The user plans to deploy the game but wants to review all ceremony movements first.
