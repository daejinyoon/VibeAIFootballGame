# Task: T01 3D 선수 방향·달리기·접촉 모션

## Status: pending

## Goal
3D 선수의 회전과 간단한 달리기·받기·태클·점프·넘어짐·회복 포즈가 실제 시뮬레이션 위치와 상태를 따라가도록 하여 3D 조작과 몸싸움을 읽기 쉽게 만든다.

## Decision Summary
- 시뮬레이션의 `facingX/Y`, `vx/vy`, `motionAction`, `knockdownDirectionX/Y`, `jumpHeight`가 포즈 입력이다. 직접 조작 방향 전환은 관성 없이 유지한다.
- 애니메이션은 코드 기반 절차 모션이며 외부 모캡/구매 에셋은 추가하지 않는다.

## Implementation

### I01. Actor pose state wiring and direction
- Related Files:
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D` `useFrame` actor update — frame state to transforms; modify
  - `game/src/components/FootballPlayer3D.jsx` :: `FootballPlayer3D`, `Limb` — root transform and limbs; modify
  - `game/src/components/Match3DGame.jsx` :: `actorsRef` shape — register limb refs if required; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type PlayerPose = { facingX:number; facingY:number; vx:number; vy:number; jumpHeight:number; motionAction:string; knockdownSeconds:number; knockdownDirectionX:number; knockdownDirectionY:number };
  // FootballPlayer3D({player: PlayerPose & PlayerIdentity, selected:boolean, actorsRef:ActorsRef}): JSX.Element|null
  ```
- **Data & Schema Fields**: preserve current actor/player maps. Add `limbs: Map<string,{leftArm:Object3D,rightArm:Object3D,leftLeg:Object3D,rightLeg:Object3D,torso:Object3D}>` only if refs must be updated from frame loop; otherwise update pose in component `useFrame`. Do not put Three Object3D instances in serializable game state.
- **Execution Flow / Logic**:
  1. Translate sim `x/y` into current world conversion (`x/80 - FIELD.width/160`, `(y-FIELD.height/2)/80`) and retain jump height.
  2. Convert sim direction to world yaw using the established forward axis; derive yaw from `atan2(facingX,facingY)` and retain prior yaw when velocity/direction is zero. Remove team-hardcoded rotation.
  3. Determine run gait from horizontal speed `Math.hypot(vx,vy)` and `motionAction==='run'`; update arms and legs with bounded sine phase and opposite leg/arm swing. Stop gait while receive/tackle/knockdown/recover/dive actions are active.
  4. Set `receive` on successful pass/loose-ball pickup using pass and possession events; `tackle` on tackle event; `jump` on positive jump state; `knockdown/recover` from explicit player motion state.
  5. For knockdown, rotate body toward the event’s contact-away direction, lower torso toward turf, offset arms/legs, then return upright on recover. Keep marker on ground and team colors/selection visible.
  6. All actor updates are mutable Three object transforms; do not trigger React state updates per rendered frame.
- **Error & Exception Handling**: finite fallback facing uses team attack direction only if no prior facing; clamp gait angle and body tilt; absent actor ref skips visual update without affecting simulation.
- **State Transition & Return**: no gameplay state mutation in rendering layer. `GameLoop3D` consumes events and state snapshot; 3D objects visualize them only.

### I02. Visual validation
- Related Files:
  - `game/src/components/FootballPlayer3D.jsx` — renderable player poses; modify
  - `game/src/components/GameLoop3D.jsx` — actor transform integration; modify

#### Details
- Start local Vite app and inspect both teams facing attack directions, user direction-key turn, stationary idle, running in 8 directions, jump/header, pass receive, tackle, fall/recover. Ensure ground marker and shadows do not float with body tilt/jump.
- Capture a desktop screenshot of representative bright stadium running/contact poses to `.memory/qa/2026-10-22-unified-football-motions.md`; include browser size, route and observed cases.

## Acceptance Criteria
- [ ] Player faces actual movement/last facing instead of fixed team yaw; moving player has visible alternating gait and stationary player does not run.
- [ ] Receive, tackle, jump, fall, and recovery have distinct visible poses synchronized with sim states.
- [ ] Frame animation is updated through refs/transforms without per-frame React render churn; existing stadium brightness and camera composition remain.

## Validation
- `npm run build` — R3F components compile.
- `npm test` — existing simulation/storage suite remains green; manual Chrome visual review recorded in `.memory/qa/2026-10-22-unified-football-motions.md`.

## Commit Message
```text
feat(3d): animate player direction and contact states

Plan: 2026-10-22-unified-3d-arcade-football
Phase: P02-3d-game-feel
Task: T01-player-3d-motions

- Orient actors to travel direction and add arcade running gait
- Show reception, tackle, knockdown and recovery poses
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
