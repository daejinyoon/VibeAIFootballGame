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
  assert.ok(Math.abs(getGoalCelebrationPose('moonwalk', 3).rootGlide) < 1e-9);
});

test('the five ceremonies use different signature poses', () => {
  const signatures = GOAL_CELEBRATION_IDS.map((ceremonyId) => {
    const pose = getGoalCelebrationPose(ceremonyId, 0.4, null);
    return POSE_FIELDS.map((field) => pose[field].toFixed(4)).join(',');
  });
  assert.equal(new Set(signatures).size, GOAL_CELEBRATION_IDS.length);
});

test('SIUU stages anticipation, a jump turn, and an arms-wide landing', () => {
  const anticipation = getGoalCelebrationPose('siuuu', 0.2);
  const airborne = getGoalCelebrationPose('siuuu', 0.62);
  const landed = getGoalCelebrationPose('siuuu', 1.2);

  assert.equal(anticipation.rootLift, 0);
  assert.ok(airborne.rootLift > 0.3);
  assert.ok(airborne.rootYaw > 0.7);
  assert.ok(landed.leftArmRoll < -1.3);
  assert.ok(landed.rightArmRoll > 1.3);
  assert.equal(landed.rootYaw, Math.PI / 2);
});

test('Take the L raises a bent arm while Moonwalk and Slickback use different glides', () => {
  const takeTheL = getGoalCelebrationPose('takeTheL', 0.3);
  const moonwalk = getGoalCelebrationPose('moonwalk', 0.3);
  const slickback = getGoalCelebrationPose('slickback', 0.3);

  assert.ok(takeTheL.leftArmRoll < -2);
  assert.ok(takeTheL.leftElbowPitch < -0.5);
  assert.ok(takeTheL.rootLift > 0);
  assert.notEqual(moonwalk.leftFootPitch, slickback.leftFootPitch);
  assert.notEqual(moonwalk.rootGlide, slickback.rootGlide);
  assert.ok(moonwalk.rootGlide < 0);
  assert.ok(slickback.rootGlide < 0);
  assert.ok(Math.abs(getGoalCelebrationPose('moonwalk', 3).rootGlide) < 1e-9);
  assert.ok(Math.abs(getGoalCelebrationPose('slickback', 3).rootGlide) < 1e-9);
});

test('RKO visibly sequences the abdominal strike, bend, hook, backward fall, hold, and recovery', () => {
  const strike = getGoalCelebrationPose('rko', 0.3, 'striker');
  const contact = getGoalCelebrationPose('rko', 0.35, 'target');
  const bent = getGoalCelebrationPose('rko', 0.75, 'target');
  const hook = getGoalCelebrationPose('rko', 0.95, 'finisher');
  const falling = getGoalCelebrationPose('rko', 1.3, 'target');
  const held = getGoalCelebrationPose('rko', 1.7, 'target');
  const recovering = getGoalCelebrationPose('rko', 2.6, 'target');
  const recovered = getGoalCelebrationPose('rko', 3, 'target');
  const groupFallback = getGoalCelebrationPose('rko', 0.95, null);

  assert.ok(strike.rightArmPitch < -1);
  assert.ok(contact.headPitch > 0);
  assert.ok(bent.torsoPitch > 0.7);
  assert.ok(bent.leftElbowPitch < -1);
  assert.ok(Math.abs(hook.rootYaw) > 2.5);
  assert.ok(falling.rootPitch < -0.8);
  assert.ok(falling.rootLift > 0);
  assert.equal(held.rootPitch, -1.38);
  assert.ok(recovering.rootPitch < 0 && recovering.rootPitch > -1.38);
  assert.equal(recovered.rootPitch, 0);
  assert.equal(groupFallback.rootPitch, 0);
  assert.ok(groupFallback.leftArmRoll < 0);
  assert.ok(groupFallback.rightArmRoll > 0);
});

test('RKO missing role assignments use a safe group pose', () => {
  const pose = getGoalCelebrationPose('rko', 1, null);
  assert.ok(pose.leftArmRoll < 0);
  assert.ok(pose.rightArmRoll > 0);
  assert.equal(pose.torsoRoll, 0);
  assert.equal(pose.rootPitch, 0);
});
