import { lazy, Suspense, useRef, useState } from 'react';
import { createCampaign, finishStage, getUnlockedStage } from './game/campaign.js';
import { createInitialGameState } from './game/createInitialGameState.js';
import { SKILL_IDS, SKILLS, applySkill, awardSkillCard, equipTeamSkill, reorderTeamSkill, unequipTeamSkill } from './game/skills.js';
import { getTeamBranding } from './game/teamBranding.js';
import { createCampaignSave, readProfile, setNickname, sortLeaderboard, updateBestRecord, writeProfile } from './storage/localProfile.js';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import LoadoutScreen from './components/LoadoutScreen.jsx';
import SkillRewardScreen from './components/SkillRewardScreen.jsx';
import StartScreen from './components/StartScreen.jsx';
import StageSelectScreen from './components/StageSelectScreen.jsx';
import TeamCustomizationScreen from './components/TeamCustomizationScreen.jsx';

const GameScreen = lazy(() => import('./components/GameScreen.jsx'));

function makeMatchState(campaign, teamCustomization) {
  const ownedSkills = new Map((campaign.ownedTeamSkills ?? []).map((entry) => [entry.skillId, entry]));
  const state = createInitialGameState({
    stage: campaign.currentStage,
    teamSkillDeck: (campaign.equippedTeamSkillIds ?? [])
      .map((skillId) => ownedSkills.get(skillId))
      .filter(Boolean),
    opponentSkillDeck: (campaign.opponentSkillSets[campaign.currentStage] ?? [])
      .map((skillId) => ({ skillId, level: 1 })),
    teamBranding: getTeamBranding(campaign.currentStage, teamCustomization),
  });
  if (campaign.isSkillPreview) {
    const skillId = campaign.ownedTeamSkills?.[0]?.skillId;
    const source = state.players.find((player) => player.id === state.controlledPlayerId);
    const target = state.players.find((player) => player.team === 'away' && player.role === 'forward');
    if (source) {
      source.facingX = 1;
      source.facingY = 0;
    }
    if (skillId === 'eulryongta' && source && target) {
      target.x = Math.min(source.x + 108, 900);
      target.y = source.y;
      target.facingX = -1;
      target.facingY = 0;
    }
    if (skillId === 'vacuumCleaner') {
      state.ball.x = Math.min(state.ball.x + 130, 850);
      state.ball.y = Math.max(60, state.ball.y - 45);
      state.ball.ownerId = null;
      state.possessionTeam = null;
    }
    if (skillId === 'rainbowReflect' && source && target) {
      source.stunnedSeconds = 2;
      source.statusDurationSeconds = { stunned: 2 };
      state.lastSkillCasterByTeam.away = target.id;
    }
    if (source && skillId) applySkill(state, { team: 'home', sourcePlayerId: source.id, skillId, level: ownedSkills.get(skillId)?.level ?? 1 });
  }
  return state;
}

function createSkillPreviewCampaign(skillId) {
  if (!SKILL_IDS.includes(skillId)) return null;
  const campaign = createCampaign();
  return {
    ...campaign,
    id: `skill-preview-${skillId}-${Date.now()}`,
    ownedTeamSkills: [{ skillId, level: 1 }],
    equippedTeamSkillIds: [skillId],
    isSkillPreview: true,
  };
}

export default function App() {
  const [profile, setProfile] = useState(() => readProfile());
  const [initial] = useState(() => {
    const skillId = new URLSearchParams(window.location.search).get('skillPreview');
    const previewCampaign = createSkillPreviewCampaign(skillId);
    return previewCampaign
      ? { screen: 'match', campaign: previewCampaign, matchState: makeMatchState(previewCampaign, profile.teamCustomization) }
      : { screen: 'start', campaign: null, matchState: null };
  });
  const [screen, setScreen] = useState(initial.screen);
  const [campaign, setCampaign] = useState(initial.campaign);
  const [selectedStage, setSelectedStage] = useState(1);
  const [matchState, setMatchState] = useState(initial.matchState);
  const [result, setResult] = useState(null);
  const [profileError, setProfileError] = useState('');
  const activeMatchInstanceRef = useRef(0);
  const handledTerminalMatchRef = useRef(null);

  const startStage = (activeCampaign = campaign) => {
    if (!activeCampaign) return;
    activeMatchInstanceRef.current += 1;
    setMatchState(makeMatchState(activeCampaign, profile.teamCustomization));
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
    if (campaign.isSkillPreview) {
      setResult({
        stage: campaign.currentStage,
        homeGoals: score.home,
        awayGoals: score.away,
        outcome,
        stageReached: campaign.currentStage,
        goalDifference: score.home - score.away,
      });
      setScreen('results');
      return;
    }
    const nextCampaign = outcome === 'win' ? finishStage(campaign, { score }) : campaign;
    setCampaign(nextCampaign);
    if (outcome === 'win') setSelectedStage(nextCampaign.currentStage);
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
    if (!awarded.ok) return null;
    setCampaign(awarded.campaign);
    persistCampaign(awarded.campaign);
    return awarded.upgradedLevel ? { upgradedLevel: awarded.upgradedLevel } : { addedToBag: true };
  };

  const moveTeamSkill = (fromIndex, toIndex) => {
    if (!campaign) return;
    const moved = reorderTeamSkill(campaign, fromIndex, toIndex);
    if (!moved.ok) return;
    setCampaign(moved.campaign);
    persistCampaign(moved.campaign);
  };

  const equipCampaignSkill = (skillId, insertionIndex) => {
    if (!campaign) return;
    const equipped = equipTeamSkill(campaign, skillId, insertionIndex);
    if (!equipped.ok) return;
    setCampaign(equipped.campaign);
    persistCampaign(equipped.campaign);
  };

  const unequipCampaignSkill = (skillId) => {
    if (!campaign) return;
    const unequipped = unequipTeamSkill(campaign, skillId);
    if (!unequipped.ok) return;
    setCampaign(unequipped.campaign);
    persistCampaign(unequipped.campaign);
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
      ownedTeamSkills: saved.ownedTeamSkills,
      equippedTeamSkillIds: saved.equippedTeamSkillIds,
      pendingSkillOffer: saved.pendingSkillOffer ?? null,
      opponentSkillSets: saved.opponentSkillSets,
      status: saved.status === 'complete' ? 'complete' : 'active',
    };
    setCampaign(resumed);
    setSelectedStage(resumed.currentStage);
    setResult(null);
    setScreen(resumed.pendingSkillOffer ? 'skillReward' : 'stageSelect');
  };

  const saveAndExit = () => {
    if (!campaign) return home();
    if (campaign.isSkillPreview) return home();
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
        teamCustomization={profile.teamCustomization}
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
        ownedTeamSkills={campaign.ownedTeamSkills}
        skills={SKILLS}
        onChoose={chooseSkill}
        onContinue={() => setScreen('stageSelect')}
        onHome={home}
      />}
      {screen === 'loadout' && campaign && <LoadoutScreen
        stage={selectedStage}
        ownedTeamSkills={campaign.ownedTeamSkills}
        equippedTeamSkillIds={campaign.equippedTeamSkillIds}
        skills={SKILLS}
        onMove={moveTeamSkill}
        onEquip={equipCampaignSkill}
        onUnequip={unequipCampaignSkill}
        onConfirm={() => setScreen('stageSelect')}
        onBack={() => setScreen('stageSelect')}
      />}
      {screen === 'leaderboard' && <LeaderboardScreen records={records} onBack={() => setScreen('start')} />}

      <footer className="footer"><span>DEX FOOTBALL ARCADE</span><span>E sprint &middot; A/S/D actions &middot; F skill</span></footer>
    </main>
  );
}
