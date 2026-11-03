# Current Context

## Active Plan
[Daily Challenge](./plans/2026-11-03-daily-challenge.md)

## Active Phase
[P03 Hosted Integration](./phases/2026-11-03-daily-challenge/P03-hosted-integration/phase.md)

## Active Task
[T01 Register PvP HTTP Routes](./phases/2026-11-03-daily-challenge/P03-hosted-integration/T01-register-pvp-http-routes.md)

## Status
- P01 완료: KST 챌린지 도메인 및 인증된 API·Cosmos 저장소 구현, 검증 통과
- P02-T01 완료: 공정한 챌린지 경기 설정 및 스킬 1회 제한 구현
- P02-T02 완료: Entra 토큰 기반 챌린지 API 클라이언트 및 응답 검증 구현
- P02-T03 완료: 챌린지 진입, 경기 결과 제출·재시도 및 오늘 순위 UI 구현
- P03-T01 배포 검사 후 PvP import 되돌림: 네 호스팅 API 경로가 모두 빈 본문 404 반환
- 기존 profile/daily 라우트 복구 재배포 및 probe 대기

## Next Step (IMPORTANT)
P03-T01 PvP import rollback을 master에 배포한 뒤 profile/daily 경로의 unauthenticated JSON 401을 확인하고 원인을 기록
