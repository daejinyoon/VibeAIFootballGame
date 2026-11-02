# Decisions: Readable RKO Preview Staging

- Date: 2026-11-02
- Status: Confirmed

## D01. Three-player formation and camera
- **Chosen**: Place the target in the center, the abdominal striker diagonally in front-left, and the finisher diagonally behind-right. Use a slightly off-axis elevated front camera so the depth order and all three full bodies remain visible.
- **Rationale**: The current left-center-right row hides the contact sequence and makes the RKO roles difficult to identify.

## D02. RKO choreography readability
- **Chosen**: Keep the shared five-second ceremony timeline. Clearly sequence the striker's abdominal hit, the target folding forward, the finisher closing the gap and hooking the target's head/neck, and both falling backward together before the hold and recovery.
- **Rationale**: The current motion lets the target fall alone while the finisher turns in place, which does not read as an RKO.

## D03. Shared animation implementation
- **Chosen**: Add only local horizontal root translation to the existing role-specific pose data and have `MiiPlayerModel` apply it alongside existing root lift/glide. Reuse the same pose path in preview and match; preserve the existing pose fields and behavior for every other ceremony.
- **Rationale**: The finisher needs to close the visible gap in both preview and match without changing player simulation or introducing preview-only choreography.
