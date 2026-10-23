# Task: T02 골키퍼 궤적 반응 다이빙 선방

## Status: done

## Goal
골키퍼가 공의 진행 궤적을 읽고 도달 가능한 슛에만 좌우 다이빙해 막도록 시뮬레이션 판정과 3D 포즈를 함께 구현한다.

## Decision Summary
- 선방은 순수 장식이 아니라 예측된 공-골문 교차 위치와 도달 범위로 판정한다. 도달할 수 없는 슛은 골키퍼를 통과한다.
- keeper normal saves/catches do not knock down the keeper; foul or strong-skill contact exception remains in P01.

## Implementation

### I01. Reachable save prediction and save event
- Related Files:
  - `game/src/game/stepGame.js` :: `handleKeeperContact`, `integrateLooseBall`, `checkBallBoundary` — save reach/collision ordering; modify
  - `game/src/game/createInitialGameState.js` :: `createPlayer` — keeper action fields; modify if absent
  - `game/src/game/stepGame.test.js` :: keeper save tests — modify

#### Details
- **Signatures & Types**:
  ```typescript
  type KeeperAction = 'idle'|'diveLeft'|'diveRight'|'recover';
  type Keeper = Player & { keeperAction: KeeperAction; keeperActionSeconds: number; keeperDiveDirection: -1|0|1 };
  function predictGoalCrossing(ball: Ball, goalX:number): { seconds:number; y:number; height:number }|null;
  function isKeeperSaveReachable(keeper: Keeper, crossing: GoalCrossing, timeToCrossing:number): boolean;
  ```
- **Data & Schema Fields**: initialize `keeperAction='idle'`, `keeperActionSeconds=0`, `keeperDiveDirection=0`; tuning constants `KEEPER_REACH_Y=44`, `KEEPER_REACTION_SECONDS=0.12`, `KEEPER_MAX_DIVE_DISTANCE=68`, `KEEPER_DIVE_SECONDS=0.42`; `keeperSave` event `{type:'keeperSave',team,keeperId,direction:-1|1,interceptY:number}`. Use existing coordinates and shot/skill-shot flight kinds.
- **Execution Flow / Logic**:
  1. Before goal-line resolution, predict time and y at defender goal plane from current ball velocity; reject shots moving away, already behind goal plane, or outside goal vertical range.
  2. Compare crossing y to keeper current y and movement budget `min(KEEPER_MAX_DIVE_DISTANCE, KEEPER_SPEED * max(0,time-KEEPER_REACTION_SECONDS) + KEEPER_REACH_Y)`. If reachable and ball height is within save envelope, set keeper action/direction and intercept ball at crossing contact; stop shot and award keeper possession/catch or rebound according to skill rule.
  3. If unreachable, do not move keeper into the ball or call catch; let existing goal boundary scoring process it. Preserve eagle-shot bypass and rainbow skill effects.
  4. Decrement keeper action timer; after dive duration move to `recover`, then `idle`; kickoff resets visual action but must not alter disciplinary state.
  5. Emit `keeperSave` only when save physically succeeds, along with existing `keeperCatch` compatibility event if a catch occurs.
- **Error & Exception Handling**: reject nonfinite velocities/coordinates, zero horizontal speed, impossible/negative crossing time; skip predictive logic and retain boundary behavior.
- **State Transition & Return**: reachable save sets ball owner to keeper and phase `goalKick` as existing catch does; unreachable shot leaves keeper unowned and boundary logic decides goal/out.

### I02. Keeper dive pose
- Related Files:
  - `game/src/components/FootballPlayer3D.jsx` :: keeper-specific limbs/body pose — modify
  - `game/src/components/GameLoop3D.jsx` :: keeper state update — modify
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D` — animate dive direction/action timer; modify

#### Details
- Animate keeper root/body lean and horizontal reach toward `keeperDiveDirection`; extend both arms toward predicted intercept side, lower body without converting the keeper into field-player fall state. Recover to upright over `keeperActionSeconds`.
- Dive pose must only play during simulation `diveLeft|diveRight`, be mirrored for both goal ends, and preserve keeper kit/gloves and goal position.

## Acceptance Criteria
- [x] Reachable shots emit a save event, transfer possession to the keeper, and trigger a dive toward the predicted crossing point.
- [x] Shots outside the keeper reach envelope continue to goal or boundary resolution; eagle shots bypass ordinary keeper saves.
- [x] Keeper trajectories reject invalid/zero horizontal velocity and respect goal-mouth and save-height limits.

## Validation
- `npm run build` passed; keeper actor animation compiles.
- Manual in-browser visual review was not performed in this turn.

## Commit Message
```text
feat(game): add trajectory-based goalkeeper dives

Plan: 2026-10-22-unified-3d-arcade-football
Phase: P02-3d-game-feel
Task: T02-keeper-dive-save

- Save only shots inside keeper reach envelope
- Synchronize left/right save dives with ball trajectory
```

## Progress
- [x] 구현 완료
- [x] 프로덕션 빌드 통과
- commit: recorded in git history.
- commit: pending
