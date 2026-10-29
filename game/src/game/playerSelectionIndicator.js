export function getPlayerEdgeIndicatorPlacement({
  ndcX, ndcY, ndcZ, behindCamera, width, height, inset = 20,
}) {
  if (![ndcX, ndcY, ndcZ, width, height, inset].every(Number.isFinite)
      || width <= 0 || height <= 0 || typeof behindCamera !== 'boolean') return null;

  const isInFrustum = !behindCamera
    && ndcX >= -1 && ndcX <= 1
    && ndcY >= -1 && ndcY <= 1
    && ndcZ >= -1 && ndcZ <= 1;
  if (isInFrustum) return null;

  const safeInset = Math.min(Math.max(0, inset), Math.max(0, Math.min(width, height) / 2 - 1));
  const centerX = width / 2;
  const centerY = height / 2;
  let directionX = (ndcX + 1) * centerX - centerX;
  let directionY = (1 - ndcY) * height / 2 - centerY;
  if (behindCamera) {
    directionX *= -1;
    directionY *= -1;
  }

  if (Math.abs(directionX) < 1e-9 && Math.abs(directionY) < 1e-9) directionY = -1;

  const left = safeInset;
  const right = width - safeInset;
  const top = safeInset;
  const bottom = height - safeInset;
  const horizontalScale = directionX > 0
    ? (right - centerX) / directionX
    : directionX < 0 ? (left - centerX) / directionX : Number.POSITIVE_INFINITY;
  const verticalScale = directionY > 0
    ? (bottom - centerY) / directionY
    : directionY < 0 ? (top - centerY) / directionY : Number.POSITIVE_INFINITY;
  const scale = Math.min(horizontalScale, verticalScale);
  if (!Number.isFinite(scale) || scale < 0) return null;

  const edgeX = Math.min(right, Math.max(left, centerX + directionX * scale));
  const edgeY = Math.min(bottom, Math.max(top, centerY + directionY * scale));
  const rotationDeg = Math.atan2(directionX, -directionY) * 180 / Math.PI;
  if (![edgeX, edgeY, rotationDeg].every(Number.isFinite)) return null;
  return { left: edgeX, top: edgeY, rotationDeg };
}
