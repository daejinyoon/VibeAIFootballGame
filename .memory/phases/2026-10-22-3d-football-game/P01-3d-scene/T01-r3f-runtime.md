# Task: T01 React Three Fiber 런타임

## Status: done

## Goal
기존 React 19 + Vite 앱에서 실제 WebGL 3D 장면을 렌더링할 수 있도록 R3F 9 런타임과 빈 경기 Canvas를 추가한다.

## Decision Summary
- `@react-three/fiber` 9와 `three`를 사용한다. React Three Fiber 공식 문서는 Fiber 9를 React 19와 짝으로 안내한다.
- 카메라·프레임 시뮬레이션 연결은 P03-T01에서 수행한다. 이 Task는 반응형 Canvas 호스트와 조명·배경이 있는 정적 장면 루트까지 만든다.

## Implementation

### I01. 3D 런타임 의존성 및 빌드 연결
- Related Files:
  - `game/package.json` :: `dependencies` — R3F/Three.js 의존성 추가; modify
  - `game/package-lock.json` :: 잠금 파일 — 설치 결과 반영; modify
- Details
  - **Dependencies**: `@react-three/fiber` 9.x, `three` 호환 안정 버전. `react`와 `react-dom`은 현재 19.x를 유지한다.
  - **Execution Flow / Logic**:
    1. `game/`에서 `npm install @react-three/fiber@^9 three`를 실행한다.
    2. lockfile에 정확히 해결된 버전을 저장한다.
    3. `npm run build`로 R3F가 Vite JSX 변환과 함께 컴파일되는지 확인한다.

### I02. 재사용 가능한 R3F 캔버스
- Related Files:
  - `game/src/components/Match3DCanvas.jsx` :: `Match3DCanvas({ children, className })` — 3D 장면의 Canvas 호스트; new
  - `game/src/styles.css` :: `.match-3d-canvas` — Canvas의 크기·배경·포커스 표시; modify
- Details
  - **Signatures & Types**:
    ```js
    /** @param {{ children?: import('react').ReactNode, className?: string }} props */
    export default function Match3DCanvas({ children, className = '' })
    ```
  - **Data & Schema Fields**:
    - 캔버스 부모 `.match-3d-canvas`: `width: 100%`, `min-height: 360px`, `aspect-ratio: 16 / 9`, `overflow: hidden`.
    - R3F `<Canvas>`: 초기 카메라 `[0, 12, 18]`, `fov: 42`, `near: 0.1`, `far: 100`; antialias 켬, `dpr`은 `[1, 1.75]`로 제한.
  - **Execution Flow / Logic**:
    1. React `Canvas`를 접근 가능한 `<div>` 안에 렌더링한다.
    2. 장면에 기본 배경색과 ambient/directional light를 둔다.
    3. 내부 `children`을 Canvas 안에 렌더링해 T02/T03 장면 컴포넌트가 삽입되게 한다.
    4. 렌더링 예외는 R3F가 콘솔에 표시하게 두고, 이 Task에 별도 게임 상태나 프레임 루프를 추가하지 않는다.

## Acceptance Criteria
- [ ] `package.json`에 React 19와 호환되는 R3F 9 및 Three.js가 추가된다.
- [ ] `Match3DCanvas`가 임의의 Three mesh 자식을 렌더링할 수 있고 Vite 빌드가 성공한다.
- [ ] 기존 React 앱 메뉴와 Node 테스트 import가 깨지지 않는다.

## Validation
- `npm run build` — Vite 프로덕션 빌드 성공
- `npm test` — 기존 Node 테스트 전부 통과

## Commit Message
```text
feat(game): add React Three Fiber runtime

Plan: 2026-10-22-3d-football-game
Phase: P01-3d-scene
Task: T01-r3f-runtime

- Add React 19 compatible R3F and Three.js dependencies
- Add responsive Match3DCanvas scene host
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
