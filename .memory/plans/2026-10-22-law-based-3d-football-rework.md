# Plan: 규칙 기반 3D 아케이드 축구 조작 및 재개 개편

## Goal
기존 4대4/5단계 로컬 아케이드 축구를 유지하면서, 즉시 방향 조작 패스·슛, 직접 선택하는 아웃 재개, 위험도 기반 파울 징계, 참고 이미지형 상단 점수 HUD와 공격 진영 카메라 구도를 제공한다. 각 Task 후 `game` 앱의 production build를 통과시키고 브라우저에서 핵심 조작을 확인한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | 경기 조작, 규칙 재개/징계, HUD와 공격 진영 카메라를 기존 시뮬레이션에 순차 적용 | [P01](../phases/2026-10-22-law-based-3d-football-rework/P01-match-rules-and-presentation/phase.md) |

## Source Decisions
- [확정 결정](../decisions/2026-10-22-law-based-3d-football-rework.md)
- 첨부 규칙서는 사용자가 선택한 범위(오프사이드 제외, 경계/재개/파울)만 구현 기준으로 사용한다.

## Execution Notes
- 기존 계획 `.memory/plans/2026-10-22-unified-3d-arcade-football.md`는 보존한다. 이 계획은 충돌하는 조작/재개/화면 결정을 구체화하며 4대4, AI, 스킬, 경기 시간 설계는 유지한다.
- 검증은 `game/`에서 `npm run build`와 브라우저 수동 확인으로 한다. 테스트 추가/실행은 필수 절차로 포함하지 않는다.
