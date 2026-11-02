# Plan: 덱스 픽셀 축구 게임

## Goal
React와 JavaScript로 PC 브라우저에서 실행되는 탑다운 픽셀 아트 6대6 축구 게임을 만든다. 플레이어는 방향키와 A/S/D/F 키로 움직이고 경기하며, 세 단계 캠페인과 보스전, 선수 스킬 배정, 브라우저 임시 저장과 랭킹을 사용할 수 있다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `in_progress` | Git 커밋 환경을 준비하고 React 앱 뼈대부터 로컬에서 플레이 가능한 캠페인까지 만든다. | [P01 로컬 게임](../phases/2026-10-21-football-game/P01-local-game/phase.md) |

## Deferred Scope
- Azure 배포, Entra ID 인증, 계정별 클라우드 저장 및 전 직원 공용 랭킹은 로컬 버전이 완성된 뒤 별도의 인터뷰·계획으로 다룬다. 사용자가 Azure 서비스 선택을 로컬 플레이 후로 미뤘으므로 이번 청사진에는 Azure 리소스나 비밀 설정을 포함하지 않는다.
- 프로토타입에서 확인할 밸런스 수치는 각 Task의 초기값으로 시작하고 실제 플레이를 보며 조정한다.

## Project Notes
- 현재 작업 폴더에는 React 앱과 Git 저장소가 없다. Git이 설치되어 있지 않고 `.git/`도 확인되지 않았다. T00에서 Git 실행 환경을 확인하고 저장소를 준비한 뒤, 기존 루트 README와 `.memory/`를 보존하기 위해 앱을 `game/` 하위 폴더에 둔다.
- 현재 Node는 `v20.17.0`이다. 현재 환경에서 사용할 수 있도록 Vite 6을 기준으로 잡는다. Vite 6은 Node 20을 지원한다. [Vite 6 Node 지원](https://vite.dev/blog/announcing-vite6)
- 게임 화면은 Canvas가 그리며 React는 메뉴와 화면 흐름을 담당한다. 시뮬레이션 규칙은 순수 JavaScript 모듈로 분리해 Node 내장 테스트 러너로 검증한다.
