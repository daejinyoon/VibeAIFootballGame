import { useMemo, useState } from 'react';
import { assignOpponentSkills, createCampaign, finishStage } from './game/campaign.js';
import { createInitialGameState } from './game/createInitialGameState.js';
import { HOME_PLAYER_IDS, SKILLS, SKILL_IDS, validateLoadout } from './game/skills.js';
import GameScreen from './components/GameScreen.jsx';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import LoadoutScreen from './components/LoadoutScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import StartScreen from './components/StartScreen.jsx';

function makeMatchState(campaign) {
  const assigned = assignOpponentSkills(
    createInitialGameState().players,
    campaign.opponentSkillSets[campaign.currentStage],
  );
  return createInitialGameState({
    stage: campaign.currentStage,
    loadout: campaign.homeLoadout,
    opponentSkillIds: assigned.filter((player) => player.team === 'away').map((player) => player.skillId).filter(Boolean),
  });
}

export default function App() {
  const [screen, setScreen] = useState('start');
  const [loadout, setLoadout] = useState({});
  const [campaign, setCampaign] = useState(null);
  const [matchState, setMatchState] = useState(null);
  const [result, setResult] = useState(null);
  const [records] = useState([]);

  const playerRows = useMemo(() => {
    const state = createInitialGameState();
    const labels = { goalkeeper: '골키퍼', defender: '수비수', midfielder: '미드필더', forward: '공격수' };
    return state.players.filter((player) => player.team === 'home').map((player) => ({
      playerId: player.id,
      role: labels[player.role],
      displayName: player.id === 'home-gk' ? '수문장' : `${labels[player.role]} ${player.id.slice(-1)}`,
      skillId: loadout[player.id] ?? '',
    }));
  }, [loadout]);

  const startNewCampaign = () => {
    setResult(null);
    setLoadout({});
    setScreen('loadout');
  };

  const beginCampaign = () => {
    const validation = validateLoadout(loadout, HOME_PLAYER_IDS);
    if (!validation.valid) return;
    if (campaign && result?.outcome === 'win') {
      const nextCampaign = { ...campaign, homeLoadout: { ...loadout } };
      setCampaign(nextCampaign);
      setResult(null);
      startStage(nextCampaign);
      return;
    }
    const nextCampaign = createCampaign({ homeLoadout: loadout });
    setCampaign(nextCampaign);
    setMatchState(makeMatchState(nextCampaign));
    setScreen('match');
  };

  const startStage = (activeCampaign = campaign) => {
    setMatchState(makeMatchState(activeCampaign));
    setScreen('match');
  };

  const handleGameEvents = (events) => {
    const endEvent = events.find((event) => event.type === 'matchWon' || event.type === 'matchLost');
    if (!endEvent || !campaign) return;

    const nextCampaign = finishStage(campaign, endEvent.score);
    setCampaign(nextCampaign);
    const outcome = endEvent.type === 'matchLost'
      ? 'loss'
      : nextCampaign.status === 'complete' ? 'campaignComplete' : 'win';
    setResult({
      stage: campaign.currentStage,
      homeGoals: endEvent.score.home,
      awayGoals: endEvent.score.away,
      outcome,
      stageReached: nextCampaign.currentStage,
      goalDifference: nextCampaign.clearedStageResults.reduce((total, item) => total + item.goalDifference, 0),
    });
    setScreen('results');
  };

  const assignSkill = (playerId, skillId) => {
    setLoadout((current) => ({ ...current, [playerId]: skillId }));
  };

  const home = () => {
    setScreen('start');
    setCampaign(null);
    setMatchState(null);
  };

  return (
    <main className="page-shell app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); home(); }}>
          <span className="brand-mark" aria-hidden="true">D</span><span>DEX ARCADE</span>
        </a>
        <span className="local-badge"><span /> LOCAL PLAY</span>
      </header>

      {screen === 'start' && <StartScreen hasSave={false} nickname="플레이어" onStart={startNewCampaign} onOpenLeaderboard={() => setScreen('leaderboard')} />}
      {screen === 'loadout' && <LoadoutScreen
        playerRows={playerRows}
        loadout={loadout}
        skillIds={SKILL_IDS}
        skills={SKILLS}
        onAssign={assignSkill}
        onConfirm={beginCampaign}
        onBack={() => setScreen('start')}
      />}
      {(screen === 'match' || screen === 'pause') && matchState && <GameScreen
        key={campaign?.currentStage ?? 1}
        gameState={matchState}
        paused={screen === 'pause'}
        onPause={() => setScreen('pause')}
        onResume={() => setScreen('match')}
        onSaveAndExit={home}
        onGameEvents={handleGameEvents}
      />}
      {screen === 'results' && result && <ResultsScreen
        result={result}
        leaderboardPlace={null}
        onRetry={() => startStage(campaign)}
        onContinue={() => {
          if (result.outcome === 'win') setScreen('loadout');
          else startNewCampaign();
        }}
        onHome={home}
      />}
      {screen === 'leaderboard' && <LeaderboardScreen records={records} onBack={() => setScreen('start')} />}

      <footer className="footer"><span>DEX FOOTBALL PROJECT</span><span>ARROWS · A/S/D · F SKILL</span></footer>
    </main>
  );
}
