# Phase: P03 로컬 웹앱 연결

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | React Three Fiber 장면에 시뮬레이션·입력·HUD·일시정지 흐름을 연결한다. | [T01](./T01-match-render-loop.md) |
| T02 | `pending` | 밝은 DEX 스포츠 UI, 5단계 캠페인, 스킬 보상 카드와 선수 배정 화면을 만든다. | [T02](./T02-campaign-reward-ui.md) |
| T03 | `pending` | 프로필 버전 2 저장 마이그레이션과 5단계 최고 기록 랭킹을 완성한다. | [T03](./T03-local-save-ranking.md) |

## Progress
- done: 1/3 (active: T02)

## Dependencies
- T01은 P01과 P02가 완료된 뒤 진행한다.
- T02는 P02 캠페인·보상 데이터 함수를 사용한다.
- T03은 P02 저장할 캠페인 스키마와 T02의 새 화면 흐름을 사용한다.
