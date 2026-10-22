# Task: T01 반응형 시각 검수와 보정

## Status: pending

## Goal
390px 모바일에서 확인된 액션 버튼 라벨 줄바꿈과 세로로 늘어난 경기장 뷰를 보정하고, 1440px 데스크톱 및 390px 모바일에서 주요 게임 흐름이 잘리지 않고 읽히는지 브라우저로 확인한다.

## Decision Summary
- 모바일 시작 화면은 주 시작 버튼을 한 줄 전체 폭으로, 이어 하기와 랭킹은 서로 읽을 수 있는 너비로 배치한다.
- 모바일 경기 Canvas는 지나치게 세로로 늘어나지 않게 하고 가로 스크롤은 허용하지 않는다.
- 기존 밝은 DEX 테마, 게임 기능, 경기장 모델은 유지한다.

## Implementation

### I01. 모바일 레이아웃 보정
- Related Files:
  - `game/src/styles.css` :: `.start-panel .actions`, `.match-3d-canvas`, responsive media rules — 좁은 화면 액션과 게임 뷰포트 조정; modify
- Details
  - 시작 화면 3개 버튼은 폭 390px에서 `새 캠페인 시작`을 한 줄로 표시하고, 보조 버튼은 각각 2줄 이하로 읽을 수 있게 한다.
  - 모바일 경기 Canvas는 `min-height: 360px` 고정으로 인해 실제 폭 298px에서 298×360px로 표시되던 비율을 보정한다. 3D 장면 전체가 보이고 플레이어·공을 식별할 수 있도록 세로 크기를 제한한다.
  - 게임 패널 내부 요소가 viewport보다 넓어지지 않게 한다. 데스크톱 스타일과 3D 경기장 색상·조명은 바꾸지 않는다.

### I02. 브라우저 검수
- Related Files:
  - `.memory/qa/2026-10-22-football-visual-review.md` :: 관찰 결과 및 화면별 확인표 — 검수 증거; new
- Details
  - Chrome 1440×950과 390×844에서 시작, 보상 카드, 보상 선수 배정, 카드 인벤토리/편성, 3D 경기, 일시정지, 랭킹 화면을 확인한다.
  - 각 모바일 화면에서 `document.documentElement.scrollWidth === window.innerWidth`를 확인한다.
  - 브라우저 `pageerror`가 없고, 시작 버튼 및 편성/일시정지 흐름이 동작하는지 확인한다.
  - QA 보고서에는 검수 해상도, 확인한 화면, 수정 전후 측정값, 미검수 화면과 한계를 기록한다. 개인 정보가 아닌 테스트 별명을 사용한다.

## Acceptance Criteria
- [ ] 모바일 시작 화면 버튼 라벨이 글자 단위로 세로 줄바꿈되지 않는다.
- [ ] 모바일 3D Canvas 높이가 폭보다 과도하게 커지지 않고 경기 장면이 식별된다.
- [ ] 주요 화면에서 모바일 가로 스크롤이나 브라우저 런타임 오류가 없다.
- [ ] 시각 검수 범위와 결과가 QA 보고서에 남는다.

## Validation
- Chrome 수동/자동 브라우저 검수: 1440×950 및 390×844; 화면별 가로 넘침·콘솔 오류·조작 흐름 확인
- `npm test` — 기존 게임과 저장 테스트 통과
- `npm run build` — 스타일 변경 후 앱 빌드

## Commit Message
```text
fix(game): improve mobile football screen layouts

Plan: 2026-10-22-football-visual-optimization
Phase: P01-visual-and-startup
Task: T01-responsive-visual-qa

- Fix mobile action labels and match viewport height
- Record desktop and mobile visual QA findings
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
