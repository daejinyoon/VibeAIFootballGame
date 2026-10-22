# Task: T02 3D 경기 화면 지연 로드

## Status: pending

## Goal
React 앱 초기 진입 번들에서 R3F/Three.js 게임 코드를 분리하고, 사용자가 새 경기나 이어 하기로 경기 화면에 들어갈 때만 `GameScreen` 모듈을 내려받게 한다.

## Decision Summary
- `React.lazy`와 `Suspense`를 사용해 `GameScreen` 화면 모듈을 동적으로 불러온다.
- 게임 동작·상태·저장 코드는 재구성하지 않고 기존 `GameScreen` 경계를 분할점으로 사용한다.
- Vite 출력에서 초기 entry와 game chunk 용량을 비교한다. 브라우저 캐시에 관계없이 초기 화면에서는 Three.js 모듈 요청이 없어야 한다.

## Implementation

### I01. 경기 화면 경계에서 코드 분할
- Related Files:
  - `game/src/App.jsx` :: imports, `screen === 'match' || screen === 'pause'` — `GameScreen` lazy import 및 로딩 fallback; modify
  - `game/src/styles.css` :: `.game-screen-loading` — 밝은 테마와 일치하는 로딩 상태; modify
- Details
  - `GameScreen`의 정적 import를 `lazy(() => import('./components/GameScreen.jsx'))`로 바꾼다.
  - 기존 경기 화면 조건부 렌더링을 `<Suspense fallback={...}>`로 감싸며 fallback은 접근 가능한 `role="status"`와 `경기장을 준비하고 있어요…` 문구를 표시한다.
  - `GameScreen`에 전달하는 모든 props와 `key={campaign?.currentStage ?? 1}`를 그대로 보존한다.
  - 시작·랭킹·보상·편성에서 3D 화면을 미리 import하지 않는다.

### I02. 초기 번들 확인 및 회귀 검증
- Related Files:
  - `.memory/qa/2026-10-22-football-visual-review.md` :: 빌드 chunk 전후 수치 및 lazy-load 확인 — modify
- Details
  - `npm run build` 결과에서 초기 entry JS와 지연 game JS의 압축 전·gzip 용량을 기록한다.
  - Chrome Network에서 첫 진입 시 Three.js/R3F chunk가 요청되지 않고, 새 캠페인 시작 시 game chunk 요청 및 3D 렌더가 발생하는지 확인한다.
  - `npm test`로 게임 흐름 회귀를 확인하고 앱 전체를 다시 캡처해 console/page errors를 확인한다.
  - 기대: 초기 entry JS 300KB 미만(압축 전), 3D 코드가 별도 지연 chunk로 출력. Three.js chunk 자체의 500KB 초과 Vite 경고가 남으면 정확한 크기를 보고서에 기록한다.

## Acceptance Criteria
- [ ] 초기 화면 HTML/JS 로드에서 R3F/Three.js 모듈이 평가되지 않는다.
- [ ] 경기 진입 시 지연 chunk가 로드되고 Canvas 장면·입력·일시정지 기능이 유지된다.
- [ ] 초기 entry JS가 압축 전 300KB 미만이다.
- [ ] `npm test`와 `npm run build`가 통과한다.

## Validation
- `npm test` — 기존 게임과 저장 테스트 통과
- `npm run build` — entry/game chunk 크기 및 빌드 출력 확인
- Chrome Network 검수: 첫 화면 및 경기 진입 시 chunk 요청 타이밍 확인

## Commit Message
```text
perf(game): lazy load three dimensional match screen

Plan: 2026-10-22-football-visual-optimization
Phase: P01-visual-and-startup
Task: T02-lazy-load-game

- Load the 3d game screen only when a match starts
- Verify initial entry and deferred chunk sizes
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
