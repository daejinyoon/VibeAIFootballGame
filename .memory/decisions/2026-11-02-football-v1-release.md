# Decisions: Football 1.0 Release

- Date: 2026-11-02
- Status: Confirmed

## D01. Release version
- **Chosen**: Release package version `1.0.0` and display `v1.0.0` in the game.
- **Rationale**: The user wants the current game published as version 1.0.

## D02. Patch note access
- **Chosen**: Add a patch notes button to the main screen; open the 1.0 notes only when the player presses it.
- **Rationale**: The user selected a button-driven patch note view rather than an automatic popup.

## D03. 1.0 patch note highlights
- **Chosen**: Summarize the five-stage 4v4 campaign, skill rewards, team customization, four supported goal celebrations with sound and camera staging, company PvP, and the improved kickoff pass/freeze behavior.
- **Rationale**: These are the main playable features and recent improvements included in the release candidate.

## D04. Deployment source visibility
- **Chosen**: Prepare and verify the release locally; do not push or publish until the user resolves the existing public-repository versus private-repository expectation.
- **Rationale**: The connected `daejinyoon/VibeAIFootballGame` repository is public, while the existing deployment plan explicitly required a private source repository and deferred closure pending the user's choice.
