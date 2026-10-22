# Task: T01 경기 엔진 chunk 캐시 경계 분리

## Status: done

## Goal
경기 화면 lazy import를 유지하면서 Vite production build에서 Three.js와 React Three Fiber를 별도 엔진 chunk로 출력하고, 첫 화면에서 요청되지 않으며 경기 진입 시 정상 로드되는지 확인한다.

## Decision Summary
- `game/src/App.jsx`의 `lazy(() => import('./components/GameScreen.jsx'))`를 그대로 둔다.
- `game/vite.config.js`에서 `build.rollupOptions.output.manualChunks`를 사용한다. `node_modules/three/` module은 `three-vendor`, `node_modules/@react-three/fiber/` module은 `r3f-vendor`로 지정한다.
- React/React DOM 등 초기 화면에서 사용하는 공용 런타임을 엔진 chunk로 끌어오지 않는다.
- 빌드 graph에서 circular chunk, 앱 코드 순서 경고, entry에서 엔진으로 향하는 preload가 생기면 우선 단일 `three-runtime` 그룹을 시험하고 결과를 검증한다. 새 문제가 해소되지 않으면 수동 분할을 적용하지 않는다.
- 경고 임계값을 높여 chunk 크기 경고를 감추지 않는다.

## Implementation

### I01. Vite production chunk boundary 설정
- Related Files:
  - `game/vite.config.js` :: `defineConfig` — production output chunk 그룹을 설정; modify

#### Details
- **Signatures & Types**:
  ```js
  export default defineConfig({
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) { /* normalized module path -> string | undefined */ }
        }
      }
    }
  });
  ```
- **Data & Schema Fields**:
  - `three-vendor`: `node_modules/three/` package module.
  - `r3f-vendor`: `node_modules/@react-three/fiber/` package module.
  - 나머지는 `undefined`를 반환해 기본 grouping을 유지한다.
- **Execution Flow / Logic**:
  1. module id의 `\`를 `/`로 정규화한다.
  2. 경로 segment 경계가 있는 `/node_modules/three/` 및 `/node_modules/@react-three/fiber/`만 매치한다.
  3. 다른 경로에는 `undefined`를 반환한다.
  4. production build output graph를 확인해 engine chunk가 시작 entry에서 정적·preload 요청되지 않게 한다.

### I02. production bundle과 경기 진입 검증
- Related Files:
  - `game/src/App.jsx` :: `GameScreen` dynamic import — 변경 없이 회귀 검증; read-only
  - `game/dist/` :: Vite output — chunk 크기와 import graph 확인; generated/ignored

#### Details
- `npm test`와 `npm run build`를 실행한다.
- build output에서 entry, 경기 UI, Three/R3F chunk의 파일명, raw/gzip 크기 및 정적 import graph를 기록한다.
- Chrome production preview의 시작 화면에서 Three/R3F chunk 요청이 없는지 확인한다.
- 경기 시작 후 필요한 엔진 chunk가 요청되고 Canvas가 표시되는지 확인한다. Console/pageerror는 0이어야 한다.
- 이전 entry 기준 259.80 kB raw / 81.26 kB gzip과 비교한다. chunk 분할이 경기 진입 시의 전체 전송량을 줄이지 않을 수 있음을 보고서에 구분해서 기록한다.

## Acceptance Criteria
- [x] `npm test`의 모든 기존 테스트가 통과한다.
- [x] `npm run build` 성공, 새 circular chunk나 실행 순서 경고 없음.
- [x] 시작 HTML entry는 Three/R3F engine chunk를 미리 요청하지 않는다.
- [x] 경기 진입 때 엔진 chunk가 요청되고 Canvas가 표시되며 pageerror가 0이다.
- [x] 초기 entry와 경기 chunk의 raw/gzip 크기 및 총 payload 변화 여부를 기록한다.

## Validation
- `cd game; npm test` — 전체 Node test suite 통과
- `cd game; npm run build` — production bundle 성공 및 새 chunk 경고 없음
- Chrome production preview smoke check — 시작 화면 엔진 미요청, 경기 시작 시 엔진 로드와 Canvas 표시, pageerror 0

## Commit Message
```text
perf(game): isolate three runtime cache chunks

Plan: 2026-10-22-football-match-chunk-cache
Phase: P01-engine-cache-boundary
Task: T01-split-engine-chunk

- split Three.js and React Three Fiber runtime from match UI
- verify startup request boundary and match runtime
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: e5b9d3b
