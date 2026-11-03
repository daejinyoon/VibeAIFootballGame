import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createCampaign, finishStage, getUnlockedStage } from './game/campaign.js';
import { createCampaignMatchState } from './game/campaignMatchState.js';
import { SKILL_IDS, SKILLS, awardSkillCard, equipTeamSkill, reorderTeamSkill, unequipTeamSkill } from './game/skills.js';
import { playCrowdCheer, prepareMatchAudio, startCrowdAmbience } from './game/matchAudio.js';
import { startMenuMusic, stopMenuMusic } from './game/menuMusic.js';
import { prepareAudioContext } from './game/audioContext.js';
import { setGameAudioEnabled } from './game/audioSettings.js';
import { createEmptyProfile, createCampaignSave, readProfile, setNickname, sortLeaderboard, updateBestRecord, writeProfile } from './storage/localProfile.js';
import { beginEntraLogin, beginEntraLogout, getProfileApiToken } from './auth/entraAuth.js';
import { isLocalDevelopmentMode } from './auth/localDevelopment.js';
import { loadCloudProfile, saveCloudProfile } from './storage/profileRepository.js';
import LeaderboardScreen from './components/LeaderboardScreen.jsx';
import ResultsScreen from './components/ResultsScreen.jsx';
import LoadoutScreen from './components/LoadoutScreen.jsx';
import SignInScreen from './components/SignInScreen.jsx';
import PvpLobbyScreen from './components/PvpLobbyScreen.jsx';
import PvpResultsScreen from './components/PvpResultsScreen.jsx';
import PvpLeaderboardScreen from './components/PvpLeaderboardScreen.jsx';
import DailyChallengeScreen from './components/DailyChallengeScreen.jsx';
import SkillRewardScreen from './components/SkillRewardScreen.jsx';
import StartScreen from './components/StartScreen.jsx';
import StageSelectScreen from './components/StageSelectScreen.jsx';
import TeamCustomizationScreen from './components/TeamCustomizationScreen.jsx';
import ReleaseNotesDialog from './components/ReleaseNotesDialog.jsx';
import { createPvpApi } from './pvp/pvpApi.js';
import { createPvpConnection } from './pvp/pvpConnection.js';
import { createForfeitPvpResult, createNormalPvpResult, createPvpMatchState, getConfirmationStatus } from './pvp/pvpMatchFlow.js';
import { shouldPollPvpRoom } from './pvp/pvpLobbyState.js';
import { createDailyChallengeApi } from './dailyChallenge/dailyChallengeApi.js';
import { canRetryDailyChallengeSubmission, canEnterDailyChallenge, getDailyChallengeTerminalResult, isDailyChallengeChangedError, isFirstDailyChallengeTerminal } from './dailyChallenge/dailyChallengeFlow.js';
import { createDailyChallengeMatchState } from './game/dailyChallengeMatchState.js';

const GameScreen = lazy(() => import('./components/GameScreen.jsx'));
const LOCAL_DEVELOPMENT_ACCOUNT = Object.freeze({ name: '로컬 테스트', username: 'local-test' });

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
  const localDevelopmentMode = isLocalDevelopmentMode(import.meta.env);
  const account = localDevelopmentMode
    ? LOCAL_DEVELOPMENT_ACCOUNT
    : authBootstrap.account ?? null;
  const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim();
  const accountIsAuthenticated = localDevelopmentMode || Boolean(account
    && tenantId
    && account.idTokenClaims?.tid === tenantId
    && typeof account.idTokenClaims?.oid === 'string'
    && account.idTokenClaims.oid.length > 0);
  const [profile, setProfile] = useState(() => localDevelopmentMode ? readProfile() : createEmptyProfile());
  const [profileLoading, setProfileLoading] = useState(accountIsAuthenticated && !localDevelopmentMode);
  const [profileLoadError, setProfileLoadError] = useState('');
  const [profileLoginRequired, setProfileLoginRequired] = useState(false);
  const [profileRetry, setProfileRetry] = useState(0);
  const [authActionError, setAuthActionError] = useState('');
  const [screen, setScreen] = useState('start');
  const [patchNotesOpen, setPatchNotesOpen] = useState(false);
  const [pvpRoom, setPvpRoom] = useState(null);
  const [pvpLoading, setPvpLoading] = useState(false);
  const [pvpError, setPvpError] = useState('');
  const [pvpMatch, setPvpMatch] = useState(null);
  const [pvpResult, setPvpResult] = useState(null);
  const [pvpConfirmationStatus, setPvpConfirmationStatus] = useState('submitting');
  const [pvpResultError, setPvpResultError] = useState('');
  const [pvpConnectionStatus, setPvpConnectionStatus] = useState('disconnected');
  const [pvpConnectionRetry, setPvpConnectionRetry] = useState(0);
  const [pvpLeaderboardRecords, setPvpLeaderboardRecords] = useState([]);
  const [pvpLeaderboardLoading, setPvpLeaderboardLoading] = useState(false);
  const [pvpLeaderboardError, setPvpLeaderboardError] = useState('');
  const [pvpLeaderboardRetry, setPvpLeaderboardRetry] = useState(0);
  const [dailyChallengeData, setDailyChallengeData] = useState(null);
  const [dailyChallengeLoading, setDailyChallengeLoading] = useState(false);
  const [dailyChallengeError, setDailyChallengeError] = useState('');
  const [dailyChallengeMatchState, setDailyChallengeMatchState] = useState(null);
  const [dailyChallengeResult, setDailyChallengeResult] = useState(null);
  const [dailyChallengeSaving, setDailyChallengeSaving] = useState(false);
  const [dailyChallengeSubmitError, setDailyChallengeSubmitError] = useState('');
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
  const pvpApiRef = useRef(null);
  const pvpConnectionRef = useRef(null);
  const pvpRemoteInputRef = useRef(null);
  const pvpSnapshotRef = useRef(null);
  const pvpResultSubmittedRef = useRef(false);
  const pvpForfeitRef = useRef(false);
  const pvpTerminalMatchRef = useRef(null);
  const pvpLeaderboardReturnRef = useRef('start');
  const dailyChallengeApiRef = useRef(null);
  const dailyChallengeRequestRef = useRef(0);
  const dailyChallengeMatchInstanceRef = useRef(0);
  const dailyChallengeTerminalRef = useRef(null);
  const dailyChallengeSubmissionPendingRef = useRef(false);
  if (!pvpApiRef.current) pvpApiRef.current = createPvpApi({ acquireToken: getProfileApiToken });
  if (!dailyChallengeApiRef.current) dailyChallengeApiRef.current = createDailyChallengeApi({ acquireToken: getProfileApiToken });

  useEffect(() => {
    if (!shouldPollPvpRoom(screen, pvpRoom)) return undefined;
    let active = true;
    const pollRoom = async () => {
      try {
        const updatedRoom = await pvpApiRef.current.getRoom(pvpRoom.code);
        if (!active) return;
        setPvpRoom(updatedRoom);
        setPvpError('');
      } catch (error) {
        if (active) setPvpError(error.message || '방 정보를 새로 고치지 못했습니다. 다시 시도해 주세요.');
      }
    };
    const timer = window.setInterval(pollRoom, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [screen, pvpRoom?.code, pvpRoom?.status]);

  useEffect(() => {
    if (!pvpRoom?.code || pvpRoom.status !== 'playing') return undefined;
    let active = true;
    const room = pvpRoom;
    const localTeam = room.isHost ? 'home' : 'away';
    const initialState = createPvpMatchState(room);
    if (!initialState) {
      setPvpError('방의 경기 설정을 읽지 못했습니다. 방을 새로고침해 주세요.');
      setPvpConnectionStatus('failed');
      setScreen('pvpConnecting');
      return undefined;
    }
    pvpResultSubmittedRef.current = false;
    pvpForfeitRef.current = false;
    pvpTerminalMatchRef.current = null;
    pvpRemoteInputRef.current = null;
    pvpSnapshotRef.current = null;
    setPvpResult(null);
    setPvpResultError('');
    setPvpConfirmationStatus('submitting');
    setPvpError('');
    setPvpConnectionStatus('connecting');
    setPvpMatch(null);
    setScreen('pvpConnecting');

    const connection = createPvpConnection({
      api: pvpApiRef.current,
      onInput: (packet) => { pvpRemoteInputRef.current = packet; },
      onSnapshot: (packet) => { pvpSnapshotRef.current = packet; },
      onForfeit: ({ loser }) => {
        const forfeitResult = createForfeitPvpResult(loser, localTeam);
        if (!active || !forfeitResult || pvpForfeitRef.current) return;
        pvpForfeitRef.current = true;
        pvpConnectionRef.current?.stop();
        setPvpResult({ ...forfeitResult, localTeam, roomCode: room.code });
        setPvpConfirmationStatus('recorded');
        setPvpResultError('');
        setScreen('pvpResults');
      },
      onStatus: setPvpConnectionStatus,
    });
    pvpConnectionRef.current = connection;
    connection.start(room.code).then(({ role }) => {
      if (!active) return;
      const expectedRole = room.isHost ? 'host' : 'guest';
      if (role !== expectedRole) throw new Error('서버에서 받은 경기 역할이 방 정보와 일치하지 않습니다.');
      setPvpMatch({ gameState: initialState, localTeam, simulationMode: room.isHost ? 'host' : 'remote' });
      setPvpConnectionStatus('connected');
      setScreen('pvpMatch');
      prepareMatchAudio();
      void startCrowdAmbience();
    }).catch((error) => {
      if (!active) return;
      connection.stop();
      setPvpError(error.message || '실시간 경기에 연결하지 못했습니다. 다시 시도해 주세요.');
      setPvpConnectionStatus('failed');
      setScreen('pvpConnecting');
    });

    return () => {
      active = false;
      connection.stop();
      if (pvpConnectionRef.current === connection) pvpConnectionRef.current = null;
    };
  }, [pvpRoom?.code, pvpRoom?.status, pvpConnectionRetry]);

  useEffect(() => {
    if (!pvpResult || pvpResult.kind !== 'normal' || !pvpRoom?.code
        || ['submitting', 'recorded', 'disputed', 'notRecorded'].includes(pvpConfirmationStatus)) return undefined;
    let active = true;
    const pollResult = async () => {
      try {
        const response = await pvpApiRef.current.getResult(pvpRoom.code);
        if (!active) return;
        const nextStatus = getConfirmationStatus(response.status);
        setPvpConfirmationStatus(nextStatus);
        setPvpResultError('');
        if (response.status === 'forfeit' && response.match?.source === 'forfeit') {
          pvpForfeitRef.current = true;
          const forfeit = createForfeitPvpResult(response.match.outcome === 'homeWin' ? 'away' : 'home', pvpMatch?.localTeam ?? 'home');
          if (forfeit) {
            setPvpResult({ ...forfeit, localTeam: pvpMatch?.localTeam ?? 'home', roomCode: pvpRoom.code });
            setScreen('pvpResults');
          }
          setPvpConnectionStatus('disconnected');
        }
        if (response.status === 'completed' || response.status === 'disputed' || response.status === 'forfeit') {
          pvpConnectionRef.current?.stop();
        }
      } catch (error) {
        if (active) setPvpResultError(error.message || '결과 확인 요청에 실패했습니다.');
      }
    };
    void pollResult();
    const timer = window.setInterval(pollResult, 2000);
    return () => { active = false; window.clearInterval(timer); };
  }, [pvpResult?.kind, pvpRoom?.code, pvpConfirmationStatus]);

  useEffect(() => {
    if (screen !== 'pvpLeaderboard') return undefined;
    let active = true;
    const load = async () => {
      setPvpLeaderboardLoading(true);
      setPvpLeaderboardError('');
      try {
        const response = await pvpApiRef.current.getLeaderboard();
        if (active) setPvpLeaderboardRecords(response.records);
      } catch (error) {
        if (active) setPvpLeaderboardError(error.message || '회사 순위를 불러오지 못했습니다.');
      } finally {
        if (active) setPvpLeaderboardLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [screen, pvpLeaderboardRetry]);
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
    if (!accountIsAuthenticated || localDevelopmentMode) return undefined;
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
          setMatchState(createCampaignMatchState(previewCampaign, loadedProfile.teamCustomization, loadedProfile.goalCelebration));
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
  }, [accountIsAuthenticated, account, localDevelopmentMode, profileRetry]);

  const saveProfile = (nextProfile) => {
    setProfile(nextProfile);
    pendingProfileRef.current = nextProfile;
    setProfileError('');
    setProfileErrorStatus(0);
    if (localDevelopmentMode) {
      try {
        const saved = writeProfile(nextProfile);
        pendingProfileRef.current = null;
        setProfile(saved);
        return Promise.resolve(saved);
      } catch (error) {
        setProfileError(error.message || '로컬 프로필을 저장하지 못했습니다.');
        setProfileErrorStatus(0);
        return Promise.reject(error);
      }
    }
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
    setMatchState(createCampaignMatchState(activeCampaign, profile.teamCustomization, profile.goalCelebration));
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

  const runPvpAction = async (action) => {
    setPvpError('');
    setPvpLoading(true);
    try {
      const result = await action();
      if (result?.code && result?.status) setPvpRoom(result);
      return result;
    } catch (error) {
      setPvpError(error.message || '대전 요청을 처리하지 못했습니다. 다시 시도해 주세요.');
      return null;
    } finally {
      setPvpLoading(false);
    }
  };

  const cancelPvpRoom = async (code) => {
    const result = await runPvpAction(() => pvpApiRef.current.cancelRoom(code));
    if (result?.cancelled) setPvpRoom(null);
  };

  const openPvpLobby = () => {
    setPvpError('');
    setScreen('pvpLobby');
  };

  const loadDailyChallenge = async () => {
    if (!canEnterDailyChallenge(localDevelopmentMode)) return null;
    const requestId = dailyChallengeRequestRef.current + 1;
    dailyChallengeRequestRef.current = requestId;
    setDailyChallengeData(null);
    setDailyChallengeLoading(true);
    setDailyChallengeError('');
    try {
      const data = await dailyChallengeApiRef.current.getDailyChallenge();
      if (dailyChallengeRequestRef.current !== requestId) return null;
      setDailyChallengeData(data);
      setDailyChallengeResult((current) => current?.challengeId
          && current.challengeId !== data.challenge.challengeId
        ? { ...current, dayChanged: true }
        : current);
      return data;
    } catch (error) {
      if (dailyChallengeRequestRef.current === requestId) {
        setDailyChallengeError(error.message || '오늘의 챌린지를 불러오지 못했습니다. 다시 시도해 주세요.');
      }
      return null;
    } finally {
      if (dailyChallengeRequestRef.current === requestId) setDailyChallengeLoading(false);
    }
  };

  const openDailyChallenge = () => {
    if (!canEnterDailyChallenge(localDevelopmentMode)) return;
    setDailyChallengeResult(null);
    setDailyChallengeSubmitError('');
    setScreen('dailyChallenge');
    void loadDailyChallenge();
  };

  const startDailyChallenge = () => {
    if (!canEnterDailyChallenge(localDevelopmentMode) || !dailyChallengeData?.challenge) return;
    const initialState = createDailyChallengeMatchState(
      dailyChallengeData.challenge,
      profile.teamCustomization,
      profile.goalCelebration,
    );
    if (!initialState) {
      setDailyChallengeError('오늘의 경기 설정을 확인할 수 없습니다. 챌린지를 새로고침해 주세요.');
      setDailyChallengeData(null);
      return;
    }
    dailyChallengeMatchInstanceRef.current += 1;
    dailyChallengeTerminalRef.current = null;
    dailyChallengeSubmissionPendingRef.current = false;
    setDailyChallengeMatchState(initialState);
    setDailyChallengeResult(null);
    setDailyChallengeSubmitError('');
    setDailyChallengeError('');
    setScreen('dailyMatch');
    prepareMatchAudio();
    void startCrowdAmbience();
    void playCrowdCheer('kickoff');
  };

  const leaveDailyChallenge = () => {
    dailyChallengeRequestRef.current += 1;
    dailyChallengeSubmissionPendingRef.current = false;
    setDailyChallengeMatchState(null);
    setScreen('start');
  };

  const submitDailyChallengeResult = async (matchResult) => {
    if (!matchResult || dailyChallengeSubmissionPendingRef.current) return;
    dailyChallengeSubmissionPendingRef.current = true;
    setDailyChallengeSaving(true);
    setDailyChallengeSubmitError('');
    try {
      const response = await dailyChallengeApiRef.current.submitResult({
        challengeId: matchResult.challengeId,
        displayName: account.name || account.username,
        homeGoals: matchResult.homeGoals,
        awayGoals: matchResult.awayGoals,
      });
      setDailyChallengeData((current) => current?.challenge.challengeId === matchResult.challengeId
        ? { ...current, myRecord: response.record, records: response.records }
        : current);
      setDailyChallengeResult((current) => current?.matchId === matchResult.matchId
        ? { ...current, saved: true, rank: response.record.rank, stale: false }
        : current);
    } catch (error) {
      if (isDailyChallengeChangedError(error)) {
        setDailyChallengeResult((current) => current?.matchId === matchResult.matchId
          ? { ...current, saved: false, stale: true, rank: null }
          : current);
        await loadDailyChallenge();
      } else {
        const message = error.message || '경기 결과를 제출하지 못했습니다. 연결을 확인하고 다시 시도해 주세요.';
        setDailyChallengeSubmitError(canRetryDailyChallengeSubmission(error)
          ? message
          : `${message} 결과 제출을 다시 시도하거나 메인 화면으로 돌아갈 수 있습니다.`);
      }
    } finally {
      dailyChallengeSubmissionPendingRef.current = false;
      setDailyChallengeSaving(false);
    }
  };

  const handleDailyChallengeEvents = (events) => {
    if (screen !== 'dailyMatch' || !dailyChallengeData?.challenge) return;
    const matchResult = getDailyChallengeTerminalResult(events);
    if (!matchResult) return;
    const matchId = dailyChallengeMatchInstanceRef.current;
    if (!isFirstDailyChallengeTerminal(dailyChallengeTerminalRef.current, matchId)) return;
    dailyChallengeTerminalRef.current = matchId;
    const resultWithMatch = {
      ...matchResult,
      challengeId: dailyChallengeData.challenge.challengeId,
      matchId,
      saved: false,
      rank: null,
      stale: false,
      dayChanged: false,
    };
    setDailyChallengeResult(resultWithMatch);
    setDailyChallengeSubmitError('');
    setScreen('dailyResult');
    void submitDailyChallengeResult(resultWithMatch);
  };

  const retryDailyChallengeSubmission = () => {
    if (!dailyChallengeResult || dailyChallengeResult.saved || dailyChallengeResult.stale) return;
    void submitDailyChallengeResult(dailyChallengeResult);
  };

  const retryDailyChallengeMatch = () => {
    setDailyChallengeResult(null);
    setDailyChallengeSubmitError('');
    setScreen('dailyChallenge');
  };

  const openTeamCustomization = () => {
    setProfileError('');
    setScreen('teamCustomization');
  };

  const handleTeamCustomizationSave = (teamCustomization, goalCelebration) => {
    saveProfile({ ...profile, teamCustomization, goalCelebration }).then(() => setScreen('start')).catch(() => undefined);
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

  const handlePvpGameEvents = (events) => {
    const endEvent = events.find((event) => ['matchWon', 'matchLost', 'matchDraw'].includes(event.type));
    if (!endEvent || !pvpMatch || !pvpRoom?.code) return;
    const matchKey = `${pvpRoom.code}:${endEvent.score?.home ?? 0}:${endEvent.score?.away ?? 0}`;
    if (pvpTerminalMatchRef.current === matchKey) return;
    pvpTerminalMatchRef.current = matchKey;
    const nextResult = createNormalPvpResult(endEvent.score, pvpMatch.localTeam);
    if (!nextResult) return;
    setPvpResult({ ...nextResult, localTeam: pvpMatch.localTeam, roomCode: pvpRoom.code });
    setPvpConfirmationStatus('submitting');
    setPvpResultError('');
    setScreen('pvpResults');
    if (pvpResultSubmittedRef.current) return;
    pvpResultSubmittedRef.current = true;
    pvpApiRef.current.submitResult(pvpRoom.code, {
      homeGoals: nextResult.homeGoals,
      awayGoals: nextResult.awayGoals,
    }).then((response) => {
      if (pvpForfeitRef.current) return;
      setPvpConfirmationStatus(getConfirmationStatus(response.status));
      if (response.status === 'completed' || response.status === 'disputed') pvpConnectionRef.current?.stop();
    }).catch((error) => {
      if (pvpForfeitRef.current) return;
      setPvpConfirmationStatus('notRecorded');
      setPvpResultError(error.message || '경기 결과를 제출하지 못했습니다.');
    });
  };

  const retryPvpResult = () => {
    if (!pvpResult || pvpResult.kind !== 'normal' || !pvpRoom?.code) return;
    setPvpConfirmationStatus('submitting');
    setPvpResultError('');
    pvpApiRef.current.submitResult(pvpRoom.code, {
      homeGoals: pvpResult.homeGoals,
      awayGoals: pvpResult.awayGoals,
    }).then((response) => {
      if (pvpForfeitRef.current) return;
      setPvpConfirmationStatus(getConfirmationStatus(response.status));
      if (response.status === 'completed' || response.status === 'disputed') pvpConnectionRef.current?.stop();
    }).catch((error) => {
      if (pvpForfeitRef.current) return;
      setPvpConfirmationStatus('notRecorded');
      setPvpResultError(error.message || '경기 결과를 제출하지 못했습니다.');
    });
  };

  const leavePvp = () => {
    pvpConnectionRef.current?.stop();
    pvpConnectionRef.current = null;
    setPvpRoom(null);
    setPvpMatch(null);
    setPvpResult(null);
    setPvpResultError('');
    setScreen('start');
  };

  const openPvpLeaderboard = (returnTo = 'start') => {
    pvpLeaderboardReturnRef.current = returnTo;
    setPvpLeaderboardRecords([]);
    setPvpLeaderboardError('');
    setScreen('pvpLeaderboard');
  };

  const backFromPvpLeaderboard = () => setScreen(pvpLeaderboardReturnRef.current);

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
  const accountDisplayName = localDevelopmentMode ? '로컬 테스트' : account?.name || account?.username || '';

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
        <a className="brand" href="#home" onClick={(event) => { event.preventDefault(); if (screen.startsWith('pvp')) leavePvp(); else if (screen.startsWith('daily')) leaveDailyChallenge(); else home(); }}>
          <span className="brand-mark" aria-hidden="true">D</span><span>DEX ARCADE</span>
        </a>
        <div className="account-control">
          <span className="account-name" title={accountDisplayName}>{accountDisplayName}</span>
          {!localDevelopmentMode && <button className="account-signout" type="button" onClick={signOut}>로그아웃</button>}
        </div>
      </header>

      {profileError && <div className="profile-sync-alert" role="alert">
        <span>{profileError}</span>
        <button type="button" className="secondary-button" onClick={() => {
          if (profileErrorStatus === 401) beginEntraLogin().catch(() => setProfileError('다시 로그인 창을 열지 못했습니다.'));
          else retryProfileSave();
        }}>{profileErrorStatus === 401 ? '다시 로그인' : '저장 다시 시도'}</button>
      </div>}

      {screen === 'start' && <StartScreen hasSave={Boolean(profile.campaignSave)} nickname={profile.nickname} profileError={profileError} onNicknameSave={handleNicknameSave} onStart={startNewCampaign} onContinue={continueSavedCampaign} onOpenLeaderboard={() => setScreen('leaderboard')} onOpenTeamCustomization={openTeamCustomization} onOpenPvp={openPvpLobby} onOpenPvpLeaderboard={() => openPvpLeaderboard('start')} onOpenDailyChallenge={openDailyChallenge} onOpenPatchNotes={() => setPatchNotesOpen(true)} showCompanyPvpActions={!localDevelopmentMode} />}
      {screen === 'dailyChallenge' && <DailyChallengeScreen
        data={dailyChallengeData}
        loading={dailyChallengeLoading}
        errorMessage={dailyChallengeError}
        result={null}
        onRefresh={() => { void loadDailyChallenge(); }}
        onStart={startDailyChallenge}
        onHome={leaveDailyChallenge}
      />}
      {screen === 'dailyResult' && <DailyChallengeScreen
        data={dailyChallengeData}
        loading={dailyChallengeLoading}
        errorMessage={dailyChallengeError}
        result={dailyChallengeResult}
        saving={dailyChallengeSaving}
        submitError={dailyChallengeSubmitError}
        onRefresh={() => { void loadDailyChallenge(); }}
        onRetrySubmit={retryDailyChallengeSubmission}
        onRetryMatch={retryDailyChallengeMatch}
        onHome={leaveDailyChallenge}
      />}
      {screen === 'dailyMatch' && dailyChallengeMatchState && <Suspense fallback={<div className="game-screen-loading" role="status">오늘의 경기를 준비하고 있어요…</div>}>
        <GameScreen
          key={`daily-${dailyChallengeMatchInstanceRef.current}`}
          gameState={dailyChallengeMatchState}
          paused={false}
          errorMessage={dailyChallengeError}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleGameAudio}
          onGameEvents={handleDailyChallengeEvents}
          simulationMode="dailyChallenge"
        />
      </Suspense>}
      {screen === 'pvpLobby' && <PvpLobbyScreen
        room={pvpRoom}
        loading={pvpLoading}
        errorMessage={pvpError}
        displayName={account.name || account.username}
        onCreateRoom={(name) => runPvpAction(() => pvpApiRef.current.createRoom(name))}
        onJoinRoom={(code, name) => runPvpAction(() => pvpApiRef.current.joinRoom(code, name))}
        onSaveLoadout={(code, skillIds) => runPvpAction(() => pvpApiRef.current.saveLoadout(code, skillIds))}
        onSetReady={(code, ready) => runPvpAction(() => pvpApiRef.current.setReady(code, ready))}
        onStart={(code) => runPvpAction(() => pvpApiRef.current.startRoom(code))}
        onCancel={cancelPvpRoom}
        onBack={() => setScreen('start')}
      />}
      {screen === 'teamCustomization' && <TeamCustomizationScreen
        customization={profile.teamCustomization}
        goalCelebration={profile.goalCelebration}
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
      {screen === 'pvpConnecting' && <section className="screen-panel pvp-connecting-panel" aria-labelledby="pvp-connecting-title">
        <p className="eyebrow">COMPANY PVP · ROOM {pvpRoom?.code}</p>
        <h1 id="pvp-connecting-title">{pvpConnectionStatus === 'failed' ? '경기에 연결하지 못했습니다.' : '상대와 경기장을 연결하고 있습니다…'}</h1>
        <p className="intro">초대 방의 경기 설정을 확인하고 실시간 연결을 준비합니다.</p>
        {pvpError && <p className="profile-error" role="alert">{pvpError}</p>}
        <div className="actions">
          {pvpConnectionStatus === 'failed' && <button className="primary-button" type="button" onClick={() => setPvpConnectionRetry((value) => value + 1)}>다시 연결</button>}
          <button className="secondary-button" type="button" onClick={leavePvp}>나가기</button>
        </div>
      </section>}
      {screen === 'pvpMatch' && pvpMatch && <Suspense fallback={<div className="game-screen-loading" role="status">실시간 대전을 준비하고 있습니다…</div>}>
        <GameScreen
          key={`pvp-${pvpRoom?.code}`}
          gameState={pvpMatch.gameState}
          paused={false}
          errorMessage={pvpError}
          audioEnabled={audioEnabled}
          onToggleAudio={toggleGameAudio}
          onGameEvents={handlePvpGameEvents}
          simulationMode={pvpMatch.simulationMode}
          localTeam={pvpMatch.localTeam}
          remoteInputRef={pvpRemoteInputRef}
          snapshotRef={pvpSnapshotRef}
          onLocalInput={(packet) => pvpConnectionRef.current?.sendInput(packet).catch((error) => setPvpError(error.message || '조작 입력을 보내지 못했습니다.'))}
          onSnapshot={(snapshot) => pvpConnectionRef.current?.sendSnapshot(snapshot.state, snapshot.sequence).catch((error) => setPvpError(error.message || '경기 화면을 전송하지 못했습니다.'))}
        />
      </Suspense>}
      {screen === 'pvpResults' && pvpResult && <PvpResultsScreen
        result={pvpResult}
        confirmationStatus={pvpConfirmationStatus}
        errorMessage={pvpResultError}
        onRetry={retryPvpResult}
        onLeaderboard={() => openPvpLeaderboard('pvpResults')}
        onHome={leavePvp}
      />}
      {screen === 'pvpLeaderboard' && <PvpLeaderboardScreen
        records={pvpLeaderboardRecords}
        loading={pvpLeaderboardLoading}
        errorMessage={pvpLeaderboardError}
        onRefresh={() => setPvpLeaderboardRetry((value) => value + 1)}
        onBack={backFromPvpLeaderboard}
      />}
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

      {patchNotesOpen && <ReleaseNotesDialog onClose={() => setPatchNotesOpen(false)} />}
      <footer className="footer"><span>DEX FOOTBALL ARCADE</span><span>E sprint &middot; A/S/D actions &middot; F skill</span></footer>
    </main>
  );
}
