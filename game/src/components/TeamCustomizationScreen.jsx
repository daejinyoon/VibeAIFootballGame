import { useState } from 'react';
import {
  KIT_PALETTES,
  LOGO_OPTIONS,
  normalizeTeamCustomization,
} from '../game/teamBranding.js';
import { BrandLogo } from './BrandLogo.jsx';

function KitPreview({ logo, palette }) {
  return (
    <div
      className="kit-preview-stage"
      role="img"
      style={{
        '--kit-jersey': palette.jersey,
        '--kit-trim': palette.trim,
        '--kit-shorts': palette.shorts,
        '--kit-boots': palette.boots,
      }}
      aria-label={`${logo.displayName} 로고, ${palette.name} 유니폼 미리보기`}
    >
      <div className="kit-preview-grid" aria-hidden="true" />
      <div className="kit-preview-brand"><BrandLogo logoId={logo.id} title="decorative" /></div>
      <div className="kit-player-silhouette" aria-hidden="true">
        <span className="kit-player-head" />
        <span className="kit-player-neck" />
        <span className="kit-player-shirt"><i /></span>
        <span className="kit-player-shorts" />
        <span className="kit-player-leg kit-player-leg-left" />
        <span className="kit-player-leg kit-player-leg-right" />
        <span className="kit-player-boot kit-player-boot-left" />
        <span className="kit-player-boot kit-player-boot-right" />
      </div>
      <div className="kit-preview-caption"><span>HOME KIT</span><b>{palette.name}</b></div>
    </div>
  );
}

export default function TeamCustomizationScreen({ customization, onSave, onBack, errorMessage }) {
  const [draft, setDraft] = useState(() => normalizeTeamCustomization(customization));
  const selectedLogo = LOGO_OPTIONS.find(({ id }) => id === draft.logoId) ?? LOGO_OPTIONS[0];
  const selectedPalette = KIT_PALETTES.find(({ id }) => id === draft.paletteId) ?? KIT_PALETTES[0];

  const updateDraft = (field, value) => setDraft((current) => normalizeTeamCustomization({ ...current, [field]: value }));

  return (
    <section className="screen-panel team-customization-panel" aria-labelledby="team-customization-title">
      <div className="team-customization-heading">
        <div>
          <p className="eyebrow"><span>TEAM IDENTITY</span> · HOME KIT</p>
          <h1 id="team-customization-title">팀 꾸미기</h1>
          <p className="intro">팀 로고와 유니폼 색상을 고르세요. 두 설정은 따로 바꿀 수 있고 저장된 캠페인에도 그대로 유지됩니다.</p>
        </div>
        <button className="back-button" type="button" onClick={onBack}>← 시작 화면</button>
      </div>

      <div className="team-customization-layout">
        <div className="team-customization-controls">
          <fieldset className="team-customization-group brand-options">
            <legend><span>01</span> 팀 로고</legend>
            <div className="brand-option-grid">
              {LOGO_OPTIONS.map((logo) => (
                <label className={`brand-option${draft.logoId === logo.id ? ' is-selected' : ''}`} key={logo.id}>
                  <input
                    type="radio"
                    name="team-logo"
                    value={logo.id}
                    aria-label={logo.displayName}
                    checked={draft.logoId === logo.id}
                    onChange={() => updateDraft('logoId', logo.id)}
                  />
                  <span className="brand-option-mark"><BrandLogo logoId={logo.id} title="decorative" /></span>
                  <span className="brand-option-name">{logo.displayName}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="team-customization-group palette-options">
            <legend><span>02</span> 유니폼 색상</legend>
            <div className="kit-palette-grid">
              {KIT_PALETTES.map((palette) => (
                <label className={`kit-palette-card${draft.paletteId === palette.id ? ' is-selected' : ''}`} key={palette.id}>
                  <input
                    type="radio"
                    name="team-palette"
                    value={palette.id}
                    aria-label={`${palette.name} 유니폼`}
                    checked={draft.paletteId === palette.id}
                    onChange={() => updateDraft('paletteId', palette.id)}
                  />
                  <span className="kit-palette-name">{palette.name}</span>
                  <span className="kit-palette-swatches" aria-hidden="true">
                    <i style={{ backgroundColor: palette.jersey }} />
                    <i style={{ backgroundColor: palette.trim }} />
                    <i style={{ backgroundColor: palette.shorts }} />
                    <i style={{ backgroundColor: palette.boots }} />
                  </span>
                  <span className="sr-only">상의, 포인트, 하의, 신발 색상 미리보기</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="team-customization-preview" aria-label="현재 팀 유니폼 미리보기">
          <KitPreview logo={selectedLogo} palette={selectedPalette} />
          <div className="team-preview-details" aria-live="polite">
            <span>현재 선택</span>
            <b>{selectedLogo.displayName} <i>×</i> {selectedPalette.name}</b>
          </div>
        </aside>
      </div>

      {errorMessage && <p className="profile-error team-customization-error" role="alert">{errorMessage}</p>}
      <div className="team-customization-actions">
        <p role="status">저장 전까지 현재 프로필 설정은 바뀌지 않습니다.</p>
        <div>
          <button className="back-button" type="button" onClick={onBack}>취소</button>
          <button className="primary-button" type="button" onClick={() => onSave(normalizeTeamCustomization(draft))}>선택 저장 <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>
  );
}
