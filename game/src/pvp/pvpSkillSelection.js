import { SKILL_IDS } from '../game/skills.js';

export function normalizePvpSkillIds(skillIds) {
  if (!Array.isArray(skillIds)) return [];
  const unique = [];
  for (const skillId of skillIds) {
    if (SKILL_IDS.includes(skillId) && !unique.includes(skillId) && unique.length < 3) unique.push(skillId);
  }
  return unique;
}

export function togglePvpSkill(skillIds, skillId) {
  const selected = normalizePvpSkillIds(skillIds);
  if (!SKILL_IDS.includes(skillId)) return selected;
  if (selected.includes(skillId)) return selected.filter((current) => current !== skillId);
  if (selected.length >= 3) return selected;
  return [...selected, skillId];
}

export function movePvpSkill(skillIds, index, direction) {
  const selected = normalizePvpSkillIds(skillIds);
  const nextIndex = index + direction;
  if (!Number.isInteger(index) || ![-1, 1].includes(direction)
      || index < 0 || index >= selected.length || nextIndex < 0 || nextIndex >= selected.length) return selected;
  const reordered = [...selected];
  [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
  return reordered;
}
