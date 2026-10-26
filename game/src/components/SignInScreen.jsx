import { useState } from 'react';

export default function SignInScreen({ configurationError = '', authError = '', onSignIn, onRetry }) {
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
        <h1 id="auth-title">계정으로 시작하기</h1>
        <p className="auth-description">조직 계정으로 로그인하면 게임을 시작할 수 있습니다.</p>
        {message && <p className="auth-error" role="alert">{message}</p>}
        <button className="primary-button auth-submit" type="button" disabled={busy || Boolean(configurationError)} onClick={signIn}>
          {busy ? '로그인 페이지로 이동 중…' : 'Microsoft Entra로 로그인'}
        </button>
        {(configurationError || authError || actionError) && (
          <button className="secondary-button auth-retry" type="button" onClick={onRetry}>
            다시 확인
          </button>
        )}
      </section>
      <footer className="footer"><span>DEX FOOTBALL ARCADE</span><span>조직 계정 인증 필요</span></footer>
    </main>
  );
}
