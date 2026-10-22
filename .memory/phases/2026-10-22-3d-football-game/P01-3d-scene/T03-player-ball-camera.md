# Task: T03 선수·공 모델과 카메라

## Status: done

## Goal
팀 컬러가 분명한 오리지널 저폴리 선수 8명과 축구공을 경기장에 표시하고, 높은 사선 카메라가 공을 부드럽게 따라가게 한다.

## Decision Summary
- 캐릭터는 코드로 구성한 원기둥·구·캡슐 조합으로 만든다. 외부 Nintendo 캐릭터나 모델은 사용하지 않는다.
- 카메라 시점은 높은 중계 시점이며 관중 UI가 아닌 공의 위치를 부드럽게 추적한다.

## Implementation

### I01. 선수 및 공의 렌더 모델
- Related Files:
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D({ player, selected })` — 팀 유니폼·역할 표시; new
  - `game/src/components/FootballBall3D.jsx` :: `FootballBall3D({ ball })` — 공 위치와 높이 표시; new
- Details
  - **Signatures & Types**:
    ```js
    /** player fields: id, team, role, x, y, jumpHeight, dismissed, skillId */
    export function FootballPlayer3D({ player, selected = false })
    /** ball fields: x, y, height, ownerId, flightKind */
    export function FootballBall3D({ ball })
    ```
  - **Data & Schema Fields**:
    - 홈 색상은 청록/라임, 원정은 코랄/오렌지 계열. 골키퍼는 팀 컬러와 구분되는 밝은 장갑·상체 패치 색을 쓴다.
    - 필드 선수는 머리 구, 몸통 캡슐/원기둥, 팔·다리 mesh, 신발, 등번호 장식으로 구성한다.
    - Three 좌표 변환은 중앙 배치된 경기장에 맞춰 `x3 = player.x / 80 - FIELD.width / 160`, `z3 = (player.y - FIELD.height / 2) / 80`, `y3 = player.jumpHeight / 80`이다. 공은 `y3 = ball.height / 80 + 0.12`를 쓴다.
    - 선택 선수 발밑에 라임색 링을 표시한다. 퇴장 선수는 경기장에 그리지 않는다.
  - **Execution Flow / Logic**:
    1. 모델은 시뮬레이션 객체를 직접 변경하지 않고 좌표·팀·역할만 렌더링한다.
    2. 선수 모델은 높이 변경을 받아 점프 위치를 보여준다.
    3. 공 그림자는 바닥 투영 위치에 남기고 실제 공 mesh는 `height`에 따라 위로 이동시켜 공중 높이를 읽기 쉽게 한다.

### I02. 추적 카메라
- Related Files:
  - `game/src/components/TrackingCamera3D.jsx` :: `TrackingCamera3D({ ball })` — 공 추적 시점; new
  - `game/src/components/Match3DCanvas.jsx` :: scene composition — 8명·공·카메라 연결; modify
- Details
  - **Signatures & Types**:
    ```js
    export function TrackingCamera3D({ ball })
    ```
  - **Execution Flow / Logic**:
    1. 기준 카메라 위치는 `[0, 11, 16]`, 경기장 전체가 보이는 FOV는 `42`다.
    2. 공 위치를 시뮬레이션 좌표에서 Three 좌표로 변환해 중앙점에 반영한다.
    3. `useFrame`에서 lerp 계수 `min(deltaSeconds * 2.5, 1)`로 목표 시점을 부드럽게 추적한다.
    4. 카메라의 x/z는 경기장 끝을 넘지 않게 clamp해 골문이 계속 화면에 남게 한다.

## Acceptance Criteria
- [ ] 팀·골키퍼·선택 선수 상태가 모델 색상과 링으로 구분된다.
- [ ] 공의 높이와 바닥 그림자가 분리되어 로빙 궤적이 보인다.
- [ ] 카메라가 공을 따라가면서도 경기장 끝을 벗어나지 않는다.

## Validation
- `npm run build` — 모델·카메라 JSX 컴파일 성공
- `npm test` — 기존 순수 게임 테스트 전부 통과

## Commit Message
```text
feat(game): add player ball models and tracking camera

Plan: 2026-10-22-3d-football-game
Phase: P01-3d-scene
Task: T03-player-ball-camera

- Add original low poly player and ball meshes
- Track the ball with a bounded elevated camera
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
