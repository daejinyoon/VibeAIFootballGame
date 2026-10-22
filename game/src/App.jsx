import { lazy, Suspense, useMemo, useState } from 'react';
import { assignOpponentSkills, createCampaign, finishStage } from './game/campaign.js';
import { createInitialGameState } from './game/createInitialGameState.js';
import { FIELD_PLAYER_IDS, SKILLS, assignSkillCard, awardSkillCard } from './game/skills.js';
import { createCampaignSave, readProfile, setNickname, sortLeaderboard, updateBestRecord, writeProfile } from './storage/localProfile.js';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import LoadoutScreen from './components/LoadoutScreen.jsx';
import SkillRewardScreen from './components/SkillRewardScreen.jsx';
import StartScreen from './components/StartScreen.jsx';

const GameScreen = lazy(() => import('./components/GameScreen.jsx'));

function makeMatchState(campaign) {
  const assigned = assignOpponentSkills(
    createInitialGameState().players,
    campaign.opponentSkillSets[campaign.currentStage] ?? [],
  );
  const opponentSkillStacks = Object.fromEntries(assigned
    .filter((player) => player.team === 'away' && player.skillId)
    .map((player) => [player.id, { skillId: player.skillId, copies: player.skillCopies }]));
  return createInitialGameState({
    stage: campaign.currentStage,
    playerSkillStacks: campaign.playerSkillStacks,
    opponentSkillStacks,
  });
}

export default function App() {
  const [screen, setScreen] = useState('start');
  const [campaign, setCampaign] = useState(null);
  const [matchState, setMatchState] = useState(null);
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(() => readProfile());
  const [profileError, setProfileError] = useState('');
  const [pendingAssignmentSkill, setPendingAssignmentSkill] = useState(null);

  const playerRows = useMemo(() => {
    const labels = { 'home-def-1': '수비수', 'home-mid-1': '미드필더', 'home-fw': '공격수' };
    return FIELD_PLAYER_IDS.map((playerId) => ({
      playerId,
      displayName: labels[playerId],
      stack: campaign?.playerSkillStacks?.[playerId] ?? null,
    }));
  }, [campaign]);

  const startStage = (activeCampaign = campaign) => {
    if (!activeCampaign) return;
    setMatchState(makeMatchState(activeCampaign));
    setScreen('match');
  };

  const persistCampaign = (activeCampaign) => {
    const nextProfile = { ...profile, campaignSave: createCampaignSave(activeCampaign) };
    try {
      const written = writeProfile(nextProfile);
      setProfile(written);
      setProfileError('');
    } catch (error) {
      setProfileError(error.message || '캠페인 저장에 실패했습니다.');
    }
  };

  const startNewCampaign = () => {
    if (profile.campaignSave && !window.confirm('저장된 캠페인을 지우고 새 캠페인을 시작할까요?')) return;
    const nextCampaign = createCampaign();
    setCampaign(nextCampaign);
    setResult(null);
    setPendingAssignmentSkill(null);
    startStage(nextCampaign);
    if (profile.campaignSave) {
      const nextProfile = { ...profile, campaignSave: null };
      setProfile(nextProfile);
      try {
        writeProfile(nextProfile);
        setProfileError('');
      } catch (error) {
        setProfileError(error.message || '저장된 캠페인을 지우지 못했습니다.');
      }
    }
  };

  const handleNicknameSave = (nickname) => {
    try {
      const nextProfile = setNickname(profile, nickname);
      setProfile(writeProfile(nextProfile));
      setProfileError('');
    } catch (error) {
      setProfileError(error.message || '별명을 저장하지 못했습니다.');
    }
  };

  const handleGameEvents = (events) => {
    const endEvent = events.find((event) => ['matchWon', 'matchLost', 'matchDraw'].includes(event.type));
    if (!endEvent || !campaign) return;

    const nextCampaign = finishStage(campaign, endEvent.score);
    setCampaign(nextCampaign);
    setPendingAssignmentSkill(null);
    const outcome = endEvent.type === 'matchDraw' ? 'draw' : endEvent.type === 'matchLost' ? 'loss' : 'win';
    const goalDifference = nextCampaign.clearedStageResults.reduce((total, item) => total + item.goalDifference, 0);
    setResult({
      stage: campaign.currentStage,
      homeGoals: endEvent.score.home,
      awayGoals: endEvent.score.away,
      outcome,
      stageReached: campaign.currentStage,
      goalDifference,
    });
    const bestProfile = endEvent.type === 'matchWon'
      ? updateBestRecord(profile, { stageReached: campaign.currentStage, goalDifference })
      : profile;
    const savedProfile = { ...bestProfile, campaignSave: createCampaignSave(nextCampaign) };
    setProfile(savedProfile);
    try {
      writeProfile(savedProfile);
      setProfileError('');
    } catch (error) {
      setProfileError(error.message || '기록을 저장하지 못했습니다.');
    }
    setScreen('results');
  };

  const chooseSkill = (skillId) => {
    const awarded = awardSkillCard(campaign, skillId);
    if (!awarded.ok) return;
    setCampaign(awarded.campaign);
    setPendingAssignmentSkill(skillId);
    persistCampaign(awarded.campaign);
  };

  const keepSkill = () => {
    if (!campaign || !pendingAssignmentSkill) return;
    const nextCampaign = { ...campaign, pendingSkillAssignment: null };
    setCampaign(nextCampaign);
    setPendingAssignmentSkill(null);
    persistCampaign(nextCampaign);
    if (nextCampaign.status === 'complete') {
      setResult((current) => current ? { ...current, outcome: 'campaignComplete' } : current);
      setScreen('results');
    } else setScreen('loadout');
  };

  const assignSkill = (playerId) => {
    const assigned = assignSkillCard(campaign, playerId, pendingAssignmentSkill);
    if (!assigned.ok) return;
    setCampaign(assigned.campaign);
    setPendingAssignmentSkill(null);
    persistCampaign(assigned.campaign);
    if (assigned.campaign.status === 'complete') {
      setResult((current) => current ? { ...current, outcome: 'campaignComplete' } : current);
      setScreen('results');
    } else setScreen('loadout');
  };

  const assignInventorySkill = (playerId, skillId) => {
    const assigned = assignSkillCard(campaign, playerId, skillId);
    if (!assigned.ok) return;
    setCampaign(assigned.campaign);
    persistCampaign(assigned.campaign);
  };

  const home = () => {
    setScreen('start');
    setCampaign(null);
    setMatchState(null);
    setPendingAssignmentSkill(null);
  };

  const continueSavedCampaign = () => {
    const saved = profile.campaignSave;
    if (!saved) return;
    const resumed = {
      id: `resume-${Date.now()}`,
      currentStage: saved.currentStage,
      clearedStageResults: saved.clearedStageResults,
      playerSkillStacks: saved.playerSkillStacks,
      skillInventory: saved.skillInventory,
      pendingSkillOffer: saved.pendingSkillOffer ?? null,
      pendingSkillAssignment: saved.pendingSkillAssignment ?? null,
      opponentSkillSets: saved.opponentSkillSets,
      status: saved.status === 'complete' ? 'complete' : 'active',
    };
    setCampaign(resumed);
    setPendingAssignmentSkill(resumed.pendingSkillAssignment ?? null);
    if (resumed.pendingSkillOffer || resumed.pendingSkillAssignment || resumed.status === 'complete') {
      const lastResult = resumed.clearedStageResults.at(-1);
      if (lastResult) {
        setResult({
          stage: lastResult.stage,
          homeGoals: lastResult.homeGoals,
          awayGoals: lastResult.awayGoals,
          outcome: resumed.status === 'complete' ? 'campaignComplete' : 'win',
          stageReached: lastResult.stage,
          goalDifference: resumed.clearedStageResults.reduce((total, item) => total + item.goalDifference, 0),
        });
        setScreen(resumed.pendingSkillOffer || resumed.pendingSkillAssignment ? 'skillReward' : 'results');
      }
    } else {
      startStage(resumed);
    }
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
      setProfileError(error.message || '저장 공간을 확인하고 다시 시도해 주세요.');
    }
  };

  const records = sortLeaderboard(profile.bestRecord ? [profile.bestRecord] : []);

  return (
    <main className="page-shell app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); home(); }}>
          <span className="brand-mark" aria-hidden="true">D</span><span>DEX ARCADE</span>
        </a>
        <span className="local-badge"><span /> 로컬 캠페인</span>
      </header>

      {screen === 'start' && <StartScreen hasSave={Boolean(profile.campaignSave)} nickname={profile.nickname} profileError={profileError} onNicknameSave={handleNicknameSave} onStart={startNewCampaign} onContinue={continueSavedCampaign} onOpenLeaderboard={() => setScreen('leaderboard')} />}
      {(screen === 'match' || screen === 'pause') && matchState && <Suspense fallback={<div className="game-screen-loading" role="status">경기장을 준비하고 있어요…</div>}>
        <GameScreen
          key={campaign?.currentStage ?? 1}
          gameState={matchState}
          paused={screen === 'pause'}
          errorMessage={profileError}
          onPause={() => setScreen('pause')}
          onResume={() => setScreen('match')}
          onSaveAndExit={saveAndExit}
          onGameEvents={handleGameEvents}
        />
      </Suspense>}
      {screen === 'results' && result && <ResultsScreen
        result={result}
        leaderboardPlace={records.length ? 1 : null}
        errorMessage={profileError}
        onRetry={() => startStage(campaign)}
        onContinue={() => {
          if (result.outcome === 'win') setScreen('skillReward');
          else if (result.outcome === 'campaignComplete') {
            const nextProfile = { ...profile, campaignSave: null };
            setProfile(nextProfile);
            try { writeProfile(nextProfile); } catch { /* the result remains visible if storage is unavailable */ }
            home();
          }
          else startNewCampaign();
        }}
        onHome={home}
      />}
      {screen === 'skillReward' && campaign && <SkillRewardScreen
        offer={campaign.pendingSkillOffer}
        inventory={campaign.skillInventory}
        playerSkillStacks={campaign.playerSkillStacks}
        playerRows={playerRows}
        skills={SKILLS}
        selectedSkill={pendingAssignmentSkill}
        onChoose={chooseSkill}
        onAssign={assignSkill}
        onKeep={keepSkill}
        onHome={home}
      />}
      {screen === 'loadout' && campaign && <LoadoutScreen
        stage={campaign.currentStage}
        playerRows={playerRows}
        playerSkillStacks={campaign.playerSkillStacks}
        inventory={campaign.skillInventory}
        skills={SKILLS}
        onAssign={assignInventorySkill}
        onConfirm={() => startStage(campaign)}
        onBack={home}
      />}
      {screen === 'leaderboard' && <LeaderboardScreen records={records} onBack={() => setScreen('start')} />}

      <footer className="footer"><span>DEX FOOTBALL ARCADE</span><span>방향키 이동 · A/S/D 액션 · F 스킬 · SPACE 점프</span></footer>
    </main>
  );
}
