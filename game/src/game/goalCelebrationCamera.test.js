import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoalCelebrationCameraFrame } from './goalCelebrationCamera.js';

const players = [
  { id: 'left', x: 360, y: 220 },
  { id: 'center', x: 420, y: 270 },
  { id: 'right', x: 480, y: 320 },
  { id: 'bystander', x: 900, y: 50 },
];

test('camera target centers only the selected participants', () => {
  const frame = getGoalCelebrationCameraFrame({
    players,
    participantIds: ['left', 'center', 'right'],
    team: 'home',
    aspect: 16 / 9,
  });

  assert.ok(frame);
  assert.equal(frame.target.x, (360 + 420 + 480) / 3 / 80 - 6);
  assert.equal(frame.target.z, 0);
  assert.equal(frame.target.y, 0.85);
  assert.ok(frame.position.x > frame.target.x, 'home view is on the home attacking side');
});

test('camera comes from the correct front for each team', () => {
  const input = { players, participantIds: ['center'], aspect: 1 };
  const home = getGoalCelebrationCameraFrame({ ...input, team: 'home' });
  const away = getGoalCelebrationCameraFrame({ ...input, team: 'away' });

  assert.ok(home.position.x > home.target.x);
  assert.ok(away.position.x < away.target.x);
  assert.equal(home.position.y, away.position.y);
  assert.equal(home.position.z, away.position.z);
  const homeAzimuth = Math.atan(Math.abs((home.position.z - home.target.z)
    / (home.position.x - home.target.x)));
  const awayAzimuth = Math.atan(Math.abs((away.position.z - away.target.z)
    / (away.position.x - away.target.x)));
  assert.ok(Math.abs(homeAzimuth - 20 * Math.PI / 180) < 1e-9);
  assert.ok(Math.abs(awayAzimuth - 20 * Math.PI / 180) < 1e-9);
  for (const frame of [home, away]) {
    const horizontalDistance = Math.hypot(
      frame.position.x - frame.target.x,
      frame.position.z - frame.target.z,
    );
    const elevation = Math.atan2(frame.position.y - frame.target.y, horizontalDistance);
    assert.ok(Math.abs(elevation - 24 * Math.PI / 180) < 1e-9);
  }
});

test('wide and narrow viewports fit the projected three-person group and full player height', () => {
  const groupPlayers = [
    { id: 'left', x: 300, y: 170 },
    { id: 'center', x: 420, y: 270 },
    { id: 'right', x: 540, y: 370 },
  ];
  const input = { players: groupPlayers, participantIds: ['left', 'center', 'right'], team: 'home' };
  const wide = getGoalCelebrationCameraFrame({ ...input, aspect: 16 / 9 });
  const narrow = getGoalCelebrationCameraFrame({ ...input, aspect: 0.5 });
  const elevation = 24 * Math.PI / 180;
  const azimuth = 20 * Math.PI / 180;
  const verticalHalfFov = 21 * Math.PI / 180;
  const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * 0.5);
  const distance = (frame) => Math.hypot(
    frame.position.x - frame.target.x,
    frame.position.y - frame.target.y,
    frame.position.z - frame.target.z,
  );
  const attackDirection = 1;
  const right = { x: -attackDirection * Math.sin(azimuth), z: Math.cos(azimuth) };
  const up = {
    x: -attackDirection * Math.sin(elevation) * Math.cos(azimuth),
    y: Math.cos(elevation),
    z: -Math.sin(elevation) * Math.sin(azimuth),
  };
  const participants = groupPlayers.filter(({ id }) => input.participantIds.includes(id));
  const projectedX = participants.map(({ x }) => x / 80 - 6);
  const projectedZ = participants.map(({ y }) => (y - 270) / 80);
  const groupCenterX = projectedX.reduce((sum, value) => sum + value, 0) / projectedX.length;
  const groupCenterZ = projectedZ.reduce((sum, value) => sum + value, 0) / projectedZ.length;
  const requiredHalfWidth = Math.max(...participants.map((_, index) => Math.abs(
    (projectedX[index] - groupCenterX) * right.x + (projectedZ[index] - groupCenterZ) * right.z,
  ))) + 0.45;
  const requiredHalfHeight = Math.max(1.0, Math.max(...participants.flatMap((_, index) => {
    const horizontal = (projectedX[index] - groupCenterX) * up.x
      + (projectedZ[index] - groupCenterZ) * up.z;
    return [
      Math.abs(horizontal - 0.85 * up.y),
      Math.abs(horizontal + (1.6 - 0.85) * up.y),
    ];
  })) + 0.2);

  assert.ok(distance(narrow) > distance(wide));
  assert.ok(distance(wide) * Math.tan(Math.atan(Math.tan(verticalHalfFov) * (16 / 9)))
    >= requiredHalfWidth - 1e-9);
  assert.ok(distance(narrow) * Math.tan(horizontalHalfFov) >= requiredHalfWidth - 1e-9);
  assert.ok(distance(wide) * Math.tan(verticalHalfFov) >= requiredHalfHeight - 1e-9);
  assert.ok(distance(narrow) * Math.tan(verticalHalfFov) >= requiredHalfHeight - 1e-9);
});

test('invalid teams, missing participants, and malformed selections return null', () => {
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: ['center'], team: 'neutral', aspect: 1 }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: [], team: 'home', aspect: 1 }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: ['missing'], team: 'home', aspect: 1 }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: ['bad'], team: 'home' }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players: [], participantIds: ['center'], team: 'home', aspect: 1 }), null);
});
