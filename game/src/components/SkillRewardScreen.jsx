import { useState } from 'react';

export default function SkillRewardScreen({
  offer = null,
  teamSkillDeck = [],
  pendingSkillPlacement = null,
  skills = {},
  onChoose,
  onPlace,
  onContinue,
  onHome,
}) {
  const [upgradeNotice, setUpgradeNotice] = useState(null);
  const activeOffer = Array.isArray(offer) ? offer : [];
  const pendingEntry = teamSkillDeck.find((entry) => entry.skillId === pendingSkillPlacement);
  const placementDeck = teamSkillDeck.filter((entry) => entry.skillId !== pendingSkillPlacement);
  const visibleDeck = pendingEntry ? placementDeck : teamSkillDeck;

  const chooseSkill = (skillId) => {
    const result = onChoose?.(skillId);
    if (result?.upgradedLevel) setUpgradeNotice({ skillId, level: result.upgradedLevel });
  };

  return (
    <section className="screen-panel reward-panel" aria-labelledby="reward-title">
      <button className="back-button" type="button" onClick={onHome}>← 메인 화면</button>
      <p className="eyebrow">STAGE CLEAR · TEAM SKILL DRAFT</p>
      <h1 id="reward-title">{pendingEntry ? '팀 스킬 순서를 정하세요' : upgradeNotice ? '팀 스킬이 강화됐어요' : '승리 보상을 고르세요'}</h1>

      {pendingEntry ? <section className="team-skill-placement" aria-label="새 스킬을 넣을 순서 선택">
        <p className="intro">{skills[pendingEntry.skillId]?.name ?? pendingEntry.skillId}을(를) 팀 공용 스킬 목록의 원하는 위치에 넣으세요.</p>
        <div className="team-skill-placement-list">
          {placementDeck.map((entry, index) => (
            <div className="team-skill-placement-slot" key={entry.skillId}>
              <button type="button" className="skill-insert-button" onClick={() => onPlace?.(index)}>
                {index === 0 ? '맨 앞에 배치' : '이 위치에 배치'}
              </button>
              <SkillDeckEntry entry={entry} index={index} skills={skills} />
            </div>
          ))}
          <button type="button" className="skill-insert-button" onClick={() => onPlace?.(placementDeck.length)}>
            {placementDeck.length === 0 ? '첫 번째 스킬로 배치' : '맨 뒤에 배치'}
          </button>
        </div>
      </section> : upgradeNotice ? <section className="skill-upgrade-notice" role="status">
        <b>{skills[upgradeNotice.skillId]?.name ?? upgradeNotice.skillId} · Lv. {upgradeNotice.level}</b>
        <p>팀 공용 스킬의 순서는 그대로 유지됩니다.</p>
        <button type="button" className="primary-button" onClick={onContinue}>계속</button>
      </section> : activeOffer.length ? <>
        <p className="intro">필살기는 선수별이 아니라 팀 전체가 함께 소유합니다. 새 스킬은 순서에 배치하고, 이미 가진 강화 가능한 스킬은 레벨이 올라갑니다.</p>
        <div className="skill-card-grid reward-card-grid">
          {activeOffer.map((skillId, index) => {
            const skill = skills[skillId] ?? {};
            const owned = teamSkillDeck.find((entry) => entry.skillId === skillId);
            return <button className={`skill-card reward-card rarity-${skill.type ?? 'utility'}`} key={skillId} onClick={() => chooseSkill(skillId)}>
              <span className="reward-card-icon"><img src={skill.artwork} alt="" aria-hidden="true" /></span>
              <span className="reward-rarity">TEAM SKILL · 0{index + 1}</span>
              <b>{skill.name ?? skillId}</b>
              <span>{skill.type === 'attack' ? '공격 스킬' : skill.type === 'defense' ? '수비 스킬' : '유틸리티 스킬'}</span>
              <small>{skill.description}</small>
              <em>{owned ? `강화 · Lv. ${owned.level} → ${owned.level + 1}` : '새 팀 스킬'}</em>
            </button>;
          })}
        </div>
      </> : <section className="skill-upgrade-notice" role="status">
        <b>새로 선택할 수 있는 스킬이 없습니다.</b>
        <p>팀이 보유한 모든 스킬이 현재 최대 레벨입니다.</p>
        <button type="button" className="primary-button" onClick={onContinue}>계속</button>
      </section>}

      <div className="team-skill-deck-summary" aria-label="현재 팀 스킬 순서">
        <h2>팀 스킬 순서</h2>
        {visibleDeck.length
          ? visibleDeck.map((entry, index) => <SkillDeckEntry key={entry.skillId} entry={entry} index={index} skills={skills} />)
          : <p>아직 보유한 팀 스킬이 없습니다.</p>}
      </div>
    </section>
  );
}

function SkillDeckEntry({ entry, index, skills }) {
  const skill = skills[entry.skillId] ?? {};
  return (
    <div className="team-skill-entry">
      <span className="team-skill-position">{String(index + 1).padStart(2, '0')}</span>
      <span className="team-skill-icon"><img src={skill.artwork} alt="" aria-hidden="true" /></span>
      <span className="team-skill-copy"><b>{skill.name ?? entry.skillId}</b><small>{entry.skillId === 'rainbowReflect' ? '자동 발동 · 패시브' : `팀 공용 · Lv. ${entry.level}`}</small></span>
    </div>
  );
}
