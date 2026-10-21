# Task: T02 우리 팀 동료의 무작위 지원 이동

## Status: done

## Goal
사용자가 직접 조작하지 않는 우리 팀 필드 선수들이 고정 역할 위치에 머물지 않고 공 근처 공간을 향해 매 경기 달라지는 경로로 움직이게 한다.

## Decision Summary
- 우리 팀 비조작 필드 선수는 넓은 경기 구역에서 공을 따라 무작위로 움직인다. 조작 선수와 골키퍼는 이 AI 대상으로 삼지 않는다.
- 상대 AI는 현재 역할 기반 전술 이동을 유지한다. PRNG는 경기 상태의 시드로 재현 가능해야 한다.

## Implementation

### I01. 시드 기반 동료 AI
- Related Files:
  - `game/src/game/createInitialGameState.js` :: `createInitialGameState` — 난수 시드와 각 선수의 목표/재선택 시간 초기화; modify
  - `game/src/game/stepGame.js` :: `moveToward`, `targetForRole`, `updateAi`, `stepGame` — 홈 동료 목표 설정 및 이동; modify
  - `game/src/game/createInitialGameState.test.js` :: 초기 AI 상태; modify
  - `game/src/game/stepGame.test.js` :: 무작위 지원 이동; modify

#### Details
- **Signatures & Types**:
  ```js
  // internal nextRandom(state) -> number; returns [0, 1), advances state.aiRandomSeed
  // internal chooseSupportTarget(state, player) -> { x: number, y: number }
  // internal updateAi(state, controlled, input, deltaSeconds, events) -> Player
  // public stepGame(state, inputFrame = {}, deltaSeconds = 0) -> GameEvent[]
  ```
- **Data & Schema Fields**:
  - `state.aiRandomSeed`: uint32 number. Initial value `0x6d2b79f5`; deterministic LCG update `seed = (1664525 * seed + 1013904223) >>> 0`, result `seed / 0x100000000`.
  - `Player.aiTarget`: `{ x: number, y: number } | null`; chosen within field bounds.
  - `Player.aiRetargetSeconds`: `number`, initialized with a deterministic value in `[1.2, 2.4]` seconds.
  - Existing dismissed-player field from T04, if present later in the chain: dismissed players never receive targets or move.
- **Execution Flow / Logic**:
  1. Precondition & Validation: only non-controlled, active home players with role other than `goalkeeper` use random support movement. Controlled home player remains `moveByInput`; away players retain current logic.
  2. Core Processing: decrement retarget timer by clamped frame dt. On missing target/timer expiry, choose a point within x `[0, FIELD.width]` and y `[0, FIELD.height]`, biased around current ball position: x offset in `[-220,220]`, y offset in `[-150,150]`; clamp to field. Rechoose timer in `[1.2,2.4]`. Move by existing `moveToward` at `AI_SPEED` and respect `stunnedSeconds`.
  3. Error & Exception Handling: malformed or missing seed initializes to fixed seed. Any non-finite target coordinate is regenerated and clamped; do not use `Math.random`, so identical state/input/dt produces identical next state.
  4. State Transition & Return: only AI target, timer, player position, velocity, and facing change. Possession, ball physics, score, and opponent decisions remain unchanged.

### I02. AI regression tests
- Related Files:
  - `game/src/game/stepGame.test.js` :: support-AI tests; modify
- **Details**:
  - Same initial state and input sequence yields equal positions, targets, and seed after N steps.
  - On a home possession, non-controlled field players move toward changing support targets and stay within field boundaries.
  - The controlled player remains controlled by arrow input; home goalkeeper and away players are excluded from random support logic.

## Acceptance Criteria
- [ ] Home non-controlled field players no longer converge only to fixed role anchors.
- [ ] Target changes are reproducible between identical simulation runs and vary as the seed advances.
- [ ] User-controlled player, goalkeeper role, opponent AI, and stunned state retain their existing behavior.

## Validation
- `cd game; npm test -- --test-name-pattern="AI|moves|stunned|controlled"` — support movement and selection tests pass
- `cd game; npm test` — full test suite passes
- `cd game; npm run build` — Vite build succeeds

## Commit Message
```text
feat(game): add seeded random teammate support movement

Plan: 2026-10-21-retro-arcade-gameplay
Phase: P01-arcade-match
Task: T02-random-teammate-ai

- Give non-controlled home field players ball-centered random targets
- Keep AI movement deterministic for repeatable simulation tests
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
