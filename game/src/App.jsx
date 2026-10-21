import { useState } from 'react';

const screens = {
  start: '시작 화면',
  loadout: '스킬 설정',
  match: '경기',
  pause: '일시정지',
  results: '경기 결과',
  leaderboard: '랭킹',
};

export default function App() {
  const [screen, setScreen] = useState('start');

  return (
    <main className="page-shell">
      <div className="ambient ambient-left" aria-hidden="true" />
      <div className="ambient ambient-right" aria-hidden="true" />

      <header className="topbar">
        <a className="brand" href="#home" onClick={() => setScreen('start')}>
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>DEX ARCADE</span>
        </a>
        <span className="local-badge"><span /> LOCAL PLAY</span>
      </header>

      <section className="hero" aria-labelledby="game-title">
        <div className="hero-copy">
          <p className="eyebrow"><span>SEASON 01</span> · GOLDEN ROAD</p>
          <h1 id="game-title">한 골이면<br /><em>판도가 바뀐다.</em></h1>
          <p className="intro">
            우리 팀 6명과 함께 세 경기의 여정을 시작하세요.<br />
            마지막 승부는 보스전, 그리고 골든골로 끝납니다.
          </p>

          <div className="actions">
            <button className="primary-button" onClick={() => setScreen('loadout')}>
              <span>새 캠페인 시작</span><span aria-hidden="true">↗</span>
            </button>
            <button className="secondary-button" onClick={() => setScreen('leaderboard')}>
              랭킹 보기 <span aria-hidden="true">→</span>
            </button>
          </div>

          <p className="screen-note" aria-live="polite">
            {screen === 'start'
              ? '로컬 플레이 · 로그인 없이 바로 시작'
              : `${screens[screen]} 화면은 다음 개발 단계에서 연결됩니다.`}
          </p>
        </div>

        <div className="pitch-card" aria-label="픽셀 축구장 미리보기">
          <div className="score-chip"><span>HOME</span><b>00</b><i>:</i><b>00</b><span>AWAY</span></div>
          <div className="pitch">
            <div className="pitch-lines" aria-hidden="true">
              <span className="halfway" /><span className="center-circle" />
              <span className="box box-left" /><span className="box box-right" />
              <span className="goal goal-left" /><span className="goal goal-right" />
            </div>
            <span className="player player-blue p1" /><span className="player player-blue p2" />
            <span className="player player-blue p3" /><span className="player player-blue p4" />
            <span className="player player-blue p5" /><span className="player player-blue keeper-blue" />
            <span className="player player-orange p6" /><span className="player player-orange p7" />
            <span className="player player-orange p8" /><span className="player player-orange p9" />
            <span className="player player-orange p10" /><span className="player player-orange keeper-orange" />
            <span className="ball" />
            <span className="field-label field-label-top">DEX FIELD · 01</span>
            <span className="field-label field-label-bottom">KICK OFF</span>
          </div>
          <div className="pitch-footer"><span>6 PLAYERS</span><span>3 STAGES</span><span>ONE WINNER</span></div>
        </div>
      </section>

      <section className="controls" aria-label="게임 조작 안내">
        <div className="controls-heading">
          <span className="section-index">01</span>
          <div><h2>경기 조작</h2><p>공을 가진 순간, 공격과 수비가 바뀝니다.</p></div>
        </div>
        <div className="control-group">
          <span className="control-label">MOVE</span>
          <div className="key-set" aria-label="방향키">
            <kbd>↑</kbd><div><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></div>
          </div>
          <span className="control-description">이동</span>
        </div>
        <div className="control-group action-keys">
          <span className="control-label">ATTACK</span>
          <div className="key-set horizontal"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
          <span className="control-description">로빙 패스 · 땅볼 패스 · 슛</span>
        </div>
        <div className="control-group action-keys">
          <span className="control-label">DEFENSE</span>
          <div className="key-set horizontal"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
          <span className="control-description">태클 · 선수 변경 · 압박</span>
        </div>
        <div className="skill-hint"><kbd>F</kbd><span>스킬 발동</span></div>
      </section>

      <footer className="footer"><span>DEX FOOTBALL PROJECT</span><span>BUILT FOR THE LOVE OF THE GAME</span></footer>
    </main>
  );
}
