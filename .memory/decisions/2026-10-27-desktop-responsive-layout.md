# Decisions: Desktop Responsive Layout

- Date: 2026-10-27
- Status: Confirmed

## D01. Screen scope
- **Chosen**: Make every post-login screen responsive, including the start menu, player registration and customization, stage selection, loadout and reward screens, results, and the match.
- **Rationale**: The user reports that the current interface is too small and wants the available browser area used throughout the game.

## D02. Desktop width and content layout
- **Chosen**: Use nearly all available desktop browser width with modest adaptive gutters. Arrange menu content in responsive columns on wide displays instead of keeping the current 1100px panel limit.
- **Rationale**: Expanding only the outer panel would leave small content clustered in the middle. Columns use wide screens while keeping related content readable.

## D03. Match viewport and height priority
- **Chosen**: Give the 3D pitch and scoreboard priority in the visible desktop viewport. Size the pitch from available width and viewport height. Let detailed skill information and secondary instructions continue below the fold when the window is short.
- **Rationale**: The playable field should remain large instead of shrinking to force every status panel onto one screen.

## D04. 3D aspect ratio and camera
- **Chosen**: Allow the match canvas to adapt to the browser's aspect ratio. Adjust camera framing so the field, players, and important play area remain visible rather than cropping the edges.
- **Rationale**: A fixed 16:9 canvas leaves unused space in desktop windows with other proportions. The existing tracking camera already reads canvas size and aspect ratio, so the implementation should extend that behavior.

## D05. Interface scale
- **Chosen**: Increase text and button sizes on larger desktop screens within sensible minimum and maximum bounds. Reflow dense controls and cards as the window changes size.
- **Rationale**: Many current labels are fixed at 9-12px, so widening containers alone would not solve readability.

## D06. Device scope
- **Chosen**: Focus this change on desktop browser windows across resolutions and window sizes. Mobile-specific layouts and touch gameplay are outside this request.
- **Rationale**: The user explicitly said not to spend effort on phones. Preserve existing mobile behavior where practical without adding new mobile controls.

## D07. Legacy CSS cleanup
- **Chosen**: Include a separate Task in this plan to remove verified unused CSS for the old landing pitch, controls, roster, and gauges after the responsive layout works.
- **Rationale**: The user approved this adjacent cleanup. Keeping it separate protects live shared selectors and makes the layout changes easier to review.

## Existing-code facts and adjacent findings
- `game/src/styles.css` limits `.screen-panel` and `.game-panel` to 1100px; `.page-shell` adds large side padding. Match canvas rules also impose 16:9 and mobile height limits.
- `TrackingCamera3D` already derives camera distance from the canvas aspect ratio. Avoid duplicating that logic when resizing the canvas.
- Match controls use keyboard events in `createInputController.js`; there are no touch controls. Mobile playability is a separate feature.
- The stylesheet contains later overrides of earlier panel and canvas rules. The plan should identify the effective cascade before editing to avoid conflicting responsive rules.
