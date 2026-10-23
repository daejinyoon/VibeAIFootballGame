import { LOGO_OPTIONS } from '../game/teamBranding.js';

export function BrandLogo({ logoId, className = '', title }) {
  const logo = LOGO_OPTIONS.find((option) => option.id === logoId) ?? LOGO_OPTIONS[0];
  const decorative = title === 'decorative';
  const classes = ['brand-logo', `brand-logo-${logo.id}`, className].filter(Boolean).join(' ');

  return (
    <img
      className={classes}
      src={logo.assetPath}
      alt={decorative ? '' : title || logo.displayName}
      aria-hidden={decorative ? 'true' : undefined}
      title={decorative ? undefined : title}
      draggable="false"
    />
  );
}

export default BrandLogo;
