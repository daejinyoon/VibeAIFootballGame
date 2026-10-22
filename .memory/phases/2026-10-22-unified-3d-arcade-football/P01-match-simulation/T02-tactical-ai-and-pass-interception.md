# Task: T02 전술 AI와 양 팀 패스 경로 판정

## Status: pending

## Goal
양 팀의 비조작 선수들이 역할과 소유권에 따라 지원·압박·커버하도록 만들고, 상대 AI가 열려 있는 패스 경로를 선택하며, 땅볼 패스와 공중 패스를 실제 공 궤적에서 양 팀 모두 차단할 수 있게 한다.

## Decision Summary
- 필드는 960×540 좌표계이며 팀은 필드 3명과 골키퍼 1명이다. 직접 조작 선수는 AI 목표 이동에서 제외한다.
- 지상 패스 차단은 공 이동 선분과 상대 필드 선수 반경으로 판정한다. 로빙·크로스는 공 높이/낙하 위치와 점프 헤더 판정으로 경합한다.

## Implementation

### I01. Role-based support and defensive shape
- Related Files:
  - `game/src/game/stepGame.js` :: `chooseSupportTarget`, `updateHomeSupportPlayer`, `updateHomeSupportAi`, `targetForRole`, `updateAi`, `updateAwayDefense` — 팀 공통 배치; modify
  - `game/src/game/stepGame.test.js` :: support/press/cover tests — 배치 결정성; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type Point = { x: number; y: number };
  type PlayerRole = 'goalkeeper' | 'defender' | 'midfielder' | 'forward';
  function targetForRole(state: GameState, player: Player, possessionTeam: 'home'|'away', ball: Ball, ballCarrier: Player|null): Point;
  function updateTeamOffBallAi(state: GameState, team: 'home'|'away', controlled: Player|null, deltaSeconds: number, events: MatchEvent[]): void;
  ```
- **Data & Schema Fields**: retain `aiTarget: Point|null`, `aiRetargetSeconds:number`, `aiTackleCooldownSeconds:number`; no random wander target as default. Add no player fields unless required by deterministic tactical target generation; if adding one, initialize in `createPlayer` with type/default documented and test cloning/reset.
- **Execution Flow / Logic**:
  1. Identify carrier from `ball.ownerId`; determine attacking team and opponent. Exclude dismissed players and goalkeeper from field target assignment.
  2. Assign exactly one nearest eligible noncontrolled defender as presser; controlled defender remains user-driven. Other field defenders target role home positions shifted toward goal-side coverage and the passing lane between carrier and nearest attacking receiver. Clamp x/y to `FIELD` bounds.
  3. When home has possession, unselected field support retains defender/midfielder/forward role: defender offers safe behind/side option, midfielder opens diagonal lane, forward makes a forward run based on ball position. Avoid occupying carrier radius and keep targets in bounds.
  4. Apply symmetric tactical helper for whichever team is AI-controlled while possession is away; never overwrite the currently controlled home player. Use `getAiTuning(stage)` to ramp support radius, pressing distance, and decision interval gradually from stages 1–4 to stage 5; do not scale speed as the main difficulty lever.
  5. Keep target generation deterministic from state and stable player order; do not consume random values each frame.
- **Error & Exception Handling**: if team has no eligible field player, skip target update; if carrier/receiver is absent, use role formation target; every computed target is finite and clamped.
- **State Transition & Return**: AI only changes targets/velocity/facing/decision timers; possession changes remain in existing ball-resolution functions.

### I02. Opponent pass choice and path validation
- Related Files:
  - `game/src/game/stepGame.js` :: `releasePass`, `integrateLooseBall`, `collectLooseBall`, `updateAi` — pass generation and interception; modify
  - `game/src/game/stepGame.test.js` :: pass-lane/loft tests — path outcomes; modify

#### Details
- **Signatures & Types**:
  ```typescript
  type PassKind = 'ground' | 'lob' | 'cross';
  function segmentDistance(point: Point, start: Point, end: Point): number;
  function findPassInterceptor(state: GameState, team: 'home'|'away', start: Point, end: Point, heightAt: (t:number)=>number): Player|null;
  function chooseAiPass(state: GameState, passer: Player): { receiver: Player; kind: PassKind; score: number }|null;
  ```
- **Data & Schema Fields**: ball flight uses existing `flightKind`, `flightSeconds`, `flightDurationSeconds`, `height`, `verticalVelocity`, `passTeam`, `passTarget`, `lastTouchTeam`; remove use of `passProtectionSeconds` as immunity (field may remain zero for backwards state compatibility). Interception event: `{type:'pass',team,action,receiverId,completed:false}` for launch, plus `{type:'passIntercepted',team,playerId,fromTeam,passKind}` on defender touch.
- **Execution Flow / Logic**:
  1. AI enumerates active same-team field receivers except passer; reject receivers behind a closed ground lane. Calculate projected pass segment and nearest opponent distance. Score forward progress, support role, distance and lane safety. Ground is default; when blocked choose a loft if the receiver can contest it; use cross for wide forward receiver. If no pass qualifies, dribble toward attack goal; shoot when clear range/angle using stage think interval.
  2. Every loose-ball integration frame computes previous and next ball positions; for ground pass, find earliest opposing field player whose center is within `INTERCEPTION_RADIUS` of the swept segment. Move ball to the contact point, transfer ownership, clear pass-flight metadata and emit `passIntercepted` plus `possessionChange` when applicable. Apply identically to home and away passes.
  3. For `lob|cross`, evaluate closest eligible opposing field player to predicted descending ball point, only if the ball is in that player’s reachable head-height window while jumping. Never grant a ground-pass lane immunity. After landing, normal loose-ball possession contest applies.
  4. `updateJumps` auto-jumps only the single nearest eligible AI field player among players that can reach the predicted landing point; keep user Space jump unchanged. Avoid keeper and dismissed players.
  5. Clear `passTeam`, target and flight metadata on catch, interception, header, boundary reset, shot, and ownership changes so stale pass identity cannot leak to next ball action.
- **Error & Exception Handling**: zero-length segment uses distance to start; invalid duration/coordinates skip predictive intercept and fall back to current ball point; no receiver means deterministic dribble/shot fallback.
- **State Transition & Return**: possession transfers to interceptor and `controlledPlayerId` becomes the receiving home player on home intercept; AI-controlled away intercept leaves user control on existing home player. Pass reception preserves `pass` completed event with receiver id.

### I03. Deterministic regression tests
- Related Files:
  - `game/src/game/stepGame.test.js` :: tactical AI, ground interception, aerial contest, auto-jump cases — modify
  - `game/src/game/constants.js` :: `getAiTuning` and tuning tables — modify only for explicit gradual values

#### Details
- Add fixed-position cases: nearest defender presses while two others cover separate lane/role targets; home support players create safe and forward options without moving controlled player; AI picks safe ground pass, switches to lob/cross when ground lane is blocked, dribbles/shoots when no receiver available.
- Add mirrored home/away ground-pass interception tests including crossing segment between frames, out-of-lane non-interception, and controlled-player update.
- Add loft test for nearest AI jump only, reachable header intercept, too-low/too-high pass not intercepting, and keeper never jumping.
- Verify each stage's AI remains deterministic for 40 frames; stage 5 decision capability is improved by positioning/decisions rather than speed changes.

## Acceptance Criteria
- [ ] Home support and away support/defense maintain role assignments; exactly one nearest noncontrolled field defender presses the carrier while remaining defenders cover lanes.
- [ ] AI passes on a safe open lane, uses lob/cross when ground lane is denied, and chooses dribble/shoot when no pass is viable.
- [ ] Both teams can intercept ground passes by swept ball path; lofts can be won only by reachable aerial contact; only the nearest eligible AI attempts automatic jump.
- [ ] Test behavior is deterministic and no player target leaves field bounds.

## Validation
- `node --test src/game/stepGame.test.js src/game/createInitialGameState.test.js` — tactical decision, interception symmetry, aerial, deterministic behavior pass.
- `npm run build` — simulation imports and UI consumers bundle.

## Commit Message
```text
feat(ai): add tactical support and pass interception

Plan: 2026-10-22-unified-3d-arcade-football
Phase: P01-match-simulation
Task: T02-tactical-ai-and-pass-interception

- Position teammates by role and defensive passing lanes
- Use swept ball paths for symmetric ground and aerial interceptions
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
