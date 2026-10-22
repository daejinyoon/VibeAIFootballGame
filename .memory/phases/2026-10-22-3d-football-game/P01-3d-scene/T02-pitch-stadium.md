# Task: T02 저폴리 경기장과 배경

## Status: done

## Goal
코드만으로 밝고 상쾌한 저폴리 축구장·골문·경기장 주변 장식을 구성해 경기 Canvas 안에서 실제 3D 경기장을 보여준다.

## Decision Summary
- 외부 이미지·모델 파일 없이 R3F 기본 geometry와 material로 그린다.
- 시뮬레이션의 `FIELD.width = 960`, `FIELD.height = 540`를 시각 좌표의 경기장 크기에 대응시킨다.

## Implementation

### I01. 경기장 구성 요소
- Related Files:
  - `game/src/components/FootballPitch3D.jsx` :: `FootballPitch3D()` — 잔디, 라인, 페널티 구역, 센터 서클; new
  - `game/src/components/StadiumBackdrop3D.jsx` :: `StadiumBackdrop3D()` — 관중석 색상 띠와 조명 장식; new
  - `game/src/game/constants.js` :: `FIELD` — 기존 시뮬레이션 필드 치수 읽기; read-only
- Details
  - **Signatures & Types**:
    ```js
    export function FootballPitch3D()
    export function StadiumBackdrop3D()
    ```
  - **Data & Schema Fields**:
    - 평면 매핑: Three.js `x` 폭 12 단위, `z` 깊이 7 단위, 잔디 `y=0`; 시뮬레이션 x/y에서 `x/80`, `z=(y - FIELD.height / 2)/80`로 환산한다.
    - 팀 홈 골문은 `x=-6`, 원정 골문은 `x=6`; 골문 폭은 시뮬레이션 `goalBottom-goalTop` 비율을 유지한다.
    - 바닥 줄무늬는 폭 12·깊이 7의 교차 녹색 mesh 10개로 만들고, 경기 라인은 아이보리색 얇은 mesh/box로 구성한다.
    - 페널티 박스, 골 에어리어, 센터 라인·원, 코너 마커, 2개 골대와 네트 프레임을 포함한다.
  - **Execution Flow / Logic**:
    1. `FootballPitch3D`가 고정된 경기장 geometry를 선언적으로 반환한다.
    2. 골문은 구·원기둥 조합의 프레임과 반투명 네트 면을 사용한다.
    3. `StadiumBackdrop3D`는 경기장 외곽에 낮은 관중석 블록과 팀 컬러 띠를 렌더링한다.
    4. 작은 화면에서도 경기장 전체가 Canvas 내부에 들어오게 장면 루트에서 크기를 바꿀 수 있도록 경기장 자체를 viewport 크기에 종속시키지 않는다.

### I02. 장면 루트 연결
- Related Files:
  - `game/src/components/Match3DCanvas.jsx` :: `Match3DCanvas` — 경기장·배경 삽입; modify
- Details
  - Canvas 내부 순서: `FootballPitch3D`, `StadiumBackdrop3D`를 각각 한 번만 렌더링한다.
  - 지면은 `receiveShadow`를 켜고 불필요한 고해상도 texture/실시간 postprocessing은 추가하지 않는다.

## Acceptance Criteria
- [ ] 필드 라인·센터·양쪽 골문이 한 장면에서 3D로 구분된다.
- [ ] 외부 에셋 없이 장면이 렌더링되고 `npm run build`가 성공한다.
- [ ] 게임 로직이나 기존 경기 좌표 상수는 수정되지 않는다.

## Validation
- `npm run build` — 신규 R3F 장면 컴파일 성공
- `npm test` — 기존 게임·저장 테스트 전부 통과

## Commit Message
```text
feat(game): build low poly football stadium

Plan: 2026-10-22-3d-football-game
Phase: P01-3d-scene
Task: T02-pitch-stadium

- Add procedural pitch markings and goals
- Add original stadium backdrop and team color accents
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
