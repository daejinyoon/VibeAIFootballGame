import { STAGE_COUNT } from '../game/constants.js';
import { getUnlockedStage } from '../game/campaign.js';

export default function StageSelectScreen({ campaign, stageResults = [], selectedStage, onSelectStage, onStartStage, onOpenLoadout, onHome }) {
  const unlockedStage = getUnlockedStage(campaign);
  const resultByStage = new Map(stageResults.map((result) => [result.stage, result]));
  const selectedResult = resultByStage.get(selectedStage);

  return (
    <section className="screen-panel stage-select-panel" aria-labelledby="stage-select-title">
      <div className="stage-map-heading">
        <div>
          <p className="eyebrow">SUNNY CUP · STAGE MAP</p>
          <h1 id="stage-select-title">다음 승부를 골라요!</h1>
          <p className="intro">클리어한 스테이지는 언제든 다시 도전할 수 있어요. 새로운 스테이지를 열어 보세요.</p>
        </div>
        <div className="stage-unlock-badge" aria-label={`현재 ${unlockedStage}단계까지 해금됨`}>
          <span>UNLOCKED</span><b>{String(unlockedStage).padStart(2, '0')} / 05</b>
        </div>
      </div>

      {campaign.status === 'complete' && <p className="campaign-clear-banner" role="status">🏆 SUNNY CUP 우승! 원하는 스테이지를 다시 플레이해 보세요.</p>}

      <div className="stage-card-grid" role="group" aria-label="플레이할 스테이지 선택">
        {Array.from({ length: STAGE_COUNT }, (_, index) => index + 1).map((stage) => {
          const clearedResult = resultByStage.get(stage);
          const locked = stage > unlockedStage;
          const continuation = stage === campaign.currentStage && !clearedResult;
          const selected = stage === selectedStage;
          const status = locked ? '잠김' : clearedResult ? '클리어 · 재도전 가능' : '도전 가능';
          return (
            <button
              key={stage}
              type="button"
              className={`stage-card${selected ? ' is-selected' : ''}${locked ? ' is-locked' : ''}${clearedResult ? ' is-cleared' : ''}`}
              disabled={locked}
              aria-pressed={selected}
              aria-label={`스테이지 ${stage}, ${status}${clearedResult ? `, 이전 점수 ${clearedResult.homeGoals}대 ${clearedResult.awayGoals}` : ''}`}
              onClick={() => onSelectStage(stage)}
            >
              <span className="stage-card-topline"><span>STAGE</span><b>{String(stage).padStart(2, '0')}</b></span>
              <span className="stage-card-emblem" aria-hidden="true">{locked ? '🔒' : stage === STAGE_COUNT ? '🏆' : clearedResult ? '★' : '⚽'}</span>
              <strong>{stage === STAGE_COUNT ? 'FINAL MATCH' : `ROUND ${String(stage).padStart(2, '0')}`}</strong>
              <span className={`stage-card-status${locked ? ' locked' : clearedResult ? ' cleared' : ''}`}>
                {locked ? '잠김' : clearedResult ? 'CLEAR · 재도전' : continuation ? 'NEXT · 이어하기' : '도전 가능'}
              </span>
              {clearedResult
                ? <span className="stage-card-score">최고 결과 <b>{clearedResult.homeGoals} : {clearedResult.awayGoals}</b></span>
                : <span className="stage-card-score">{locked ? '이전 스테이지를 클리어하세요' : continuation ? '캠페인 진행 단계' : '새로운 라이벌이 기다려요'}</span>}
            </button>
          );
        })}
      </div>

      <div className="stage-select-actions">
        <div className="stage-selection-summary" aria-live="polite">
          <span>선택한 스테이지</span>
          <b>{String(selectedStage).padStart(2, '0')}</b>
          <small>{selectedResult ? `재도전 · 이전 ${selectedResult.homeGoals}:${selectedResult.awayGoals}` : '새로운 도전'}</small>
        </div>
        <div className="stage-action-buttons">
          <button type="button" className="secondary-button" onClick={onOpenLoadout}>팀 편성</button>
          <button type="button" className="primary-button" onClick={onStartStage}>경기 시작 <span aria-hidden="true">→</span></button>
          <button type="button" className="stage-home-button" onClick={onHome}>메인 화면</button>
        </div>
      </div>
    </section>
  );
}
