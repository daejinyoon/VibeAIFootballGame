# Plan: Football Developer Presentation

## Goal
2026-10-28 회사 내부 개발자 발표를 위해, “원하는 결과물에는 구체적인 기획이 필요하다”를 핵심 메시지로 하는 10분·8장·16:9 편집 가능한 PPTX를 제작한다. 초기 2D 구상에서 실제 3D 설계로 바뀐 결정을 원문 근거로 비교하고, `grill-me → memory-plan → memory-execute` 산출물, 태클 렌더 예외, Azure 배포 대상 교훈을 보조 사례로 쓴다. 각 슬라이드에 시간 배분과 전환 문장을 포함한 발표 메모를 넣고, 생성한 PPTX의 구조와 실제 렌더링을 검증한다.

## Phases
| Phase | Status | Summary | Blueprint |
| :--- | :--- | :--- | :--- |
| P01 | `done` | 근거 기반 발표 원고 작성과 PPTX 제작·검증 | [P01](../phases/2026-10-27-football-dev-presentation/P01-presentation-artifact/phase.md) |

## Confirmed Constraints
- [결정 문서](../decisions/2026-10-27-football-dev-presentation.md)의 D01–D09를 따른다.
- 기획의 구체화에 발표의 전반부 5분을 할당한다. 게임 규칙 소개와 라이브 시연은 넣지 않는다.
- 2D·3D 비교에는 문서의 정확한 작성일과 그 시점의 사양을 붙인다. 2026-10-21 사양을 현재 구현으로 표현하지 않는다.
- 태클 사례는 “선언되지 않은 `sliding` 참조 수정”으로 설명한다. 수정 뒤 Chrome·Edge의 인증 경기 장시간 테스트와 입력 지연 실측이 없다는 사실을 슬라이드/메모에 표시한다.
- Azure 사례는 잘못된 배포 경로를 전용 앱으로 고친 사례로 설명한다. 다른 사람 앱의 원복 완료를 주장하지 않으며 계정 ID·토큰·연결 문자열은 표시하지 않는다.
- 이미 완료된 Desktop Responsive Layout 계획은 그대로 남긴다. `.memory/current.md`만 이 발표 계획의 T01로 바꾼다.
- 작업 트리에 기존 수정·미추적 파일이 많다. 실행 시 각 Task의 산출물과 Task 문서만 선택적으로 Git stage한다.

## Deliverable
- `presentation/football-dev-talk/2026-10-27-football-dev-presentation.pptx` — PowerPoint에서 편집 가능한 최종 파일; 슬라이드 8장과 각 장의 발표 메모 포함.
- `presentation/football-dev-talk/slide-content.json` — 근거, 화면 문구, 시간 배분, 메모의 단일 원본.
- `presentation/football-dev-talk/build-deck.cjs`와 npm lockfile — 동일 PPTX 재생성을 위한 제작 소스.

## Dependencies & Validation Strategy
- Node.js는 현재 설치된 v20.17.0을 사용한다. Windows의 `python.exe`는 Store shim으로 확인되어 Python 제작 도구에 의존하지 않는다.
- PPTX 생성은 `pptxgenjs@4.0.1`에 버전을 고정한다. 공식 문서상 `slide.addNotes(...)`와 `pptx.writeFile(...)`을 지원한다: [Speaker Notes](https://gitbrent.github.io/PptxGenJS/docs/speaker-notes.html), [Saving Presentations](https://gitbrent.github.io/PptxGenJS/docs/usage-saving/).
- 실제 설치된 Microsoft PowerPoint로 PPTX를 열어 슬라이드별 이미지를 내보내고 글자 잘림/대비/가독성을 확인한다. PPTX ZIP 내부의 slide와 notesSlide XML도 검사한다.
- 산출물은 로컬 파일이다. 현재 게임 배포에 이 발표 자료를 게시하는 작업은 포함하지 않는다.
