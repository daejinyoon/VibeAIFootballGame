import { useState } from 'react';

export default function StartScreen({ hasSave, nickname, profileError, onNicknameSave, onStart, onContinue, onOpenLeaderboard }) {
  const [draftNickname, setDraftNickname] = useState(nickname);
  return (
    <section className="screen-panel start-panel" aria-labelledby="game-title">
      <div className="start-copy">
        <p className="eyebrow"><span>SEASON 01</span> · GOLDEN ROAD</p>
        <h1 id="game-title">덱스 픽셀<br /><em>축구왕을 향해.</em></h1>
        <p className="intro">6대6 경기를 이기고, 세 단계를 돌파해 보스에게 도전하세요.</p>
        <p className="welcome">{nickname ? `환영합니다, ${nickname}님` : '플레이에 사용할 별명을 입력해 주세요.'}</p>
        <form className="nickname-form" onSubmit={(event) => { event.preventDefault(); onNicknameSave(draftNickname); }}>
          <label htmlFor="nickname">플레이어 별명</label>
          <div><input id="nickname" value={draftNickname} onChange={(event) => setDraftNickname(event.target.value)} maxLength={16} placeholder="2~16자" /><button className="secondary-button" type="submit">별명 저장</button></div>
        </form>
        {profileError && <p className="profile-error" role="alert">{profileError}</p>}
        <div className="actions">
          <button className="primary-button" disabled={!nickname} onClick={onStart}>새 캠페인 시작 <span aria-hidden="true">→</span></button>
          {hasSave && <button className="secondary-button" disabled={!nickname} onClick={onContinue}>이어 하기 →</button>}
          <button className="secondary-button" disabled={!nickname} onClick={onOpenLeaderboard}>랭킹 보기 →</button>
        </div>
      </div>
      <div className="start-preview" aria-hidden="true">
        <div className="preview-score"><span>HOME</span><b>00</b><i>:</i><b>00</b><span>AWAY</span></div>
        <div className="preview-pitch"><div className="preview-lines" />
          {Array.from({ length: 12 }, (_, index) => <span key={index} className={`preview-player ${index < 6 ? 'home' : 'away'}`} style={{ left: `${10 + ((index * 37) % 81)}%`, top: `${14 + ((index * 53) % 70)}%` }} />)}
          <span className="preview-ball" />
        </div>
        <p className="pitch-footer"><span>6 VS 6</span><span>3 STAGES</span><span>GOLDEN GOAL</span></p>
      </div>
      <div className="control-guide">
        <div><strong>이동</strong><span>방향키 ↑ ↓ ← →</span></div>
        <div><strong>공격</strong><span>A 로빙 패스 · S 땅볼 패스 · D 슛</span></div>
        <div><strong>수비</strong><span>A 태클 · S 선수 변경 · D 압박</span></div>
        <div><strong>스킬</strong><span>F 스킬 발동</span></div>
      </div>
    </section>
  );
}
