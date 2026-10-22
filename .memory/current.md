# Current Context

## Active Plan
[축구 경기 청크 캐시 경계 개선](./plans/2026-10-22-football-match-chunk-cache.md)

## Active Phase
[P01 엔진 캐시 경계](./phases/2026-10-22-football-match-chunk-cache/P01-engine-cache-boundary/phase.md)

## Active Task
[T01 경기 엔진 chunk 캐시 경계 분리](./phases/2026-10-22-football-match-chunk-cache/P01-engine-cache-boundary/T01-split-engine-chunk.md)

## Status
- P01 실제 3D 장면 완료: T01 commit 08befaf, T02 commit eff1ed6, T03 commit 408c57c
- P02-T01 완료: 4대4 편성 및 5단계 캠페인 구현·검증·커밋 5f3c2cb
- P02-T02 완료: 카드 드래프트·선수별 최대 3회 사용·저장 복구, 검증·커밋 48305ba
- P02-T03 완료: Space 점프·크로스·자동 헤딩, 검증·커밋 0becc05
- P02-T04 완료: 5단계 AI 밸런스·경기 규칙 회귀 검증, 커밋 00162c7
- P03-T01 완료: R3F 경기 루프·입력·HUD·정지/재개 연결, 검증·커밋 cdf501f
- P03-T02 완료: 밝은 캠페인 UI·보상 카드·편성 흐름, 검증·커밋 ce2f3c7
- P01-T01 완료: 데스크톱·모바일 Chrome 시각 검수, 모바일 레이아웃 수정 및 캡처 기록, 커밋 1fe686c
- P01-T02 완료: 경기 진입 시 GameScreen 지연 로드, 초기 JS 78.9% 감소, 검증·커밋 209cf64
- 축구 경기 청크 캐시 경계 개선 P01-T01: 구현 및 브라우저 검증 진행 중

## Next Step (IMPORTANT)
T01 청사진에 따라 `game/vite.config.js`의 production chunk 구성을 수정하고 빌드·브라우저 요청을 검증합니다.
