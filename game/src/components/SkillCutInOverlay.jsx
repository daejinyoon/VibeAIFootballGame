import { Canvas } from '@react-three/fiber';
import { SKILLS } from '../game/skills.js';
import { getPlayerKit } from '../game/playerKit.js';
import { MiiPlayerModel } from './MiiPlayerModel.jsx';
import { SKILL_EFFECT_COLORS } from './SkillEffects3D.jsx';

export function SkillCutInOverlay({ cue, player, teamBranding }) {
  if (!cue || !player) return null;

  const skill = SKILLS[cue.skillId];
  if (!skill) return null;
  const team = cue.team === 'away' ? 'away' : 'home';
  const [primary, secondary] = SKILL_EFFECT_COLORS[cue.skillId]?.[team]
    ?? SKILL_EFFECT_COLORS.eagleShot[team];
  const logoId = teamBranding?.[team]?.logoId ?? (team === 'away' ? 'samsung' : 'dex');
  const teamName = teamBranding?.[team]?.displayName ?? (team === 'away' ? 'SAMSUNG' : 'DEX');

  return (
    <div
      key={cue.id}
      className={`skill-cut-in skill-cut-in-${skill.type}${cue.skillId === 'eulryongta' ? ' skill-cut-in-eulryongta' : ''}`}
      style={{
        '--cut-in-primary': primary,
        '--cut-in-secondary': secondary,
        '--cut-in-duration': `${cue.durationSeconds}s`,
      }}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="skill-cut-in-rays" aria-hidden="true" />
      {cue.skillId === 'eulryongta' && <img className="skill-cut-in-photo" src="/images/skills/eulryongta-cutin.jpg" alt="" aria-hidden="true" onError={(event) => { event.currentTarget.hidden = true; }} />}
      <div className="skill-cut-in-character" aria-hidden="true">
        <Canvas camera={{ position: [0, 0.76, 3.1], fov: 34 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
          <ambientLight intensity={1.5} />
          <directionalLight position={[-2, 4, 5]} color="#fff4dd" intensity={2.2} />
          <MiiPlayerModel player={player} pose="cutIn" scale={1.18} kit={getPlayerKit(player, teamBranding)} logoId={logoId} isKeeper={false} />
        </Canvas>
      </div>
      <div className="skill-cut-in-copy">
        <span className="skill-cut-in-label">{teamName} SPECIAL MOVE</span>
        <h2>{skill.name}</h2>
        <span className="skill-cut-in-type">{skill.type.toUpperCase()}</span>
      </div>
      <img className="skill-cut-in-art" src={skill.artwork} alt="" aria-hidden="true" />
    </div>
  );
}
