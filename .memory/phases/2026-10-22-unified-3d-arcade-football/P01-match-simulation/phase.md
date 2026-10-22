# Phase: P01 경기 시뮬레이션

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done ✅` | 정규·골든골 시계와 승·패·무승부 결과 전이를 구현한다. | [T01](./T01-timer-and-draw.md) |
| T02 | `done ✅` | 역할 기반 지원·수비 AI, 상대 패스 선택, 양 팀 공통 실제 경로 차단 및 단일 AI 점프를 구현한다. | [T02](./T02-tactical-ai-and-pass-interception.md) |
| T03 | `in_progress 🔵` | 태클·강한 접촉의 넘어짐·회복 상태와 골키퍼 예외를 시뮬레이션에 반영한다. | [T03](./T03-contact-knockdown-state.md) |

## Progress
- done: 2/3 (active: T03)

## Exit Criteria
- `node --test src/game/stepGame.test.js src/game/campaign.test.js`가 통과하고 각 경기 결과 이벤트가 캠페인 진행·기록 규칙과 일치한다.
- 패스 차단, 로빙 경합, AI 팀원 배치, 태클 접촉/회복은 결정론적인 시뮬레이션 단위 테스트로 재현된다.
