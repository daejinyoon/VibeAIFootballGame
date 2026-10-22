# Current Context

## Active Plan
[규칙 기반 3D 아케이드 축구 조작 및 재개 개편](./plans/2026-10-22-law-based-3d-football-rework.md)

## Active Phase
[P01 경기 규칙과 화면 구성](./phases/2026-10-22-law-based-3d-football-rework/P01-match-rules-and-presentation/phase.md)

## Active Task
[T03 접촉 위험도 기반 파울 징계](./phases/2026-10-22-law-based-3d-football-rework/P01-match-rules-and-presentation/T03-foul-severity-and-discipline.md)

## Status
- T01 완료: 충전 게이지 제거, 즉시 방향 기준 패스/슛과 UI 조작 안내 변경. production build 통과.
- T02 완료: 공 전체 경계 판정과 수동 스로인/코너/골킥 구현. production build 통과.
- P01 진행률 2/4 (active: T03)

## Next Step (IMPORTANT)
T03 청사진을 읽고 `game/src/game/stepGame.js`의 `resolveTackle`/`awardFoul` 위험도 분류와 경고·퇴장 상태 전이를 구현합니다. 작업 디렉터리는 `game/`이며 빌드 검증 명령은 `npm run build`입니다.
