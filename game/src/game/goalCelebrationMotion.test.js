import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoalCelebrationPose } from './goalCelebrationMotion.js';
import { GOAL_CELEBRATION_IDS } from './goalCelebrations.js';

const POSE_FIELDS = [
  'torsoPitch', 'torsoRoll', 'headPitch', 'leftArmPitch', 'rightArmPitch',
  'leftArmRoll', 'rightArmRoll', 'leftElbowPitch', 'rightElbowPitch',
  'leftLegPitch', 'rightLegPitch', 'leftFootPitch', 'rightFootPitch',
  'rootLift', 'rootGlide', 'rootYaw', 'rootPitch',
];

test('every ceremony returns a complete finite pose through its three-second timeline', () => {
  for (const ceremonyId of GOAL_CELEBRATION_IDS) {
    for (const time of [0, 0.275, 0.55, 0.95, 1.35, 2, 2.5, 3]) {
      const pose = getGoalCelebrationPose(ceremonyId, time);
      assert.deepEqual(Object.keys(pose).sort(), [...POSE_FIELDS].sort(), `${ceremonyId} at ${time}s`);
      assert.ok(Object.values(pose).every(Number.isFinite), `${ceremonyId} at ${time}s is finite`);
      assert.equal(pose.leftElbowPitch, 0, `${ceremonyId} left elbow default at ${time}s`);
      assert.equal(pose.rightElbowPitch, 0, `${ceremonyId} right elbow default at ${time}s`);
      assert.equal(pose.leftFootPitch, 0, `${ceremonyId} left foot default at ${time}s`);
      assert.equal(pose.rightFootPitch, 0, `${ceremonyId} right foot default at ${time}s`);
      assert.equal(pose.rootPitch, 0, `${ceremonyId} body pitch default at ${time}s`);
    }
  }
});

test('unknown ceremonies and non-finite time samples return null', () => {
  assert.equal(getGoalCelebrationPose('missing', 0), null);
  assert.equal(getGoalCelebrationPose('siuuu', Number.NaN), null);
  assert.equal(getGoalCelebrationPose('siuuu', Number.POSITIVE_INFINITY), null);
});

test('time clamps to the three-second interval', () => {
  assert.deepEqual(getGoalCelebrationPose('moonwalk', -4), getGoalCelebrationPose('moonwalk', 0));
  assert.deepEqual(getGoalCelebrationPose('moonwalk', 8), getGoalCelebrationPose('moonwalk', 3));
  assert.equal(getGoalCelebrationPose('moonwalk', 3).rootGlide, -0.42);
});

test('the five ceremonies use different signature poses', () => {
  const signatures = GOAL_CELEBRATION_IDS.map((ceremonyId) => {
    const pose = getGoalCelebrationPose(ceremonyId, 0.4, null);
    return POSE_FIELDS.map((field) => pose[field].toFixed(4)).join(',');
  });
  assert.equal(new Set(signatures).size, GOAL_CELEBRATION_IDS.length);
});

test('RKO bends the target, applies the finisher hook, holds the fall, and recovers', () => {
  const bent = getGoalCelebrationPose('rko', 0.55, 'target');
  const falling = getGoalCelebrationPose('rko', 0.95, 'target');
  const held = getGoalCelebrationPose('rko', 1.35, 'target');
  const recovered = getGoalCelebrationPose('rko', 3, 'target');
  const strike = getGoalCelebrationPose('rko', 0.35, 'striker');
  const hook = getGoalCelebrationPose('rko', 0.95, 'finisher');
  const groupFallback = getGoalCelebrationPose('rko', 0.95, null);

  assert.equal(bent.torsoPitch, -0.75);
  assert.ok(falling.torsoRoll > 0.5);
  assert.ok(falling.rootLift < 0);
  assert.deepEqual(
    [held.torsoPitch, held.torsoRoll, held.headPitch, held.rootLift],
    [-0.22, 1.15, -0.12, -0.22],
  );
  assert.ok(Math.abs(recovered.torsoRoll) < 1e-9);
  assert.ok(strike.leftArmPitch < -0.9);
  assert.ok(hook.leftArmRoll < groupFallback.leftArmRoll);
  assert.deepEqual(
    new Set([JSON.stringify(strike), JSON.stringify(bent), JSON.stringify(hook)]).size,
    3,
  );
});

test('RKO missing role assignments use a safe group pose', () => {
  const pose = getGoalCelebrationPose('rko', 1, null);
  assert.ok(pose.leftArmRoll < 0);
  assert.ok(pose.rightArmRoll > 0);
  assert.equal(pose.torsoRoll, 0);
  assert.equal(pose.rootLift, 0.035 * Math.abs(Math.sin(Math.PI)));
});
