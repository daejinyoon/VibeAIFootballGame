# Phase: P01 Team Controls and Shared Skills

## Tasks

| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | Add nine kit presets; fix kickoff selection and keyboard guide | [T01](./T01-kits-kickoff-and-controls.md) |
| T02 | `in_progress` | Create ordered shared team skill deck, reward/setup UI, and save migration | [T02](./T02-team-skill-deck-and-migration.md) |
| T03 | `pending` | Implement shared activation order/cooldown and all confirmed skill rules | [T03](./T03-shared-skill-simulation.md) |
| T04 | `pending` | Present skill effects in 3D and add Eulryongta photo cut-in and impact sound | [T04](./T04-skill-3d-effects-and-audio.md) |

## Dependencies

- T01 is independent and runs first.
- T02 establishes the campaign/save/team-deck model used by T03.
- T03 establishes simulation state and transient effect data consumed by T04.
- T04 is the final renderer/audio integration task.

## Progress

- done: 1/4 (active: T02)
