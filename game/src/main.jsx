import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

export function main() {
  const rootElement = document.getElementById('root');

  if (!rootElement) {
    throw new Error('앱을 표시할 #root 요소를 index.html에서 찾지 못했습니다.');
  }

  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

main();
