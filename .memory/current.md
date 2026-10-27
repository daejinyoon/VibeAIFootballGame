# Current Context

## Active Plan
[경기 오디오와 밸런스 개선](./plans/2026-10-27-audio-match-balance.md)

## Active Phase
[P01 오디오·경기 밸런스·골킥 연출](./phases/2026-10-27-audio-match-balance/P01-audio-matchplay-and-goal-kick/phase.md)

## Active Task
[T02 골 입구와 기본 자동 태클](./phases/2026-10-27-audio-match-balance/P01-audio-matchplay-and-goal-kick/T02-goal-opening-and-basic-tackle.md)

## Status
- T01 오디오와 전체 음소거 제어가 검증되어 커밋되었다.
- T02가 다음 구현 Task다.
- 구현 전 `.memory/decisions/2026-10-27-audio-match-balance.md`의 사용자 결정을 따른다.
- 기존 미커밋 파일 변경은 보존한다.
## Next Step (IMPORTANT)
T02 청사진을 읽고 `game/src/game/constants.js`의 골 입구와 `game/src/game/stepGame.js`의 근접 자동 태클을 구현한다.
