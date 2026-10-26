const MIN_DIRECTION_MAGNITUDE = 0.001;
const CARRIER_MOVEMENT_THRESHOLD = 3;

function teamForward(team) {
  return team === 'away' ? { x: -1, y: 0 } : { x: 1, y: 0 };
}

function isFiniteVector(x, y) {
  return Number.isFinite(x) && Number.isFinite(y);
}

function getYaw(x, y, fallback) {
  if (!isFiniteVector(x, y) || Math.hypot(x, y) < MIN_DIRECTION_MAGNITUDE) {
    ({ x, y } = fallback);
  }
  return Math.atan2(x, y);
}

/** Return the Three.js yaw for a player facing the ball or moving direction. */
export function getPlayerFacingYaw(player, ball) {
  const safePlayer = player && typeof player === 'object' ? player : {};
  const fallback = teamForward(safePlayer.team);

  if (ball?.ownerId === safePlayer.id) {
    const velocityIsUsable = isFiniteVector(safePlayer.vx, safePlayer.vy)
      && Math.hypot(safePlayer.vx, safePlayer.vy) >= CARRIER_MOVEMENT_THRESHOLD;
    const x = velocityIsUsable ? safePlayer.vx : safePlayer.facingX;
    const y = velocityIsUsable ? safePlayer.vy : safePlayer.facingY;
    return getYaw(x, y, fallback);
  }

  const coordinatesAreUsable = isFiniteVector(safePlayer.x, safePlayer.y)
    && isFiniteVector(ball?.x, ball?.y);
  return getYaw(
    coordinatesAreUsable ? ball.x - safePlayer.x : Number.NaN,
    coordinatesAreUsable ? ball.y - safePlayer.y : Number.NaN,
    fallback,
  );
}
