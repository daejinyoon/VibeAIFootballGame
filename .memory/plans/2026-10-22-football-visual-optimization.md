# Plan: 축구 게임 시각 검수와 초기 로딩 최적화

## Goal
주요 게임 화면을 데스크톱과 모바일 Chrome에서 시각 확인하고, 확인된 모바일 레이아웃 문제를 고친다. 시작 화면에서 Three.js 런타임을 제외해 첫 진입 JavaScript 용량을 줄인다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | 반응형 화면을 검수·보정하고 3D 경기 화면을 지연 로드한다. | [P01](../phases/2026-10-22-football-visual-optimization/P01-visual-and-startup/phase.md) |

## Task Order
1. P01-T01: 데스크톱·모바일 흐름을 시각 확인하고 확인된 레이아웃 문제를 보정한다.
2. P01-T02: 경기 화면을 지연 로드하고 빌드 출력으로 초기 번들 분리를 확인한다.

## Scope
- 기존 React/Vite 앱과 저폴리 3D 게임 코드를 유지한다.
- Entra ID, Azure 저장, 온라인 대전은 포함하지 않는다.
- 스크린샷은 브라우저 시각 검수 증거로 남기되, 제품의 공개 페이지나 배포는 변경하지 않는다.
