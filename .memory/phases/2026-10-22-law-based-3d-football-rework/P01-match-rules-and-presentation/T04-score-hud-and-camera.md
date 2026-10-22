# Task: T04 상단 스코어보드와 공격 진영 카메라

## Status: done

## Goal
참고 이미지처럼 양 팀 표시/점수와 남은 시간을 경기 화면 상단에 고정하고, 높은 사선 시점에서 공을 가진 팀의 공격 절반을 강조하면서 양쪽 골대를 확인하게 한다.

## Decision Summary
- 상단 HUD에 팀 색상, 양 팀 점수, 중앙 `mm:ss` 시계를 표시한다. 골든골에서도 남은 시간을 표시하고 badge를 둔다.
- 카메라는 높은 사선/넓은 구도를 유지한다. 공 위치와 공격 방향으로 look target을 옮기되 양쪽 골대를 모두 보인다.
- HUD는 3D Canvas 위 HTML overlay로 구현한다.

## Implementation

### I01. 점수/시간 고정 overlay
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen`, time/score selectors, `.game-canvas-wrap`; modify
  - `game/src/styles.css` :: `.game-canvas-wrap`, `.match-score-hud`; modify
  - `game/src/components/Match3DGame.jsx` :: state delivery; read-only

#### Details
- **Signatures & Types**:
  ```ts
  formatMatchTime(seconds: number): string;
  type MatchScoreHudProps = { score: { home: number; away: number }; time: string; phase: GameState['phase'] };
  ```
- **Data & Schema Fields**:
  - Use existing `score.home`, `score.away`, `remainingSeconds`, `overtimeRemainingSeconds`, `phase`; add no simulation fields.
  - Timer is ceil of finite seconds clamped to zero, rendered as two-digit `MM:SS`.
- **Execution Flow / Logic**:
  1. `formatMatchTime`: finite seconds -> ceil -> clamp >=0 -> `MM:SS`; 60=`01:00`, 9=`00:09`.
  2. Render `.match-score-hud` inside `.game-canvas-wrap` at top center. Layout: home team badge/score, center clock, away score/team badge. Use current team kit colors; add no external logos.
  3. Normal match uses `remainingSeconds`; overtime uses `overtimeRemainingSeconds` and `GOLDEN GOAL` badge. Keep HUD visible in pause, goal pause, restart, foul restart and finished phases.
  4. Keep stage header, possession/foul notice, pause, skill stocks and errors.
  5. Narrow viewport reduces padding/font; overlay height <=54px and does not cover field center. Set decorative wrapper pointer-events none and preserve accessible text.
- **Error & Exception Handling**:
  - Missing/non-finite time shows `00:00`; missing score shows 0.
  - Team/score text is accessible. No change to canvas keyboard capture.
- **State Transition & Return**:
  - Read-only UI driven by existing `onStateChange` snapshots.

### I02. 공격 절반을 강조하는 넓은 추적 카메라
- Related Files:
  - `game/src/components/TrackingCamera3D.jsx` :: `TrackingCamera3D` `useFrame` focus/position; modify
  - `game/src/components/Match3DCanvas.jsx` :: camera start/fov only if tuning requires; modify
  - `game/src/game/constants.js` :: FIELD mapping; read-only
- **Signatures & Types**:
  ```ts
  getAttackDirection(possessionTeam: 'home' | 'away' | null, lastTouchTeam: 'home' | 'away' | null): -1 | 1 | null;
  getAttackHalfFocusX(ballX: number, attackDirection: -1 | 1, fieldWidth: number): number;
  ```
- **Data & Schema Fields**:
  - Read existing `gameStateRef.current.ball`, `possessionTeam`, `ball.lastTouchTeam`; add no render state/camera store.
  - Home attacks +x, away attacks -x. Unknown possession uses last-touch; if both unknown use ball-only tracking.
- **Execution Flow / Logic**:
  1. Convert game x/y to Three world units at scale 80:1.
  2. Base focus on ball. Attack-half anchor is `0.65*FIELD.width` for home and `0.35*FIELD.width` for away; blend focus with ball x using midpoint so the camera emphasizes the active half.
  3. Clamp look target and camera x so the field width and both goals remain visible at current FOV/height. Do not zoom in. If viewport review clips a goal, reduce horizontal follow clamp.
  4. Preserve existing ball y/height tracking and lerp smoothing; attack direction changes transition smoothly.
  5. Keep current Canvas aspect/responsive sizing. Do not change simulation.
- **Error & Exception Handling**:
  - Invalid team or non-finite ball coordinates falls back to field center; never pass NaN to camera transforms.
  - If possession and lastTouch are absent, use symmetric ball tracking.
- **State Transition & Return**:
  - Mutate only camera position/look target. Game state remains read-only.

## Acceptance Criteria
- [ ] 점수와 `MM:SS`가 경기 화면 위쪽에 계속 보인다.
- [ ] 정규/골든골 시간이 state와 맞고 골든골 badge가 표시된다.
- [ ] 공격 방향 변경에 카메라가 부드럽게 반응한다.
- [ ] 양 골대가 모두 보이고 zoom으로 반대편이 사라지지 않는다.
- [ ] 좁은 viewport에서도 HUD가 잘리거나 점수/시간을 가리지 않는다.

## Validation
- `cd game; npm run build` — Vite production build 성공
- 브라우저 수동 확인: 데스크톱/좁은 viewport, 홈/away 공격, 골든골, 양 골대.

## Commit Message
```text
feat(game): add top match scoreboard and attack half camera

Plan: 2026-10-22-law-based-3d-football-rework
Phase: P01-match-rules-and-presentation
Task: T04-score-hud-and-camera

- Show score and match clock above the 3D pitch
- Bias the wide tracking camera toward the attacking half
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 (`npm run build`)
- commit: pending
