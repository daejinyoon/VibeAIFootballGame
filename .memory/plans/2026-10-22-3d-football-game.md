# Plan: 덱스 3D 아케이드 축구 게임

## Goal
기존 React 게임을 실제 3D 경기장·선수 장면으로 바꾸고, 3필드 선수+골키퍼의 4대4 AI 캠페인을 로컬에서 플레이할 수 있게 한다. 다섯 단계와 5단계 보스, Space 점프·헤딩·크로스, 승리 후 스킬 카드 보상, 브라우저 임시 저장과 랭킹을 연결한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done ✅` | React Three Fiber 기반 저폴리 경기장·선수·공·카메라를 만들고 장면을 브라우저에서 렌더링한다. | [P01](../phases/2026-10-22-3d-football-game/P01-3d-scene/phase.md) |
| P02 | `done ✅` | 경기 인원, 5단계 AI 캠페인, 카드 보상·중복 스킬 사용, 공중볼과 점프를 게임 규칙에 반영한다. | [P02](../phases/2026-10-22-3d-football-game/P02-match-core/phase.md) |
| P03 | `done ✅` | 3D 장면을 실시간 경기와 화면 흐름에 연결하고, 새 진행 상태를 브라우저 저장·랭킹에 반영한다. | [P03](../phases/2026-10-22-3d-football-game/P03-local-experience/phase.md) |

## Task Order
1. P01-T01 → P01-T02 → P01-T03: 3D 런타임과 장면을 만든다.
2. P02-T01 → P02-T02 → P02-T03 → P02-T04: 기존 순수 게임 규칙과 테스트를 새 캠페인·성장 규칙으로 바꾼다.
3. P03-T01 → P03-T02 → P03-T03: UI, 렌더 루프, 저장, 랭킹을 연결한다.

## Deferred Scope
- Entra ID 로그인, 덱스 지정 보안 그룹 확인, Azure 계정 저장·공용 랭킹은 로컬 3D AI 버전을 플레이한 다음 별도 인터뷰와 계획에서 결정한다.
- 직원 간 온라인 대전은 네트워크 동기화·방 구성·매치 규칙을 별도 인터뷰와 계획으로 다룬다.
- 밸런스 수치(점프 높이·시간, 스킬 사용 효과)는 첫 플레이에 적합한 상수로 시작하고 실제 플레이 후 조정한다.

## Project Notes
- 기존 앱은 `game/` 아래 React 19 + Vite 6 + JavaScript이며 테스트는 Node 내장 러너(`npm test`)를 사용한다.
- React 19에는 React Three Fiber 9 계열을 설치한다. 공식 설치 안내에서 Fiber 9와 React 19의 조합을 명시한다. [React Three Fiber 설치 안내](https://r3f.docs.pmnd.rs/getting-started/installation)
- 기존 게임 시뮬레이션은 순수 JavaScript로 유지한다. 경기장 평면은 기존 `x/y` 좌표로 계산하고, Three.js 장면은 이를 `x/z` 평면으로 변환한다. 선수 `jumpHeight`와 공 `height`만 수직 축으로 렌더링한다.
- 기존 브라우저 프로필은 `schemaVersion: 1`, 별명·캠페인 저장·최고 기록을 담는다. P03-T03에서 버전 2로 변환하되 별명·최고 기록·가능한 캠페인 진행을 보존한다.

