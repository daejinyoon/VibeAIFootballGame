# Phase: P01 Existing Profile Container

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `in_progress 🔵` | Move daily result storage to the existing profiles container, keep profile documents isolated, and deploy the API fix. | [T01](./T01-use-existing-profile-container.md) |

## Progress
- done: 0/1 (active: T01)
- Diagnosis: production has the `football` database and existing `profiles` container, but no `pvp` container. Daily challenge currently opens `pvp` through the PvP repository and maps the resulting storage failure to `DAILY_CHALLENGE_STORAGE_UNAVAILABLE`.
- Local verification: API 44/44 tests, API syntax check, and frontend build pass. No Azure resources were changed.
