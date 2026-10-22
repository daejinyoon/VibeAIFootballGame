export default function PauseMenu({ onResume, onSaveAndExit, errorMessage }) {
  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-card">
        <p className="eyebrow">TIME OUT</p>
        <h2 id="pause-title">잠깐 쉬어 가기</h2>
        <p>현재 경기 상태와 남은 시간은 그대로 보관됩니다.</p>
        {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
        <button className="primary-button" onClick={onResume}>경기 계속하기 <span aria-hidden="true">▶</span></button>
        <button className="secondary-button" onClick={onSaveAndExit}>저장하고 메인 화면으로</button>
      </div>
    </div>
  );
}
