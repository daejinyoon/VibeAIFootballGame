import { useState } from 'react';

export default function StartScreen({ hasSave, nickname, profileError, onNicknameSave, onStart, onContinue, onOpenLeaderboard, onOpenTeamCustomization }) {
  const [draftNickname, setDraftNickname] = useState(nickname);

  return (
    <section className="screen-panel start-panel" aria-labelledby="game-title">
      <div className="start-copy">
        <p className="eyebrow"><span>DEX ARCADE</span> · SUNNY CUP</p>
        <p className="start-kicker">LOCAL ARCADE · 4 VS 4</p>
        <h1 id="game-title">골 넣고<br /><em>레벨 업!</em></h1>
        <p className="intro">필드 선수 3명과 골키퍼가 팀을 이뤄 5단계 AI 리그에 도전합니다. 승리할 때마다 스킬 카드를 골라 팀을 성장시키세요.</p>
        <p className="welcome">{nickname ? `어서 와요, ${nickname}! 오늘의 승부를 시작해 볼까요?` : '플레이어 별명을 정하고 오락실에 입장하세요.'}</p>
        <form className="nickname-form" onSubmit={(event) => { event.preventDefault(); onNicknameSave(draftNickname); }}>
          <label htmlFor="nickname">플레이어 별명</label>
          <div>
            <input id="nickname" value={draftNickname} onChange={(event) => setDraftNickname(event.target.value)} maxLength={16} placeholder="2~16자 별명" />
            <button className="secondary-button" type="submit">별명 저장</button>
          </div>
        </form>
        {profileError && <p className="profile-error" role="alert">{profileError}</p>}
        <div className="actions">
          <button className="secondary-button team-customization-entry" type="button" onClick={onOpenTeamCustomization}>팀 꾸미기 <span aria-hidden="true">→</span></button>
          <button className="primary-button" disabled={!nickname} onClick={onStart}>새 캠페인 시작 <span aria-hidden="true">→</span></button>
          {hasSave && <button className="secondary-button" disabled={!nickname} onClick={onContinue}>이어 하기 <span aria-hidden="true">↗</span></button>}
          <button className="secondary-button" disabled={!nickname} onClick={onOpenLeaderboard}>기록 보기 <span aria-hidden="true">↗</span></button>
        </div>
      </div>

      <div className="start-visual">
        <div className="poster-caption"><span>THE SUNNY CUP</span><b>오늘의 라이벌을 제쳐라!</b><i>01 / 05</i></div>
        <img className="start-poster" src="/images/arcade-football-poster.svg" alt="푸른 하늘 아래 두 축구 선수가 공을 향해 달려드는 아케이드 포스터" />
        <div className="poster-score" aria-label="4대4, 다섯 단계, 스킬 카드 보상">
          <span>4 VS 4 <small>GK 포함</small></span><span>5 STAGES <small>AI 챌린지</small></span><span>SKILL DRAFT <small>승리 보상</small></span>
        </div>
      </div>

      <div className="control-guide" aria-label="조작 방법">
        <div><strong>이동</strong><span>방향키 이동 · E 달리기</span></div>
        <div><strong>공격</strong><span>A 로빙 패스 · S 패스 · D 슛</span></div>
        <div><strong>수비</strong><span>A 태클 · S 선수 전환 · D 압박</span></div>
        <div><strong>스킬</strong><span>F 발동</span></div>
      </div>
    </section>
  );
}
