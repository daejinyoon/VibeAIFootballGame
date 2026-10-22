const SKILL_ICONS = { attack: '✦', defense: '◈', utility: '✧' };

export default function SkillRewardScreen({ offer = [], inventory = {}, playerSkillStacks = {}, playerRows = [], skills = {}, selectedSkill, onChoose, onAssign, onKeep, onHome }) {
  const hasSelection = Boolean(selectedSkill);
  const activeOffer = Array.isArray(offer) ? offer : [];
  return (
    <section className="screen-panel reward-panel" aria-labelledby="reward-title">
      <button className="back-button" onClick={onHome}>← 메인 화면</button>
      <p className="eyebrow">STAGE CLEAR · SKILL DRAFT</p>
      <h1 id="reward-title">{hasSelection ? '보상 카드를 배치하세요' : '승리 보상을 선택하세요'}</h1>
      <p className="intro">{hasSelection
        ? `${skills[selectedSkill]?.name ?? selectedSkill} 카드를 선수에게 장착하거나 보관할 수 있어요.`
        : '세 장 중 한 장을 골라요. 필드 선수 한 명에게 장착하거나 보유함에 둘 수 있습니다.'}</p>

      {!hasSelection && <div className="skill-card-grid reward-card-grid">
        {activeOffer.map((skillId, index) => {
          const skill = skills[skillId] ?? {};
          return <button className={`skill-card reward-card rarity-${skill.type ?? 'utility'}`} key={skillId} onClick={() => onChoose(skillId)}>
            <span className="reward-card-icon" aria-hidden="true">{SKILL_ICONS[skill.type] ?? '✦'}</span>
            <span className="reward-rarity">SKILL CARD · 0{index + 1}</span>
            <b>{skill.name ?? skillId}</b><span>{skill.type === 'attack' ? '공격 스킬' : skill.type === 'defense' ? '수비 스킬' : '유틸리티 스킬'}</span>
            <small>{skill.description}</small><em>보유 {inventory[skillId] ?? 0}장</em>
          </button>;
        })}
      </div>}

      {hasSelection && <section className="skill-assignment reward-assignment" aria-labelledby="assignment-title">
        <p className="eyebrow">CHOOSE A FIELD PLAYER</p>
        <h2 id="assignment-title">장착할 선수를 선택하세요</h2>
        <p>같은 스킬을 모으면 해당 선수의 경기당 사용 횟수가 최대 3회까지 늘어납니다.</p>
        <div className="skill-player-grid">
          {playerRows.map((player) => {
            const stack = playerSkillStacks[player.playerId];
            const sameSkill = stack?.skillId === selectedSkill;
            const maxed = sameSkill && stack.copies >= 3;
            return <button className="skill-player-card" key={player.playerId} disabled={maxed} onClick={() => onAssign(player.playerId)}>
              <span className="player-card-number">{player.playerId.endsWith('def-1') ? '01' : player.playerId.endsWith('mid-1') ? '02' : '03'}</span>
              <b>{player.displayName}</b>
              <span>{stack ? `${skills[stack.skillId]?.name ?? stack.skillId} ×${stack.copies}` : '스킬 없음'}</span>
              <small>{maxed ? '최대 3회 사용' : sameSkill ? `장착하면 경기당 ${stack.copies + 1}회 사용` : stack ? '기존 스킬은 보유함으로 이동' : '경기당 1회 사용'}</small>
            </button>;
          })}
        </div>
        <div className="reward-actions"><button className="secondary-button" onClick={onKeep}>보유함에 보관</button><button className="text-button" onClick={onHome}>나중에 결정</button></div>
      </section>}
      <div className="reward-roster-note">필드 선수 3명만 스킬을 장착할 수 있어요 · 골키퍼는 스킬 장착 대상에서 제외됩니다.</div>
    </section>
  );
}
