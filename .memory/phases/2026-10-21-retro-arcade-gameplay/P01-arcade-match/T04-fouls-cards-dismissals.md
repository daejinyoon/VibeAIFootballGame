# Task: T04 諛섏튃쨌移대뱶쨌?댁옣

## Status: done

## Goal
??? ?щ씪?대뵫 ?쒗겢??怨??좎닔 ?묒큺 ?쒖꽌? ?꾨갑 ?묎렐?쇰줈 ?먯젙?섍퀬, 諛섏튃 ?꾩튂??留욌뒗 ?꾨━?Β룻럹?먰떚??諛??좎닔蹂?寃쎄퀬쨌?댁옣??寃쎄린 ?곹깭??諛섏쁺?쒕떎.

## Decision Summary
- ?뺣㈃?먯꽌 怨듭쓣 癒쇱? 嫄대뱶由??쇰컲 ?쒗겢? ?뺣떦?섎떎. ?ㅼ뿉???쒕룄?섍굅??怨듬낫???좎닔瑜?癒쇱? 嫄대뱶由щ㈃ 諛섏튃?대떎. ?ㅽ궗濡?怨듭쓣 ?띾뱷?섎㈃ 諛섏튃???꾨땲??
- ???좎닔??泥?諛섏튃? ?먮줈, ??踰덉㎏ 諛섏튃? ?덈뱶?? ?????媛숈? 洹쒖튃???곸슜?섍퀬 ?댁옣 ?좎닔??援먯껜?섏? ?딅뒗?? ??紐낆씠 ?⑥븘??寃쎄린??怨꾩냽?섍퀬, 怨⑦궎???댁옣? 鍮?怨⑤Ц?쇰줈 泥섎━?쒕떎.

## Implementation

### I01. 諛섏튃 ?먯젙, ?명듃?쇱뒪, ?좎닔 ?댁옣 ?곹깭
- Related Files:
  - `game/src/game/createInitialGameState.js` :: `createPlayer`, `createInitialGameState` ??移대뱶? ?댁옣 湲곕낯 ?꾨뱶; modify
  - `game/src/game/stepGame.js` :: `moveByInput`, `updateAi`, ?쒗겢 泥섎━ 釉붾줉, `checkBallBoundary`, `stepGame` ????? ?먯젙 諛??ш컻; modify
  - `game/src/game/constants.js` :: 寃쎄린???섎꼸??援ъ뿭 ?섏튂; modify only if shared penalty-box constants are introduced
  - `game/src/game/stepGame.test.js` :: ??? 諛섏튃쨌?명듃?쇱뒪쨌?댁옣 ?뚭? ?뚯뒪?? modify

#### Details
- **Signatures & Types**:
  ```js
  // internal isBehindTackler(tackler, carrier) -> boolean
  // internal resolveTackle(state, tackler, carrier, skillProtected = false) -> GameEvent[]
  // internal awardFoul(state, foulingPlayer, fouledPlayer, spot) -> GameEvent[]
  // internal activePlayers(state, team) -> Player[]
  // public stepGame(state, inputFrame = {}, deltaSeconds = 0) -> GameEvent[]
  ```
- **Data & Schema Fields**:
  - `Player.foulCount`: integer `0..2`, initialized 0.
  - `Player.card`: `'none' | 'yellow' | 'red'`, initialized `'none'`.
  - `Player.dismissed`: boolean, initialized false. Excluded from all AI, user switching, contact and keeper candidate selection.
  - `state.foulSpot`: `{ x:number, y:number } | null` while displaying/restarting a set piece.
  - `state.phase`: add `'freeKick'` and `'penaltyKick'`; use `phaseSeconds=1` before play resumes, consistent with existing goal-kick pause.
  - Events: `foul` with `{team, playerId, spot, restart:'freeKick'|'penaltyKick'}`, `yellowCard`, `redCard`, `freeKick`, `penaltyKick`, `playerDismissed`.
- **Execution Flow / Logic**:
  1. Precondition & Validation: candidate tackle only occurs during active play, when the tackler is sliding and an opposing player owns ball. Do not process already-dismissed players. Ball/players must have finite coordinates.
  2. Core Processing: use existing slide duration `0.25s`, tackle reach `26` (power tackle `39`) and existing motion. A foul occurs if carrier distance is at most 22 and tackler-to-carrier relative vector dot carrier facing is negative (behind), or ball-to-tackler distance is greater than carrier-to-tackler distance (player contacted first). Otherwise tackle wins possession. `skillProtected=true` for power tackle activation or existing skill effects that directly steal possession; skip foul, still transfer ball. On foul increment `foulCount`; at 1 set yellow, at 2 set red and dismissed. Determine penalty box from attack direction: x within 0??32 for home-defended goal or `FIELD.width-132..FIELD.width` for away-defended goal, and y within `FIELD.height/2 짹 100`; inside -> penalty kick, otherwise free kick. Set fouled team possession, choose nearest active fouled player as taker (tie-break by array order), position ball and controlled player at foul spot. Red card removes player from active list; when the currently controlled home player is sent off, select nearest active home player by distance, fallback to the first remaining array item. If keeper is dismissed, keeper is excluded from contact/goalkeeper candidates and goal remains unguarded. Continue even at one active player.
  3. Error & Exception Handling: clamp foul spot into field. If no active taker exists, retain match and emit event with null taker; never throw. Prevent duplicate foul/card events from one collision by ending that tackle resolution after first adjudication. For skill-caused steal, do not increment foul count.
  4. State Transition & Return: free-kick/penalty phase pauses for one second then returns to `playing` with ball owned by the taker; standard attack A/S/D behavior applies. Emit one foul event and the appropriate card event. Scores and remaining campaign stage do not change.

### I02. Active player UI and symmetric rules tests
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `GameScreen` ??remaining active player counts and latest foul/restart label from state/events; modify
  - `game/src/styles.css` :: `.match-card-status` ??compact HUD display; modify
  - `game/src/game/stepGame.test.js` :: foul/contact/card/taker-switch cases; modify
- **Details**:
  - Display home and away active counts as `?쒕룞 ?좎닔 n紐?; compute from non-dismissed roster each snapshot, do not store independent counters.
  - Test clean front tackle, player-first foul, behind foul, skill-protected steal, identical yellow/red progression for both teams, penalty-box boundary, direct control by nearest free-kick taker, controlled player dismissal auto-switch, keeper dismissal/no keeper catch, and play continuing at one player.

## Acceptance Criteria
- [ ] Clean front ball-first tackle wins possession without foul; rear/player-first tackle produces a foul.
- [ ] Power Tackle and direct skill possession steals do not add foul count.
- [ ] Both teams receive first-yellow and second-red progression.
- [ ] A red player is permanently excluded and team count decreases; team can continue at one active player.
- [ ] Penalty area foul restarts as penalty; other foul restarts as free kick with nearest player under user control.
- [ ] Dismissed goalkeeper does not catch shots and is not replaced.

## Validation
- `cd game; npm test -- --test-name-pattern="tackle|foul|card|dismiss|penalty|free kick|keeper"` ??foul and dismissal cases pass
- `cd game; npm test` ??full test suite passes
- `cd game; npm run build` ??Vite build succeeds

## Commit Message
```text
feat(game): add fouls cards and cumulative dismissals

Plan: 2026-10-21-retro-arcade-gameplay
Phase: P01-arcade-match
Task: T04-fouls-cards-dismissals

- Apply the same tackle and card rules to both teams
- Add free kicks, penalties, and active-roster tracking after red cards
```

## Progress
- [x] Implementation complete
- [x] Validation passed
- commit: 2026-10-21

