const TERMINAL_EVENTS = new Set(['matchWon', 'matchLost', 'matchDraw']);

export function canEnterDailyChallenge(localDevelopmentMode) {
  return localDevelopmentMode !== true;
}

export function getDailyChallengeTerminalResult(events) {
  const event = Array.isArray(events) ? events.find((entry) => TERMINAL_EVENTS.has(entry?.type)) : null;
  const homeGoals = event?.score?.home;
  const awayGoals = event?.score?.away;
  if (!Number.isInteger(homeGoals) || homeGoals < 0 || homeGoals > 99
      || !Number.isInteger(awayGoals) || awayGoals < 0 || awayGoals > 99) return null;
  const outcome = event.type === 'matchDraw' ? 'draw' : event.type === 'matchLost' ? 'loss' : 'win';
  if ((outcome === 'draw' && homeGoals !== awayGoals)
      || (outcome === 'win' && homeGoals <= awayGoals)
      || (outcome === 'loss' && homeGoals >= awayGoals)) return null;
  return {
    homeGoals,
    awayGoals,
    outcome,
    goalDifference: homeGoals - awayGoals,
  };
}

export function isDailyChallengeChangedError(error) {
  return error?.status === 409 && error?.code === 'CHALLENGE_CHANGED';
}

export function isFirstDailyChallengeTerminal(previousMatchId, matchId) {
  return Number.isSafeInteger(matchId) && matchId > 0 && previousMatchId !== matchId;
}

export function canRetryDailyChallengeSubmission(error) {
  return error?.status === 0 || error?.status === 503
    || error?.code === 'NETWORK_ERROR'
    || error?.code === 'DAILY_CHALLENGE_STORAGE_UNAVAILABLE';
}
