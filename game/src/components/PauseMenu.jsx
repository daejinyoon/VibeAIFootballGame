export default function PauseMenu({ onResume, onSaveAndExit, errorMessage }) {
  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="pause-card"><p className="eyebrow">MATCH PAUSED</p><h2 id="pause-title">잠시 쉬어 가요</h2>
        <p>현재 경기 상태는 그대로 유지됩니다.</p>
        {errorMessage && <p className="profile-error" role="alert">{errorMessage}</p>}
        <button className="primary-button" onClick={onResume}>경기 계속하기 <span aria-hidden="true">→</span></button>
        <button className="secondary-button" onClick={onSaveAndExit}>임시 저장 후 메인으로</button>
      </div>
    </div>
  );
}
