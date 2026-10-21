# Task: T06 로컬 저장과 랭킹

## Status: pending

## Goal
게임을 로그인 없이 로컬에서 시험할 수 있도록 닉네임, 한 개의 캠페인 저장 슬롯, 이어 하기, 최고 캠페인 기록과 브라우저 랭킹을 저장한다.

## Decision Summary
- 브라우저 `localStorage`를 저장소로 사용한다. Azure·Entra 연결은 이번 계획에서 구현하지 않는다.
- 저장은 일시정지 메뉴의 “저장 후 나가기”에서만 만들며, 이어 하면 통과한 단계는 보존하고 현재 단계 경기의 시작부터 다시 한다.

## Implementation

### I01. 로컬 프로필 저장 계층
- Related Files:
  - `game/src/storage/localProfile.js` :: profile CRUD와 저장 슬롯; new
  - `game/src/storage/localProfile.test.js` :: 메모리 Storage 기반 검증; new
- **Signatures & Types**:
  ```js
  export const STORAGE_KEY = "dex-pixel-football:v1";
  export function createEmptyProfile();
  export function readProfile(storage = window.localStorage);
  export function writeProfile(profile, storage = window.localStorage);
  export function setNickname(profile, nickname);
  export function createCampaignSave(campaign);
  export function updateBestRecord(profile, campaignResult);
  export function sortLeaderboard(records);
  ```
- **Data & Schema Fields**:
  - `LocalProfile`: `{ schemaVersion: 1, nickname: string, campaignSave: CampaignSave|null, bestRecord: BestRecord|null }`.
  - `CampaignSave`: `{ savedAt: string, currentStage: 1|2|3, clearedStageResults: Array<{ stage: number, homeGoals: number, awayGoals: number, goalDifference: number }>, homeLoadout: Record<PlayerId, SkillId>, opponentSkillSets: { 1: SkillId[], 2: SkillId[], 3: SkillId[] } }`. 현재 경기 좌표/남은 시간은 저장하지 않는다.
  - `BestRecord`: `{ nickname: string, stageReached: 1|2|3, goalDifference: number, updatedAt: string }`.
- **Execution Flow / Logic**:
  1. 처음 방문 시 빈 프로필을 만든다. 닉네임 입력을 완료해야 저장/랭킹 기능을 사용한다. 닉네임은 trim 후 2–16자, 공백만인 값은 거부한다.
  2. `readProfile`은 JSON parse와 schemaVersion 검사 후 유효하지 않은 데이터면 앱을 중단하지 않고 빈 프로필을 반환한다.
  3. 저장 후 나가기를 누르면 캠페인 진행·스킬 배정·상대 조합을 저장하고 현재 경기만 시작 상태로 되돌린다. 같은 stage로 이어 할 때 저장된 무작위 상대 조합을 유지한다.
  4. 저장 슬롯이 있는 상태에서 새 캠페인 시작 시 확인 UI를 보여준다. 취소하면 현재 저장을 보존하고, 확인하면 새 캠페인이 저장을 대체한다.
  5. 승리한 stage 결과만 누적 골 차이에 합산한다. 랭킹 후보는 `{stageReached, goalDifference}`로 비교하고 기존 기록보다 높은 단계이거나 같은 단계에서 골 차이가 클 때만 갱신한다. exact tie는 기존 기록을 유지한다.
  6. 정렬은 `stageReached` 내림차순, `goalDifference` 내림차순, `nickname` 오름차순이다. localStorage 쓰기 실패는 UI에 한국어 오류 메시지를 표시한다.
  7. `App`에 `readProfile`/`writeProfile`을 연결하고 별명 수정, 이어 하기, 저장 후 나가기, 캠페인 결과 갱신, 랭킹 열기를 연결한다.
- **Error & Exception Handling**: JSON 손상·버전 불일치·저장 quota 오류를 화면 흰색 오류로 만들지 않는다. 저장 실패 시 현재 앱 메모리 상태는 유지하고 재시도 안내를 보여준다.

## Acceptance Criteria
- [ ] 로컬 첫 방문에서 별명을 저장하고 랭킹에 표시할 수 있다.
- [ ] 저장 슬롯 하나를 만들고 새로고침 뒤 이어 하기 할 수 있으며, 이어 하면 현재 단계 경기를 처음부터 시작한다.
- [ ] 덮어쓰기 취소는 기존 저장을 지키고, 확인은 새 캠페인으로 대체한다.
- [ ] 승리한 단계만 골 차이에 포함하고, 개인 최고 기록 순서로 랭킹을 정렬한다.
- [ ] 손상된 브라우저 데이터와 저장 실패가 앱을 종료시키지 않는다.

## Validation
- `cd game; npm test` — nickname, parse recovery, save/resume, overwrite, best-record update and ordering tests pass.
- `cd game; npm run build` — local persistence integration bundles.
- `cd game; npm run dev` — manually save, refresh, resume, overwrite and inspect leaderboard.

## Commit Message
```text
feat(game): add browser saves and local leaderboard

Plan: 2026-10-21-football-game
Phase: P01-local-game
Task: T06-local-save-ranking

- Persist a single resumable campaign in localStorage
- Track and sort each local profile's best campaign
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- commit: pending
