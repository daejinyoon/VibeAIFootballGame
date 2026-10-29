export default function PvpLeaderboardScreen({ records = [], loading = false, errorMessage = '', onRefresh, onBack }) {
  return (
    <section className="screen-panel leaderboard-panel pvp-leaderboard-panel" aria-labelledby="pvp-leaderboard-title">
      <button className="back-button" type="button" onClick={onBack}>← 결과 화면</button>
      <p className="eyebrow">COMPANY PVP RECORDS</p>
      <h1 id="pvp-leaderboard-title">회사 사용자 순위</h1>
      <p className="intro">기권승을 포함한 PvP 승리 횟수 순위입니다.</p>
      {loading && <p className="pvp-confirmation" role="status">순위를 불러오는 중입니다…</p>}
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
      {!loading && !errorMessage && (records.length
        ? <ol className="pvp-record-list">{records.map((record, index) => (
          <li key={`${record.rank}-${record.displayName}-${index}`}>
            <b className="pvp-record-rank">{String(record.rank).padStart(2, '0')}</b>
            <strong>{record.displayName}</strong>
            <span><b>{record.wins}</b>승</span>
            <span>{record.losses}패</span>
            <span>{record.draws}무</span>
            <span>{record.matchesPlayed}경기</span>
          </li>
        ))}</ol>
        : <div className="empty-records"><b>아직 등록된 PvP 기록이 없습니다.</b><small>회사 사용자와 첫 경기를 시작해 보세요.</small></div>)}
      <div className="actions">
        <button className="secondary-button" type="button" disabled={loading} onClick={onRefresh}>새로고침</button>
        <button className="primary-button" type="button" onClick={onBack}>돌아가기</button>
      </div>
    </section>
  );
}
