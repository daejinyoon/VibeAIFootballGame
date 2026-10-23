function SkillIcon({ skill, name }) {
  return <span className="team-skill-icon"><img src={skill.artwork} alt="" aria-hidden="true" /><span className="sr-only">{name}</span></span>;
}

export default function LoadoutScreen({
  stage = 1,
  ownedTeamSkills = [],
  equippedTeamSkillIds = [],
  skills = {},
  onEquip,
  onUnequip,
  onMove,
  onConfirm,
  onBack,
}) {
  const equipped = new Set(equippedTeamSkillIds);
  const canEquipMore = equippedTeamSkillIds.length < 3;
  const bagSkills = ownedTeamSkills;

  return (
    <section className="screen-panel loadout-panel" aria-labelledby="loadout-title">
      <button className="back-button" type="button" onClick={onBack}>메인 화면</button>
      <p className="eyebrow">TEAM SETUP · STAGE {String(stage).padStart(2, '0')}</p>
      <h1 id="loadout-title">팀 스킬을 준비하세요</h1>
      <p className="intro">보유한 스킬 중 최대 3개를 순서대로 장착할 수 있습니다. 경기 중 F를 누르면 준비된 스킬이 순서대로 발동하며, 스킬마다 재사용 대기시간 10초가 적용됩니다.</p>

      <div className="loadout-layout skill-loadout-layout">
        <section className="loadout-stock" aria-labelledby="skill-bag-title">
          <div className="loadout-section-heading">
            <div><p className="eyebrow">SKILL BAG</p><h2 id="skill-bag-title">보유 스킬</h2></div>
            <span>{ownedTeamSkills.length}개</span>
          </div>
          {bagSkills.length ? <ul className="skill-bag-list">
            {bagSkills.map((entry) => {
              const skill = skills[entry.skillId] ?? {};
              return <li className="skill-bag-card" key={entry.skillId}>
                <SkillIcon skill={skill} name={skill.name ?? entry.skillId} />
                <span className="team-skill-copy"><b>{skill.name ?? entry.skillId}</b><small>Lv. {entry.level} · {skill.description ?? ''}</small></span>
                <button type="button" className="skill-loadout-action" disabled={equipped.has(entry.skillId) || !canEquipMore} onClick={() => onEquip?.(entry.skillId)}>
                  {equipped.has(entry.skillId) ? '장착됨' : canEquipMore ? '장착' : '슬롯 가득 참'}
                </button>
              </li>;
            })}
          </ul> : <p className="team-skill-empty">모든 보유 스킬을 장착했습니다.</p>}
        </section>

        <section className="loadout-roster" aria-labelledby="skill-equipment-title">
          <div className="loadout-section-heading">
            <div><p className="eyebrow">MATCH EQUIPMENT</p><h2 id="skill-equipment-title">경기 장착 슬롯</h2></div>
            <span>{equippedTeamSkillIds.length}/3</span>
          </div>
          <ol className="skill-equipment-slots">
            {[0, 1, 2].map((index) => {
              const skillId = equippedTeamSkillIds[index];
              const entry = ownedTeamSkills.find((owned) => owned.skillId === skillId);
              const skill = skills[skillId] ?? {};
              return <li className={`skill-equipment-slot${entry ? ' is-filled' : ''}`} key={index}>
                <span className="team-skill-position">{String(index + 1).padStart(2, '0')}</span>
                {entry ? <>
                  <SkillIcon skill={skill} name={skill.name ?? skillId} />
                  <span className="team-skill-copy"><b>{skill.name ?? skillId}</b><small>Lv. {entry.level} · {skill.description ?? ''}</small></span>
                  <span className="skill-slot-actions">
                    <button type="button" aria-label={`${skill.name ?? skillId} 순서 위로`} disabled={index === 0} onClick={() => onMove?.(index, index - 1)}>↑</button>
                    <button type="button" aria-label={`${skill.name ?? skillId} 순서 아래로`} disabled={index >= equippedTeamSkillIds.length - 1} onClick={() => onMove?.(index, index + 1)}>↓</button>
                    <button type="button" aria-label={`${skill.name ?? skillId} 장착 해제`} onClick={() => onUnequip?.(skillId)}>빼기</button>
                  </span>
                </> : <span className="empty-skill-slot">빈 슬롯 · 보유 스킬에서 장착</span>}
              </li>;
            })}
          </ol>
        </section>
      </div>

      <div className="setup-actions">
        <span className="validation-note">장착한 스킬과 순서는 경기를 시작한 뒤에는 변경할 수 없습니다.</span>
        <button type="button" className="primary-button" onClick={onConfirm}>스테이지 선택으로 <span aria-hidden="true">→</span></button>
      </div>
    </section>
  );
}
