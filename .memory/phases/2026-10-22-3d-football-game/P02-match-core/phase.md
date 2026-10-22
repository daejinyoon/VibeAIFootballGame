# Phase: P02 캠페인과 경기 규칙

## Tasks
| Task | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| T01 | `done` | 4대4 명단, 5단계 캠페인, 저장 단계 범위 구현. | [T01](./T01-roster-five-stages.md) |
| T02 | `done` | 스킬 카드 보상, 필드 선수별 최대 3회 사용, 저장 복구 구현. | [T02](./T02-skill-draft-stacks.md) |
| T03 | `done` | Space 점프, 로빙·크로스 궤적, 공중 충돌과 자동 헤딩을 구현한다. | [T03](./T03-jump-cross-header.md) |
| T04 | `done` | 단계별 상대 스킬 수·보스 AI를 조정하고 기존 경기 규칙과 이벤트를 4대4에 맞춘다. | [T04](./T04-ai-difficulty-rules.md) |

## Progress
- done: 4/4

## Dependencies
- T02는 T01에서 확정한 필드 선수 ID와 캠페인 스키마를 사용한다.
- T03은 T01의 4대4 상태 모델과 기존 `stepGame` 좌표계를 사용한다.
- T04는 T01~T03의 새 roster, stages, skill-use state를 사용한다.
