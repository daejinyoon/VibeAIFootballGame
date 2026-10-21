export default function ResultsScreen({ result, leaderboardPlace, onRetry, onContinue, onHome }) {
  const won = result.outcome !== 'loss';
  const title = result.outcome === 'campaignComplete' ? '캠페인 우승!' : won ? `${result.stage}단계 승리!` : `${result.stage}단계 패배`;
  return (
    <section className="screen-panel result-panel" aria-labelledby="result-title">
      <p className="eyebrow">{result.outcome === 'campaignComplete' ? 'CAMPAIGN CLEAR' : `STAGE 0${result.stage} RESULT`}</p>
      <h1 id="result-title">{title}</h1>
      <div className="result-score"><span>우리 팀</span><b>{result.homeGoals}</b><i>:</i><b>{result.awayGoals}</b><span>상대 팀</span></div>
      <p className="intro">{result.outcome === 'campaignComplete' ? '세 단계를 모두 이겼습니다. 대단한 경기였어요!' : won ? `현재 누적 골 차이 ${result.goalDifference > 0 ? '+' : ''}${result.goalDifference}` : '다시 도전해 이 단계를 통과하세요.'}</p>
      {leaderboardPlace && <p>랭킹 {leaderboardPlace}위</p>}
      <div className="actions">
        {won ? <button className="primary-button" onClick={onContinue}>{result.outcome === 'campaignComplete' ? '새 캠페인' : '다음 단계 준비'} <span aria-hidden="true">→</span></button> : <button className="primary-button" onClick={onRetry}>같은 단계 다시 도전 <span aria-hidden="true">↻</span></button>}
        <button className="secondary-button" onClick={onHome}>메인 화면</button>
      </div>
    </section>
  );
}
