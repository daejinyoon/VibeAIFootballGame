const statusLabels = {
  submitting: '결과를 서버에 제출하고 있습니다.',
  awaitingOpponent: '상대의 결과 확인을 기다리는 중입니다.',
  recorded: '경기 결과가 순위에 기록되었습니다.',
  disputed: '결과가 일치하지 않아 순위에 기록되지 않았습니다.',
  notRecorded: '결과를 확인하지 못했습니다. 다시 확인해 주세요.',
};

export default function PvpResultsScreen({ result, confirmationStatus, errorMessage, onLeaderboard, onHome, onRetry }) {
  const outcome = result?.localOutcome;
  const label = outcome === 'draw' ? '무승부' : outcome === 'win' ? '승리' : '패배';
  const isForfeit = result?.kind === 'forfeit';
  return (
    <section className="screen-panel pvp-results-panel" aria-labelledby="pvp-result-title">
      <p className="eyebrow">COMPANY PVP · {isForfeit ? 'FORFEIT' : 'MATCH RESULT'}</p>
      <p className={`result-outcome result-outcome-${outcome ?? 'loss'}`} role="status">{label}</p>
      <h1 id="pvp-result-title">{isForfeit ? '기권 경기' : '대전 결과'}</h1>
      {isForfeit
        ? <p className="intro">{result.loser === result.localTeam ? '연결이 끊겨 기권패로 기록되었습니다.' : '상대의 연결이 끊겨 기권승으로 기록되었습니다.'}</p>
        : <div className="result-score" aria-label={`홈 ${result.homeGoals} 대 ${result.awayGoals} 원정`}>
          <span>홈</span><b>{result.homeGoals}</b><i>:</i><b>{result.awayGoals}</b><span>원정</span>
        </div>}
      {!isForfeit && <p className="pvp-confirmation" role="status">{statusLabels[confirmationStatus] ?? statusLabels.submitting}</p>}
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      <div className="actions">
        {confirmationStatus === 'notRecorded' && <button className="secondary-button" type="button" onClick={onRetry}>결과 다시 확인</button>}
        <button className="primary-button" type="button" onClick={onLeaderboard}>회사 순위 보기</button>
        <button className="secondary-button" type="button" onClick={onHome}>메인 화면</button>
      </div>
    </section>
  );
}
