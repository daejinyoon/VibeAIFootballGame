import { useEffect, useRef, useState } from 'react';
import Match3DGame from './Match3DGame.jsx';
import PauseMenu from './PauseMenu.jsx';
import { SKILLS } from '../game/skills.js';
import { getAwayHudAccent } from '../game/teamBranding.js';
import { BrandLogo } from './BrandLogo.jsx';
import { MatchMiniMap } from './MatchMiniMap.jsx';
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
  const [scoreToast, setScoreToast] = useState(null);
  const cutInRef = useRef(null);
  const cutInTimerRef = useRef(null);
  const scoreTimerRef = useRef(null);
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
  const nextTeamSkill = (team) => {
    const deck = viewState.teamSkillDecks?.[team] ?? [];
    if (!deck.length) return null;
    const start = (viewState.skillQueueIndex?.[team] ?? 0) % deck.length;
    for (let offset = 0; offset < deck.length; offset += 1) {
      const entry = deck[(start + offset) % deck.length];
      if (entry.skillId !== 'rainbowReflect') return entry;
    }
    return null;
  };
  const homeNextSkill = nextTeamSkill('home');
  const homeCooldown = Math.max(0, viewState.skillCooldownRemaining?.home ?? 0);
  const awayCooldown = Math.max(0, viewState.skillCooldownRemaining?.away ?? 0);
  const homeDeck = viewState.teamSkillDecks?.home ?? [];
  const homeQueueIndex = homeNextSkill ? homeDeck.findIndex((entry) => entry.skillId === homeNextSkill.skillId) : -1;
  const homeBranding = viewState.teamBranding?.home ?? {};
  const awayBranding = viewState.teamBranding?.away ?? {};
  const homeName = homeBranding.displayName || 'DEX';
  const awayName = awayBranding.displayName || 'SAMSUNG';
  const homeAccent = homeBranding.kit?.jersey || '#00A6C8';
  const awayAccent = getAwayHudAccent(homeAccent);
  const stamina = Math.max(0, Math.min(100, Number.isFinite(controlledPlayer?.sprintStamina)
    ? controlledPlayer.sprintStamina
    : 0));
  const cutInPlayer = cutInCue
    ? viewState.players.find((player) => player.id === cutInCue.playerId)
    : null;

  useEffect(() => () => {
    if (cutInTimerRef.current !== null) window.clearTimeout(cutInTimerRef.current);
    if (scoreTimerRef.current !== null) window.clearTimeout(scoreTimerRef.current);
  }, []);

  const handleGameEvents = (events) => {
    for (const event of events) {
      if (event.type === 'goal') {
        const scoringTeamName = event.team === 'home' ? homeName : awayName;
        setScoreToast({ id: `${event.team}-${performance.now()}`, label: `${scoringTeamName} +${event.points}` });
        if (scoreTimerRef.current !== null) window.clearTimeout(scoreTimerRef.current);
        scoreTimerRef.current = window.setTimeout(() => setScoreToast(null), 2100);
      }
      if (event.type !== 'skillUsed' || event.automatic || !event.playerId || cutInRef.current) continue;
      const cue = {
        id: `${event.playerId}-${event.skillId}-${performance.now()}`,
        playerId: event.playerId,
        team: event.team,
        skillId: event.skillId,
        durationSeconds: event.skillId === 'eulryongta' ? 1.2 : 0.72,
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
        <div className="match-score-hud" style={{ '--home-team-accent': homeAccent, '--away-team-accent': awayAccent }} role="group" aria-label={`${homeName} ${homeScore}, ${awayName} ${awayScore}, 남은 시간 ${timeLabel}`}>
          <div className="score-team score-team-home"><span className="score-team-mark"><BrandLogo logoId={homeBranding.logoId ?? 'dex'} title="decorative" /></span><span className="score-team-name">{homeName}</span><b>{homeScore}</b></div>
          <div className="score-clock"><small>{isOvertime ? 'GOLDEN GOAL' : 'MATCH TIME'}</small><strong>{timeLabel}</strong></div>
          <div className="score-team score-team-away"><b>{awayScore}</b><span className="score-team-name">{awayName}</span><span className="score-team-mark"><BrandLogo logoId={awayBranding.logoId ?? 'samsung'} title="decorative" /></span></div>
        </div>
        <Match3DGame initialState={gameState} paused={paused} onGameEvents={handleGameEvents} onStateChange={(next) => {
        const now = performance.now();
        if (now - lastUpdate.current > 100) {
          lastUpdate.current = now;
          setViewState(next);
        }
        }} />
        <MatchMiniMap players={viewState.players} ball={viewState.ball} controlledPlayerId={viewState.controlledPlayerId} homeAccent={homeAccent} awayAccent={awayBranding.kit?.jersey || '#E94B55'} />
        {scoreToast && <div key={scoreToast.id} className="goal-score-toast" aria-live="polite">{scoreToast.label}</div>}
        <SkillCutInOverlay cue={cutInCue} player={cutInPlayer} teamBranding={viewState.teamBranding} />
      </div>
      <div className="game-bottomline">
        <div className="sprint-meter" aria-label={`스프린트 스태미나 ${Math.round(stamina)}%`}>
          <div className="sprint-meter-label"><span>SPRINT STAMINA</span><b>{Math.round(stamina)}%</b></div>
          <progress max="100" value={stamina} aria-label="조작 선수 스프린트 스태미나" />
        </div>
        <div className="skill-stock team-skill-deck">
          <span>우리 팀 필살기 순서</span>
          <div className="team-skill-list">
            {homeDeck.map((entry, index) => (
              <span key={`${entry.skillId}-${index}`} className={index === homeQueueIndex && entry.skillId !== 'rainbowReflect' ? 'team-skill-item is-next' : 'team-skill-item'}>
                {index + 1}. {SKILLS[entry.skillId]?.name ?? entry.skillId}{entry.skillId === 'rainbowReflect' ? ' · 패시브' : ` · Lv.${entry.level}`}
              </span>
            ))}
            {!homeDeck.length && <span className="team-skill-item">아직 보유한 필살기가 없습니다</span>}
          </div>
          <small>{homeNextSkill ? `다음 사용: ${SKILLS[homeNextSkill.skillId]?.name} · F` : 'F · 팀 공용 필살기'}</small>
          <div className="cooldown-track" role="progressbar" aria-label="우리 팀 필살기 재사용 대기시간" aria-valuemin="0" aria-valuemax="10" aria-valuenow={Math.max(0, 10 - homeCooldown)}>
            <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, (10 - homeCooldown) / 10))})` }} />
          </div>
          <b>{homeCooldown > 0 ? `팀 재사용 대기 ${homeCooldown.toFixed(1)}초` : '팀 필살기 사용 가능'}</b>
        </div>
        <div className="skill-stock away-skill-stock">
          <span>상대 팀 필살기</span>
          <b>{awayCooldown > 0 ? '팀 재사용 대기 중' : '발동 준비'}</b>
          <small>{awayCooldown > 0 ? `${awayCooldown.toFixed(1)}초 후 다시 사용 가능` : '상대 팀 쿨타임'}</small>
          <div className="cooldown-track" role="progressbar" aria-label="상대 팀 필살기 재사용 대기시간" aria-valuemin="0" aria-valuemax="10" aria-valuenow={Math.max(0, 10 - awayCooldown)}>
            <span style={{ transform: `scaleX(${Math.max(0, Math.min(1, (10 - awayCooldown) / 10))})` }} />
          </div>
        </div>
        <p>{restartControls}</p>
      </div>
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      {paused && <PauseMenu onResume={onResume} onSaveAndExit={onSaveAndExit} errorMessage={errorMessage} />}
    </section>
  );
}
