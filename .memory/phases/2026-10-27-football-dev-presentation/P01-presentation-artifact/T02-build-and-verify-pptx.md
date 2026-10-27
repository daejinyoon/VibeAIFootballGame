# Task: T02 Build and Verify PPTX

## Status: done

## Goal
T01의 `slide-content.json`에서 발표자가 바로 편집·발표할 수 있는 16:9 PPTX 8장과 슬라이드별 메모를 생성하고, PowerPoint 렌더 및 PPTX 내부 구조 검증으로 화면 잘림과 사실 오류를 제거한다.

## Decision Summary
- 생성 도구는 Node.js 20과 `pptxgenjs@4.0.1`이다. Python은 이 PC에서 Microsoft Store shim만 발견됐으므로 사용하지 않는다. PowerPoint가 설치돼 있어 실제 슬라이드 렌더 QA에 사용한다.
- 화면은 내부 개발자용 기술 발표로 디자인한다. 2026-10-27 후속 요청으로 S02에 당시 실제 2D·3D 경기장 캡처 두 장을 추가했고, 나머지는 결정문 비교, 구현 연결 도식, 스킬 산출물, 태클 코드 한 줄, 배포 경계 도식을 사용한다. 라이브 데모는 없다.
- 완성 조건은 PPTX 생성만이 아니라 8개 notesSlide XML, 8개 슬라이드 이미지, 육안 판독, 민감정보·과장 주장 점검까지 포함한다.

## Implementation

### I01. 재현 가능한 제작 환경과 PPTX 생성기

- Related Files:
  - `presentation/football-dev-talk/package.json` :: `scripts.build`, `dependencies.pptxgenjs` — Node 제작 환경; new
  - `presentation/football-dev-talk/package-lock.json` :: npm lockfile — `pptxgenjs@4.0.1`와 전이 의존성 고정; new
  - `presentation/football-dev-talk/slide-content.json` :: `PresentationContent`, `slides` — T01에서 완성된 원고의 유일한 문구 원본; read-only unless factual correction needed
  - `presentation/football-dev-talk/build-deck.cjs` :: `readContent`, `validateContent`, `drawSlide`, `buildPresentation` — PPTX 제작; new
  - `presentation/football-dev-talk/2026-10-27-football-dev-presentation-with-screenshots.pptx` :: PowerPoint package — D10 후속 요청을 반영한 최종 산출물; new
  - `presentation/football-dev-talk/assets/match-2d-2026-10-21-pitch.png`, `presentation/football-dev-talk/assets/match-3d-2026-10-22-pitch.png` :: 실제 경기장 캡처 — S02 화면 비교; new

#### Details
- **Signatures & Types**:
  ```typescript
  type SlideKind = 'title'|'timeline'|'comparison'|'mapping'|'workflow'|'incident'|'operations'|'closing';
  type SlideSpec = {
    id: string; kind: SlideKind; title: string; subtitle: string;
    durationSec: number; message: string;
    blocks: {label:string; body:string}[];
    quotes: {text:string; sourceKey:string}[];
    sourceRefs: string[]; notes: string;
  };
  type PresentationContent = {
    schemaVersion: 1; title: string; audience: string; durationSec: 600;
    sourceCatalog: Record<string, {path:string; locator:string; claim:string}>;
    slides: SlideSpec[];
  };
  function readContent(path: string): PresentationContent;
  function validateContent(content: PresentationContent): void;
  function drawSlide(pptx: import('pptxgenjs'), spec: SlideSpec, index: number, content: PresentationContent): void;
  async function buildPresentation(): Promise<void>;
  ```
- **Data & Schema Fields**:
  - `package.json`: `private: true`; `name: "football-dev-talk"`; `version: "1.0.0"`; `scripts.build: "node build-deck.cjs"`; `dependencies.pptxgenjs: "4.0.1"` (caret 없이 정확한 버전).
  - PPTX metadata: `author: "윤대진"`, `subject: "구체적인 기획과 AI 스킬로 축구 게임을 개발한 과정"`, `title`은 JSON의 `title`, 언어는 한국어 문구를 사용.
  - Slide canvas: 16:9 `LAYOUT_WIDE`, 13.333 × 7.5 inch. 최소 안전 여백 0.55 inch, 본문 폰트 최소 18 pt, 작은 출처/페이지 표시 최소 10 pt. 한국어 글꼴 `맑은 고딕`; 영문 및 코드 글꼴 `Aptos` 또는 `Consolas`.
  - Palette: navy `142B36`, off-white `F7F7F2`, coral `DD6B52`, teal `2E9B8B`, muted gray `526871`. 어두운 배경/밝은 글자 또는 밝은 배경/짙은 글자 조합으로 대비 유지.
  - PPTX의 모든 주요 텍스트는 PowerPoint에서 편집 가능한 텍스트 상자·도형으로 만든다. 슬라이드 전체를 이미지 한 장으로 굳히지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `slide-content.json`의 schemaVersion=1, 8장, 시간 합계=600, 참조 키 존재, 빈 메모 없음 확인; 위반 시 출력 파일을 쓰지 않고 오류와 slide ID를 출력한다.
  2. Core Processing: `pptxgenjs` 프레젠테이션을 만들고 각 `kind`에 맞는 레이아웃으로 `slides`를 순서대로 그린다. 하단에는 `S0x / 08`, 해당 장 출처의 짧은 파일명·결정 날짜를 넣는다. 각 장에 `slide.addNotes(spec.notes)`를 호출한다. `await pptx.writeFile({ fileName: outputPath, compression: true })` 완료 후 파일 크기가 0보다 큰지 확인한다.
  3. Error & Exception Handling: JSON 오류, 미지원 `kind`, 누락된 출처, 폰트/좌표 계산 오류는 실패로 끝낸다. 임의의 기본값으로 문구를 생략하거나 발표 메모 없이 PPTX를 저장하지 않는다.
  4. State Transition & Return: 최종 PPTX 경로를 출력한다. 상대 경로는 `__dirname` 기준으로 계산해 작업 디렉터리와 무관하게 같은 파일을 생성한다.

#### 슬라이드별 화면 계약
| ID | 화면 구성 | 필수 표시 |
| :--- | :--- | :--- |
| S01 | 어두운 표지, 큰 한 문장 제목, 날짜/청중 표시 | 10분 내부 개발자 발표라는 맥락 |
| S02 | 10/21 초기 2D 경기장과 10/22 3D 프로토타입 경기장 실제 캡처 두 장을 나란히 표시 | 날짜·Git/이미지 출처를 밝히고 최신 배포 화면이라고 주장하지 않음. 2D 탑다운·6대6·3단계는 **초기 결정**으로 표기 |
| S03 | 2열 실제 결정 문서 발췌 비교 | 2D 문서와 3D 문서의 날짜·인용·출처; 긴 인용은 잘라 의미를 바꾸지 말고 T01의 짧은 정확 인용 사용 |
| S04 | `원하는 표현 → 기획 항목 → 구현 파일` 3열 연결 도식 | 카메라·선수·공 세 줄과 4대4/5단계 범위 결정 |
| S05 | `grill-me → memory-plan → memory-execute` 3단 흐름 | 각 단계의 실제 파일 산출물 경로와 인간 결정/AI 실행의 경계 |
| S06 | 피드백→원인 후보→수정→검증 단계 | `const sliding = (livePlayer.slideSeconds ?? 0) > 0;`, 168 tests + build, **인증 경기 장시간 검증 미실시** 경고 띠 |
| S07 | 잘못된 대상/전용 대상의 간결한 흐름도 | 배포 대상 정정, 이전 앱 원복 미완료, 토큰·ID 없음 |
| S08 | 네 개의 재사용 원칙 + 짧은 마무리 | 목표 경험→상세 결정→작은 작업→검증 범위 명시 |

### I02. 구조 검사와 실제 PowerPoint 렌더 QA

- Related Files:
  - `presentation/football-dev-talk/verify-pptx.ps1` :: `Assert-PptxPackage` — ZIP 구조·8장·8개 메모·민감정보를 검사; new
  - `presentation/football-dev-talk/render-preview.ps1` :: `Export-SlidePreviews` — 설치된 PowerPoint COM으로 PNG 8장 추출; new
  - `presentation/football-dev-talk/build-deck.cjs` :: `drawSlide` — 시각 QA에서 발견한 넘침·대비 수정; modify
  - `presentation/football-dev-talk/2026-10-27-football-dev-presentation-with-screenshots.pptx` :: 최종 산출물 — 수정 후 재생성; modify

#### Details
- **Signatures & Types**:
  ```powershell
  function Assert-PptxPackage([string]$PptxPath): [void]
  function Export-SlidePreviews([string]$PptxPath, [string]$OutputDir): [void]
  ```
- **Data & Schema Fields**:
  - `verify-pptx.ps1` 기본 입력 경로는 같은 폴더의 최종 PPTX다. `[System.IO.Compression.ZipFile]::OpenRead()`로 읽는다. `ppt/slides/slide[0-9]+.xml` 8개, `ppt/notesSlides/notesSlide[0-9]+.xml` 8개를 정규식으로 정확히 센다. 각 notesSlide에서 XML 텍스트를 합쳐 30자 이상인지 검사한다. `slide-content.json`에는 `AZURE_STATIC_WEB_APPS_API_TOKEN`, `AccountKey=`, `client_secret` 같은 비밀 값 패턴이 없어야 한다.
  - `render-preview.ps1`은 PowerPoint COM `Presentations.Open(absPath, ReadOnly=true, Untitled=false, WithWindow=false)` 및 `Presentation.Export(outputDir, 'PNG', 1600, 900)`을 사용한다. `finally`에서 presentation을 닫고 PowerPoint를 종료한다. PNG는 `%TEMP%/football-dev-presentation-preview/`에 두어 Git 산출물에 포함하지 않는다.
  - 미리보기 8장의 개수·가로세로가 1600×900인지 확인한다. 이름은 Office 내보내기 형식에 따라 다를 수 있으므로 파일명을 하드코딩하지 않는다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: `npm ci` 후 `npm run build`를 실행해 PPTX를 생성한다.
  2. Core Processing: ZIP의 슬라이드와 메모를 검사하고 PowerPoint에서 PNG 8장을 내보낸다. 모델의 `view_image`로 **모든 장**을 열어 글자 잘림, 과도한 문구, 낮은 대비, 도형 겹침, 출처 가독성을 확인한다.
  3. Error & Exception Handling: COM 내보내기가 환경 문제로 실패하면 PowerPoint UI에서 파일을 열어 수동으로 PDF 또는 PNG로 내보내 전 장을 검사한다. 이 검사 없이 “시각 검증 완료”라고 쓰지 않는다. 수정이 필요하면 `slide-content.json` 또는 `build-deck.cjs`만 고치고 PPTX를 다시 생성한다.
  4. State Transition & Return: 최종 PPTX, 재생성 명령, 검증 결과를 보고한다. PPTX를 자동 배포하거나 외부 계정에 업로드하지 않는다.

## Acceptance Criteria
- [x] `presentation/football-dev-talk/2026-10-27-football-dev-presentation-with-screenshots.pptx`가 열리고 16:9 편집 가능한 슬라이드 8장과 메모 8개를 포함한다.
- [x] 제목·본문·코드·출처가 1600×900 PNG에서 잘리지 않고 겹치지 않는다. S02의 실제 경기 캡처 2장 외에는 기획 문서와 과정이 시각적 중심이다.
- [x] S01–S04가 5분의 기획 설명을, 전체가 정확히 10분의 발표 메모를 제공한다.
- [x] S06은 렌더 예외 수정과 브라우저 장시간 검증 미실시를 구분하고, S07은 잘못된 배포 수정과 이전 앱 원복 미완료를 구분한다.
- [x] 민감한 계정·구독·연결 문자열·토큰이 PPTX/원고에 포함되지 않고, 기존 Git 변경 사항을 덮어쓰지 않는다.

## Validation
- `npm ci` (workdir `presentation/football-dev-talk`) — 고정된 npm lockfile로 의존성 설치. 이 환경에서 루트에서 실행한 `--prefix` 명령은 루트 `package.json`을 찾으므로 작업 디렉터리를 명시한다.
- `npm run build` (workdir `presentation/football-dev-talk`) — 8장·600초 스키마 확인 후 PPTX 생성.
- `powershell -NoProfile -ExecutionPolicy Bypass -File presentation/football-dev-talk/verify-pptx.ps1` — 8개 slide XML, 8개 notesSlide XML, 메모 텍스트, 민감정보 검사 통과. Windows 기본 실행 정책이 스크립트를 막아 이 단일 프로세스에만 Bypass를 지정한다.
- `powershell -NoProfile -ExecutionPolicy Bypass -File presentation/football-dev-talk/render-preview.ps1` — PowerPoint가 PNG 8장을 1600×900으로 내보냄; 그 후 8장 육안 확인.

## Commit Message
```text
feat(presentation): build verified football developer deck

Plan: 2026-10-27-football-dev-presentation
Phase: P01-presentation-artifact
Task: T02-build-and-verify-pptx

- Generate editable eight-slide PPTX with speaker notes
- Verify source claims, slide package, and rendered layout
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 8 slide XML/8 notesSlide XML/16:9/편집 가능한 도형, PowerPoint PNG 8장(1600×900) 육안 확인
- commit: recorded in git history

## Execution Notes
- Node.js 20에서 `pptxgenjs@4.0.1`로 생성했다. 프로젝트 루트에서 `npm --prefix`가 루트 `package.json`을 요구해 실제 실행은 프레젠테이션 폴더를 작업 디렉터리로 사용했다.
- Windows 실행 정책이 PowerShell 스크립트를 막아 검증/렌더 명령에 `-ExecutionPolicy Bypass`를 이 프로세스에만 지정했다.
- PowerPoint COM으로 모든 슬라이드를 PNG로 내보냈고, 전체 8장을 열어 확인했다. S01, S03, S07의 어색한 줄바꿈을 수정하고 재생성·재확인했다.
- npm audit는 제작 전용 의존성 `pptxgenjs` → `image-size` 경로에서 high 등급 경고 2건을 보고했다. 외부 입력 이미지를 읽지 않는 이 로컬 제작 스크립트와 최종 PPTX 실행에는 직접 연결되지 않지만, 제작 도구를 재사용하거나 버전을 갱신할 때 확인이 필요하다.
- D10 후속 요청: Git `9de6939`의 2D 경기를 별도 작업 폴더에서 실행해 실제 캔버스를 캡처했고, 2026-10-22 저장된 3D 프로토타입 화면의 경기장 영역과 S02에서 나란히 비교했다. 새 이름의 PPTX를 생성해 사용자가 열어 둔 기존 발표 파일을 덮어쓰지 않았다. 8장·8개 노트·PowerPoint 렌더 검증을 다시 통과했다.
