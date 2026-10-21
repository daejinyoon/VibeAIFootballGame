import { useMemo, useState } from 'react';
import { assignOpponentSkills, createCampaign, finishStage } from './game/campaign.js';
import { createInitialGameState } from './game/createInitialGameState.js';
import { HOME_PLAYER_IDS, SKILLS, SKILL_IDS, validateLoadout } from './game/skills.js';
import { createCampaignSave, readProfile, setNickname, sortLeaderboard, updateBestRecord, writeProfile } from './storage/localProfile.js';
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
  const [profile, setProfile] = useState(() => readProfile());
  const [profileError, setProfileError] = useState('');
  const [overwriteApproved, setOverwriteApproved] = useState(false);

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
    if (profile.campaignSave && !window.confirm('저장된 캠페인이 새 캠페인으로 바뀝니다. 새 캠페인을 시작할까요?')) return;
    setOverwriteApproved(true);
    setResult(null);
    setLoadout({});
    setScreen('loadout');
  };

  const handleNicknameSave = (nickname) => {
    try {
      const nextProfile = setNickname(profile, nickname);
      setProfile(nextProfile);
      const written = writeProfile(nextProfile);
      setProfile(written);
      setProfileError('');
    } catch (error) {
      setProfileError(error.message || '별명을 저장하지 못했습니다. 다시 시도해 주세요.');
    }
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
    if (overwriteApproved) {
      const nextProfile = { ...profile, campaignSave: null };
      setProfile(nextProfile);
      try {
        writeProfile(nextProfile);
        setProfileError('');
      } catch (error) {
        setProfileError(error.message || '기존 저장 데이터를 지우지 못했습니다.');
      }
    }
    setOverwriteApproved(false);
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
    const bestProfile = updateBestRecord(profile, {
      stageReached: campaign.currentStage,
      goalDifference: nextCampaign.clearedStageResults.reduce((total, item) => total + item.goalDifference, 0),
    });
    const savedProfile = nextCampaign.status === 'complete'
      ? { ...bestProfile, campaignSave: null }
      : bestProfile;
    setProfile(savedProfile);
    try {
      writeProfile(savedProfile);
      setProfileError('');
    } catch (error) {
      setProfileError(error.message || '기록을 저장하지 못했습니다.');
    }
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

  const continueSavedCampaign = () => {
    const saved = profile.campaignSave;
    if (!saved) return;
    const resumed = {
      id: `resume-${Date.now()}`,
      currentStage: saved.currentStage,
      clearedStageResults: saved.clearedStageResults,
      homeLoadout: saved.homeLoadout,
      opponentSkillSets: saved.opponentSkillSets,
      status: 'active',
    };
    setCampaign(resumed);
    setLoadout({ ...saved.homeLoadout });
    startStage(resumed);
  };

  const saveAndExit = () => {
    if (!campaign) return home();
    const nextProfile = { ...profile, campaignSave: createCampaignSave(campaign) };
    try {
      writeProfile(nextProfile);
      setProfile(nextProfile);
      setProfileError('');
      home();
    } catch (error) {
      setProfileError(error.message || '저장하지 못했습니다. 저장 공간을 확인하고 다시 시도해 주세요.');
    }
  };

  const records = sortLeaderboard(profile.bestRecord ? [profile.bestRecord] : []);

  return (
    <main className="page-shell app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); home(); }}>
          <span className="brand-mark" aria-hidden="true">D</span><span>DEX ARCADE</span>
        </a>
        <span className="local-badge"><span /> LOCAL PLAY</span>
      </header>

      {screen === 'start' && <StartScreen hasSave={Boolean(profile.campaignSave)} nickname={profile.nickname} profileError={profileError} onNicknameSave={handleNicknameSave} onStart={startNewCampaign} onContinue={continueSavedCampaign} onOpenLeaderboard={() => setScreen('leaderboard')} />}
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
        errorMessage={profileError}
        onPause={() => setScreen('pause')}
        onResume={() => setScreen('match')}
        onSaveAndExit={saveAndExit}
        onGameEvents={handleGameEvents}
      />}
      {screen === 'results' && result && <ResultsScreen
        result={result}
        leaderboardPlace={records.length ? 1 : null}
        errorMessage={profileError}
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
