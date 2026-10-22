# Current Context

## Active Plan
[규칙 기반 3D 아케이드 축구 조작 및 재개 개편](./plans/2026-10-22-law-based-3d-football-rework.md)

## Active Phase
[P01 경기 규칙과 화면 구성](./phases/2026-10-22-law-based-3d-football-rework/P01-match-rules-and-presentation/phase.md)

## Active Task
[T02 공 경계 판정과 직접 조작하는 경기 재개](./phases/2026-10-22-law-based-3d-football-rework/P01-match-rules-and-presentation/T02-boundaries-and-manual-restarts.md)

## Status
- T01 완료: 충전 게이지 제거, 즉시 방향 기준 패스/슛과 UI 조작 안내 변경. production build 통과.
- P01 진행률 1/4 (active: T02)

## Next Step (IMPORTANT)
T02 청사진을 읽고 `game/src/game/stepGame.js`에서 공 전체 경계 판정과 직접 조작하는 스로인·코너·골킥을 구현합니다. 작업 디렉터리는 `game/`이며 빌드 검증 명령은 `npm run build`입니다.
