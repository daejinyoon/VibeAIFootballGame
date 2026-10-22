export default function ResultsScreen({
  result,
  leaderboardPlace,
  errorMessage,
  skillOffer,
  pendingAssignmentSkill,
  playerRows = [],
  skills = {},
  inventory = {},
  onChooseSkill,
  onAssignSkill,
  onRetry,
  onContinue,
  onHome,
}) {
  const won = result.outcome !== 'loss';
  const title = result.outcome === 'campaignComplete'
    ? '캠페인 우승!'
    : won ? `${result.stage}단계 승리!` : `${result.stage}단계 패배`;
  const needsReward = won && (skillOffer?.length > 0 || pendingAssignmentSkill);
  const selectedSkill = skills[pendingAssignmentSkill];

  return (
    <section className="screen-panel result-panel" aria-labelledby="result-title">
      <p className="eyebrow">{result.outcome === 'campaignComplete' ? 'CAMPAIGN CLEAR' : `STAGE 0${result.stage} RESULT`}</p>
      <h1 id="result-title">{title}</h1>
      <div className="result-score"><span>우리 팀</span><b>{result.homeGoals}</b><i>:</i><b>{result.awayGoals}</b><span>상대 팀</span></div>
      <p className="intro">{result.outcome === 'campaignComplete'
        ? '다섯 단계를 모두 클리어했습니다. 마지막 보상도 선수에게 장착해 보세요.'
        : won ? `현재 누적 골 차 ${result.goalDifference > 0 ? '+' : ''}${result.goalDifference}` : '같은 단계에 다시 도전할 수 있어요.'}</p>
      {leaderboardPlace && <p>기록 순위 {leaderboardPlace}위</p>}
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}

      {skillOffer?.length > 0 && <section className="skill-reward" aria-labelledby="skill-reward-title">
        <p className="eyebrow">STAGE CLEAR REWARD</p>
        <h2 id="skill-reward-title">스킬 카드 하나를 선택하세요</h2>
        <p>선택한 카드는 선수 한 명에게 장착할 수 있습니다.</p>
        <div className="skill-card-grid">
          {skillOffer.map((skillId) => <button className="skill-card" key={skillId} onClick={() => onChooseSkill(skillId)}>
            <b>{skills[skillId]?.name ?? skillId}</b>
            <span>{skills[skillId]?.type}</span>
            <small>{skills[skillId]?.description}</small>
            <em>보유 {inventory?.[skillId] ?? 0}장</em>
          </button>)}
        </div>
      </section>}

      {pendingAssignmentSkill && <section className="skill-assignment" aria-labelledby="skill-assignment-title">
        <p className="eyebrow">PLAYER ASSIGNMENT</p>
        <h2 id="skill-assignment-title">{selectedSkill?.name ?? pendingAssignmentSkill} 카드를 장착할 선수를 고르세요</h2>
        <div className="skill-player-grid">
          {playerRows.map((player) => {
            const sameSkill = player.stack?.skillId === pendingAssignmentSkill;
            const copies = player.stack?.copies ?? 0;
            const atLimit = sameSkill && copies >= 3;
            return <button className="skill-player-card" key={player.playerId} disabled={atLimit} onClick={() => onAssignSkill(player.playerId)}>
              <b>{player.displayName}</b>
              <span>{player.stack ? `${skills[player.stack.skillId]?.name ?? player.stack.skillId} ×${copies}` : '스킬 없음'}</span>
              <small>{atLimit ? '최대 3회 사용' : sameSkill ? `장착하면 경기당 ${copies + 1}회 사용` : '장착하면 경기당 1회 사용'}</small>
            </button>;
          })}
        </div>
      </section>}

      <div className="actions">
        {won
          ? <button className="primary-button" disabled={Boolean(needsReward)} onClick={onContinue}>
            {result.outcome === 'campaignComplete' ? '메인 화면' : '다음 단계 준비'} <span aria-hidden="true">→</span>
          </button>
          : <button className="primary-button" onClick={onRetry}>같은 단계 다시 도전 <span aria-hidden="true">→</span></button>}
        <button className="secondary-button" onClick={onHome}>메인 화면</button>
      </div>
    </section>
  );
}
