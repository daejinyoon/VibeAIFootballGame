# Task: T01 경기 오디오와 전체 음소거 제어

## Status: done

## Goal

로그인 직후부터 로그아웃까지 BGM을 끊김 없이 반복하고, 경기 중 관중 웅성거림과 킥오프·골 함성을 재생하며, 경기 HUD 버튼 하나로 BGM·관중·스킬 효과음을 즉시 켜고 끌 수 있게 한다.

## Decision Summary

- 기본 오디오는 켜짐이며 설정은 브라우저 저장소에 기록하지 않는다.
- 관중 루프는 OpenGameArt의 Gregor Quendel `10 - Ambience`를 사용하고 CC BY 4.0 출처를 기록한다.

## Implementation

### I01. 인증 세션에 연결된 오디오 설정과 BGM 생명주기

- Related Files:
  - `game/src/game/audioSettings.js` :: `isGameAudioEnabled`, `setGameAudioEnabled`, `subscribeGameAudio` — 오디오 전체 설정과 구독을 제공; new
  - `game/src/game/audioContext.js` :: `getAudioContext`, `prepareAudioContext` — Web Audio 공통 출력 게인 연결; modify
  - `game/src/game/menuMusic.js` :: `startMenuMusic`, `stopMenuMusic`, `scheduleNextPhrase` — 팬페어 반복과 mute 반영; modify
  - `game/src/game/skillAudio.js` :: `playSkillAudio`, `playEulryongtaImpact` 및 음원 노드 연결 — 스킬 효과음 mute 반영; modify
  - `game/src/App.jsx` :: `App`, `enterMenuMusicScreen`, `leaveMenuMusicScreen`, `signOut`, `startStage` — 인증 상태에서 BGM을 시작하고 화면 전환 시 유지; modify
  - `game/src/game/audioSettings.test.js` :: 설정 기본값·구독; new
  - `game/src/game/menuMusic.test.js` :: 반복 재생과 mute 전환; modify
  - `game/src/game/skillAudio.test.js` :: 스킬 효과음의 전역 mute 반영; modify

#### Details

- **Signatures & Types**:
  ```js
  export function isGameAudioEnabled() // boolean
  export function setGameAudioEnabled(enabled) // boolean
  export function subscribeGameAudio(listener) // () => void
  export function startMenuMusic() // boolean
  export function stopMenuMusic() // void
  ```
- **Data & Schema Fields**:
  - 모듈 내부 `gameAudioEnabled: boolean`은 `true`로 시작한다. localStorage, profile, campaign 데이터에는 저장하지 않는다.
  - 각 Web Audio 출력은 하나의 공유 `GainNode`를 거친다. 비활성화 시 gain을 0으로, 활성화 시 1로 바꾸며 오디오 컨텍스트가 없거나 노드 생성이 실패해도 게임 진행은 계속한다.
- **Execution Flow / Logic**:
  1. `audioSettings.js`에서 리스너 집합을 관리한다. `setGameAudioEnabled`는 Boolean으로 정규화하고 실제 값이 바뀌면 등록된 리스너에 새 값을 전달한다. `subscribeGameAudio`는 구독 직후 현재 값을 전달하고 해제 함수를 반환한다.
  2. `audioContext.js`에서 공유 출력 게인을 지연 생성하고 모든 합성 오디오가 이를 통해 `context.destination`으로 연결되게 한다. `menuMusic.js`는 자신의 phrase gain 뒤에 공유 출력을 연결한다. 음소거 변경은 이미 생성된 BGM에도 즉시 적용한다.
  3. `App`에서 `audioEnabled` React 상태를 `true`로 초기화한다. `accountIsAuthenticated`가 참이 되는 시점에 BGM을 한 번 시작하고 `screen` 변화에는 정지하지 않는다. 로그아웃 또는 App 정리 때 정지한다. 기존 메뉴 화면 전용 시작·정지 effect는 제거하거나 인증 생명주기와 충돌하지 않게 통합한다.
  4. 자동 재생이 거부되면 첫 `pointerdown` 또는 `keydown`에서 `prepareAudioContext()`와 BGM 시작을 다시 시도하고 성공 후 한 번 등록된 입력 리스너를 제거한다.
  5. 스킬 오디오 함수는 재생 전에 `isGameAudioEnabled()`를 확인하고, 이미 재생 중인 Web Audio도 공유 출력 게인이 mute한다.
- **Error & Exception Handling**:
  - AudioContext, GainNode, 사용자 입력 리스너 생성 실패는 기존처럼 조용히 처리한다. BGM 실패가 로그인이나 경기 로딩을 막지 않는다.
  - App 재렌더나 화면 이동으로 중복 BGM 세션을 만들지 않는다. `startMenuMusic`의 기존 멱등 동작을 유지한다.
- **State Transition & Return**: 로그인 전에는 BGM이 꺼져 있고, 인증 후 한 세션만 반복 재생한다. 로그아웃·unmount에서 종료한다. 음소거는 다음 App 로그인에서 기본 켜짐으로 돌아온다.

### I02. 경기 관중 음원과 HUD 스피커 버튼

- Related Files:
  - `game/src/game/matchAudio.js` :: `prepareMatchAudio`, `playCrowdCheer`, 새 `startCrowdAmbience`, `stopCrowdAmbience` — 관중 루프와 이벤트 함성; modify
  - `game/src/components/GameLoop3D.jsx` :: `GameLoop3D` — 이벤트 함성 호출과 오디오 설정 구독; modify
  - `game/src/components/GameScreen.jsx` :: `GameScreen` — `audioEnabled`, `onToggleAudio` props와 경기 스피커 버튼; modify
  - `game/src/App.jsx` :: `App`, `startStage` — 설정 상태를 HUD로 전달하고 match audio에 적용; modify
  - `game/src/styles.css` :: `.game-canvas-wrap`, `.match-score-hud`, 신규 `.match-audio-toggle` — HUD 우상단 위치와 좁은 화면 배치; modify
  - `game/public/audio/crowd-ambience.mp3` :: OpenGameArt의 `10 - Ambience`; new
  - `game/public/audio/ATTRIBUTION.md` :: 음원 라이선스 기록; modify
  - `game/src/game/matchAudio.test.js` :: ambient loop 생명주기, 음소거, event volume; modify

#### Details

- **Signatures & Types**:
  ```js
  export function startCrowdAmbience() // boolean
  export function stopCrowdAmbience() // void
  export async function playCrowdCheer(eventType) // Promise<boolean>
  function GameScreen({ gameState, paused, errorMessage, onPause, onResume,
    onSaveAndExit, onGameEvents, audioEnabled, onToggleAudio })
  ```
- **Data & Schema Fields**:
  - ambient `HTMLAudioElement`: `src='/audio/crowd-ambience.mp3'`, `loop=true`, `preload='auto'`, volume `0.16`, mute는 `isGameAudioEnabled()`를 따른다.
  - 이벤트 함성은 기존 `/audio/crowd-cheering.mp3`와 kickoff `0.35`, goal `0.9` 볼륨을 유지한다.
  - UI는 `audioEnabled: boolean`과 무인자 `onToggleAudio: () => void`를 사용하며 접근성 이름은 켜짐 `소리 끄기`, 꺼짐 `소리 켜기`로 제공한다.
- **Execution Flow / Logic**:
  1. OpenGameArt `https://opengameart.org/content/free-crowd-cheering-sounds`의 CC BY 4.0 ZIP에서 Gregor Quendel의 `10 - Ambience` 파일을 추출해 `crowd-ambience.mp3`로 저장한다. Attribution에 작성자, 트랙명, 라이선스, 출처 링크와 파일명을 추가한다.
  2. `matchAudio.js`에서 ambient element를 지연 생성하고 멱등하게 loop 재생한다. 재생 거부·파일 누락은 `false`를 반환하고 경기 로직에 전파하지 않는다. `stopCrowdAmbience`는 pause하고 `currentTime=0`으로 되돌린다.
  3. `App.startStage`는 로그인 버튼 클릭의 사용자 동작 안에서 ambience와 초기 kickoff 함성을 시작한다. `GameScreen`은 unpaused 경기 동안 ambience가 유지되도록 하고 pause/unmount에서 멈춘다. `App.startStage`의 kickoff 함성은 초기 kickoff용이고 `GameLoop3D`의 kickoff 이벤트는 goal 뒤 kickoff용이므로 두 호출을 유지한다. 각 kickoff에서 함성이 한 번만 재생되는지 확인한다. `App`의 pause 메뉴 복귀 handler도 사용자 클릭 안에서 ambience를 다시 시작한다.
  4. HUD의 스피커 버튼은 `.game-canvas-wrap` 내부 우상단에 배치하고 score HUD와 겹치지 않게 offset한다. `aria-pressed`, `aria-label`, 키보드 포커스 표시를 제공한다. `App`의 handler는 React 상태와 오디오 설정 모듈을 함께 갱신한다.
  5. 모바일 폭 420px 이하에서도 버튼이 캔버스 밖으로 나가거나 점수 HUD를 가리지 않는지 CSS breakpoint를 지정한다.
- **Error & Exception Handling**:
  - `Audio` 미지원, 로딩 실패, autoplay 거부 시 ambience만 생략하고 기존 이벤트 함성과 경기 입력은 계속 동작한다.
  - 하나의 ambience 인스턴스만 유지해 화면 렌더마다 재생이 중복되지 않게 한다.
- **State Transition & Return**: 활성 경기에서만 ambience가 loop한다. pause·경기 화면 종료에서 정지하며, 전체 mute는 ambience, 이벤트 함성, BGM, 스킬 오디오에 즉시 반영한다.

## Acceptance Criteria

- [ ] 인증 완료 뒤 화면 이동과 경기 진입에도 BGM이 중단되지 않고 로그아웃 때 정지한다.
- [ ] 인증 사용자 첫 입력에서 autoplay 차단 상태를 재시도한다.
- [ ] 경기 중 낮은 관중 ambience loop와 기존 kickoff·goal 함성이 함께 동작한다.
- [ ] 한 번의 킥오프에서 이벤트 함성이 정확히 한 번만 재생된다.
- [ ] HUD 스피커 하나가 BGM·관중·스킬 효과음을 즉시 mute/unmute하고 reload 다음 접속은 켜짐으로 시작한다.
- [ ] ambience 음원과 CC BY 4.0 attribution이 함께 제공된다.

## Validation

- `npm test -- --test-name-pattern="audio settings|menu fanfare|crowd|global audio setting"` from `game/` — 오디오 상태, BGM, ambience, 스킬 mute 테스트 통과.
- `npm run build` from `game/` — 프로덕션 빌드 성공.

## Commit Message

```text
feat(audio): keep match audio across the session

Plan: 2026-10-27-audio-match-balance
Phase: P01-audio-matchplay-and-goal-kick
Task: T01-match-audio-and-mute-control

- Loop the fanfare and crowd ambience across the requested screens
- Add a single accessible match audio toggle
```

## Progress

- [x] 구현 완료
- [x] 검증 통과 (`npm test -- --test-name-pattern="audio settings|menu fanfare|crowd|global audio setting"`, `npm run build`)
- commit: pending
