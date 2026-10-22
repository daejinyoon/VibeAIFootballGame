import { useState } from 'react';

export default function StartScreen({ hasSave, nickname, profileError, onNicknameSave, onStart, onContinue, onOpenLeaderboard }) {
  const [draftNickname, setDraftNickname] = useState(nickname);
  return (
    <section className="screen-panel start-panel" aria-labelledby="game-title">
      <div className="start-copy">
        <p className="eyebrow"><span>DEX ARCADE</span> · SUNNY CUP</p>
        <h1 id="game-title">덱스 풋볼<br /><em>승리의 로드.</em></h1>
        <p className="intro">필드 3명과 골키퍼가 한 팀이 되어 5단계 AI 리그에 도전하세요. 승리할 때마다 스킬 카드를 얻습니다.</p>
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
          {Array.from({ length: 6 }, (_, index) => <span key={index} className={`preview-player ${index < 3 ? 'home' : 'away'}`} style={{ left: `${14 + ((index * 35) % 72)}%`, top: `${20 + ((index * 41) % 60)}%` }} />)}
          <span className="preview-ball" />
        </div>
        <p className="pitch-footer"><span>4 VS 4 · GK 포함</span><span>5 AI STAGES</span><span>SKILL DRAFT</span></p>
      </div>
      <div className="control-guide">
        <div><strong>이동</strong><span>방향키 ↑ ↓ ← →</span></div>
        <div><strong>공격</strong><span>A 로빙 패스 · S 땅볼 패스 · D 슛</span></div>
        <div><strong>수비</strong><span>A 태클 · S 선수 변경 · D 압박</span></div>
        <div><strong>스킬</strong><span>F 스킬 발동</span></div>
        <div><strong>점프</strong><span>SPACE 공중볼 경합 · 헤딩</span></div>
      </div>
    </section>
  );
}
