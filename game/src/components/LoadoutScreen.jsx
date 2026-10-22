import { useState } from 'react';

export default function LoadoutScreen({ stage = 2, playerRows = [], playerSkillStacks = {}, inventory = {}, skills = {}, onAssign, onConfirm, onBack }) {
  const [selectedSkill, setSelectedSkill] = useState(null);
  const available = Object.entries(inventory).filter(([, count]) => count > 0);
  const selectedName = selectedSkill ? skills[selectedSkill]?.name ?? selectedSkill : null;

  return (
    <section className="screen-panel loadout-panel" aria-labelledby="loadout-title">
      <button className="back-button" onClick={onBack}>← 메인 화면</button>
      <p className="eyebrow">TEAM SETUP · BEFORE STAGE {String(stage).padStart(2, '0')}</p>
      <h1 id="loadout-title">다음 경기를 준비하세요</h1>
      <p className="intro">보유 카드를 선수에게 옮겨 배치할 수 있어요. 선수를 선택하면 현재 스킬이 보유함으로 돌아옵니다.</p>
      <div className="loadout-layout">
        <section className="loadout-stock" aria-labelledby="stock-title">
          <div className="loadout-section-heading"><div><p className="eyebrow">SKILL INVENTORY</p><h2 id="stock-title">보유 카드</h2></div><span>{available.reduce((sum, [, count]) => sum + count, 0)}장</span></div>
          {available.length ? <div className="inventory-list">{available.map(([skillId, count]) => <button key={skillId} className={`inventory-card ${selectedSkill === skillId ? 'is-selected' : ''}`} aria-pressed={selectedSkill === skillId} onClick={() => setSelectedSkill(selectedSkill === skillId ? null : skillId)}>
            <span className="inventory-gem" aria-hidden="true">✦</span><span><b>{skills[skillId]?.name ?? skillId}</b><small>{skills[skillId]?.description}</small></span><em>×{count}</em>
          </button>)}</div> : <div className="inventory-empty">보유한 카드가 없어요.<br />다음 경기로 바로 이동할 수 있습니다.</div>}
          {selectedName && <p className="loadout-hint" role="status">{selectedName} 선택됨 · 장착할 선수를 누르세요.</p>}
        </section>
        <section className="loadout-roster" aria-labelledby="roster-title">
          <div className="loadout-section-heading"><div><p className="eyebrow">FIELD PLAYERS</p><h2 id="roster-title">필드 선수</h2></div><span>3명</span></div>
          <div className="loadout-player-list">{playerRows.map((player, index) => {
            const stack = playerSkillStacks[player.playerId];
            const canAssign = Boolean(selectedSkill && inventory[selectedSkill] > 0);
            return <button key={player.playerId} className={`loadout-player ${canAssign ? 'can-assign' : ''}`} disabled={!canAssign} onClick={() => { onAssign(player.playerId, selectedSkill); setSelectedSkill(null); }}>
              <span className="loadout-player-number">0{index + 1}</span><span className="loadout-player-info"><b>{player.displayName}</b><small>{stack ? `${skills[stack.skillId]?.name ?? stack.skillId} · 경기당 ${stack.copies}회` : '장착 스킬 없음'}</small></span><span className="loadout-player-action">{canAssign ? '배치 →' : 'PLAYER'}</span>
            </button>;
          })}</div>
          <div className="goalkeeper-note"><span aria-hidden="true">▣</span><span><b>골키퍼</b><small>스킬 장착 대상에서 제외</small></span><em>GK</em></div>
        </section>
      </div>
      <div className="setup-actions"><span className="validation-note">배치하지 않은 카드는 보유함에 남습니다.</span><button className="primary-button" onClick={onConfirm}>다음 경기 시작 <span aria-hidden="true">→</span></button></div>
    </section>
  );
}
