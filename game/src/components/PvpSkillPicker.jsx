import { SKILL_IDS, SKILLS } from '../game/skills.js';
import { movePvpSkill, normalizePvpSkillIds, togglePvpSkill } from '../pvp/pvpSkillSelection.js';

export default function PvpSkillPicker({ selectedSkillIds, onChange, disabled = false }) {
  const selected = normalizePvpSkillIds(selectedSkillIds);
  const update = (next) => onChange?.(next);

  return (
    <section className="pvp-picker" aria-labelledby="pvp-picker-title">
      <div className="pvp-picker-heading">
        <div>
          <p className="eyebrow">PVP LOADOUT</p>
          <h3 id="pvp-picker-title">경기 스킬 3개 선택</h3>
          <p className="pvp-picker-hint">순서대로 경기 중 사용할 수 있어요. 모든 스킬은 Lv. 1로 적용됩니다.</p>
        </div>
        <strong className="pvp-selection-count" aria-live="polite">{selected.length} / 3</strong>
      </div>

      <div className="pvp-skill-grid">
        {SKILL_IDS.map((skillId) => {
          const skill = SKILLS[skillId];
          const index = selected.indexOf(skillId);
          const isSelected = index >= 0;
          const isFull = selected.length === 3;
          return (
            <button
              className={`pvp-skill-card${isSelected ? ' is-selected' : ''}`}
              key={skillId}
              type="button"
              aria-pressed={isSelected}
              disabled={disabled || (!isSelected && isFull)}
              onClick={() => update(togglePvpSkill(selected, skillId))}
            >
              {skill.artwork && <img src={skill.artwork} alt="" loading="lazy" />}
              <span className="pvp-skill-copy">
                <strong>{skill.name}</strong>
                <small>Lv. 1 · {skill.type}</small>
                <span>{skill.description}</span>
              </span>
              <b className="pvp-skill-order">{isSelected ? index + 1 : '+'}</b>
            </button>
          );
        })}
      </div>

      <ol className="pvp-selected-skills" aria-label="선택한 스킬 사용 순서">
        {selected.map((skillId, index) => (
          <li key={skillId}>
            <span><b>{index + 1}</b>{SKILLS[skillId].name}<small>Lv. 1</small></span>
            <div>
              <button type="button" disabled={disabled || index === 0} aria-label={`${SKILLS[skillId].name} 순서 올리기`} onClick={() => update(movePvpSkill(selected, index, -1))}>↑</button>
              <button type="button" disabled={disabled || index === selected.length - 1} aria-label={`${SKILLS[skillId].name} 순서 내리기`} onClick={() => update(movePvpSkill(selected, index, 1))}>↓</button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
