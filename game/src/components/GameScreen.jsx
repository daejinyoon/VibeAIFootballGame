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
  const cutInQueueRef = useRef([]);
  const cutInTimerRef = useRef(null);
  const cutInSequenceRef = useRef(0);
  const scoreTimerRef = useRef(null);
  const lastUpdate = useRef(0);
  const stage = gameState.stage;
  const isOvertime = viewState.phase === 'overtime';
  const isGoalKick = viewState.phase === 'goalKick' || viewState.restart?.type === 'goalKick';
  const goalKickTeam = viewState.restart?.type === 'goalKick'
    ? viewState.restart.team
    : viewState.possessionTeam;
  const timeLabel = formatMatchTime(isOvertime ? viewState.overtimeRemainingSeconds : viewState.remainingSeconds);
  const homeScore = Number.isFinite(viewState.score?.home) ? viewState.score.home : 0;
  const awayScore = Number.isFinite(viewState.score?.away) ? viewState.score.away : 0;
  const possession = viewState.possessionTeam === 'home' ? '우리 팀 공격' : viewState.possessionTeam === 'away' ? '상대 공격' : '공 경합 중';
  const restartControls = isGoalKick
    ? goalKickTeam === 'home'
      ? viewState.restart?.team === 'home'
        ? '방향키로 방향 선택 · A 장거리 킥 · S 짧은 패스 (준비 중 미리 입력 가능)'
        : '우리 팀 골킥 진행 중'
      : '상대 팀 골킥 진행 중'
    : viewState.restart?.team !== 'home'
      ? viewState.restart ? '상대 팀 재개 중' : '방향키 이동 · E 스프린트 · 공중볼 자동 헤딩·걷어내기 · A 로빙 패스 · S 땅볼 패스(수비 시 선수 전환) · D 슛 · F 스킬'
      : viewState.restart.type === 'throwIn' ? '방향키로 방향 선택 · S 스로인 (준비 중 미리 입력 가능)'
        : viewState.restart.type === 'cornerKick' ? '방향키로 방향 선택 · A 크로스 · S 짧은 패스 (준비 중 미리 입력 가능)'
          : '방향키로 방향 선택 · A 장거리 킥 · S 짧은 패스 (준비 중 미리 입력 가능)';
  const activeHome = viewState.players.filter((player) => player.team === 'home' && !player.dismissed).length;
  const activeAway = viewState.players.filter((player) => player.team === 'away' && !player.dismissed).length;
  const controlledPlayer = viewState.players.find((player) => player.id === viewState.controlledPlayerId);
  const cooldownFor = (team, skillId) => Math.max(0, viewState.skillCooldownRemaining?.[team]?.[skillId] ?? 0);
  const teamGlobalCooldownFor = (team) => {
    const remaining = viewState.teamSkillGlobalCooldownRemaining?.[team];
    return Number.isFinite(remaining) ? Math.max(0, remaining) : 0;
  };
  const homeTeamGlobalCooldown = teamGlobalCooldownFor('home');
  const awayTeamGlobalCooldown = teamGlobalCooldownFor('away');
  const nextTeamSkill = (team) => {
    const deck = viewState.teamSkillDecks?.[team] ?? [];
    if (!deck.length) return null;
    const start = (viewState.skillQueueIndex?.[team] ?? 0) % deck.length;
    for (let offset = 0; offset < deck.length; offset += 1) {
      const entry = deck[(start + offset) % deck.length];
      if (cooldownFor(team, entry.skillId) > 0) continue;
      return entry;
    }
    return null;
  };
  const homeNextSkill = nextTeamSkill('home');
  const awayNextSkill = nextTeamSkill('away');
  const homeDeck = viewState.teamSkillDecks?.home ?? [];
  const awayDeck = viewState.teamSkillDecks?.away ?? [];
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

  useEffect(() => {
    cutInQueueRef.current = [];
    cutInRef.current = null;
    setCutInCue(null);
    if (cutInTimerRef.current !== null) window.clearTimeout(cutInTimerRef.current);
    cutInTimerRef.current = null;

    return () => {
      cutInQueueRef.current = [];
      cutInRef.current = null;
      if (cutInTimerRef.current !== null) window.clearTimeout(cutInTimerRef.current);
      cutInTimerRef.current = null;
      if (scoreTimerRef.current !== null) window.clearTimeout(scoreTimerRef.current);
    };
  }, [gameState]);

  const showNextCutIn = () => {
    if (cutInRef.current || cutInQueueRef.current.length === 0) return;
    const cue = cutInQueueRef.current.shift();
    cutInRef.current = cue;
    setCutInCue(cue);
    cutInTimerRef.current = window.setTimeout(() => {
      if (cutInRef.current?.id !== cue.id) return;
      cutInRef.current = null;
      cutInTimerRef.current = null;
      setCutInCue(null);
      showNextCutIn();
    }, cue.durationSeconds * 1000);
  };

  const handleGameEvents = (events) => {
    for (const event of events) {
      if (event.type === 'goal') {
        const scoringTeamName = event.team === 'home' ? homeName : awayName;
        setScoreToast({ id: `${event.team}-${performance.now()}`, label: `${scoringTeamName} +${event.points}` });
        if (scoreTimerRef.current !== null) window.clearTimeout(scoreTimerRef.current);
        scoreTimerRef.current = window.setTimeout(() => setScoreToast(null), 2100);
      }
      if (event.type !== 'skillUsed' || !event.playerId || !SKILLS[event.skillId]) continue;
      cutInSequenceRef.current += 1;
      const cue = {
        id: `${event.playerId}-${event.skillId}-${cutInSequenceRef.current}`,
        playerId: event.playerId,
        team: event.team,
        skillId: event.skillId,
        durationSeconds: ['eulryongta', 'tornadoShot'].includes(event.skillId) ? 1.35 : 0.9,
      };
      cutInQueueRef.current.push(cue);
    }
    showNextCutIn();
    onGameEvents?.(events);
  };

  return (
    <section className="game-panel" aria-label="축구 경기">
      <div className="game-topline"><div><p className="eyebrow">STAGE 0{stage}{stage === 5 ? ' · BOSS MATCH' : ''}</p><h1>경기 진행 중</h1></div><button className="secondary-button pause-button" onClick={onPause}>Ⅱ 일시정지</button></div>
      <div className="match-card-status" aria-live="polite">
        <span>ACTIVE PLAYERS <b>{activeHome}</b> : <b>{activeAway}</b> · {possession}</span>
        {isGoalKick && <strong className="goal-kick-status">GOAL KICK · {goalKickTeam === 'home' ? '우리 팀' : '상대 팀'}</strong>}
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
          {homeTeamGlobalCooldown > 0 && <small>우리 팀 공통 대기 {homeTeamGlobalCooldown.toFixed(1)}초</small>}
          <div className="team-skill-list">
            {homeDeck.map((entry, index) => (
              <span key={`${entry.skillId}-${index}`} className={`team-skill-item${entry.skillId === homeNextSkill?.skillId ? ' is-next' : ''}`}>
                {index + 1}. {SKILLS[entry.skillId]?.name ?? entry.skillId} · Lv.{entry.level}
                <small>{cooldownFor('home', entry.skillId) > 0 ? `대기 ${cooldownFor('home', entry.skillId).toFixed(1)}초` : '준비 완료'}</small>
              </span>
            ))}
            {!homeDeck.length && <span className="team-skill-item">아직 보유한 필살기가 없습니다</span>}
          </div>
          <small>{homeNextSkill ? `다음 사용: ${SKILLS[homeNextSkill.skillId]?.name} · F` : 'F · 장착한 스킬 순서대로 사용'}</small>
        </div>
        <div className="skill-stock away-skill-stock">
          <span>상대 필살기</span>
          {awayTeamGlobalCooldown > 0 && <small>상대 팀 공통 대기 {awayTeamGlobalCooldown.toFixed(1)}초</small>}
          <small>{awayNextSkill ? `다음 사용: ${SKILLS[awayNextSkill.skillId]?.name}` : '모든 스킬이 준비 중'}</small>
          <div className="team-skill-list away-team-skill-list">
            {awayDeck.map((entry, index) => (
              <span key={`${entry.skillId}-${index}`} className="team-skill-item">
                {index + 1}. {SKILLS[entry.skillId]?.name ?? entry.skillId} · Lv.{entry.level}
                <small>{cooldownFor('away', entry.skillId) > 0 ? `대기 ${cooldownFor('away', entry.skillId).toFixed(1)}초` : '준비 완료'}</small>
              </span>
            ))}
            {!awayDeck.length && <span className="team-skill-item">보유 스킬 없음</span>}
          </div>
        </div>
        <p>{restartControls}</p>
      </div>
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      {paused && <PauseMenu onResume={onResume} onSaveAndExit={onSaveAndExit} errorMessage={errorMessage} />}
    </section>
  );
}
