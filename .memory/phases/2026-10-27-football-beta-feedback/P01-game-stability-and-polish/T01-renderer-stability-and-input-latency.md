# Task: T01 Renderer Stability and Input Latency

## Status: done

## Goal
Remove the confirmed exception in the 3D tackle pose and establish whether desktop Chrome/Edge can complete a five-minute match soak without the reported whole-tab stall or approximately one-second player-input delay.

## Decision Summary
- The selected player input is processed from `createInputController.readFrame()` in the R3F `useFrame` loop; the controlled actor is written each frame. React snapshots are cloned every six frames and the HUD view is throttled to 100 ms, so do not change these UI paths as a substitute for fixing measured world-control latency.
- `MiiPlayerModel.jsx` reads `player.slideSeconds` in gameplay state, but its tackle pose currently reads an undeclared `sliding` identifier. Define the pose flag from the live player's `slideSeconds`.
- Preserve the pre-existing `Match3DCanvas.jsx` change that disables shadows. Do not infer that this setting is the cause of the reported stall.

## Implementation

### I01. Fix the tackle animation's live-state read

- Related Files:
  - `game/src/components/MiiPlayerModel.jsx` :: `MiiPlayerModel` — derive the tackle pose from the live player state instead of an undeclared identifier; modify.
  - `game/src/game/stepGame.js` :: `updateHomeDefense`, `advancePlayerRecovery` — read-only reference for when `slideSeconds` is set and decremented.

#### Details
- **Signatures & Types**:
  ```typescript
  type LivePlayer = {
    motionAction?: string;
    slideSeconds?: number;
    // Other existing player fields remain unchanged.
  };
  ```
- **Data & Schema Fields**:
  - Reuse the existing optional numeric `player.slideSeconds`; add no new player-state field.
- **Execution Flow / Logic**:
  1. Inside `MiiPlayerModel`'s existing `useFrame`, after resolving `livePlayer` and before computing `actionPose`, derive `const sliding = (livePlayer.slideSeconds ?? 0) > 0`.
  2. Keep the existing tackle-pose branch and its values: use `0.25` when sliding and `0.92` for the other tackle pose.
  3. Do not modify tackle timing or the simulation's `slideSeconds` lifecycle.
  4. A player without `slideSeconds` must use the non-sliding pose and must not throw.

### I02. Measure the reported desktop stall and input path

- Related Files:
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D` — per-frame input, simulation, actor update, and snapshot path; read-only unless a measured defect requires a minimal fix.
  - `game/src/game/createInputController.js` :: `createInputController` — keyboard event-to-frame path; read-only unless a measured defect requires a minimal fix.
  - `game/src/components/Match3DCanvas.jsx` :: `Match3DCanvas` — current renderer settings and error boundary; preserve the existing uncommitted `shadows={false}` change.

#### Details
- **Execution Flow / Logic**:
  1. Run the local game with `npm run dev` from `game/`; use desktop Chrome and Edge, a focused match canvas, and a five-minute match session containing movement, sprint, a tackle, shots, and at least one restart.
  2. In DevTools Performance, record one run per browser. Check the console for repeated exceptions, the main-thread flame chart for long tasks, and the Memory timeline for steadily growing retained heap. Record whether the whole tab stops responding.
  3. During each run, make 30 arrow-key movement inputs at separated times. Trace `keydown` → next `readFrame()` → `stepGame()` → controlled actor transform. Target the first visible actor change within 100 ms of `keydown` at normal desktop frame rates.
  4. Only change an input or rendering hot path if the trace identifies it as the source. Do not lower the React snapshot interval to address player-model motion; the actor transform is already updated independently each frame.
  5. Record the browser, duration, observed console errors, input latency range, and any repeatable long task/heap growth in the Task completion notes. If the full-tab freeze does not reproduce after the known exception is fixed, report that limit rather than claiming a root cause.

#### Failure Handling
- A browser renderer fallback is not equivalent to a whole-tab freeze; record them separately.
- Do not revert user-owned rendering changes while profiling.
- If a new root cause requires broad renderer or simulation redesign, stop before expanding this Task and report the measured evidence for a follow-up decision.

## Acceptance Criteria
- [x] A tackle animation uses `livePlayer.slideSeconds` and no longer throws because `sliding` is undefined.
- [deferred] Post-fix Chrome and Edge five-minute soak and 30-input latency observations are deferred until the user's batch deployment; live pre-fix tackle freeze was reproduced by the user.
- [x] No code change beyond the tackle flag was made; no speculative rendering rewrite is included.
- [x] The existing `shadows={false}` workspace change remains intact.

## Validation
- `npm test` from `game/` — existing Node test suite passes.
- `npm run build` from `game/` — Vite production build completes.
- Manual Chrome and Edge five-minute soak described in I02 — post-fix verification deferred until the user's batch deployment; pre-fix tackle freeze reproduced on the live site.

## Commit Message
```text
fix(game): prevent tackle pose render exception

Plan: 2026-10-27-football-beta-feedback
Phase: P01-game-stability-and-polish
Task: T01-renderer-stability-and-input-latency

- Read the tackle slide timer from the live player state
- Record the confirmed live tackle freeze; defer post-fix browser soak to batch deployment
```

## Progress
- [x] Implementation complete — `MiiPlayerModel.jsx` derives the tackle slide pose from `livePlayer.slideSeconds`.
- [x] Automated validation — `npm test` 168/168 passed; `npm run build` succeeded.
- [deferred] Post-fix Chrome/Edge five-minute soak and 30-input latency measurements move to batch-release verification per user direction. User reproduced the pre-fix tackle freeze on the live deployment.
- commit: recorded in git history
### Execution Notes (2026-10-27)
- User manually confirmed that the provided Azure deployment freezes when tackling. This matches the deployed bundle's sole `sliding` identifier occurrence inside the tackle-pose branch. The local source has the fix; post-fix browser verification is deferred until the user's planned batch deployment.
- `game/`에서 `npm test`: 168 tests passed, 0 failed.
- `game/`에서 `npm run build`: 성공. Vite가 minified Three.js chunk가 500 kB를 넘는다는 기존 bundle-size 경고를 출력함.
- Chrome headless로 로컬 개발 서버를 열어 앱 렌더링을 확인했으나, Entra Tenant ID/Client ID가 설정되지 않아 인증 안내 화면에 머무름. 경기에 진입할 수 없어 Chrome/Edge 경기 soak, tackle 동작, 30회 입력 지연 측정은 수행하지 못함.
- 사용자가 제공한 Azure Static Web Apps 주소는 HTTP 200으로 게임 HTML을 반환함. 응답의 `Last-Modified`는 2026-10-26이며 현재 로컬 수정(2026-10-27)이 배포된 빌드라는 증거는 없음. 인증된 경기 조작/성능 측정은 실행하지 않음.
- 배포된 `GameScreen` 번들에서 `sliding` 식별자가 한 번 나타나며, 해당 참조는 tackle pose 삼항 연산자 안에 있음. 로컬 소스에는 `const sliding = (livePlayer.slideSeconds ?? 0) > 0;`가 존재해 수정 전/후 차이를 확인함.
- 설치된 `@react-three/fiber`의 `update()`는 `useFrame` 구독자를 직접 호출하고, 예외를 잡는 코드 없이 그 다음 `gl.render()`를 호출함. 전역 RAF loop는 update 전에 다음 RAF를 예약함. 따라서 tackle 중 undeclared `sliding` 예외가 반복되면 그 프레임의 WebGL render가 건너뛰고 다음 프레임도 다시 실패할 수 있음. 이 동작은 경기 화면 정지의 강한 후보 원인이지만 전체 브라우저 탭 freeze를 증명하지는 않음.
- `resolveTackle`은 `motionAction='tackle'`을 0.32초 동안 유지하므로, 배포본의 예외는 태클 한 번마다 여러 연속 프레임의 렌더를 막을 수 있음. `RendererErrorBoundary`는 React component render 오류용이며 R3F 전역 RAF 콜백 오류는 이 경계 밖에서 발생함.
- 배포된 `/api/profile`은 자격 증명 없는 GET에 401을 반환함. 이는 보호된 API가 연결되었다는 응답이며, 인증 후 Cosmos 저장/경기 로드가 되는지는 검증하지 않음.
- 사용자가 전달한 Entra IDs는 Git에서 무시되는 `game/.env.local`에 기록함. API/Cosmos 로컬 설정은 별도이며 아직 구성되지 않음.
- CPU-only 시뮬레이션 스트레스 확인: `stepGame`을 18,000회(시뮬레이션 300초) 이동/질주/태클/스킬 입력과 함께 실행. wall time 0.615초, 평균 step 0.033 ms, 최대 step 16.17 ms. 유한하지 않은 선수/공 좌표 없음, `skillEffects` 최대 2개, `skillProjectiles` 최대 3개로 배열 증가가 관찰되지 않음. 이 결과는 브라우저 렌더링/GPU/키보드 입력 경로를 검증하지 않음.
- 장기 메모리/반복문 소스 점검: `PlayerMotionEffects3D`는 종류별 파티클 12개 풀과 별 8개를 재사용하고, `frameDelta`를 0.05초로 제한해 0.035초 간격 방출 `while`은 프레임당 최대 2회. `EagleProjectile3D` trail history는 28개로 제한. `advanceEagleVolley` 반복은 발사 수가 skill level에 도달하면 끝나며 level schema 상 최대 3. 코드상 무한 반복/무한 증가 경로는 발견하지 못함.
- 별도 interactive Chrome 세션을 원격 디버깅 포트로 열어 인증 경기 테스트를 준비하려 했으나, 실행 정책이 브라우저 프로세스 시작을 차단함. 사용자 로그인 세션을 사용할 수 없어서 브라우저 렌더/GPU/키 입력 실측은 아직 불가.
- 측정 기록 없음: 브라우저 버전/경기 soak 시간/콘솔 반복 예외/입력 지연은 인증된 경기 세션으로 재검증 필요.
- 코드 수정은 청사진에서 확인한 undeclared `sliding` 참조 한 곳에 한정. `Match3DCanvas.jsx`의 기존 `shadows={false}` 변경은 유지.
