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
});

test('narrow viewports increase camera distance enough to keep the lateral group within frame', () => {
  const input = { players, participantIds: ['left', 'center', 'right'], team: 'home' };
  const wide = getGoalCelebrationCameraFrame({ ...input, aspect: 16 / 9 });
  const narrow = getGoalCelebrationCameraFrame({ ...input, aspect: 0.5 });
  const horizontalHalfFov = Math.atan(Math.tan(21 * Math.PI / 180) * 0.5);
  const requiredHalfWidth = ((320 - 220) / 80) / 2 + 0.45;
  const narrowDistance = Math.hypot(
    narrow.position.x - narrow.target.x,
    narrow.position.y,
  );

  assert.ok(narrowDistance > Math.hypot(wide.position.x - wide.target.x, wide.position.y));
  assert.ok(narrowDistance * Math.tan(horizontalHalfFov) >= requiredHalfWidth - 1e-9);
});

test('invalid teams, missing participants, and malformed selections return null', () => {
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: ['center'], team: 'neutral', aspect: 1 }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: [], team: 'home', aspect: 1 }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: ['missing'], team: 'home', aspect: 1 }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players, participantIds: ['bad'], team: 'home' }), null);
  assert.equal(getGoalCelebrationCameraFrame({ players: [], participantIds: ['center'], team: 'home', aspect: 1 }), null);
});
