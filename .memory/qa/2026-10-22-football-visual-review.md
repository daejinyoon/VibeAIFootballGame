# 축구 게임 시각 검수 기록

- Date: 2026-10-22
- Browser: Chrome headless, local Vite server
- Viewports: desktop 1440×950, mobile 390×844
- Test profile: `DEX` (local fixture; no personal data)
- Runtime `pageerror`: 0

## 확인 화면

| 화면 | Desktop | Mobile | 결과 |
| :--- | :---: | :---: | :--- |
| 시작 | 확인 | 확인 | 수정 후 보조 버튼 2개가 가로로 정돈되고 제목/입력/경기 프리뷰가 읽힘 |
| 승리 보상 카드 | 확인 | 확인 | 카드 3장, 설명, 필드 선수 안내가 폭에 맞춰 쌓임 |
| 보상 선수 배정 | 확인 | 확인 | 선수 3명 버튼이 터치 가능한 크기로 세로 배치됨 |
| 인벤토리·편성 | 확인 | 확인 | 남은 카드를 선수에게 이동할 수 있고 GK 제외 안내가 보임 |
| 경기 진행 | 확인 | 확인 | 3D 경기장 전체와 선수·공이 보이고 조작 HUD가 화면 안에 있음 |
| 일시정지 | 확인 | — | 모달, 계속하기와 임시 저장 후 메인 버튼이 보임 |
| 랭킹 | — | 확인 | 5단계 기록이 `5/5 단계`로 표시되고 목록이 넘치지 않음 |
| 경기 결과 | 확인 | — | 점수·골 차·랭킹·보상 버튼의 위계가 읽힘 |

## 발견 및 수정

1. 수정 전 모바일 시작 화면에서 `이어 하기`와 `랭킹 보기` 버튼 폭이 부족해 글자가 세로로 쪼개졌다. 주요 시작 버튼을 한 줄 전체 폭으로 두고 보조 버튼을 2열로 배치했다.
2. 수정 전 모바일 경기 Canvas는 298×360px로 고정되어 경기장 주변 빈 바닥이 지나치게 길었다. 수정 후 같은 폭에서 약 298×250px가 되었고 경기장이 화면 안에서 더 균형 있게 보인다.
3. 모든 확인한 모바일 화면에서 `document.documentElement.scrollWidth`와 `window.innerWidth`가 390px로 같았다. 가로 페이지 넘침은 없었다.

## 초기 로딩 최적화 결과

- 지연 로딩 전 초기 JavaScript entry: 1,228.87kB (gzip 343.08kB)
- 지연 로딩 후 초기 JavaScript entry: 259.80kB (gzip 81.26kB), 약 78.9% 감소
- 분리된 `GameScreen` chunk: 966.99kB (gzip 261.39kB)
- Chrome Network에서 첫 화면에 GameScreen/R3F 요청이 없고 경기 시작 뒤 요청되는 것을 확인했다. 지연 중 `경기장을 준비하고 있어요…` 안내가 표시되고 경기 화면으로 정상 전환됐다.
- 빌드는 성공했다. Three/R3F 경기 chunk가 500kB를 넘어 Vite의 chunk 크기 경고는 남아 있다. 이 코드는 사용자가 경기에 들어간 뒤에만 내려받는다.

## 화면 캡처

- 시작 [desktop](./football-visual-review/start-desktop.png) · [mobile](./football-visual-review/start-mobile.png)
- [보상 카드 mobile](./football-visual-review/reward-mobile.png) · [선수 배정 mobile](./football-visual-review/loadout-mobile.png)
- [경기 mobile](./football-visual-review/match-mobile.png) · [일시정지 desktop](./football-visual-review/pause-desktop.png)
- [결과 desktop](./football-visual-review/results-desktop.png) · [랭킹 mobile](./football-visual-review/leaderboard-mobile.png)

## 범위와 한계

- 보상·인벤토리 화면은 로컬 저장 fixture를 넣어 재개 경로로 열고, 선수 배정과 다음 경기 진입을 브라우저에서 수행했다.
- 경기 결과 화면은 같은 CSS와 React 런타임에서 실제 `ResultsScreen` 컴포넌트를 fixture 결과로 렌더링해 시각 확인했다. 경기 60초 전체 플레이 밸런스는 이번 시각 검수 대상이 아니다.
- 검수에서는 화면의 흐름·반응형 배치·런타임 예외를 확인했다. 색약·스크린리더 사용성 평가나 다양한 실제 모바일 기기 검증은 포함하지 않았다.
