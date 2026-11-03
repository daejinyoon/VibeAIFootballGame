import { SKILLS } from '../game/skills.js';

function OutcomeLabel({ outcome }) {
  return <span className={`daily-outcome daily-outcome-${outcome}`}>
    {outcome === 'win' ? '승리' : outcome === 'draw' ? '무승부' : '패배'}
  </span>;
}

function Score({ homeGoals, awayGoals }) {
  return <p className="daily-score" aria-label={`우리 팀 ${homeGoals} 대 ${awayGoals} 상대 팀`}>
    <span>우리 팀</span><b>{homeGoals}</b><i>:</i><b>{awayGoals}</b><span>상대 팀</span>
  </p>;
}

function Leaderboard({ records }) {
  if (!records.length) {
    return <div className="daily-empty-records"><strong>아직 오늘 기록이 없습니다.</strong><span>첫 경기를 플레이하고 순위에 이름을 올려 보세요.</span></div>;
  }
  return <ol className="daily-record-list" tabIndex="0" aria-label="오늘의 챌린지 순위">
    {records.map((record, index) => (
      <li key={`${record.rank}-${record.displayName}-${index}`}>
        <b className="daily-record-rank">{String(record.rank).padStart(2, '0')}</b>
        <strong>{record.displayName}</strong>
        <span className="daily-record-outcome"><OutcomeLabel outcome={record.outcome} /></span>
        <span className="daily-record-score">{record.homeGoals} : {record.awayGoals}</span>
        <small>골 차 {record.goalDifference > 0 ? '+' : ''}{record.goalDifference}</small>
      </li>
    ))}
  </ol>;
}

export default function DailyChallengeScreen({
  data, loading = false, errorMessage = '', result, saving = false, submitError = '',
  onRefresh, onStart, onRetrySubmit, onRetryMatch, onHome,
}) {
  const challenge = data?.challenge;
  const skills = challenge?.skillIds.map((skillId) => SKILLS[skillId]?.name ?? skillId) ?? [];

  return (
    <section className="screen-panel daily-challenge-panel" aria-labelledby="daily-challenge-title">
      <div className="daily-challenge-heading">
        <div>
          <p className="eyebrow">DEX ARCADE · DAILY MATCH</p>
          <h1 id="daily-challenge-title">오늘의 챌린지</h1>
          {challenge && <p className="daily-date">KST · {challenge.date}</p>}
        </div>
        <span className="daily-challenge-stamp" aria-hidden="true">TODAY<br />ONLY</span>
      </div>

      {loading && <p className="daily-status" role="status">오늘의 챌린지와 순위를 불러오는 중입니다…</p>}
      {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}

      {result ? (
        <>
          <div className="daily-result-card">
            <p className="eyebrow">MATCH RESULT</p>
            <OutcomeLabel outcome={result.outcome} />
            <Score homeGoals={result.homeGoals} awayGoals={result.awayGoals} />
            {saving && <p className="daily-status" role="status">경기 결과를 순위에 제출하고 있습니다…</p>}
            {result.dayChanged && result.saved && <p className="daily-stale" role="status">오늘 챌린지가 갱신되었습니다. 이 결과는 이전 챌린지에서 서버가 확인한 기록입니다.</p>}
            {result.saved && !result.dayChanged && data?.challenge.challengeId === result.challengeId
              && <p className="daily-saved" role="status">서버 기록 확인 완료 · 오늘 최고 기록 <b>{result.rank}위</b></p>}
            {result.stale && <p className="daily-stale" role="status">챌린지가 갱신되어 이전 경기 결과는 등록되지 않았습니다. 새 챌린지에서 다시 플레이해 주세요.</p>}
            {!saving && !result.saved && !result.stale && submitError && <p className="profile-error" role="alert">{submitError}</p>}
          </div>
          {data && <Leaderboard records={data.records} />}
          <div className="actions daily-actions">
            {!result.stale && !result.saved && !saving && submitError && <button className="primary-button" type="button" onClick={onRetrySubmit}>결과 다시 제출</button>}
            {result.stale
              ? <button className="primary-button" type="button" disabled={loading || !data} onClick={data ? onRetryMatch : onRefresh}>{data ? '새 챌린지 플레이' : '오늘 챌린지 새로고침'}</button>
              : <button className="primary-button" type="button" disabled={!data || loading || (!result.saved && !result.stale)} onClick={onRetryMatch}>다시 경기하기</button>}
            <button className="secondary-button" type="button" disabled={loading} onClick={onRefresh}>순위 새로고침</button>
            <button className="secondary-button" type="button" onClick={onHome}>메인 화면</button>
          </div>
        </>
      ) : (
        <>
          {challenge && <>
            <div className="daily-rule-grid" aria-label="오늘 경기 규칙">
              <div><span>경기 시간</span><strong>{challenge.regulationSeconds}초</strong></div>
              <div><span>AI 난이도</span><strong>STAGE {challenge.aiStage}</strong></div>
              <div><span>스킬 사용</span><strong>각 1회</strong></div>
            </div>
            <section className="daily-skill-rule" aria-labelledby="daily-skill-title">
              <h2 id="daily-skill-title">양 팀 공통 스킬</h2>
              <ul>{skills.map((skill) => <li key={skill}>{skill}<small>Lv.1 · 1회</small></li>)}</ul>
            </section>
            {data.myRecord && <section className="daily-my-record" aria-label="내 오늘 최고 기록">
              <b>내 최고 기록 · {data.myRecord.rank}위</b>
              <span>{data.myRecord.homeGoals} : {data.myRecord.awayGoals}</span>
              <OutcomeLabel outcome={data.myRecord.outcome} />
            </section>}
            {!data.myRecord && <p className="daily-no-personal-record" role="status">아직 오늘 개인 기록이 없습니다. 챌린지를 플레이해 첫 기록을 남겨 보세요.</p>}
            <section className="daily-leaderboard" aria-labelledby="daily-leaderboard-title">
              <div className="daily-section-heading"><div><p className="eyebrow">TODAY'S TOP 100</p><h2 id="daily-leaderboard-title">오늘의 회사 순위</h2></div></div>
              <Leaderboard records={data.records} />
            </section>
          </>}
          <div className="actions daily-actions">
            {data && <button className="primary-button" type="button" disabled={loading} onClick={onStart}>챌린지 시작</button>}
            {!data && <button className="primary-button" type="button" disabled={loading} onClick={onRefresh}>오늘 챌린지 불러오기</button>}
            <button className="secondary-button" type="button" disabled={loading} onClick={onRefresh}>새로고침</button>
            <button className="secondary-button" type="button" onClick={onHome}>메인 화면</button>
          </div>
        </>
      )}
    </section>
  );
}
