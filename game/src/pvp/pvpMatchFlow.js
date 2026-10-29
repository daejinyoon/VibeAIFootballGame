import { createInitialGameState } from '../game/createInitialGameState.js';
import { getTeamBranding } from '../game/teamBranding.js';
import { SKILL_IDS } from '../game/skills.js';

export function createPvpMatchState(room) {
  if (!room || typeof room.code !== 'string' || typeof room.isHost !== 'boolean' || room.status !== 'playing'
      || !Array.isArray(room.hostSkillIds) || room.hostSkillIds.length !== 3
      || !room.hostSkillIds.every((skillId) => SKILL_IDS.includes(skillId))
      || !Array.isArray(room.guestSkillIds) || room.guestSkillIds.length !== 3
      || !room.guestSkillIds.every((skillId) => SKILL_IDS.includes(skillId))) return null;
  const deck = (ids) => ids.map((skillId) => ({ skillId, level: 1 }));
  return createInitialGameState({
    stage: 1,
    teamSkillDeck: deck(room.hostSkillIds),
    opponentSkillDeck: deck(room.guestSkillIds),
    teamBranding: getTeamBranding(1),
  });
}

export function createNormalPvpResult(score, localTeam) {
  if (!Number.isInteger(score?.home) || !Number.isInteger(score?.away)
      || score.home < 0 || score.away < 0 || !['home', 'away'].includes(localTeam)) return null;
  return {
    kind: 'normal',
    homeGoals: score.home,
    awayGoals: score.away,
    localOutcome: score.home === score.away ? 'draw'
      : (score.home > score.away) === (localTeam === 'home') ? 'win' : 'loss',
  };
}

export function createForfeitPvpResult(loser, localTeam) {
  if (!['home', 'away'].includes(loser) || !['home', 'away'].includes(localTeam)) return null;
  return { kind: 'forfeit', loser, localOutcome: loser === localTeam ? 'loss' : 'win' };
}

export function getConfirmationStatus(status) {
  if (status === 'awaitingResults') return 'awaitingOpponent';
  if (status === 'completed') return 'recorded';
  if (status === 'disputed') return 'disputed';
  if (status === 'forfeit') return 'recorded';
  return 'notRecorded';
}
