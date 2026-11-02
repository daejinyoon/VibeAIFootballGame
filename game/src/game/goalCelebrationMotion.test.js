import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoalCelebrationPose } from './goalCelebrationMotion.js';
import { GOAL_CELEBRATION_DURATION_SECONDS, GOAL_CELEBRATION_IDS } from './goalCelebrations.js';

const POSE_FIELDS = [
  'torsoPitch', 'torsoRoll', 'headPitch', 'leftArmPitch', 'rightArmPitch',
  'leftArmRoll', 'rightArmRoll', 'leftElbowPitch', 'rightElbowPitch',
  'leftLegPitch', 'rightLegPitch', 'leftFootPitch', 'rightFootPitch',
  'rootLift', 'rootGlide', 'rootYaw', 'rootPitch',
];

const choreographyTime = (seconds) => seconds * GOAL_CELEBRATION_DURATION_SECONDS / 3;

test('every ceremony returns a complete finite pose through its five-second timeline', () => {
  for (const ceremonyId of GOAL_CELEBRATION_IDS) {
    for (const time of [0, 0.275, 0.55, 0.95, 1.35, 2, 2.5, 3, 4, 5]) {
      const pose = getGoalCelebrationPose(ceremonyId, time);
      assert.deepEqual(Object.keys(pose).sort(), [...POSE_FIELDS].sort(), `${ceremonyId} at ${time}s`);
      assert.ok(Object.values(pose).every(Number.isFinite), `${ceremonyId} at ${time}s is finite`);
    }
  }
});

test('unknown ceremonies and non-finite time samples return null', () => {
  assert.equal(getGoalCelebrationPose('missing', 0), null);
  assert.equal(getGoalCelebrationPose('moonwalk', 0), null);
  assert.equal(getGoalCelebrationPose('siuuu', Number.NaN), null);
  assert.equal(getGoalCelebrationPose('siuuu', Number.POSITIVE_INFINITY), null);
});

test('time clamps to the five-second interval', () => {
  assert.deepEqual(getGoalCelebrationPose('slickback', -4), getGoalCelebrationPose('slickback', 0));
  assert.deepEqual(getGoalCelebrationPose('slickback', 8), getGoalCelebrationPose('slickback', GOAL_CELEBRATION_DURATION_SECONDS));
  assert.ok(Math.abs(getGoalCelebrationPose('slickback', GOAL_CELEBRATION_DURATION_SECONDS).rootGlide) < 1e-9);
});

test('the four supported ceremonies use different signature poses', () => {
  const signatures = GOAL_CELEBRATION_IDS.map((ceremonyId) => {
    const pose = getGoalCelebrationPose(ceremonyId, choreographyTime(0.4), null);
    return POSE_FIELDS.map((field) => pose[field].toFixed(4)).join(',');
  });
  assert.equal(new Set(signatures).size, GOAL_CELEBRATION_IDS.length);
});

test('SIUU stages anticipation, a jump turn, and an arms-wide landing', () => {
  const anticipation = getGoalCelebrationPose('siuuu', choreographyTime(0.2));
  const airborne = getGoalCelebrationPose('siuuu', choreographyTime(0.62));
  const landed = getGoalCelebrationPose('siuuu', choreographyTime(1.2));

  assert.equal(anticipation.rootLift, 0);
  assert.ok(airborne.rootLift > 0.3);
  assert.ok(airborne.rootYaw > 0.7);
  assert.ok(landed.leftArmRoll < -1.3);
  assert.ok(landed.rightArmRoll > 1.3);
  assert.equal(landed.rootYaw, Math.PI / 2);
});

test('Take the L raises a bent arm and Slickback glides out and returns', () => {
  const takeTheL = getGoalCelebrationPose('takeTheL', choreographyTime(0.3));
  const slickback = getGoalCelebrationPose('slickback', choreographyTime(0.3));

  assert.ok(takeTheL.leftArmRoll < -2);
  assert.ok(takeTheL.leftElbowPitch < -0.5);
  assert.ok(takeTheL.rootLift > 0);
  assert.ok(slickback.rootGlide < 0);
  assert.ok(Math.abs(getGoalCelebrationPose('slickback', 5).rootGlide) < 1e-9);
});

test('RKO visibly sequences the abdominal strike, bend, hook, backward fall, hold, and recovery', () => {
  const strike = getGoalCelebrationPose('rko', choreographyTime(0.3), 'striker');
  const contact = getGoalCelebrationPose('rko', choreographyTime(0.35), 'target');
  const bent = getGoalCelebrationPose('rko', choreographyTime(0.75), 'target');
  const hook = getGoalCelebrationPose('rko', choreographyTime(0.95), 'finisher');
  const falling = getGoalCelebrationPose('rko', choreographyTime(1.3), 'target');
  const held = getGoalCelebrationPose('rko', choreographyTime(1.7), 'target');
  const recovering = getGoalCelebrationPose('rko', choreographyTime(2.6), 'target');
  const recovered = getGoalCelebrationPose('rko', 5, 'target');
  const groupFallback = getGoalCelebrationPose('rko', choreographyTime(0.95), null);

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
  const pose = getGoalCelebrationPose('rko', choreographyTime(1), null);
  assert.ok(pose.leftArmRoll < 0);
  assert.ok(pose.rightArmRoll > 0);
  assert.equal(pose.torsoRoll, 0);
  assert.equal(pose.rootPitch, 0);
});
