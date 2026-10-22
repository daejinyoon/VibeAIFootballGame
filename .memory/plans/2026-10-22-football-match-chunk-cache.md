# Plan: 축구 경기 청크 캐시 경계 개선

## Goal
경기 화면의 지연 로딩을 유지하면서 Three.js/R3F 런타임을 게임 UI 코드에서 분리한다. 초기 entry 크기가 유지되는지, 빌드 chunk와 브라우저 동작이 올바른지 확인한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Three.js/R3F 런타임과 경기 화면의 빌드 캐시 경계를 분리하고 검증한다. | [P01](../phases/2026-10-22-football-match-chunk-cache/P01-engine-cache-boundary/phase.md) |

## Task Order
1. P01-T01: Vite build output에서 3D 런타임과 경기 UI를 나누고 초기/경기 chunk 및 브라우저 동작을 검증한다.

## Scope
- 기존 `React.lazy` 경기 지연 로딩과 플레이 동작을 유지한다.
- Entra ID, Azure 저장, 온라인 대전은 포함하지 않는다.
- 경고 임계값 상향으로 chunk 크기 경고를 숨기지 않는다.
- Vite 공식 build output split 기능을 사용하며, 생성 결과에 따라 분할 기준을 조정한다.
