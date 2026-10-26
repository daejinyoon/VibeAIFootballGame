import { useState } from 'react';

export default function SignInScreen({
  configurationError = '', authError = '', profileLoading = false, accountName = '',
  reauthenticate = false, onSignIn, onRetry, onSignOut,
}) {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const message = actionError || authError || configurationError;

  const signIn = async () => {
    setBusy(true);
    setActionError('');
    try {
      await onSignIn();
    } catch {
      setActionError('로그인 창을 시작하지 못했습니다. 잠시 후 다시 시도하세요.');
      setBusy(false);
    }
  };

  return (
    <main className="page-shell app-shell auth-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="DEX ARCADE">
          <span className="brand-mark" aria-hidden="true">D</span><span>DEX ARCADE</span>
        </a>
        <span className="local-badge"><span /> MICROSOFT ENTRA</span>
      </header>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">DEX CONSULTING</p>
        <h1 id="auth-title">{profileLoading ? '저장 데이터 불러오는 중' : accountName ? '클라우드 저장 연결 필요' : '계정으로 시작하기'}</h1>
        <p className="auth-description">{accountName ? `${accountName} 계정의 게임 저장 데이터를 확인하고 있습니다.` : '조직 계정으로 로그인하면 게임을 시작할 수 있습니다.'}</p>
        {profileLoading && <p className="auth-description" role="status">Azure 저장소에 연결하는 중입니다. 잠시만 기다려 주세요.</p>}
        {message && <p className="auth-error" role="alert">{message}</p>}
        {reauthenticate && !profileLoading && <button className="primary-button auth-submit" type="button" onClick={signIn}>다시 로그인</button>}
        {!accountName && <button className="primary-button auth-submit" type="button" disabled={busy || Boolean(configurationError)} onClick={signIn}>
          {busy ? '로그인 페이지로 이동 중…' : 'Microsoft Entra로 로그인'}
        </button>}
        {(configurationError || authError || actionError) && !profileLoading && !reauthenticate && (
          <button className="secondary-button auth-retry" type="button" onClick={onRetry}>
            다시 확인
          </button>
        )}
        {accountName && onSignOut && <button className="secondary-button auth-retry" type="button" onClick={onSignOut}>다른 계정으로 로그인</button>}
      </section>
      <footer className="footer"><span>DEX FOOTBALL ARCADE</span><span>조직 계정 인증 필요</span></footer>
    </main>
  );
}
