export default function LeaderboardScreen({ records, onBack }) {
  const sorted = [...records].sort((a, b) => b.stageReached - a.stageReached || b.goalDifference - a.goalDifference || a.nickname.localeCompare(b.nickname, 'ko'));
  return (
    <section className="screen-panel leaderboard-panel" aria-labelledby="leaderboard-title">
      <button className="back-button" onClick={onBack}>← 메인 화면</button>
      <p className="eyebrow">LOCAL RECORDS</p><h1 id="leaderboard-title">랭킹</h1>
      <p className="intro">이 브라우저에 저장된 최고 기록을 보여줍니다.</p>
      {sorted.length ? <ol className="record-list">{sorted.map((record, index) => <li key={`${record.nickname}-${index}`}><b>{String(index + 1).padStart(2, '0')}</b><span>{record.nickname}</span><span>{record.stageReached}단계</span><span>골 차 {record.goalDifference}</span></li>)}</ol> : <div className="empty-records"><span aria-hidden="true">🏆</span><b>아직 등록된 기록이 없어요.</b><small>캠페인을 완료하면 기록이 여기에 표시됩니다.</small></div>}
    </section>
  );
}
