# Decisions: Goal Kick Formation and Kit Application

- Date: 2026-10-23
- Status: Confirmed

## D01. Goal-kick positioning
- **Chosen**: After a goalkeeper saves the ball and play restarts with a goal kick, reposition both teams to their standard formations before play resumes.
- **Rationale**: The pitch should regain clear team spacing after a save instead of leaving players scattered near the shot.

## D02. Home kit in matches
- **Chosen**: Apply the saved home-team palette and selected team logo to the home players' in-match 3D models. Keep the opponent's existing stage-specific kit and logo rules, including the black kit for stage 5.
- **Observed issue**: The customization preview shows the selected palette correctly, but after saving and starting a new campaign and match, the home players still appear in the default cyan kit despite a different palette being selected.
- **Code inspection**: The selected customization is passed into match-state branding and the player model reads kit colors from that branding. Diagnose why the rendered in-match home models still use the default appearance and make the saved selection visibly apply.
- **Rationale**: The kit preview and the match should represent the same saved team identity.
