# Task: T01 Evidence-Backed Story

## Status: done

## Goal
내부 개발자에게 10분 동안 설명할 수 있는 8장짜리 발표의 문구·근거·발표 메모를 하나의 UTF-8 JSON 파일에 확정한다. 이 Task의 관찰 가능한 결과는 정확히 600초의 시간 배분, 슬라이드별 한 문장 메시지, 검증 가능한 출처가 들어간 `slide-content.json`이다.

## Decision Summary
- 핵심 메시지는 “원하는 결과물에는 구체적인 기획이 필요하다”이다. 슬라이드 1–4(총 300초)는 초기 2D에서 3D로 바뀐 결정과 구현 단위의 관계를 설명한다.
- 실제 게임 화면·규칙 소개는 최소화한다. 5장은 스킬 사용 경로, 6장은 태클 렌더 예외, 7장은 Azure 배포 경계, 8장은 재사용 가능한 방법으로 마무리한다.
- 2026-10-21 초기 사양과 2026-10-22 변경 사양을 각각 그 날짜의 결정으로 표시한다. 발표자는 1인칭으로 설명하되 확인되지 않은 성능 개선이나 복구 완료를 말하지 않는다.

## Implementation

### I01. 발표 원고와 출처를 단일 JSON으로 정의

- Related Files:
  - `presentation/football-dev-talk/slide-content.json` :: `PresentationContent`, `SlideSpec`, `sourceCatalog` — 발표 문구·시간·노트·출처의 단일 원본; new
  - `.memory/decisions/2026-10-27-developer-presentation.md` :: `D01`–`D09` — 사용자 확정 범위; read-only
  - `.memory/decisions/2026-10-21-pixel-football.md` :: `D01`, `D03`, `D06`, `D10` — 초기 2D·6대6·3단계·React/JS 근거; read-only
  - `.memory/decisions/2026-10-22-3d-arcade-football.md` :: `D02`, `D04`, `D05` — 3D 기술·카메라·공 높이·4대4·5단계 근거; read-only
  - `.memory/phases/2026-10-27-football-beta-feedback/P01-game-stability-and-polish/T01-renderer-stability-and-input-latency.md` :: `Acceptance Criteria`, `Execution Notes` — 태클 수정과 검증 한계; read-only
  - `.memory/decisions/2026-10-27-azure-deployment-target.md` :: `Decision`, `Existing app recovery` — 배포 대상 정정 및 미복구 근거; read-only
  - `.agents/skills/grill-me/SKILL.md`, `.agents/skills/memory-plan/SKILL.md`, `.agents/skills/memory-execute/SKILL.md` :: 각 스킬 워크플로 — 사용 순서와 산출물 근거; read-only
  - `game/src/components/TrackingCamera3D.jsx`, `game/src/components/FootballPlayer3D.jsx`, `game/src/components/FootballBall3D.jsx`, `game/src/components/MiiPlayerModel.jsx` :: 구현 파일명과 태클 상태 코드 근거; read-only

#### Details
- **Signatures & Types** (데이터 계약; JavaScript 구현은 T02에서 작성):
  ```typescript
  type SlideKind = 'title' | 'timeline' | 'comparison' | 'mapping' | 'workflow' | 'incident' | 'operations' | 'closing';
  type Source = { path: string; locator: string; claim: string };
  type SlideSpec = {
    id: 'S01'|'S02'|'S03'|'S04'|'S05'|'S06'|'S07'|'S08';
    kind: SlideKind;
    title: string;
    subtitle: string;
    durationSec: number;
    message: string;
    blocks: { label: string; body: string }[];
    quotes: { text: string; sourceKey: string }[];
    sourceRefs: string[];
    notes: string;
  };
  type PresentationContent = {
    schemaVersion: 1;
    title: string;
    audience: string;
    durationSec: 600;
    sourceCatalog: Record<string, Source>;
    slides: SlideSpec[];
  };
  ```
- **Data & Schema Fields**:
  - 모든 필드는 필수다. 해당 항목이 없는 슬라이드에는 빈 배열 `[]`을 사용한다. `null`과 빈 `title`, `message`, `notes`는 허용하지 않는다.
  - `id`는 `S01`부터 `S08`까지 중복 없이 오름차순이고 `kind`는 8개 타입을 각각 한 번씩 사용한다.
  - `sourceRefs`는 `sourceCatalog`의 키만 가리킨다. 각 슬라이드에는 적어도 1개가 있어야 한다. 슬라이드 하단 출처 표시에 쓰므로 한 장당 3개를 넘기지 않는다.
  - `quotes`의 `text`는 해당 문서 원문을 그대로 사용한다. 발표용 풀이 문장은 `blocks`나 `notes`에 넣는다.
  - `notes`에는 약속한 시간에 맞춰 말할 핵심 문장과 다음 장으로 넘어가는 전환 문장을 포함한다. 읽는 대본보다 발표자 메모에 적합한 길이로 쓴다.
- **Execution Flow / Logic**:
  1. Precondition & Validation: 위 경로의 문서·코드가 존재하는지 확인한다. 작성된 결정과 실제 구현 상태가 다른 경우 “당시 결정”과 “현재 코드”를 구분한다.
  2. Core Processing: 아래 8장 계약에 맞게 `slides`를 작성하고 `sourceCatalog`에 근거 위치를 기록한다. 화면에 들어갈 `blocks`는 장당 2–4개, 각 `body`는 가급적 한두 줄로 유지한다.
  3. Error & Exception Handling: 근거 없는 주장이나 불일치 문구를 발견하면 그 문구를 삭제하거나 “당시 계획”으로 한정한다. 출처가 불명확한 통계·효과 수치는 넣지 않는다.
  4. State Transition & Return: JSON 파싱과 8장·600초·출처 참조 검증을 통과한 파일을 저장한다.

#### 8장 구성 계약
| ID | 종류 | 시간 | 제목/핵심 메시지 | 필수 근거와 메모 방향 |
| :--- | :--- | ---: | :--- | :--- |
| S01 | title | 40초 | `원하는 결과물은 구체적인 기획에서 시작됐다` — 축구 게임은 과정의 사례 | “게임 소개보다 기획 방법을 공유한다”로 시작; 2026-10-21~27 작업 기간만 표시 |
| S02 | timeline | 65초 | `첫 기획은 2D 탑다운이었다` — 초기 선택은 로컬 PC 웹 프로토타입에 맞았다 | 10/21 결정: 2D 탑다운, 6대6, 3단계, React/JS; 이후 변경의 출발점임을 명시 |
| S03 | comparison | 100초 | `목표 경험을 다시 쓰자 3D가 필요해졌다` — 표현 요구를 기술 결정으로 바꿨다 | 10/21의 2D 화면과 10/22의 R3F·Three.js, 높은 사선 카메라, 선수 점프 높이, 공의 포물선을 좌우 비교; 2D 실패라고 단정하지 않음 |
| S04 | mapping | 95초 | `상세 기획은 구현 단위를 만든다` — 카메라·선수·공·캠페인을 각각 명시했다 | 요구 → 결정 → 코드 대상 연결: 카메라→`TrackingCamera3D.jsx`, 선수→`FootballPlayer3D.jsx`, 공→`FootballBall3D.jsx`; 4대4·5단계 범위 결정도 표시. 구현 파일명은 코드에서 확인된 사실로만 사용 |
| S05 | workflow | 90초 | `세 스킬로 결정을 작업에 연결했다` — 대화의 선택을 파일과 커밋으로 남겼다 | `grill-me`→`decisions/`, `memory-plan`→`plans/`·`phases/`·Task, `memory-execute`→`current.md`·검증·커밋; 사용자 결정과 AI 실행의 경계를 한 문장으로 설명 |
| S06 | incident | 95초 | `태클 멈춤: 추측 대신 상태와 렌더 경로를 봤다` — 선언되지 않은 변수 참조 수정 | 사용자 재현→`MiiPlayerModel.jsx`의 `sliding` 참조→`(livePlayer.slideSeconds ?? 0) > 0`→168개 자동 테스트와 빌드. 화면에는 “수정 후 인증 Chrome·Edge 장시간 검증은 미실시”를 반드시 표시 |
| S07 | operations | 60초 | `배포 대상도 설계의 일부였다` — 전용 Azure 앱으로 경로를 정정 | 다른 앱 대상 배포를 중단하고 `ydj-football`로 별도 배포; 기존 앱 원본이 없어 원복을 완료하지 못함. 비밀 값·구독 ID는 표시하지 않음 |
| S08 | closing | 55초 | `다음 프로젝트에도 남길 방법` — 원하는 경험을 문장으로, 결정은 파일로, 실행은 검증으로 | ① 목표 장면 설명 ② 설계 항목 확정 ③ 작은 Task로 구현 ④ 확인된 결과와 미검증 범위 분리; 질문 유도 없이 감사 인사로 종료 |

#### 정확한 인용 후보
- S03 좌측: `위에서 내려다보는 2D 탑다운 화면. PC 웹 브라우저를 우선 지원한다.` — `.memory/decisions/2026-10-21-pixel-football.md` D01.
- S03 우측: `React Three Fiber와 Three.js로 실제 3D 경기장·선수·공을 렌더링한다.` — `.memory/decisions/2026-10-22-3d-arcade-football.md` D02.
- S03/S04 우측 보조: `높은 사선 중계 시점의 카메라가 공을 부드럽게 따라간다.` — 같은 문서 D02의 문장.
- S06 짧은 코드 표시: `const sliding = (livePlayer.slideSeconds ?? 0) > 0;` — 태클 Task 청사진과 commit `1f78f26`에 기록된 수정.

## Acceptance Criteria
- [x] 8개 `SlideSpec`의 `durationSec` 합이 정확히 600이고 발표 전반부 S01–S04 합이 300이다.
- [x] 모든 슬라이드에 한국어 메시지·발표 메모·출처가 있으며, S03에는 실제 결정 문서 원문 두 개 이상이 있다.
- [x] S06에는 수정 후 브라우저 실측이 남아 있다는 한계가 화면 문구와 메모 모두에 들어 있다.
- [x] S07에는 기존 앱 원복을 완료하지 못했다는 한계가 메모에 들어 있고 자격 증명·ID는 없다.
- [x] 스킬 자체를 만든 과정을 발표의 중심으로 바꾸지 않고, 사용 경로와 산출물에 집중한다.

## Validation
- `node -e "const d=require('./presentation/football-dev-talk/slide-content.json');const s=d.slides;if(d.schemaVersion!==1||s.length!==8||s.reduce((n,x)=>n+x.durationSec,0)!==600||s.slice(0,4).reduce((n,x)=>n+x.durationSec,0)!==300||s.some((x,i)=>x.id!==('S'+String(i+1).padStart(2,'0'))||!x.title||!x.message||!x.notes||!x.sourceRefs.length||x.sourceRefs.some(k=>!d.sourceCatalog[k])))process.exit(1);console.log('8 slides / 600 seconds / sources OK')"` — JSON 파싱과 핵심 계약 통과.
- `rg -n "sliding|장시간|원복|2D|3D" presentation/football-dev-talk/slide-content.json` — S03·S06·S07의 민감한 사실·한계 문구를 육안 검토.

## Commit Message
```text
docs(presentation): draft evidence-backed developer talk

Plan: 2026-10-27-football-dev-presentation
Phase: P01-presentation-artifact
Task: T01-evidence-backed-story

- Write eight-slide narrative with exact decision excerpts
- Allocate ten minutes and mark verification limits
```

## Progress
- [x] 구현 완료
- [x] 검증 통과 — 8장/600초/출처 키 검사 및 결정문 인용 대조
- commit: recorded in git history
