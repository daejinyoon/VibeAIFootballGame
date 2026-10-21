# Task: T01 React JavaScript 앱 뼈대

## Status: done

## Goal
저장소의 기존 스타터 파일을 보존하면서 `game/` 안에 실행·빌드 가능한 React 앱을 만든다. 이후 게임 화면과 UI를 넣을 안정된 진입점을 마련한다.

## Decision Summary
- React + JavaScript + Vite 6을 사용한다. Vite 6은 현재 확인한 Node `v20.17.0`과 호환된다.
- 애플리케이션 파일은 기존 스타터킷 README와 `.memory/`를 덮어쓰지 않도록 `game/`에 둔다.

## Implementation

### I01. 빌드 설정과 브라우저 진입점
- Related Files:
  - `game/package.json` :: scripts와 React/Vite 의존성; new
  - `game/vite.config.js` :: React 플러그인과 Vite 설정; new
  - `game/index.html` :: React mount 노드와 문서 메타데이터; new
  - `game/.gitignore` :: `node_modules/`, `dist/` 제외; new
- **Signatures & Types**:
  ```js
  // package scripts
  // dev: vite --host 127.0.0.1
  // build: vite build
  // preview: vite preview --host 127.0.0.1
  // test: node --test

  // vite.config.js
  export default defineConfig({ plugins: [react()] });
  ```
- **Data & Schema Fields**:
  - `package.json`: `name: "dex-pixel-football"`, `private: true`, `type: "module"`; dependencies `react`와 `react-dom` 19.x; devDependencies `vite` 6.x와 `@vitejs/plugin-react` 4.x.
- **Execution Flow / Logic**:
  1. `game/`에 위 파일들을 새로 만든다. 저장소 루트 README 및 메모리 파일은 수정하지 않는다.
  2. `cd game` 후 `npm install`로 lockfile을 만든다.
  3. Vite React 플러그인을 등록하고 index.html에서 `/src/main.jsx`를 불러온다.
  4. 빌드 산출물은 `game/dist/`에 생성한다.
- **Error & Exception Handling**: `npm install` 또는 Vite 실행이 실패하면 Node/npm 버전과 설치 출력을 보고 원인을 기록한다. 앱 코드에서 빌드 오류를 숨기지 않는다.

### I02. React 앱 셸
- Related Files:
  - `game/src/main.jsx` :: `createRoot`로 앱을 mount; new
  - `game/src/App.jsx` :: 앱 화면 상태와 최상위 화면; new
  - `game/src/styles.css` :: 기본 폰트, 픽셀 스타일 토큰, PC 레이아웃; new
- **Signatures & Types**:
  ```js
  export default function App();
  export function main(); // 모듈 진입점에서 호출되는 부수효과 함수
  ```
- **Data & Schema Fields**:
  - `screen`: `"start" | "loadout" | "match" | "pause" | "results" | "leaderboard"`; 초기값 `"start"`.
- **Execution Flow / Logic**:
  1. `main.jsx`에서 `#root` 요소를 찾고 없으면 명확한 오류를 발생시킨다.
  2. `App`은 임시 타이틀 화면과 각 화면으로 확장할 빈 콘텐츠 영역을 렌더한다.
  3. CSS는 PC 우선의 중앙 고정 경기 화면, 어두운 배경, 픽셀 폰트 fallback 및 버튼 기본 상태를 정의한다.
- **Error & Exception Handling**: root mount 노드 누락 시 브라우저 콘솔에 원인을 알리고 조용히 빈 화면으로 끝내지 않는다.

## Acceptance Criteria
- [x] `game/`에서 Vite 개발 서버가 `http://127.0.0.1:5173`으로 열리고 React 타이틀 화면을 표시한다.
- [x] `npm run build`가 성공하며 기존 루트 `README.md`와 `.memory/` 파일은 바뀌지 않는다.
- [x] 테스트 스크립트가 `node --test`를 호출한다.

## Validation
- `cd game; npm run build` — Vite production build 성공.
- `cd game; npm test` — 테스트 파일이 아직 없어도 명령이 정상 종료.
- `cd game; npm run dev` — PC 브라우저에서 타이틀 화면 수동 확인.

## Commit Message
```text
feat(game): initialize React JavaScript app

Plan: 2026-10-21-football-game
Phase: P01-local-game
Task: T01-project-shell

- Add Vite 6 React app under game/
- Preserve starter kit root files
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: recorded in Git history
