import { SKILL_IDS } from '../game/skills.js';

function hasLoadout(skillIds) {
  return Array.isArray(skillIds)
    && skillIds.length === 3
    && new Set(skillIds).size === 3
    && skillIds.every((skillId) => SKILL_IDS.includes(skillId));
}

export function canStartPvpRoom(room) {
  return Boolean(room?.isHost
    && room.status === 'ready'
    && room.hostReady
    && room.guestReady
    && hasLoadout(room.hostSkillIds)
    && hasLoadout(room.guestSkillIds));
}

export function isPvpLoadoutSaved(selectedSkillIds, savedSkillIds) {
  return hasLoadout(selectedSkillIds)
    && hasLoadout(savedSkillIds)
    && selectedSkillIds.every((skillId, index) => skillId === savedSkillIds[index]);
}

export function shouldPollPvpRoom(screen, room) {
  return screen === 'pvpLobby' && Boolean(room?.code) && ['waiting', 'ready'].includes(room.status);
}
