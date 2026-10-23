export default function LoadoutScreen({ stage = 2, teamSkillDeck = [], skills = {}, onMove, onConfirm, onBack }) {
  return (
    <section className="screen-panel loadout-panel" aria-labelledby="loadout-title">
      <button className="back-button" type="button" onClick={onBack}>← 메인 화면</button>
      <p className="eyebrow">TEAM SETUP · BEFORE STAGE {String(stage).padStart(2, '0')}</p>
      <h1 id="loadout-title">팀 스킬 순서를 정하세요</h1>
      <p className="intro">경기 중 F를 누르면 조건에 맞는 스킬이 현재 순서대로 발동됩니다. 팀 전체가 스킬을 공유하고, 성공적으로 발동하면 팀 쿨타임이 시작됩니다.</p>

      <section className="team-skill-order-panel" aria-labelledby="team-skill-order-title">
        <div className="loadout-section-heading">
          <div><p className="eyebrow">SHARED TEAM DECK</p><h2 id="team-skill-order-title">공용 스킬 순서</h2></div>
          <span>{teamSkillDeck.length}개</span>
        </div>
        {teamSkillDeck.length ? <ol className="team-skill-order-list">
          {teamSkillDeck.map((entry, index) => {
            const skill = skills[entry.skillId] ?? {};
            const passive = entry.skillId === 'rainbowReflect';
            return <li className="team-skill-order-row" key={entry.skillId}>
              <span className="team-skill-position">{String(index + 1).padStart(2, '0')}</span>
              <span className="team-skill-icon"><img src={skill.artwork} alt="" aria-hidden="true" /></span>
              <span className="team-skill-copy"><b>{skill.name ?? entry.skillId}</b><small>{passive ? '자동 발동 · 패시브' : `팀 공용 · Lv. ${entry.level}`}</small></span>
              <span className="team-skill-reorder">
                <button type="button" aria-label={`${skill.name ?? entry.skillId} 순서 앞으로`} disabled={index === 0} onClick={() => onMove?.(index, index - 1)}>앞으로</button>
                <button type="button" aria-label={`${skill.name ?? entry.skillId} 순서 뒤로`} disabled={index === teamSkillDeck.length - 1} onClick={() => onMove?.(index, index + 1)}>뒤로</button>
              </span>
            </li>;
          })}
        </ol> : <p className="team-skill-empty">아직 보유한 스킬이 없습니다. 스테이지 승리 보상으로 팀 스킬을 얻을 수 있습니다.</p>}
      </section>

      <div className="setup-actions">
        <span className="validation-note">무지개반사는 상대 스킬에 자동으로 대응합니다.</span>
        <button type="button" className="primary-button" onClick={onConfirm}>스테이지 선택으로 <span aria-hidden="true">→</span></button>
      </div>
    </section>
  );
}
