# Plan: 통합 3D 아케이드 축구

## Goal
기존 React/Three.js 기반 4대4 로컬 캠페인을 재사용해 60초 경기와 30초 골든골·무승부 종료, 역할 기반 AI와 양 팀 공통 패스 차단, 접촉·공중볼 상호작용, 궤적에 반응하는 골키퍼 다이빙을 완성한다. 정규 시간이 화면에 보이고, 모든 종료 결과가 보상·저장 규칙과 일치하며, 3D 선수의 방향·달리기·받기·태클·넘어짐·회복과 골키퍼 다이빙이 시뮬레이션 상태를 정확히 표현하는 것이 완료 기준이다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 경기 시뮬레이션 규칙: 시간·무승부, 전술 AI와 공 경로 판정, 접촉 상태를 구현한다. | [P01](../phases/2026-10-22-unified-3d-arcade-football/P01-match-simulation/phase.md) |
| P02 | `done` | 3D 표시와 결과 UI를 시뮬레이션 상태에 연결해 경기 동작을 읽기 쉽게 만든다. | [P02](../phases/2026-10-22-unified-3d-arcade-football/P02-3d-game-feel/phase.md) |

## Scope and Dependencies
- DEX 통합 결정 문서: [2026-10-22-unified-3d-arcade-football.md](../decisions/2026-10-22-unified-3d-arcade-football.md)
- 기존 4대4 로스터, 5단계 캠페인·보상·스킬, 저장·랭킹, 경기장·카메라, lazy load와 캐시 분리는 재사용한다.
- P01 T01은 종료 이벤트/outcome 계약을 먼저 확정한다. T02는 이 결과 계약과 현재 AI 구조를 기반으로 공격·수비 판단 및 패스 경로를 다루고, T03은 T02의 점유권·접촉 경로를 이용해 넘어짐 상태를 추가한다. P02는 P01의 최종 상태와 이벤트를 시각 모션에 연결한다.
- 온라인, Entra ID/Azure, 외부 캐릭터 에셋, 전면 물리 엔진 교체 및 별도 오디오 제작은 포함하지 않는다.
