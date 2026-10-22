export default function ResultsScreen({ result, leaderboardPlace, errorMessage, onRetry, onContinue, onHome }) {
  const won = result.outcome !== 'loss';
  const complete = result.outcome === 'campaignComplete';
  const title = complete ? '캠페인 우승!' : won ? `${result.stage}단계 승리!` : `${result.stage}단계 패배`;

  return (
    <section className="screen-panel result-panel" aria-labelledby="result-title">
      <p className="eyebrow">{complete ? 'CAMPAIGN CLEAR' : `STAGE 0${result.stage} RESULT`}</p>
      <h1 id="result-title">{title}</h1>
      <div className="result-score"><span>우리 팀</span><b>{result.homeGoals}</b><i>:</i><b>{result.awayGoals}</b><span>상대 팀</span></div>
      <p className="intro">{complete
        ? '다섯 단계를 모두 클리어했습니다. 마지막 승리 보상을 확인하고 우승을 마무리하세요.'
        : won ? `누적 골 차 ${result.goalDifference > 0 ? '+' : ''}${result.goalDifference}` : '캠페인 진행과 보유 스킬은 유지됩니다. 같은 단계에 다시 도전해 보세요.'}</p>
      {leaderboardPlace && <p>현재 기록 순위 {leaderboardPlace}위</p>}
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      <div className="actions">
        {won
          ? <button className="primary-button" onClick={onContinue}>
            {complete ? '메인 화면' : '승리 보상 받기'} <span aria-hidden="true">→</span>
          </button>
          : <button className="primary-button" onClick={onRetry}>같은 단계 다시 도전 <span aria-hidden="true">→</span></button>}
        <button className="secondary-button" onClick={onHome}>메인 화면</button>
      </div>
    </section>
  );
}
