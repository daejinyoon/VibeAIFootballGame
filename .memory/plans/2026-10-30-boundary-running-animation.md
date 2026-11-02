# Plan: Field-Boundary Running Animation

## Goal
Stop the 3D player model's running motion when a player is held against a pitch boundary and its coordinates do not change. Keep intended `vx` and `vy` intact so facing and pass-receiver logic remain unchanged. When the player moves away from the boundary, the running motion should resume immediately.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | done | Calculate actual per-frame movement for presentation and use it to drive the field player's running motion. | [P01](../phases/2026-10-30-field-boundary-running-animation/P01-boundary-aware-running-motion/phase.md) |
