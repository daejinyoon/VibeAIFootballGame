import { useEffect, useRef, useState } from 'react';
import Match3DGame from './Match3DGame.jsx';
import PauseMenu from './PauseMenu.jsx';
import { SKILLS } from '../game/skills.js';
import { SkillCutInOverlay } from './SkillCutInOverlay.jsx';

export function formatMatchTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';
  const totalSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export default function GameScreen({ gameState, paused, errorMessage, onPause, onResume, onSaveAndExit, onGameEvents }) {
  const [viewState, setViewState] = useState(gameState);
  const [cutInCue, setCutInCue] = useState(null);
  const cutInRef = useRef(null);
  const cutInTimerRef = useRef(null);
  const lastUpdate = useRef(0);
  const stage = gameState.stage;
  const isOvertime = viewState.phase === 'overtime';
  const timeLabel = formatMatchTime(isOvertime ? viewState.overtimeRemainingSeconds : viewState.remainingSeconds);
  const homeScore = Number.isFinite(viewState.score?.home) ? viewState.score.home : 0;
  const awayScore = Number.isFinite(viewState.score?.away) ? viewState.score.away : 0;
  const possession = viewState.possessionTeam === 'home' ? '우리 팀 공격' : viewState.possessionTeam === 'away' ? '상대 공격' : '공 경합 중';
  const restartControls = viewState.restart?.team !== 'home'
    ? viewState.restart ? '상대 팀 재개 중' : '방향키 이동 · E 스프린트 · 공중볼 자동 헤딩·걷어내기 · A 로빙 패스 · S 땅볼 패스(수비 시 선수 전환) · D 슛 · F 스킬'
    : viewState.restart.type === 'throwIn' ? '방향키로 방향 선택 · S 스로인'
      : viewState.restart.type === 'cornerKick' ? '방향키로 방향 선택 · A 크로스 · S 짧은 패스'
        : '방향키로 방향 선택 · A 장거리 킥 · S 짧은 패스';
  const activeHome = viewState.players.filter((player) => player.team === 'home' && !player.dismissed).length;
  const activeAway = viewState.players.filter((player) => player.team === 'away' && !player.dismissed).length;
  const controlledPlayer = viewState.players.find((player) => player.id === viewState.controlledPlayerId);
  const awaySkillUses = viewState.players
    .filter((player) => player.team === 'away' && player.skillId && player.skillUsesRemaining > 0)
    .reduce((total, player) => total + player.skillUsesRemaining, 0);
  const cutInPlayer = cutInCue
    ? viewState.players.find((player) => player.id === cutInCue.playerId)
    : null;

  useEffect(() => () => {
    if (cutInTimerRef.current !== null) window.clearTimeout(cutInTimerRef.current);
  }, []);

  const handleGameEvents = (events) => {
    for (const event of events) {
      if (event.type !== 'skillUsed' || event.automatic || !event.playerId || cutInRef.current) continue;
      const cue = {
        id: `${event.playerId}-${event.skillId}-${performance.now()}`,
        playerId: event.playerId,
        team: event.team,
        skillId: event.skillId,
        durationSeconds: 0.72,
      };
      cutInRef.current = cue;
      setCutInCue(cue);
      cutInTimerRef.current = window.setTimeout(() => {
        if (cutInRef.current === cue) {
          cutInRef.current = null;
          setCutInCue(null);
        }
        cutInTimerRef.current = null;
      }, cue.durationSeconds * 1000);
      break;
    }
    onGameEvents?.(events);
  };

  return (
    <section className="game-panel" aria-label="축구 경기">
      <div className="game-topline"><div><p className="eyebrow">STAGE 0{stage}{stage === 5 ? ' · BOSS MATCH' : ''}</p><h1>경기 진행 중</h1></div><button className="secondary-button pause-button" onClick={onPause}>Ⅱ 일시정지</button></div>
      <div className="match-card-status" aria-live="polite">
        <span>ACTIVE PLAYERS <b>{activeHome}</b> : <b>{activeAway}</b> · {possession}</span>
      </div>
      <div className="game-canvas-wrap">
        <div className="match-score-hud" role="group" aria-label={`DEX ${homeScore}, 상대 ${awayScore}, 남은 시간 ${timeLabel}`}>
          <div className="score-team score-team-home"><span className="score-team-mark">DEX</span><span className="score-team-name">DEX FC</span><b>{homeScore}</b></div>
          <div className="score-clock"><small>{isOvertime ? 'GOLDEN GOAL' : 'MATCH TIME'}</small><strong>{timeLabel}</strong></div>
          <div className="score-team score-team-away"><b>{awayScore}</b><span className="score-team-name">AI RIVALS</span><span className="score-team-mark">AI</span></div>
        </div>
        <Match3DGame initialState={gameState} paused={paused} onGameEvents={handleGameEvents} onStateChange={(next) => {
        const now = performance.now();
        if (now - lastUpdate.current > 100) {
          lastUpdate.current = now;
          setViewState(next);
        }
        }} />
        <SkillCutInOverlay cue={cutInCue} player={cutInPlayer} teamBranding={viewState.teamBranding} />
      </div>
      <div className="game-bottomline">
        <div className="skill-stock"><span>조작 선수 스킬</span><b>{controlledPlayer?.skillId ? SKILLS[controlledPlayer.skillId]?.name : '장착된 스킬 없음'}</b><small>{controlledPlayer?.skillId === 'rainbowReflect' ? '자동 발동' : `F · 남은 사용 ${controlledPlayer?.skillUsesRemaining ?? 0}회`}</small></div>
        <div className="skill-stock away-skill-stock"><span>상대 팀 스킬</span><b>남은 사용 횟수</b><small>{awaySkillUses}회</small></div>
        <p>{restartControls}</p>
      </div>
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      {paused && <PauseMenu onResume={onResume} onSaveAndExit={onSaveAndExit} errorMessage={errorMessage} />}
    </section>
  );
}
