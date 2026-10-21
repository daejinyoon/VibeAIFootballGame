import { useMemo } from 'react';
import { validateLoadout } from '../game/skills.js';

export default function LoadoutScreen({ playerRows, loadout, skillIds, skills, onAssign, onConfirm, onBack }) {
  const validation = useMemo(() => validateLoadout(loadout), [loadout]);
  const assigned = Object.values(loadout).filter(Boolean).length;

  return (
    <section className="screen-panel setup-panel" aria-labelledby="loadout-title">
      <div className="panel-heading">
        <button className="back-button" onClick={onBack}>← 뒤로</button>
        <p className="eyebrow">TEAM SETUP · 6 PLAYERS</p>
        <h1 id="loadout-title">선수 스킬 설정</h1>
        <p className="intro">선수 여섯 명에게 서로 다른 스킬을 하나씩 배정하세요. 포지션 제한은 없습니다.</p>
      </div>
      <div className="roster-list">
        {playerRows.map((player, index) => (
          <label className="roster-row" key={player.playerId}>
            <span className="roster-number">0{index + 1}</span>
            <span className="roster-name"><b>{player.displayName}</b><small>{player.role}</small></span>
            <select value={loadout[player.playerId] ?? ''} onChange={(event) => onAssign(player.playerId, event.target.value)} aria-label={`${player.displayName} 스킬`}>
              <option value="">스킬 선택</option>
              {skillIds.map((skillId) => {
                const taken = Object.entries(loadout).some(([otherId, equipped]) => otherId !== player.playerId && equipped === skillId);
                return <option key={skillId} value={skillId} disabled={taken}>{skills[skillId].name}{taken ? ' · 배정됨' : ''}</option>;
              })}
            </select>
            <span className="skill-type">{loadout[player.playerId] ? skills[loadout[player.playerId]]?.type : '미배정'}</span>
          </label>
        ))}
      </div>
      <div className="setup-actions">
        <span className={validation.valid ? 'validation-ok' : 'validation-note'}>{validation.valid ? '구성이 준비됐어요.' : `${assigned}/6 배정 · 중복 없이 6개를 선택하세요.`}</span>
        <button className="primary-button" disabled={!validation.valid} onClick={onConfirm}>1단계 경기 시작 <span aria-hidden="true">→</span></button>
      </div>
    </section>
  );
}
