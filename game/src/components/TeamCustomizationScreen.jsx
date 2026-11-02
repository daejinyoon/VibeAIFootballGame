import { useState } from 'react';
import {
  KIT_PALETTES,
  LOGO_OPTIONS,
  normalizeTeamCustomization,
} from '../game/teamBranding.js';
import {
  DEFAULT_GOAL_CELEBRATION_SETTINGS,
  GOAL_CELEBRATION_OPTIONS,
  normalizeGoalCelebrationSettings,
} from '../game/goalCelebrations.js';
import { BrandLogo } from './BrandLogo.jsx';
import { Customization3DPreview } from './Customization3DPreview.jsx';

export default function TeamCustomizationScreen({
  customization,
  goalCelebration = DEFAULT_GOAL_CELEBRATION_SETTINGS,
  onSave,
  onBack,
  errorMessage,
}) {
  const [draft, setDraft] = useState(() => normalizeTeamCustomization(customization));
  const [goalCelebrationDraft, setGoalCelebrationDraft] = useState(
    () => normalizeGoalCelebrationSettings(goalCelebration),
  );
  const selectedLogo = LOGO_OPTIONS.find(({ id }) => id === draft.logoId) ?? LOGO_OPTIONS[0];
  const selectedPalette = KIT_PALETTES.find(({ id }) => id === draft.paletteId) ?? KIT_PALETTES[0];

  const updateDraft = (field, value) => setDraft((current) => normalizeTeamCustomization({ ...current, [field]: value }));
  const updateGoalCelebration = (settings) => setGoalCelebrationDraft(normalizeGoalCelebrationSettings(settings));

  return (
    <section className="screen-panel team-customization-panel" aria-labelledby="team-customization-title">
      <div className="team-customization-heading">
        <div>
          <p className="eyebrow"><span>TEAM IDENTITY</span> · HOME KIT</p>
          <h1 id="team-customization-title">팀 꾸미기</h1>
          <p className="intro">팀 로고와 유니폼 색상, 골 세리머니를 고르세요. 설정은 프로필에 저장됩니다.</p>
        </div>
        <button className="back-button" type="button" onClick={onBack}>시작 화면</button>
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

          <fieldset className="team-customization-group goal-ceremony-options">
            <legend><span>03</span> 골 세리머니</legend>
            <p className="goal-ceremony-description">골을 넣었을 때 팀이 함께 할 세리머니를 고르세요.</p>
            <div className="goal-ceremony-grid">
              <label className={`goal-ceremony-card${goalCelebrationDraft.mode === 'random' ? ' is-selected' : ''}`}>
                <input
                  type="radio"
                  name="goal-ceremony"
                  value="random"
                  checked={goalCelebrationDraft.mode === 'random'}
                  onChange={() => updateGoalCelebration({ mode: 'random', ceremonyId: null })}
                />
                <span className="goal-ceremony-name">랜덤</span>
                <span className="goal-ceremony-detail">경기마다 하나를 선택</span>
              </label>
              {GOAL_CELEBRATION_OPTIONS.map(({ id, label }) => (
                <label className={`goal-ceremony-card${goalCelebrationDraft.mode === 'specific' && goalCelebrationDraft.ceremonyId === id ? ' is-selected' : ''}`} key={id}>
                  <input
                    type="radio"
                    name="goal-ceremony"
                    value={id}
                    checked={goalCelebrationDraft.mode === 'specific' && goalCelebrationDraft.ceremonyId === id}
                    onChange={() => updateGoalCelebration({ mode: 'specific', ceremonyId: id })}
                  />
                  <span className="goal-ceremony-name">{label}</span>
                  <span className="goal-ceremony-detail">팀 세리머니</span>
                </label>
              ))}
            </div>
            <div className="goal-ceremony-preview">
              <div className="goal-ceremony-preview-heading">
                <span>동작 미리보기</span>
                <span>{goalCelebrationDraft.mode === 'random' ? '5초마다 다음 동작' : '선택한 동작 반복'}</span>
              </div>
              <Customization3DPreview
                ceremonyId={goalCelebrationDraft.ceremonyId}
                palette={selectedPalette}
                logoId={selectedLogo.id}
                rotateRandom={goalCelebrationDraft.mode === 'random'}
              />
            </div>
          </fieldset>
        </div>

        <aside className="team-customization-preview" aria-label="현재 팀 유니폼 미리보기">
          <div className="kit-preview-stage" role="img" aria-label={`${selectedLogo.displayName} 로고, ${selectedPalette.name} 유니폼 3D 미리보기`}>
            <div className="kit-preview-grid" aria-hidden="true" />
            <Customization3DPreview mode="kit" ceremonyId={null} palette={selectedPalette} logoId={selectedLogo.id} />
            <div className="kit-preview-brand"><BrandLogo logoId={selectedLogo.id} title="decorative" /></div>
            <div className="kit-preview-caption"><span>HOME KIT</span><b>{selectedPalette.name}</b></div>
          </div>
          <div className="team-preview-details" aria-live="polite">
            <span>현재 선택</span>
            <b>{selectedLogo.displayName} <i>×</i> {selectedPalette.name}</b>
          </div>
        </aside>
      </div>

      {errorMessage && <p className="profile-error team-customization-error" role="alert">{errorMessage}</p>}
      <div className="team-customization-actions">
        <p role="status">저장하기 전까지 현재 프로필 설정은 바뀌지 않습니다.</p>
        <div>
          <button className="back-button" type="button" onClick={onBack}>취소</button>
          <button
            className="primary-button"
            type="button"
            onClick={() => onSave(
              normalizeTeamCustomization(draft),
              normalizeGoalCelebrationSettings(goalCelebrationDraft),
            )}
          >선택 저장 <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </section>
  );
}
