import { useRef, useState } from 'react';
import PitchCanvas from './PitchCanvas.jsx';
import PauseMenu from './PauseMenu.jsx';
import { SKILLS } from '../game/skills.js';

export default function GameScreen({ gameState, paused, errorMessage, onPause, onResume, onSaveAndExit, onGameEvents }) {
  const [viewState, setViewState] = useState(gameState);
  const lastUpdate = useRef(0);
  const stage = gameState.stage;
  const timeLabel = viewState.phase === 'overtime' ? 'GOLDEN GOAL' : String(Math.ceil(viewState.remainingSeconds));
  const possession = viewState.possessionTeam === 'home' ? '우리 팀 공격' : viewState.possessionTeam === 'away' ? '상대 공격' : '공 경합 중';
  const chargePercent = Math.min(100, Math.max(0, Math.round((viewState.charge?.elapsedSeconds ?? 0) * 100)));
  const activeHome = viewState.players.filter((player) => player.team === 'home' && !player.dismissed).length;
  const activeAway = viewState.players.filter((player) => player.team === 'away' && !player.dismissed).length;
  const foulLabel = viewState.lastFoul?.restart === 'penaltyKick' ? 'PENALTY KICK' : 'FREE KICK';
  const chargeLabels = { lobPass: 'A 로빙 패스', groundPass: 'S 땅볼 패스', shot: 'D 슛' };
  const controlledPlayer = viewState.players.find((player) => player.id === viewState.controlledPlayerId);
  const awaySkillUses = viewState.players
    .filter((player) => player.team === 'away' && player.skillId && player.skillUsesRemaining > 0)
    .reduce((total, player) => total + player.skillUsesRemaining, 0);

  return (
    <section className="game-panel" aria-label="축구 경기">
      <div className="game-topline"><div><p className="eyebrow">STAGE 0{stage}{stage === 5 ? ' · BOSS MATCH' : ''}</p><h1>경기 진행 중</h1></div><button className="secondary-button pause-button" onClick={onPause}>Ⅱ 일시정지</button></div>
      <div className="match-card-status" aria-live="polite">
        <span>ACTIVE PLAYERS <b>{activeHome}</b> : <b>{activeAway}</b> · {possession}</span>
        {viewState.foulNoticeSeconds > 0 && viewState.lastFoul && <strong>{foulLabel} · {viewState.lastFoul.team.toUpperCase()} FOUL</strong>}
      </div>
      <div className="game-canvas-wrap"><PitchCanvas initialState={gameState} score={viewState.score} timeLabel={timeLabel} paused={paused} onGameEvents={onGameEvents} onStateChange={(next) => {
        const now = performance.now();
        if (now - lastUpdate.current > 100) {
          lastUpdate.current = now;
          setViewState(next);
        }
      }} /></div>
      <div className="game-bottomline">
        {viewState.charge?.action && <div className="charge-gauge" role="progressbar" aria-label={`${chargeLabels[viewState.charge.action]} 힘`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={chargePercent}>
          <div className="charge-gauge-label"><span>{chargeLabels[viewState.charge.action]}</span><b>{chargePercent}%</b></div>
          <div className="charge-gauge-track"><i style={{ width: `${chargePercent}%` }} /></div>
        </div>}
        <div className="skill-stock"><span>조작 선수 스킬</span><b>{controlledPlayer?.skillId ? SKILLS[controlledPlayer.skillId]?.name : '장착된 스킬 없음'}</b><small>{controlledPlayer?.skillId === 'rainbowReflect' ? '자동 발동' : `F · 남은 사용 ${controlledPlayer?.skillUsesRemaining ?? 0}회`}</small></div>
        <div className="skill-stock away-skill-stock"><span>상대 팀 스킬</span><b>남은 사용 횟수</b><small>{awaySkillUses}회</small></div>
        <p>방향키 이동 · A/S/D 공격·수비 · F 스킬</p>
      </div>
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      {paused && <PauseMenu onResume={onResume} onSaveAndExit={onSaveAndExit} errorMessage={errorMessage} />}
    </section>
  );
}
