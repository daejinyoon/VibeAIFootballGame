import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createCampaign, finishStage, getUnlockedStage } from './game/campaign.js';
import { createCampaignMatchState } from './game/campaignMatchState.js';
import { SKILL_IDS, SKILLS, awardSkillCard, equipTeamSkill, reorderTeamSkill, unequipTeamSkill } from './game/skills.js';
import { playCrowdCheer, prepareMatchAudio, startCrowdAmbience } from './game/matchAudio.js';
import { startMenuMusic, stopMenuMusic } from './game/menuMusic.js';
import { prepareAudioContext } from './game/audioContext.js';
import { setGameAudioEnabled } from './game/audioSettings.js';
import { createEmptyProfile, createCampaignSave, setNickname, sortLeaderboard, updateBestRecord } from './storage/localProfile.js';
import { beginEntraLogin, beginEntraLogout, getProfileApiToken } from './auth/entraAuth.js';
import { loadCloudProfile, saveCloudProfile } from './storage/profileRepository.js';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import LoadoutScreen from './components/LoadoutScreen.jsx';
import SignInScreen from './components/SignInScreen.jsx';
import SkillRewardScreen from './components/SkillRewardScreen.jsx';
import StartScreen from './components/StartScreen.jsx';
import StageSelectScreen from './components/StageSelectScreen.jsx';
import TeamCustomizationScreen from './components/TeamCustomizationScreen.jsx';

const GameScreen = lazy(() => import('./components/GameScreen.jsx'));

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

export default function App({ authBootstrap = {} }) {
  const account = authBootstrap.account ?? null;
  const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim();
  const accountIsAuthenticated = Boolean(account
    && tenantId
    && account.idTokenClaims?.tid === tenantId
    && typeof account.idTokenClaims?.oid === 'string'
    && account.idTokenClaims.oid.length > 0);
  const [profile, setProfile] = useState(createEmptyProfile);
  const [profileLoading, setProfileLoading] = useState(accountIsAuthenticated);
  const [profileLoadError, setProfileLoadError] = useState('');
  const [profileLoginRequired, setProfileLoginRequired] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const [authActionError, setAuthActionError] = useState('');
  const [screen, setScreen] = useState('start');
  const [campaign, setCampaign] = useState(null);
  const [selectedStage, setSelectedStage] = useState(1);
  const [matchState, setMatchState] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [result, setResult] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileErrorStatus, setProfileErrorStatus] = useState(0);
  const activeMatchInstanceRef = useRef(0);
  const handledTerminalMatchRef = useRef(null);
  const pendingProfileRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  useEffect(() => {
    if (!accountIsAuthenticated) {
      stopMenuMusic();
      return undefined;
    }

    setAudioEnabled(true);
    setGameAudioEnabled(true);
    startMenuMusic();
    let resumedFromGesture = false;
    const resumeFromGesture = () => {
      if (resumedFromGesture) return;
      resumedFromGesture = true;
      prepareAudioContext();
      startMenuMusic();
      window.removeEventListener('pointerdown', resumeFromGesture);
      window.removeEventListener('keydown', resumeFromGesture);
    };
    window.addEventListener('pointerdown', resumeFromGesture, { once: true });
    window.addEventListener('keydown', resumeFromGesture, { once: true });
    return () => {
      window.removeEventListener('pointerdown', resumeFromGesture);
      window.removeEventListener('keydown', resumeFromGesture);
      stopMenuMusic();
    };
  }, [accountIsAuthenticated]);

  const toggleGameAudio = () => setAudioEnabled((enabled) => {
    const nextEnabled = !enabled;
    setGameAudioEnabled(nextEnabled);
    return nextEnabled;
  });

  useEffect(() => {
    if (!accountIsAuthenticated) return undefined;
    let cancelled = false;
    setProfileLoading(true);
    setProfileLoadError('');
    loadCloudProfile({ account, acquireToken: getProfileApiToken })
      .then(({ profile: loadedProfile }) => {
        if (cancelled) return;
        setProfile(loadedProfile);
        setProfileLoginRequired(false);
        const skillId = new URLSearchParams(window.location.search).get('skillPreview');
        const previewCampaign = createSkillPreviewCampaign(skillId);
        if (previewCampaign) {
          setCampaign(previewCampaign);
          setMatchState(createCampaignMatchState(previewCampaign, loadedProfile.teamCustomization));
          setScreen('match');
        }
        setProfileLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setProfileLoadError(error.message || '클라우드 프로필을 불러오지 못했습니다. 다시 시도해 주세요.');
        setProfileLoginRequired(error.status === 401);
        setProfileLoading(false);
      });
    return () => { cancelled = true; };
  }, [accountIsAuthenticated, account, profileRetry]);

  const saveProfile = (nextProfile) => {
    setProfile(nextProfile);
    pendingProfileRef.current = nextProfile;
    setProfileError('');
    setProfileErrorStatus(0);
    const save = saveQueueRef.current.catch(() => undefined).then(() => saveCloudProfile({
      account,
      profile: nextProfile,
      acquireToken: getProfileApiToken,
    }));
    saveQueueRef.current = save;
    return save.then(({ profile: saved }) => {
      if (pendingProfileRef.current === nextProfile) {
        pendingProfileRef.current = null;
        setProfile(saved);
        setProfileError('');
        setProfileErrorStatus(0);
      }
      return saved;
    }).catch((error) => {
      if (pendingProfileRef.current === nextProfile) {
        setProfileError(error.message || '클라우드 저장에 실패했습니다. 다시 시도해 주세요.');
        setProfileErrorStatus(error.status || 0);
      }
      throw error;
    });
  };

  const retryProfileSave = () => {
    if (profileLoadError) {
      setProfileRetry((value) => value + 1);
      return;
    }
    if (pendingProfileRef.current) saveProfile(pendingProfileRef.current).catch(() => undefined);
  };

  const signOut = async () => {
    setAuthActionError('');
    try {
      await beginEntraLogout(account);
    } catch {
      setAuthActionError('로그아웃을 완료하지 못했습니다. 다시 시도하세요.');
    }
  };

  const startStage = (activeCampaign = campaign) => {
    if (!activeCampaign) return;
    prepareMatchAudio();
    void startCrowdAmbience();
    void playCrowdCheer('kickoff');
    activeMatchInstanceRef.current += 1;
    setMatchState(createCampaignMatchState(activeCampaign, profile.teamCustomization));
    setScreen('match');
  };

  const persistCampaign = (activeCampaign) => {
    const nextProfile = { ...profile, campaignSave: createCampaignSave(activeCampaign) };
    return saveProfile(nextProfile).catch(() => undefined);
  };

  const startNewCampaign = () => {
    if (profile.campaignSave && !window.confirm('저장된 캠페인을 지우고 새 캠페인을 시작할까요?')) return;
    const nextCampaign = createCampaign();
    setCampaign(nextCampaign);
    setSelectedStage(1);
    setResult(null);
    setScreen('stageSelect');
    if (profile.campaignSave) saveProfile({ ...profile, campaignSave: null }).catch(() => undefined);
  };

  const handleNicknameSave = (nickname) => {
    try {
      const nextProfile = setNickname(profile, nickname);
      saveProfile(nextProfile).catch(() => undefined);
    } catch (error) {
      setProfileError(error.message || '별명을 저장하지 못했습니다.');
    }
  };

  const openTeamCustomization = () => {
    setProfileError('');
    setScreen('teamCustomization');
  };

  const handleTeamCustomizationSave = (teamCustomization) => {
    saveProfile({ ...profile, teamCustomization }).then(() => setScreen('start')).catch(() => undefined);
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
    saveProfile(savedProfile).catch(() => undefined);
    setScreen('results');
  };

  const chooseSkill = (skillId) => {
    const awarded = awardSkillCard(campaign, skillId);
    if (!awarded.ok) return null;
    let nextCampaign = awarded.campaign;
    let autoEquipped = false;
    if (awarded.upgradedLevel == null) {
      const equippedIds = Array.isArray(nextCampaign.equippedTeamSkillIds)
        ? nextCampaign.equippedTeamSkillIds
        : [];
      if (equippedIds.length < 3) {
        const equipped = equipTeamSkill(nextCampaign, skillId, equippedIds.length);
        if (equipped.ok) {
          nextCampaign = equipped.campaign;
          autoEquipped = true;
        }
      }
    }
    setCampaign(nextCampaign);
    persistCampaign(nextCampaign);
    return awarded.upgradedLevel != null
      ? { upgradedLevel: awarded.upgradedLevel }
      : { addedToBag: true, autoEquipped };
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

  const saveAndExit = async () => {
    if (!campaign) return home();
    if (campaign.isSkillPreview) return home();
    const nextProfile = { ...profile, campaignSave: createCampaignSave(campaign) };
    try {
      await saveProfile(nextProfile);
      home();
    } catch {}
  };

  const leaveCompletedCampaign = () => {
    const nextProfile = { ...profile, campaignSave: null };
    saveProfile(nextProfile).then(home).catch(() => undefined);
  };

  const records = sortLeaderboard(profile.bestRecord ? [profile.bestRecord] : []);

  if (!accountIsAuthenticated) {
    return (
      <SignInScreen
        configurationError={authBootstrap.configurationError ?? ''}
        authError={authActionError || authBootstrap.authError || (account ? 'DEX Consulting 조직 계정으로 로그인해야 게임을 이용할 수 있습니다.' : '')}
        onSignIn={beginEntraLogin}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (profileLoading || profileLoadError) {
    return (
      <SignInScreen
        configurationError={authBootstrap.configurationError ?? ''}
        authError={profileLoadError}
        profileLoading={profileLoading}
        accountName={account.name || account.username}
        onSignIn={beginEntraLogin}
        reauthenticate={profileLoginRequired}
        onRetry={() => profileLoginRequired ? beginEntraLogin() : retryProfileSave()}
        onSignOut={signOut}
      />
    );
  }

  return (
    <main className="page-shell app-shell">
      <header className="topbar">
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); home(); }}>
          <span className="brand-mark" aria-hidden="true">D</span><span>DEX ARCADE</span>
        </a>
        <div className="account-control">
          <span className="account-name" title={account.username}>{account.name || account.username}</span>
          <button className="account-signout" type="button" onClick={signOut}>로그아웃</button>
        </div>
      </header>

      {profileError && <div className="profile-sync-alert" role="alert">
        <span>{profileError}</span>
        <button type="button" className="secondary-button" onClick={() => {
          if (profileErrorStatus === 401) beginEntraLogin().catch(() => setProfileError('다시 로그인 창을 열지 못했습니다.'));
          else retryProfileSave();
        }}>{profileErrorStatus === 401 ? '다시 로그인' : '저장 다시 시도'}</button>
      </div>}

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
        onOpenLoadout={() => { setScreen('loadout'); }}
        onHome={home}
      />}
      {(screen === 'match' || screen === 'pause') && matchState && <Suspense fallback={<div className="game-screen-loading" role="status">경기장을 준비하고 있어요…</div>}>
        <GameScreen
          key={campaign?.currentStage ?? 1}
          gameState={matchState}
          paused={screen === 'pause'}
          errorMessage={profileError}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleGameAudio}
          onPause={() => setScreen('pause')}
          onResume={() => { void startCrowdAmbience(); setScreen('match'); }}
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
        onContinue={() => {
          const equippedIds = Array.isArray(campaign.equippedTeamSkillIds)
            ? campaign.equippedTeamSkillIds
            : [];
          if (equippedIds.length === 3) setScreen('loadout');
          else {
            setScreen('stageSelect');
          }
        }}
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
        onConfirm={() => { setScreen('stageSelect'); }}
        onBack={() => { setScreen('stageSelect'); }}
      />}
      {screen === 'leaderboard' && <LeaderboardScreen records={records} onBack={() => setScreen('start')} />}

      <footer className="footer"><span>DEX FOOTBALL ARCADE</span><span>E sprint &middot; A/S/D actions &middot; F skill</span></footer>
    </main>
  );
}
