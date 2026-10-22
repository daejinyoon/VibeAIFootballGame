# Phase: P01 시각 검수와 초기 로딩

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 데스크톱·모바일 게임 흐름을 시각 검수하고 레이아웃 문제를 보정한다. | [T01](./T01-responsive-visual-qa.md) |
| T02 | `in_progress 🔵` | 3D 경기 화면을 지연 로드해 시작 화면의 초기 번들을 줄인다. | [T02](./T02-lazy-load-game.md) |

## Progress
- done: 1/2 (active: T02)

## Dependencies
- T01은 기존 React 화면과 CSS를 대상으로 한다.
- T02는 T01 검수에서 확정한 게임 화면 흐름을 유지하며 App의 화면 진입점만 지연 로드한다.
