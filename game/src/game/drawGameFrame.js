import { FIELD } from './constants.js';

const COLORS = {
  turfA: '#286347',
  turfB: '#2d6b4c',
  line: '#d9efcf',
  home: '#64a8ff',
  away: '#ff8757',
  homeKeeper: '#d5f879',
  awayKeeper: '#ffc36e',
  outline: '#f5f3e9',
  ball: '#fff6dc',
  shadow: 'rgb(4 17 10 / 40%)',
  stun: '#fff4a6',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function projectPoint(x, y, camera) {
  const worldY = clamp(Number.isFinite(y) ? y : 0, 0, FIELD.height);
  const depth = worldY / FIELD.height;
  const perspective = depth ** 1.22;
  const scale = 0.72 + 0.28 * depth;
  const baseX = FIELD.width / 2 + ((Number.isFinite(x) ? x : 0) - FIELD.width / 2) * scale;
  return {
    x: baseX + camera.x,
    y: 92 + perspective * 443 + camera.y,
    scale,
  };
}

function projectedPath(ctx, points, camera, close = false) {
  if (points.length === 0) return;
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    const point = projectPoint(x, y, camera);
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  if (close) ctx.closePath();
}

function drawCrowd(ctx) {
  const crowdColors = ['#b8c0a1', '#a65c42', '#d8c578', '#697e9b', '#cf7c52', '#d6dbd0'];
  ctx.fillStyle = '#18272c';
  ctx.fillRect(0, 0, FIELD.width, 92);
  for (let row = 0; row < 8; row += 1) {
    const y = 4 + row * 12;
    const step = 7 + row * 0.7;
    for (let x = -4; x < FIELD.width; x += step) {
      const seed = (Math.floor(x * 3 + row * 193) * 1103515245 + 12345) >>> 0;
      ctx.fillStyle = crowdColors[seed % crowdColors.length];
      ctx.fillRect(Math.round(x + ((seed >>> 8) % 4)), y, 3, 4 + row % 2);
    }
  }
  ctx.fillStyle = '#d2d3c1';
  ctx.fillRect(0, 78, FIELD.width, 5);
  ctx.fillStyle = '#26333b';
  ctx.fillRect(0, 83, FIELD.width, 9);
}

function drawPitch(ctx, camera) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 92, FIELD.width, FIELD.height - 92);
  ctx.clip();

  const left = 18;
  const right = FIELD.width - 18;
  const top = 18;
  const bottom = FIELD.height - 18;
  ctx.fillStyle = COLORS.turfA;
  projectedPath(ctx, [[left, top], [right, top], [right, bottom], [left, bottom]], camera, true);
  ctx.fill();

  const pitchWidth = right - left;
  for (let stripe = 0; stripe < 10; stripe += 1) {
    if (stripe % 2 === 0) continue;
    const x1 = left + stripe * pitchWidth / 10;
    const x2 = left + (stripe + 1) * pitchWidth / 10;
    ctx.fillStyle = COLORS.turfB;
    projectedPath(ctx, [[x1, top], [x2, top], [x2, bottom], [x1, bottom]], camera, true);
    ctx.fill();
  }

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  projectedPath(ctx, [[left, top], [right, top], [right, bottom], [left, bottom]], camera, true);
  ctx.stroke();
  projectedPath(ctx, [[FIELD.width / 2, top], [FIELD.width / 2, bottom]], camera);
  ctx.stroke();

  const circlePoints = [];
  for (let index = 0; index <= 48; index += 1) {
    const angle = index / 48 * Math.PI * 2;
    circlePoints.push([FIELD.width / 2 + Math.cos(angle) * 74, FIELD.height / 2 + Math.sin(angle) * 74]);
  }
  projectedPath(ctx, circlePoints, camera, true);
  ctx.stroke();
  const center = projectPoint(FIELD.width / 2, FIELD.height / 2, camera);
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(center.x - 2, center.y - 2, 4, 4);

  const boxTop = FIELD.height / 2 - 100;
  const boxBottom = FIELD.height / 2 + 100;
  for (const x1 of [left, FIELD.width - 18 - 132]) {
    const x2 = x1 + 132;
    projectedPath(ctx, [[x1, boxTop], [x2, boxTop], [x2, boxBottom], [x1, boxBottom]], camera, true);
    ctx.stroke();
  }
  for (const x1 of [left, FIELD.width - 18 - 54]) {
    const x2 = x1 + 54;
    projectedPath(ctx, [[x1, FIELD.height / 2 - 55], [x2, FIELD.height / 2 - 55], [x2, FIELD.height / 2 + 55], [x1, FIELD.height / 2 + 55]], camera, true);
    ctx.stroke();
  }

  for (const goalX of [0, FIELD.width]) {
    const direction = goalX === 0 ? -1 : 1;
    const insideX = goalX === 0 ? 1 : FIELD.width - 1;
    const outsideX = goalX + direction * 20;
    const netPoints = [[goalX, FIELD.goalTop], [outsideX, FIELD.goalTop], [outsideX, FIELD.goalBottom], [goalX, FIELD.goalBottom]];
    ctx.strokeStyle = '#e5e7d8';
    projectedPath(ctx, netPoints, camera, true);
    ctx.stroke();
    for (let y = FIELD.goalTop + 10; y < FIELD.goalBottom; y += 12) {
      projectedPath(ctx, [[goalX, y], [outsideX, y]], camera);
      ctx.stroke();
    }
    projectedPath(ctx, [[insideX, FIELD.goalTop], [insideX, FIELD.goalBottom]], camera);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer(ctx, player, isControlled, camera) {
  if (player.dismissed) return;
  const groundPoint = projectPoint(player.x, player.y, camera);
  const point = { ...groundPoint, y: groundPoint.y - Math.max(0, player.jumpHeight ?? 0) * groundPoint.scale };
  const width = Math.round((player.role === 'goalkeeper' ? 22 : 18) * point.scale);
  const height = Math.round((player.role === 'goalkeeper' ? 26 : 24) * point.scale);
  const x = Math.round(point.x - width / 2);
  const y = Math.round(point.y - height / 2);
  const color = player.role === 'goalkeeper'
    ? (player.team === 'home' ? COLORS.homeKeeper : COLORS.awayKeeper)
    : COLORS[player.team];

  ctx.fillStyle = COLORS.shadow;
  ctx.fillRect(groundPoint.x - width / 2 + 3 * point.scale, groundPoint.y + height / 2 - 1, width, Math.max(3, 5 * point.scale));
  if (isControlled) {
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 3, y - 3, width + 6, height + 6);
  }
  if (player.card === 'yellow' || player.card === 'red') {
    ctx.fillStyle = player.card === 'red' ? '#ff554d' : '#ffe34f';
    ctx.fillRect(x + width - 3, y - 6, 5, 6);
  }
  ctx.fillStyle = color;
  if (player.powerTackleSeconds > 0) {
    ctx.strokeStyle = '#ffcf63';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);
  }
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = player.team === 'home' ? '#17334b' : '#5a2d24';
  ctx.fillRect(x + width * 0.2, y + height * 0.33, width * 0.6, Math.max(2, height * 0.15));
  ctx.fillStyle = '#f9f6e9';
  ctx.fillRect(
    Math.round(point.x + player.facingX * (width / 2 - 3) - 2),
    Math.round(point.y + player.facingY * (height / 2 - 4) - 2),
    4 * point.scale,
    4 * point.scale,
  );
  if (player.skillId) {
    ctx.fillStyle = '#effca0';
    ctx.fillRect(x + width / 2 - 2, y - 4, 4, 2);
  }
  if (player.stunnedSeconds > 0) {
    ctx.fillStyle = COLORS.stun;
    ctx.fillRect(x + width - 1, y - 8, 4, 3);
    ctx.fillRect(x + width + 3, y - 5, 3, 2);
  }
}

function drawSkillEffects(ctx, state, camera) {
  const vacuum = state.vacuumEffect;
  if (vacuum) {
    const player = state.players.find((candidate) => candidate.id === vacuum.playerId);
    if (player) {
      const ball = projectPoint(state.ball.x, state.ball.y, camera);
      const target = projectPoint(player.x, player.y, camera);
      ctx.strokeStyle = '#b8fff0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(target.x, target.y);
      ctx.stroke();
      for (const radius of [14, 23, 32]) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, radius * ball.scale, Math.PI * 0.2, Math.PI * 1.65);
        ctx.stroke();
      }
    }
  }

  const reflection = state.rainbowReflection;
  if (reflection) {
    const player = state.players.find((candidate) => candidate.id === reflection.playerId);
    if (player) {
      const target = projectPoint(player.x, player.y, camera);
      const ball = projectPoint(state.ball.x, state.ball.y, camera);
      ctx.strokeStyle = '#ed8dff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(target.x, target.y, 22 * target.scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(target.x, target.y);
      ctx.lineTo(ball.x, ball.y);
      ctx.stroke();
    }
  }
}

function drawBall(ctx, ball, camera) {
  const point = projectPoint(ball.x, ball.y, camera);
  const lift = Math.max(0, Number.isFinite(ball.height) ? ball.height : 0) * point.scale;
  const size = Math.min(16, (8 + lift * 0.08) * point.scale);
  const x = Math.round(point.x - size / 2);
  const y = Math.round(point.y - lift - size / 2);

  if (lift > 1) {
    ctx.fillStyle = 'rgb(8 20 12 / 30%)';
    ctx.fillRect(Math.round(point.x - 4), Math.round(point.y - 3), 8, 5);
  }
  ctx.fillStyle = ball.skillId === 'eagleShot'
    ? '#fff078'
    : ball.skillId === 'tornadoShot'
      ? '#bfe8ff'
      : ball.skillId === 'rainbowReflect'
        ? '#f4a9ff'
        : COLORS.ball;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#38433a';
  ctx.fillRect(x + size / 2 - 1, y + size / 2 - 1, Math.max(1, 2 * point.scale), Math.max(1, 2 * point.scale));
  if (ball.skillId === 'tornadoShot' || ball.skillId === 'rainbowReflect') {
    ctx.strokeStyle = ball.skillId === 'tornadoShot' ? '#bfe8ff' : '#f4a9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y - lift, size, 0, Math.PI * 1.6);
    ctx.stroke();
  }
}

function drawScoreboard(ctx, score, timeLabel) {
  ctx.fillStyle = '#17202a';
  ctx.fillRect(18, 10, FIELD.width - 36, 68);
  ctx.fillStyle = '#343ba0';
  ctx.fillRect(18, 10, 352, 62);
  ctx.fillStyle = '#a3353b';
  ctx.fillRect(590, 10, 352, 62);
  ctx.fillStyle = '#d5d4c7';
  ctx.fillRect(18, 72, FIELD.width - 36, 4);
  ctx.fillStyle = '#f5f4e8';
  ctx.font = 'bold 22px Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HOME', 110, 38);
  ctx.fillText('AWAY', 850, 38);
  ctx.font = 'bold 38px Consolas, monospace';
  ctx.fillText(String(score?.home ?? 0), 305, 69);
  ctx.fillText(String(score?.away ?? 0), 655, 69);
  ctx.fillStyle = '#f2d366';
  ctx.font = 'bold 14px Consolas, monospace';
  ctx.fillText('TIME', 480, 30);
  ctx.fillStyle = '#ff794b';
  ctx.font = 'bold 31px Consolas, monospace';
  ctx.fillText(timeLabel ?? '--', 480, 67);
}

/** Draw one immutable world-state snapshot into the fixed 960 x 540 arcade viewport. */
export function drawGameFrame(ctx, state, renderOptions = {}) {
  if (!ctx) throw new TypeError('Canvas 2D context is required.');
  if (!state || !Array.isArray(state.players) || !state.ball) {
    throw new TypeError('A valid game state with a player list and ball is required.');
  }

  const camera = {
    x: Number.isFinite(renderOptions.cameraX) ? renderOptions.cameraX : 0,
    y: Number.isFinite(renderOptions.cameraY) ? renderOptions.cameraY : 0,
  };
  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawCrowd(ctx);
  drawPitch(ctx, camera);

  const orderedPlayers = [...state.players].sort((left, right) => (
    projectPoint(0, left.y, camera).y - projectPoint(0, right.y, camera).y
  ));
  for (const player of orderedPlayers) {
    drawPlayer(ctx, player, player.id === state.controlledPlayerId, camera);
  }
  drawSkillEffects(ctx, state, camera);
  drawBall(ctx, state.ball, camera);
  drawScoreboard(ctx, renderOptions.score ?? state.score, renderOptions.timeLabel);
}
