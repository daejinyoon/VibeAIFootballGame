# Task: T00 Git 커밋 환경 준비

## Status: done

## Goal
각 실행 태스크를 사용자 프로젝트 안에서 커밋할 수 있도록 Git 실행 환경과 저장소를 준비한다. 이 작업은 게임 앱 코드를 만들지 않는다.

## Decision Summary
- 작업 디렉터리 루트 `C:\Users\DEX\Desktop\윤대진AI`를 Git 저장소 루트로 사용한다.
- 현재 확인 결과 `git` 명령을 찾지 못했고 `.git/` 디렉터리도 없다.
- Git for Windows가 설치되지 않았다면 자동 설치하지 않는다. 사용자에게 공식 설치 방법을 안내하고 설치가 확인된 뒤 이어서 진행한다.
- 작성자 이름과 이메일은 이 저장소에만 설정한다. 값이 없으면 사용자에게 원하는 표시 이름과 이메일을 물어본다. 전역 Git 설정을 변경하지 않는다.

## Implementation

### I01. Git 설치와 저장소 상태 확인
- Related Files:
  - `.git/` :: 저장소 메타데이터; Git이 준비된 경우 생성
  - `.gitignore` :: 생성되는 빌드·의존성·비밀 설정 파일 제외; new
- **Signatures & Types**:
  ```text
  git --version
  git rev-parse --show-toplevel
  git config --local user.name
  git config --local user.email
  ```
- **Data & Schema Fields**:
  - Git 작성자 설정은 현재 저장소 범위의 문자열 `user.name`, `user.email` 두 값이다.
  - `.gitignore`는 `node_modules/`, `dist/`, `.env`, `.env.*`를 제외하되 `.env.example`은 추적 가능하게 한다. `.memory/`와 앱 소스는 제외하지 않는다.
- **Execution Flow / Logic**:
  1. `git --version`으로 실행 가능 여부와 `git rev-parse --show-toplevel`로 저장소 존재 여부를 확인한다.
  2. Git이 없으면 Windows 사용자가 설치할 수 있도록 Git for Windows 공식 다운로드 페이지와 설치 후 확인할 명령을 안내하고 이 태스크를 보류한다. 자동으로 시스템 프로그램을 설치하지 않는다.
  3. 저장소가 없으면 프로젝트 루트에서 `git init`을 실행한다. 이미 있으면 기존 저장소를 그대로 사용한다.
  4. `.gitignore`를 만들어 빌드 산출물, 의존성 폴더, 환경 변수 파일을 제외한다. `.memory/`는 실행 이력 추적을 위해 Git에 포함한다.
  5. 저장소 로컬 `user.name` 또는 `user.email`이 비어 있으면 사용자에게 값을 확인한 뒤 `git config --local`로 설정한다. 이미 설정되어 있으면 덮어쓰지 않는다.
  6. 이 태스크에서 바꾼 `.gitignore`와 `.memory/` 계획 파일만 명시적으로 스테이징하고, 커밋한다. 다른 기존 사용자 파일은 자동으로 스테이징하지 않는다.
- **Error & Exception Handling**: 설치 후에도 `git` 명령을 찾지 못하면 터미널을 다시 열도록 안내하고 재확인한다. Git 저장소 권한 오류나 이름/이메일 미확정 시 진행을 멈추고 오류 원인 또는 필요한 값을 사용자에게 설명한다.

## Acceptance Criteria
- [x] `git --version`이 버전을 출력하고 프로젝트 루트가 저장소 루트로 확인된다.
- [x] 작성자 이름과 이메일이 저장소 로컬 설정에 있으며 전역 설정은 바뀌지 않았다.
- [x] 루트 `.gitignore`가 생성되어 `node_modules/`, `dist/`, 비밀 `.env` 파일은 제외하고 `.env.example`과 `.memory/`는 추적 가능하다.
- [x] 이 태스크에서 바꾼 파일만 커밋되고, 무관한 기존 사용자 파일은 스테이징되지 않았다.

## Validation
- `git --version` — Git CLI 설치 여부 확인.
- `git rev-parse --show-toplevel` — 저장소 루트가 프로젝트 폴더인지 확인.
- `git config --local --get user.name; git config --local --get user.email` — 로컬 작성자 정보 확인.
- `git check-ignore game/node_modules game/dist .env; git check-ignore -v .env.example` — 제외/예외 규칙 확인. 대상 경로가 아직 없으면 `.gitignore` 패턴을 대상으로 점검한다.
- `git status --short` — 이번 태스크의 변경만 커밋되었고 무관한 파일을 포함하지 않았는지 확인.

## Commit Message
```text
chore(project): prepare Git for task commits

Plan: 2026-10-21-football-game
Phase: P01-local-game
Task: T00-git-setup

- Prepare repository-local Git identity and ignore rules
- Keep unrelated existing files out of the setup commit
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: `178c2fb`
