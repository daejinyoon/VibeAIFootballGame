import { FIELD } from '../game/constants.js';

function isValidPosition(entity) {
  return Number.isFinite(entity?.x) && Number.isFinite(entity?.y)
    && entity.x >= 0 && entity.x <= FIELD.width
    && entity.y >= 0 && entity.y <= FIELD.height;
}

export function MatchMiniMap({ players = [], ball, controlledPlayerId, homeAccent = '#1ab6d1', awayAccent = '#E94B55' }) {
  const activePlayers = players.filter((player) => !player.dismissed && isValidPosition(player));

  return (
    <div className="match-minimap" style={{ '--home-team-accent': homeAccent, '--away-team-accent': awayAccent }} role="img" aria-label="경기장 미니맵: 양 팀 선수, 공, 조작 선수 위치">
      <svg viewBox={`0 0 ${FIELD.width} ${FIELD.height}`} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id="match-minimap-field-clip">
            <rect x="0" y="0" width={FIELD.width} height={FIELD.height} />
          </clipPath>
        </defs>
        <rect className="minimap-field" x="0" y="0" width={FIELD.width} height={FIELD.height} />
        <g className="minimap-lines">
          <rect x="12" y="12" width={FIELD.width - 24} height={FIELD.height - 24} />
          <line x1={FIELD.width / 2} y1="12" x2={FIELD.width / 2} y2={FIELD.height - 12} />
          <circle cx={FIELD.width / 2} cy={FIELD.height / 2} r="72" />
          <rect x="12" y={FIELD.height * 0.25} width="132" height={FIELD.height * 0.5} />
          <rect x={FIELD.width - 144} y={FIELD.height * 0.25} width="132" height={FIELD.height * 0.5} />
        </g>
        <g clipPath="url(#match-minimap-field-clip)">
          {activePlayers.map((player) => {
            const controlled = player.id === controlledPlayerId;
            const keeper = player.role === 'goalkeeper';
            const className = [
              'minimap-player',
              player.team === 'away' ? 'is-away' : 'is-home',
              keeper && 'is-keeper',
              controlled && 'is-controlled',
            ].filter(Boolean).join(' ');
            return (
              <g key={player.id} className={className} transform={`translate(${player.x} ${player.y})`}>
                {keeper && <circle className="minimap-keeper-ring" r="14" />}
                {controlled && <><circle className="minimap-controlled-ring" r="18" /><circle className="minimap-controlled-ring-inner" r="12" /></>}
                <circle className="minimap-player-dot" r={controlled ? 9 : 7} />
              </g>
            );
          })}
          {isValidPosition(ball) && (
            <circle className="minimap-ball" cx={ball.x} cy={ball.y} r="8" />
          )}
        </g>
      </svg>
      <span className="minimap-caption" aria-hidden="true">LIVE MAP</span>
    </div>
  );
}
