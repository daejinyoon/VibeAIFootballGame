# Current Context

## Active Plan
[규칙 기반 3D 아케이드 축구 조작 및 재개 개편](./plans/2026-10-22-law-based-3d-football-rework.md)

## Active Phase
[P01 경기 규칙과 화면 구성](./phases/2026-10-22-law-based-3d-football-rework/P01-match-rules-and-presentation/phase.md)

## Active Task
[T04 상단 스코어보드와 공격 진영 카메라](./phases/2026-10-22-law-based-3d-football-rework/P01-match-rules-and-presentation/T04-score-hud-and-camera.md)

## Status
- T01 완료: 충전 게이지 제거, 즉시 방향 기준 패스/슛과 UI 조작 안내 변경. production build 통과.
- T02 완료: 공 전체 경계 판정과 수동 스로인/코너/골킥 구현. production build 통과.
- T03 완료: 부주의/무모함/과도한 힘 파울 분류, 반복 경고와 퇴장 처리. production build 통과.
- P01 진행률 3/4 (active: T04)

## Next Step (IMPORTANT)
T04 청사진을 읽고 `game/src/components/GameScreen.jsx`, `game/src/components/TrackingCamera3D.jsx`, `game/src/styles.css`의 상단 시간·점수 HUD와 공격 절반 추적 구도를 구현합니다. 작업 디렉터리는 `game/`이며 빌드 검증 명령은 `npm run build`입니다.
