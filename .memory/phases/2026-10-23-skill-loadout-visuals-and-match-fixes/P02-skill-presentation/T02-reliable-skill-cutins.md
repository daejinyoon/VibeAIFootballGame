# Task: T02 Reliable Skill Cut-ins

## Status: done

## Goal
Display one cut-in for every skill activation by either team, including activations in rounds after the first, even when two skill events arrive before the previous cut-in has finished.

## Decision Summary
- Cut-ins are required for both teams on every activation and every round. An active cue may delay a later cue, but it must never discard it.

## Implementation

### I01. Event queue and match lifecycle
- Related Files:
  - `game/src/components/GameScreen.jsx` :: `handleGameEvents`, `cutInRef`, `cutInTimerRef`, match lifecycle effects — queue skill cues and drain them sequentially; modify.
  - `game/src/components/SkillCutInOverlay.jsx` :: `SkillCutInOverlay` — keep rendering any current cue and both-team branding; modify only if required for cue identity/transition.
  - `game/src/styles.css` :: `.skill-cut-in-*` animation — preserve readable entry/exit and timing for queued cues; modify only if queue transition needs it.
- **Data & Types**:
  ```ts
  type SkillCutInCue = {
    id: string;
    playerId: string;
    team: 'home' | 'away';
    skillId: SkillId;
    durationSeconds: number;
  };
  ```
  - Keep 1.35 seconds for Eulryongta, Tornado Shot, and World Split, and 0.9 seconds for other skills unless the current confirmed set-piece cue duration is longer.
- **Execution Flow / Logic**:
  1. For every `skillUsed` event with a valid `playerId`, append one cue to a FIFO queue. Keep purely passive/reflection notifications outside this path; active Rainbow emits `skillUsed` and must receive a cut-in.
  2. If no cue is active, display the queue head and start its timer. When it expires, dequeue it and immediately display the next queued cue.
  3. Keep source player/team/skill ID on the cue so the overlay uses the correct team logo, uniform, player, and skill art for either side.
  4. Tie queue and timer cleanup to the game-screen instance. On a new match `gameState` or unmount, clear pending timer and queued/active cues so a previous round cannot block the next one.
  5. Keep simulation event forwarding to `onGameEvents` independent from overlay rendering; cut-in display must not suppress goals, audio, or campaign result events.

## Acceptance Criteria
- [x] Every home and away `skillUsed` event with a valid actor and skill produces exactly one visible cut-in.
- [x] A second event during an active cue is queued and shown afterward instead of discarded.
- [x] A new game state or unmount clears old timers/queues so the next match can show its first cut-in.
- [x] Timer callbacks verify cue identity before clearing, preventing stale timers from removing newer cues.

## Validation
- `npm run build` — GameScreen and overlay compile.
- `npm test -- src/game/stepGame.test.js` — skill events continue to be emitted once and presentation changes do not alter event delivery.

## Commit Message
```text
fix(ui): queue every team skill cut-in across rounds

Plan: 2026-10-23-skill-loadout-visuals-and-match-fixes
Phase: P02-skill-presentation
Task: T02-reliable-skill-cutins

- Queue home and away cut-ins instead of dropping overlapping activations
- Reset cut-in timers and queue at match boundaries
```

## Progress
- [ ] 구현 완료
- [ ] 검증 통과
- Validation: `npm run build` passed.
- commit: pending
