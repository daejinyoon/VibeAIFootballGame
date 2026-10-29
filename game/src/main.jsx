import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { initializeEntraAuth } from './auth/entraAuth.js';
import { isLocalDevelopmentMode } from './auth/localDevelopment.js';
import './styles.css';

export async function main() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('앱을 표시할 #root 요소를 index.html에서 찾지 못했습니다.');
  }

  const root = createRoot(rootElement);
  root.render(<div className="auth-bootstrap" role="status">DEX ARCADE · 로그인 상태 확인 중…</div>);

  const authBootstrap = isLocalDevelopmentMode(import.meta.env)
    ? { account: null, configurationError: '', authError: '' }
    : await initializeEntraAuth();
  root.render(
    <React.StrictMode>
      <App authBootstrap={authBootstrap} />
    </React.StrictMode>,
  );
}

main();
