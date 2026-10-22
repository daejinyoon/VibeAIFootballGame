# Decision: 축구 경기 청크 캐시 경계 개선

## Context
- 시작 화면에서는 `GameScreen`을 `React.lazy`로 지연 로드해 초기 JavaScript를 줄였다.
- 현재 경기 화면 chunk에는 앱 경기 코드와 Three.js/R3F 의존성이 함께 들어가며, 약 967 kB로 빌드 경고가 발생한다.

## Decision
- 기존 `GameScreen` 지연 로드를 유지한다.
- Vite 6 빌드 설정의 output chunk 전략으로 Three.js와 React Three Fiber 런타임을 경기 전용 동적 import와 분리해 캐시 경계를 만든다.
- 초기 화면에 3D 런타임을 다시 포함시키지 않는다.
- chunk 수, 정적 의존 관계, 경기 진입 시 네트워크 요청과 브라우저 런타임을 확인하고, 실제 결과에 따라 청크 이름과 분할 기준을 조정한다.
- chunk 크기 경고 임계값을 올려 감추지 않는다.

## Consequences
- Three/R3F 파일은 게임 전용 화면 코드가 바뀌어도 콘텐츠 해시가 유지되면 브라우저 캐시를 재사용할 수 있다.
- 파일을 나눠도 게임 진입 시 내려받는 전체 바이트가 줄어든다고 가정하지 않는다. 결과 보고에는 초기 번들과 경기 시점 청크의 실제 크기를 각각 기록한다.
- vendor 분할이 중복 로딩, circular chunk, 불필요한 초기 preload를 만들면 해당 설정을 조정하거나 근거와 함께 되돌린다.

## References
- [Vite Build Options](https://vite.dev/config/build-options.html)
