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
  shadow: 'rgb(4 17 10 / 35%)',
  stun: '#fff4a6',
};

function drawPlayer(ctx, player, isControlled) {
  const size = player.role === 'goalkeeper' ? 24 : 20;
  const x = Math.round(player.x - size / 2);
  const y = Math.round(player.y - size / 2);
  const color = player.role === 'goalkeeper'
    ? (player.team === 'home' ? COLORS.homeKeeper : COLORS.awayKeeper)
    : COLORS[player.team];

  ctx.fillStyle = COLORS.shadow;
  ctx.fillRect(x + 3, y + 4, size, size);

  if (isControlled) {
    ctx.strokeStyle = COLORS.outline;
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 4, y - 4, size + 8, size + 8);
  }

  ctx.fillStyle = color;
  if (player.powerTackleSeconds > 0) {
    ctx.strokeStyle = '#ffcf63';
    ctx.lineWidth = 3;
    ctx.strokeRect(x - 5, y - 5, size + 10, size + 10);
  }
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = player.team === 'home' ? '#17334b' : '#5a2d24';
  ctx.fillRect(x + 4, y + 4, size - 8, 4);
  ctx.fillStyle = '#f9f6e9';
  ctx.fillRect(
    Math.round(player.x + player.facingX * (size / 2 - 4) - 2),
    Math.round(player.y + player.facingY * (size / 2 - 4) - 2),
    4,
    4,
  );

  if (player.stunnedSeconds > 0) {
    ctx.fillStyle = COLORS.stun;
    ctx.fillRect(x + size - 2, y - 7, 4, 4);
    ctx.fillRect(x + size + 3, y - 4, 3, 3);
  }
}

function drawSkillEffects(ctx, state) {
  const vacuum = state.vacuumEffect;
  if (vacuum) {
    const player = state.players.find((candidate) => candidate.id === vacuum.playerId);
    if (player) {
      ctx.strokeStyle = '#b8fff0';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(state.ball.x, state.ball.y);
      ctx.lineTo(player.x, player.y);
      ctx.stroke();
      ctx.lineWidth = 3;
      for (const radius of [14, 23, 32]) {
        ctx.beginPath();
        ctx.arc(state.ball.x, state.ball.y, radius, Math.PI * 0.2, Math.PI * 1.65);
        ctx.stroke();
      }
    }
  }

  const reflection = state.rainbowReflection;
  if (reflection) {
    const player = state.players.find((candidate) => candidate.id === reflection.playerId);
    if (player) {
      ctx.strokeStyle = '#ed8dff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(player.x, player.y);
      ctx.lineTo(state.ball.x, state.ball.y);
      ctx.stroke();
    }
  }
}

function drawPitch(ctx) {
  const margin = 18;
  const pitchWidth = FIELD.width - margin * 2;
  const pitchHeight = FIELD.height - margin * 2;

  ctx.fillStyle = COLORS.turfA;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  for (let stripe = 0; stripe < 10; stripe += 1) {
    if (stripe % 2 === 1) {
      ctx.fillStyle = COLORS.turfB;
      ctx.fillRect(margin + stripe * (pitchWidth / 10), margin, pitchWidth / 10, pitchHeight);
    }
  }

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(margin, margin, pitchWidth, pitchHeight);

  ctx.beginPath();
  ctx.moveTo(FIELD.width / 2, margin);
  ctx.lineTo(FIELD.width / 2, FIELD.height - margin);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(FIELD.width / 2, FIELD.height / 2, 74, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = COLORS.line;
  ctx.fillRect(FIELD.width / 2 - 3, FIELD.height / 2 - 3, 6, 6);

  const boxTop = FIELD.height / 2 - 100;
  const boxHeight = 200;
  const boxWidth = 132;
  ctx.strokeRect(margin, boxTop, boxWidth, boxHeight);
  ctx.strokeRect(FIELD.width - margin - boxWidth, boxTop, boxWidth, boxHeight);
  ctx.strokeRect(margin, FIELD.height / 2 - 55, 54, 110);
  ctx.strokeRect(FIELD.width - margin - 54, FIELD.height / 2 - 55, 54, 110);

  // Leave a gap in the end line and draw a small net beyond each goal mouth.
  ctx.fillStyle = COLORS.turfA;
  ctx.fillRect(0, FIELD.goalTop, margin + 2, FIELD.goalBottom - FIELD.goalTop);
  ctx.fillRect(FIELD.width - margin - 2, FIELD.goalTop, margin + 2, FIELD.goalBottom - FIELD.goalTop);
  ctx.strokeStyle = COLORS.line;
  ctx.strokeRect(1, FIELD.goalTop, margin - 1, FIELD.goalBottom - FIELD.goalTop);
  ctx.strokeRect(FIELD.width - margin, FIELD.goalTop, margin - 1, FIELD.goalBottom - FIELD.goalTop);
}

function drawBall(ctx, ball) {
  const lift = Math.max(0, Number.isFinite(ball.height) ? ball.height : 0);
  const size = Math.min(16, 8 + lift * 0.08);
  const x = Math.round(ball.x - size / 2);
  const y = Math.round(ball.y - lift - size / 2);

  if (lift > 1) {
    ctx.fillStyle = 'rgb(8 20 12 / 30%)';
    ctx.fillRect(Math.round(ball.x - 4), Math.round(ball.y - 3), 8, 5);
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
  ctx.fillRect(x + size / 2 - 1, y + size / 2 - 1, 2, 2);
  if (ball.skillId === 'tornadoShot' || ball.skillId === 'rainbowReflect') {
    ctx.strokeStyle = ball.skillId === 'tornadoShot' ? '#bfe8ff' : '#f4a9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y - lift, size, 0, Math.PI * 1.6);
    ctx.stroke();
  }
}

/** Draw one immutable game-state snapshot onto a 960 × 540 canvas. */
export function drawGameFrame(ctx, state) {
  if (!ctx) {
    throw new TypeError('Canvas 2D context가 필요합니다.');
  }
  if (!state || !Array.isArray(state.players) || !state.ball) {
    throw new TypeError('유효한 경기 상태와 선수 목록이 필요합니다.');
  }

  ctx.clearRect(0, 0, FIELD.width, FIELD.height);
  drawPitch(ctx);

  for (const player of state.players) {
    drawPlayer(ctx, player, player.id === state.controlledPlayerId);
  }

  drawSkillEffects(ctx, state);
  drawBall(ctx, state.ball);
}
