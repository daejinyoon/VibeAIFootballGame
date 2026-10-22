# Task: T03 접촉 넘어짐·회복 시뮬레이션 상태

## Status: pending

## Goal
태클·밀침으로 실제 접촉한 필드 선수가 양 팀 공통으로 넘어져 1초간 조작과 액션을 받지 않고 회복하게 하며, 골키퍼는 반칙 또는 강한 스킬 충돌에서만 같은 상태를 적용한다.

## Decision Summary
- 접촉한 선수의 sim state가 모션과 조작 제한의 단일 기준이다. 일반 패스 차단은 받기 이벤트만 내고 넘어짐을 일으키지 않는다.
- 넘어짐은 `stunnedSeconds`를 재사용하되 기존 스킬 스턴과 분리할 수 있도록 `knockdownSeconds`, `knockdownDirectionX/Y`, `motionAction`을 추가한다.

## Implementation

### I01. Knockdown state and contact resolution
- Related Files:
  - `game/src/game/createInitialGameState.js` :: `createPlayer` — 상태 초기화; modify
  - `game/src/game/stepGame.js` :: `resolveTackle`, `awardFoul`, `maybeUseAiSkill`, `stepGame` — 접촉과 입력 차단; modify
  - `game/src/game/skills.js` :: `applySkill` — 강한 스킬 접촉 이벤트 계약 확인; read-only unless needed
  - `game/src/game/stepGame.test.js` :: tackle/contact knockdown tests — modify

#### Details
- **Signatures & Types**:
  ```typescript
  type MotionAction = 'idle'|'run'|'receive'|'tackle'|'knockdown'|'recover'|'jump'|'dive';
  type Player = { knockdownSeconds: number; knockdownDirectionX: number; knockdownDirectionY: number; motionAction: MotionAction };
  function knockDownPlayer(player: Player, direction: Point, durationSeconds?: number): void;
  ```
- **Data & Schema Fields**: initialize `knockdownSeconds=0`, direction `(0,0)`, `motionAction='idle'`; knockdown duration constant `KNOCKDOWN_SECONDS=1.0`. Keep `stunnedSeconds` for existing skill effects, not as the knockdown source of truth.
- **Execution Flow / Logic**:
  1. When a valid tackle body contact resolves, mark the tackler action `tackle` and knock down the carrier if the tackle changes possession; set knockdown direction away from contact source. A clean ball-only interception changes possession without knockdown.
  2. On foul/strong contact, apply the same knockdown to both teams’ field players. Goalkeepers do not fall on regular saves, keeper catches, or ordinary contact; only foul/penalty or strong-skill collision code paths may call `knockDownPlayer` for keeper.
  3. At each live simulation step decrement knockdown timer. While positive, skip movement, jump initiation, pass/shoot/skill/tackle inputs and AI target movement for that player; preserve current direct control id unless existing dismissal switches it.
  4. At zero set `motionAction='recover'` for one render state, clear direction after recovery, then `idle|run` is selected by normal movement updates. Do not let target movement overwrite a player while knockdown timer is positive.
  5. Strong-skill collision may knock down a keeper only if its existing skill result provides an actual collision target; do not infer collision from distant visual effect.
- **Error & Exception Handling**: clamp duration to `[0, 1.0]`; normalize finite direction vector, otherwise `(0,0)`; dismissed player remains dismissed and does not recover into play.
- **State Transition & Return**: contact emits existing `tackle`/`foul` events plus `playerKnockedDown:{type,team,playerId,durationSeconds,direction:{x,y}}`; normal pass interception emits `passIntercepted` only.

### I02. Simulation state regression tests
- Related Files:
  - `game/src/game/stepGame.test.js` :: human/AI tackle, recovery and keeper cases — modify

#### Details
- Verify both teams’ field-player carrier is knocked down on real tackle contact and remains position/input frozen for a total of one second, then can move.
- Verify a clean pass interception and keeper save/catch never knock down a player. Verify goalkeeper is knocked down on a documented foul/strong-skill collision only.
- Verify both direct input and AI movement/action paths respect knockdown timer; output event direction points away from contacting player; delta clamp works across >1s frame input.

## Acceptance Criteria
- [ ] Contact creates one synchronized knockdown sim state and motion event; passer reception alone never falls.
- [ ] Any field player from either team is unavailable for movement/action for about one second and recovers automatically.
- [ ] Keeper is exempt from ordinary save/contact knockdown and only eligible for foul/strong-skill collision.

## Validation
- `node --test src/game/stepGame.test.js src/game/skills.test.js` — contact, input lockout, recovery, keeper exception cases pass.
- `npm run build` — added state remains compatible with React/R3F actor readers.

## Commit Message
```text
feat(game): add contact knockdown and recovery state

Plan: 2026-10-22-unified-3d-arcade-football
Phase: P01-match-simulation
Task: T03-contact-knockdown-state

- Lock contacted field players for a one-second recovery
- Keep ordinary pass reception and goalkeeper saves clean
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
