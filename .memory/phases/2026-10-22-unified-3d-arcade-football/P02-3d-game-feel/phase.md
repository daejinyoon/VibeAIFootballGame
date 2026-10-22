# Phase: P02 3D 경기 감각

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `in_progress` | 3D 캐릭터의 이동 방향 회전, 달리기, 받기·태클·넘어짐·회복 모션을 시뮬레이션 상태에 연결한다. | [T01](./T01-player-3d-motions.md) |
| T02 | `pending` | 슛 도달 가능성 판정과 연결된 골키퍼 좌우 다이빙·선방 모션을 만든다. | [T02](./T02-keeper-dive-save.md) |
| T03 | `pending` | 고정 HUD의 mm:ss/골든골 표시와 무승부 재도전 결과 UI를 완성한다. | [T03](./T03-timer-and-draw-ui.md) |

## Progress
- done: 0/3 (active: T01)

## Exit Criteria
- 자동·사용자 조작 선수의 방향과 행동이 장면에서 맞게 보이고 공 처리/충돌 결과와 애니메이션이 동기화된다.
- 화면 상단 점수·시간 HUD는 카메라와 무관하게 고정되고, 무승부는 재도전 또는 메인 화면으로 끝난다.
- `npm run build`와 전체 `npm test`가 통과한다.
