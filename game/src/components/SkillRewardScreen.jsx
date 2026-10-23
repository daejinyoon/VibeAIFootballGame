import { useState } from 'react';

export default function SkillRewardScreen({
  offer = null,
  ownedTeamSkills = [],
  skills = {},
  onChoose,
  onContinue,
  onHome,
}) {
  const [upgradeSkillId, setUpgradeSkillId] = useState(null);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const activeOffer = Array.isArray(offer) ? offer : [];
  const upgradeEntry = ownedTeamSkills.find((entry) => entry.skillId === upgradeSkillId);
  const upgradeSkill = skills[upgradeSkillId] ?? {};

  const chooseSkill = (skillId) => {
    const owned = ownedTeamSkills.find((entry) => entry.skillId === skillId);
    if (owned) {
      setUpgradeSkillId(skillId);
      return;
    }
    const result = onChoose?.(skillId);
    if (result) setRewardClaimed(true);
  };

  const confirmUpgrade = () => {
    if (!upgradeSkillId || !upgradeEntry) return;
    const result = onChoose?.(upgradeSkillId);
    if (!result) return;
    setRewardClaimed(true);
    setUpgradeSkillId(null);
  };

  return (
    <section className="screen-panel reward-panel" aria-labelledby="reward-title">
      <button className="back-button" type="button" onClick={onHome}>메인 화면</button>
      <p className="eyebrow">STAGE CLEAR · TEAM SKILL REWARD</p>
      <h1 id="reward-title">{upgradeSkillId ? '스킬 레벨업을 확인하세요' : activeOffer.length ? '보상 스킬을 고르세요' : rewardClaimed ? '스킬 보상을 받았습니다' : '선택 가능한 스킬이 없습니다'}</h1>

      {upgradeSkillId && upgradeEntry ? <section className="skill-upgrade-confirm" role="dialog" aria-modal="true" aria-labelledby="skill-upgrade-title">
        <span className="reward-card-icon"><img src={upgradeSkill.artwork} alt="" aria-hidden="true" /></span>
        <h2 id="skill-upgrade-title">{upgradeSkill.name ?? upgradeSkillId}</h2>
        <p>이 스킬을 레벨업할까요?</p>
        <p className="skill-level-change">Lv. {upgradeEntry.level} <span aria-hidden="true">→</span> Lv. {upgradeEntry.level + 1}</p>
        <div className="skill-upgrade-actions">
          <button type="button" className="secondary-button" onClick={() => setUpgradeSkillId(null)}>취소</button>
          <button type="button" className="primary-button" onClick={confirmUpgrade}>레벨업 확인</button>
        </div>
      </section> : activeOffer.length ? <>
        <p className="intro">새 스킬은 보유 목록에 추가됩니다. 이미 보유한 스킬은 확인한 뒤 레벨을 올릴 수 있습니다. 장착은 스킬 준비 화면에서 바꿀 수 있습니다.</p>
        <div className="skill-card-grid reward-card-grid">
          {activeOffer.map((skillId, index) => {
            const skill = skills[skillId] ?? {};
            const owned = ownedTeamSkills.find((entry) => entry.skillId === skillId);
            return <button className={`skill-card reward-card rarity-${skill.type ?? 'utility'}`} key={skillId} type="button" onClick={() => chooseSkill(skillId)}>
              <span className="reward-card-icon"><img src={skill.artwork} alt="" aria-hidden="true" /></span>
              <span className="reward-rarity">TEAM SKILL · 0{index + 1}</span>
              <b>{skill.name ?? skillId}</b>
              <span>{skill.type === 'attack' ? '공격 스킬' : skill.type === 'defense' ? '수비 스킬' : '유틸리티 스킬'}</span>
              <small>{skill.description}</small>
              <em>{owned ? `확인 후 레벨업 · Lv. ${owned.level} → ${owned.level + 1}` : '새 스킬 · 보유 목록에 추가'}</em>
            </button>;
          })}
        </div>
      </> : <section className="skill-upgrade-notice" role="status">
        <b>{rewardClaimed ? '보유 목록에 스킬 보상을 추가했습니다.' : '이번에는 선택할 수 있는 스킬이 없습니다.'}</b>
        <p>{rewardClaimed ? '스킬 준비 화면에서 장착할 스킬과 순서를 정하세요.' : '보유한 스킬이 모두 최고 레벨이거나 선택 가능한 보상이 없습니다.'}</p>
        <button type="button" className="primary-button" onClick={onContinue}>계속</button>
      </section>}

      <section className="team-skill-deck-summary" aria-labelledby="owned-skills-title">
        <h2 id="owned-skills-title">보유 스킬 · {ownedTeamSkills.length}개</h2>
        {ownedTeamSkills.length ? <ul className="reward-owned-list">
          {ownedTeamSkills.map((entry) => {
            const skill = skills[entry.skillId] ?? {};
            return <li className="team-skill-entry" key={entry.skillId}>
              <span className="team-skill-position" aria-hidden="true">◆</span>
              <span className="team-skill-icon"><img src={skill.artwork} alt="" aria-hidden="true" /></span>
              <span className="team-skill-copy"><b>{skill.name ?? entry.skillId}</b><small>보유 · Lv. {entry.level}</small></span>
            </li>;
          })}
        </ul> : <p>아직 보유한 스킬이 없습니다.</p>}
      </section>
    </section>
  );
}
