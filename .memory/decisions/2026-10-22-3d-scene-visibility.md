# Decisions: 3D Scene Visibility

- Date: 2026-10-22
- Status: Confirmed

## D01. Scene visibility repair scope
- **Chosen**: Repair the complete 3D match scene so the pitch, players, and ball are visible, not only the ball.
- **Rationale**: The supplied screenshot shows a solid sky-blue match canvas with no visible pitch or players either.

## D02. Unsupported 3D rendering behavior
- **Chosen**: Show guidance to open the game in a browser that supports WebGL when 3D cannot be displayed.
- **Rationale**: Keep the game as a 3D arcade game and make the limitation clear instead of switching to a 2D version.

## D03. Visual direction
- **Chosen**: Preserve the existing bright arcade presentation and the current gameplay/camera requirements while restoring the scene.
- **Rationale**: The reported issue concerns missing rendered objects, not a request to change the established art direction or game rules.

## Investigation notes
- The blank scene was reproduced in local Chrome at the development URL.
- The match UI and timer render, and the WebGL canvas exists, but the pitch, players, and ball remain invisible.
- The inspected React scene includes all three object components; investigation should focus on the renderer/camera path and provide clear unsupported-WebGL guidance.
