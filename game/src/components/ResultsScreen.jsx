export default function ResultsScreen({ result, leaderboardPlace, errorMessage, onRetry, onContinue, onHome }) {
  const complete = result.outcome === 'campaignComplete';
  const won = result.outcome === 'win' || complete;
  const drawn = result.outcome === 'draw';
  const stageLabel = `STAGE ${String(result.stage).padStart(2, '0')} RESULT`;
  const title = complete
    ? '캠페인 우승!'
    : drawn
      ? `${result.stage}단계 무승부`
      : won
        ? `${result.stage}단계 승리!`
        : `${result.stage}단계 패배`;
  const outcomeLabel = complete ? '캠페인 클리어' : drawn ? '무승부' : won ? '승리' : '패배';

  return (
    <section className="screen-panel result-panel" aria-labelledby="result-title">
      <p className="eyebrow">{complete ? 'CAMPAIGN CLEAR' : stageLabel}</p>
      <p className={`result-outcome result-outcome-${result.outcome}`} role="status">{outcomeLabel}</p>
      <h1 id="result-title">{title}</h1>
      <div className="result-score" aria-label={`우리 팀 ${result.homeGoals}대 ${result.awayGoals} 상대 팀`}>
        <span>우리 팀</span><b>{result.homeGoals}</b><i>:</i><b>{result.awayGoals}</b><span>상대 팀</span>
      </div>
      <p className="intro">
        {complete
          ? '다섯 단계를 모두 클리어했습니다. 마지막 승리 보상까지 받았습니다!'
          : won
            ? `승리 보상으로 스킬 카드를 선택하세요. 누적 골 차 ${result.goalDifference > 0 ? '+' : ''}${result.goalDifference}`
            : drawn
              ? '승부가 나지 않았습니다. 보상 없이 현재 단계를 다시 플레이할 수 있습니다.'
              : '이번 경기에서 패배했습니다. 보유 스킬과 캠페인 진행은 유지됩니다. 현재 단계에 다시 도전하세요.'}
      </p>
      {leaderboardPlace && <p>현재 기록 순위 {leaderboardPlace}위</p>}
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      <div className="actions">
        {won
          ? <button className="primary-button" onClick={onContinue}>
            {complete ? '메인 화면으로' : '승리 보상 받기'} <span aria-hidden="true">→</span>
          </button>
          : <button className="primary-button" onClick={onRetry}>현재 단계 다시 도전 <span aria-hidden="true">→</span></button>}
        <button className="secondary-button" onClick={onHome}>메인 화면</button>
      </div>
    </section>
  );
}
