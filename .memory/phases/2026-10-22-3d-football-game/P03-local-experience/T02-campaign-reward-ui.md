# Task: T02 캠페인·보상 UI

## Status: done

## Goal
상쾌한 DEX 스포츠 화면에서 무스킬 시작, 5단계 AI 경기, 승리 보상 카드 선택, 카드의 선수 배정·보관·교체 흐름을 완성한다.

## Decision Summary
- 메뉴와 보상 화면은 밝고 역동적인 DEX 오리지널 스타일이며, 경기 모델은 P01에서 만든 오리지널 저폴리 3D다.
- 스테이지를 이길 때 3장 중 한 장을 선택하고, 5단계 보스 승리 후에도 마지막 보상 선택을 보여준다.

## Implementation

### I01. 화면 상태 및 캠페인 흐름
- Related Files:
  - `game/src/App.jsx` :: `App`, `makeMatchState`, `handleGameEvents`, `continueSavedCampaign`, `assignSkill` — 화면/보상 흐름; modify
  - `game/src/components/StartScreen.jsx` :: 시작 메뉴와 조작 안내; modify
  - `game/src/components/ResultsScreen.jsx` :: 승패·단계 진행 안내; modify
  - `game/src/components/LoadoutScreen.jsx` :: 보유 스킬과 세 선수 배치; modify
  - `game/src/components/SkillRewardScreen.jsx` :: 3장 카드 선택·선수 지정; new
- Details
  - **Signatures & Types**:
    ```js
    export default function SkillRewardScreen({ offer, inventory, playerSkillStacks, playerRows, onChoose, onAssign, onKeep })
    export default function LoadoutScreen({ playerRows, playerSkillStacks, inventory, onAssign, onConfirm, onBack })
    ```
  - **Screen State**: `'start'|'match'|'pause'|'results'|'skillReward'|'loadout'|'leaderboard'`; `campaign` and `pendingReward` are React state.
  - **Execution Flow / Logic**:
    1. New campaign creates empty skill inventory/three empty player stacks and starts stage 1 directly; no pre-match skill is granted.
    2. On stage win, show results then `SkillRewardScreen` with three generated skill cards. Player selects one card then selects a field player or `보관`.
    3. Assigning the same skill to that player increments copies up to 3. Assigning a different skill returns the old stack to inventory before attaching one copy. `보관` increments inventory only.
    4. Before stages 2–5, allow a loadout screen to reassign inventory cards; an unassigned card remains in inventory.
    5. On stage 5 win, show the final reward selection, then campaign completion result. On loss, no reward is granted and retry preserves current campaign stacks.
    6. Start screen says `4대4 (필드 3 + GK)`, five AI stages, temporary save/resume, ranking. Controls list arrows, A/S/D, F and Space.

### I02. 밝은 스포츠 테마와 카드·캐릭터 화면
- Related Files:
  - `game/src/styles.css` :: design tokens, screen/card/roster/3D viewport styles; modify
  - `game/src/components/LeaderboardScreen.jsx` :: 5-stage local ranking; modify
  - `game/src/components/PauseMenu.jsx` :: save/resume labels and layout; modify
- Details
  - **Data & Schema Fields**:
    - CSS tokens: `--ink:#152434`, `--muted:#64798b`, `--field:#39a869`, `--lime:#d7fa57`, `--coral:#ff7059`, `--sky:#53d5eb`, `--paper:#f5f9ed`.
    - Reward card shows icon drawn from CSS/inline vector, Korean skill name, short description, and rarity/accent border. No copyrighted sprites/images.
    - Player roster card shows player role, assigned skill name, copies and remaining uses; GK card explicitly says `스킬 없음`.
  - **Execution Flow / Logic**:
    1. Preserve keyboard focus outlines, readable text contrast and mobile wrapping in styles.
    2. Remove `LOCAL PLAY` old pixel branding in favor of DEX 3D arcade branding.
    3. Replace old 6-person strings and gauge labels with 4v4/5-stage/card-use copy.
    4. Keep existing ranking order (stage reached descending, goal difference descending, Korean nickname ascending), displaying stage range 1–5.

## Acceptance Criteria
- [ ] A new campaign enters stage 1 with no active or stored skills.
- [ ] Each clear shows exactly three distinct choices, lets player assign one to a field player or keep it stored, and never lets the goalkeeper equip a skill.
- [ ] Same-skill stack cap is 3 per field player; replacement returns old stack to inventory.
- [ ] Five-stage progress, final reward, pause save, retry, continue and leaderboard screens remain reachable.
- [ ] UI is bright, readable, responsive, DEX-branded and uses no Nintendo assets.

## Validation
- `npm test` — campaign, skills, storage and screen-adjacent logic tests pass
- `npm run build` — all React screens and CSS compile

## Commit Message
```text
feat(game): add five stage reward and loadout screens

Plan: 2026-10-22-3d-football-game
Phase: P03-local-experience
Task: T02-campaign-reward-ui

- Add skill card draft and field player assignment flow
- Refresh DEX campaign screens for the 3d arcade game
```

## Progress
- [x] 구현 완료
- [x] 검증 통과
- commit: pending
