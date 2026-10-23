import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import { assignOpponentSkills, createCampaign, finishStage, getUnlockedStage } from './game/campaign.js';
import { createInitialGameState } from './game/createInitialGameState.js';
import { FIELD_PLAYER_IDS, SKILLS, assignSkillCard, awardSkillCard } from './game/skills.js';
import { createCampaignSave, readProfile, setNickname, sortLeaderboard, updateBestRecord, writeProfile } from './storage/localProfile.js';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import LoadoutScreen from './components/LoadoutScreen.jsx';
import SkillRewardScreen from './components/SkillRewardScreen.jsx';
import StartScreen from './components/StartScreen.jsx';
import StageSelectScreen from './components/StageSelectScreen.jsx';
import TeamCustomizationScreen from './components/TeamCustomizationScreen.jsx';

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
  const [selectedStage, setSelectedStage] = useState(1);
  const [matchState, setMatchState] = useState(null);
  const [result, setResult] = useState(null);
  const [profile, setProfile] = useState(() => readProfile());
  const [profileError, setProfileError] = useState('');
  const [pendingAssignmentSkill, setPendingAssignmentSkill] = useState(null);
  const activeMatchInstanceRef = useRef(0);
  const handledTerminalMatchRef = useRef(null);

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
    activeMatchInstanceRef.current += 1;
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
    setSelectedStage(1);
    setResult(null);
    setPendingAssignmentSkill(null);
    setScreen('stageSelect');
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

  const openTeamCustomization = () => {
    setProfileError('');
    setScreen('teamCustomization');
  };

  const handleTeamCustomizationSave = (teamCustomization) => {
    try {
      const written = writeProfile({ ...profile, teamCustomization });
      setProfile(written);
      setProfileError('');
      setScreen('start');
    } catch (error) {
      setProfileError(error.message || '팀 설정 저장에 실패했습니다. 다시 시도해 주세요.');
    }
  };

  const selectStage = (stage) => {
    if (!campaign || !Number.isInteger(stage) || stage < 1 || stage > getUnlockedStage(campaign)) return;
    setSelectedStage(stage);
    setProfileError('');
  };

  const startSelectedStage = () => {
    if (!campaign || !Number.isInteger(selectedStage) || selectedStage < 1
        || selectedStage > getUnlockedStage(campaign)) {
      setProfileError('아직 열리지 않은 스테이지입니다.');
      return;
    }
    const activeCampaign = { ...campaign, currentStage: selectedStage, status: 'active' };
    setCampaign(activeCampaign);
    setResult(null);
    setProfileError('');
    persistCampaign(activeCampaign);
    startStage(activeCampaign);
  };

  const handleGameEvents = (events) => {
    const endEvent = events.find((event) => ['matchWon', 'matchLost', 'matchDraw'].includes(event.type));
    if (!endEvent || !campaign) return;
    const matchKey = `${campaign.id}:${campaign.currentStage}:${activeMatchInstanceRef.current}`;
    if (handledTerminalMatchRef.current === matchKey) return;
    handledTerminalMatchRef.current = matchKey;

    const score = endEvent.score ?? matchState?.score ?? { home: 0, away: 0 };
    const outcome = endEvent.type === 'matchDraw' ? 'draw' : endEvent.type === 'matchLost' ? 'loss' : 'win';
    const nextCampaign = outcome === 'win' ? finishStage(campaign, { score }) : campaign;
    setCampaign(nextCampaign);
    if (outcome === 'win') setSelectedStage(nextCampaign.currentStage);
    setPendingAssignmentSkill(null);
    const goalDifference = nextCampaign.clearedStageResults.reduce((total, item) => total + item.goalDifference, 0);
    setResult({
      stage: campaign.currentStage,
      homeGoals: score.home,
      awayGoals: score.away,
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
    setScreen('stageSelect');
  };

  const assignSkill = (playerId) => {
    const assigned = assignSkillCard(campaign, playerId, pendingAssignmentSkill);
    if (!assigned.ok) return;
    setCampaign(assigned.campaign);
    setPendingAssignmentSkill(null);
    persistCampaign(assigned.campaign);
    setScreen('stageSelect');
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
    setSelectedStage(resumed.currentStage);
    setResult(null);
    setPendingAssignmentSkill(resumed.pendingSkillAssignment ?? null);
    setScreen(resumed.pendingSkillOffer || resumed.pendingSkillAssignment ? 'skillReward' : 'stageSelect');
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

  const leaveCompletedCampaign = () => {
    const nextProfile = { ...profile, campaignSave: null };
    setProfile(nextProfile);
    try {
      writeProfile(nextProfile);
      setProfileError('');
    } catch (error) {
      setProfileError(error.message || '캠페인 완료 기록을 정리하지 못했습니다.');
    }
    home();
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

      {screen === 'start' && <StartScreen hasSave={Boolean(profile.campaignSave)} nickname={profile.nickname} profileError={profileError} onNicknameSave={handleNicknameSave} onStart={startNewCampaign} onContinue={continueSavedCampaign} onOpenLeaderboard={() => setScreen('leaderboard')} onOpenTeamCustomization={openTeamCustomization} />}
      {screen === 'teamCustomization' && <TeamCustomizationScreen
        customization={profile.teamCustomization}
        onSave={handleTeamCustomizationSave}
        onBack={() => { setProfileError(''); setScreen('start'); }}
        errorMessage={profileError}
      />}
      {screen === 'stageSelect' && campaign && <StageSelectScreen
        campaign={campaign}
        stageResults={campaign.clearedStageResults}
        selectedStage={selectedStage}
        onSelectStage={selectStage}
        onStartStage={startSelectedStage}
        onOpenLoadout={() => setScreen('loadout')}
        onHome={home}
      />}
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
          else if (result.outcome === 'campaignComplete') leaveCompletedCampaign();
        }}
        onHome={() => result.outcome === 'campaignComplete' ? leaveCompletedCampaign() : home()}
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
        stage={selectedStage}
        playerRows={playerRows}
        playerSkillStacks={campaign.playerSkillStacks}
        inventory={campaign.skillInventory}
        skills={SKILLS}
        onAssign={assignInventorySkill}
        onConfirm={() => setScreen('stageSelect')}
        onBack={() => setScreen('stageSelect')}
      />}
      {screen === 'leaderboard' && <LeaderboardScreen records={records} onBack={() => setScreen('start')} />}

      <footer className="footer"><span>DEX FOOTBALL ARCADE</span><span>E sprint &middot; A/S/D actions &middot; F skill</span></footer>
    </main>
  );
}
