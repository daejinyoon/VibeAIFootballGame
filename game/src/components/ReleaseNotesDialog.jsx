import { useEffect, useRef } from 'react';
import { APP_VERSION_LABEL, RELEASE_HISTORY } from '../game/releaseNotes.js';

export default function ReleaseNotesDialog({ onClose }) {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    closeButtonRef.current?.focus();
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = [...dialog.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  return (
    <div className="release-notes-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="release-notes-dialog" role="dialog" aria-modal="true" aria-labelledby="release-notes-title" tabIndex={-1}>
        <header className="release-notes-header">
          <div>
            <p className="eyebrow">DEX FOOTBALL ARCADE · {APP_VERSION_LABEL}</p>
            <h2 id="release-notes-title">게임 패치 노트</h2>
            <p>버전별 업데이트 내용을 최신순으로 확인해 보세요.</p>
          </div>
          <button
            ref={closeButtonRef}
            className="release-notes-close"
            type="button"
            aria-label="패치 노트 닫기"
            onClick={onClose}
          >×</button>
        </header>

        <div className="release-notes-content">
          {RELEASE_HISTORY.map(({ version, date, sections }) => (
            <section className="release-notes-release" key={`${version}-${date}`} aria-label={`v${version}`}>
              <header className="release-notes-release-header">
                <h3>v{version}</h3>
                <time dateTime={date}>{date}</time>
              </header>
              {sections.map(({ title, items }, index) => (
                <section className="release-notes-section" key={title}>
                  <span className="release-notes-index">0{index + 1}</span>
                  <div>
                    <h4>{title}</h4>
                    <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </section>
              ))}
            </section>
          ))}
        </div>

        <footer className="release-notes-footer">
          <span>즐거운 경기 되세요!</span>
          <button className="primary-button" type="button" onClick={onClose}>확인</button>
        </footer>
      </section>
    </div>
  );
}
