import assert from 'node:assert/strict';
import test from 'node:test';
import { getGoalCelebrationPose } from './goalCelebrationMotion.js';
import { GOAL_CELEBRATION_DURATION_SECONDS, GOAL_CELEBRATION_IDS } from './goalCelebrations.js';
import {
  PREVIEW_PLAYER_IDS,
  PREVIEW_PLAYER_POSITIONS,
  RKO_PREVIEW_CAMERA,
  RKO_PREVIEW_ROLES,
} from './goalCelebrationPreview.js';

const POSE_FIELDS = [
  'torsoPitch', 'torsoRoll', 'headPitch', 'leftArmPitch', 'rightArmPitch',
  'leftArmRoll', 'rightArmRoll', 'leftElbowPitch', 'rightElbowPitch',
  'leftLegPitch', 'rightLegPitch', 'leftFootPitch', 'rightFootPitch',
  'rootLift', 'rootShiftX', 'rootGlide', 'rootYaw', 'rootPitch',
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

test('RKO preview separates the three roles by depth and keeps the target centered', () => {
  const { targetId, strikerId, finisherId } = RKO_PREVIEW_ROLES;
  const [striker, target, finisher] = PREVIEW_PLAYER_POSITIONS.rko;

  assert.equal(new Set([targetId, strikerId, finisherId]).size, 3);
  assert.deepEqual(new Set([targetId, strikerId, finisherId]), new Set(PREVIEW_PLAYER_IDS));
  assert.deepEqual(target, [0, 0, 0]);
  assert.ok(striker[2] > target[2]);
  assert.ok(finisher[2] < target[2]);
  assert.notEqual(striker[2], finisher[2]);
  assert.ok(RKO_PREVIEW_CAMERA.position[0] > 0);
  assert.ok(RKO_PREVIEW_CAMERA.position[2] > 0);
});

test('RKO folds the target and lands the finisher forward after close contact', () => {
  const targetBeforeKick = getGoalCelebrationPose('rko', choreographyTime(0.34), 'target');
  const targetAfterContact = getGoalCelebrationPose('rko', choreographyTime(0.4), 'target');
  const strikerApproaching = getGoalCelebrationPose('rko', choreographyTime(0.3), 'striker');
  const strikerKicking = getGoalCelebrationPose('rko', choreographyTime(0.45), 'striker');
  const strikerRetracting = getGoalCelebrationPose('rko', choreographyTime(0.75), 'striker');
  const bent = getGoalCelebrationPose('rko', choreographyTime(0.95), 'target');
  const approaching = getGoalCelebrationPose('rko', choreographyTime(1), 'finisher');
  const hooked = getGoalCelebrationPose('rko', choreographyTime(1.2), 'finisher');
  const leaping = getGoalCelebrationPose('rko', choreographyTime(1.4), 'finisher');
  const targetEarlySlam = getGoalCelebrationPose('rko', choreographyTime(1.25), 'target');
  const targetLaterSlam = getGoalCelebrationPose('rko', choreographyTime(1.6), 'target');
  const finisherEarlySlam = getGoalCelebrationPose('rko', choreographyTime(1.3), 'finisher');
  const falling = getGoalCelebrationPose('rko', choreographyTime(1.6), 'target');
  const finisherFalling = getGoalCelebrationPose('rko', choreographyTime(1.6), 'finisher');
  const held = getGoalCelebrationPose('rko', choreographyTime(1.8), 'target');
  const finisherHeld = getGoalCelebrationPose('rko', choreographyTime(1.8), 'finisher');
  const recovering = getGoalCelebrationPose('rko', choreographyTime(2.35), 'target');
  const finisherRecovering = getGoalCelebrationPose('rko', choreographyTime(2.35), 'finisher');
  const recovered = getGoalCelebrationPose('rko', 5, 'target');
  const finisherRecovered = getGoalCelebrationPose('rko', 5, 'finisher');
  const groupFallback = getGoalCelebrationPose('rko', choreographyTime(0.95), null);

  assert.equal(targetBeforeKick.headPitch, 0);
  assert.equal(targetBeforeKick.torsoPitch, 0);
  assert.ok(targetAfterContact.headPitch > 0);
  assert.ok(targetAfterContact.torsoPitch > 0);
  assert.ok(strikerApproaching.rootShiftX > 0 && strikerApproaching.rootGlide > 0);
  assert.ok(strikerKicking.rightLegPitch < -1);
  assert.ok(strikerKicking.rightFootPitch < 0);
  assert.ok(Math.abs(strikerRetracting.rightLegPitch) < 1e-9);
  assert.ok(bent.torsoPitch > 0.7);
  assert.ok(bent.leftElbowPitch < -1);
  assert.ok(approaching.rootShiftX < 0);
  assert.ok(approaching.rootGlide > 0);
  assert.equal(approaching.rootPitch, -Math.PI / 2, 'the finisher faces up from the start of the RKO approach');
  assert.equal(approaching.rootLift, 0.035);
  assert.ok(Math.abs(approaching.rootYaw) < 0.5);
  assert.equal(hooked.rootPitch, -Math.PI / 2);
  assert.ok(hooked.leftArmPitch < -0.9 && hooked.rightArmPitch < -0.8);
  assert.equal(leaping.rootPitch, -Math.PI / 2);
  assert.ok(leaping.rootLift > 0.3);
  assert.ok(targetEarlySlam.rootPitch >= 0);
  assert.equal(targetEarlySlam.rootGlide, 0, 'the target stays in place at slam onset');
  assert.equal(targetLaterSlam.rootGlide, 0, 'the target stays at its prior position during the slam');
  assert.equal(held.rootGlide, 0, 'the target stays at its prior position while grounded');
  assert.equal(finisherEarlySlam.rootPitch, -Math.PI / 2);
  assert.ok(falling.rootPitch > 0.8);
  assert.ok(finisherFalling.rootPitch < 0);
  assert.ok(finisherFalling.rootShiftX < 0 && finisherFalling.rootGlide > 0);
  assert.ok(finisherFalling.rootGlide >= hooked.rootGlide + 0.1);
  assert.equal(held.rootPitch, 1.35);
  assert.equal(finisherHeld.rootPitch, -Math.PI / 2);
  assert.equal(finisherHeld.rootShiftX, -0.72);
  assert.equal(finisherHeld.rootGlide, 1.2, 'the finisher lands farther forward than the target');
  assert.ok(recovering.rootPitch > 0 && recovering.rootPitch < 1.35);
  assert.equal(recovering.rootGlide, 0, 'the target remains at its prior position during recovery');
  assert.ok(finisherRecovering.rootPitch < 0 && finisherRecovering.rootPitch > -Math.PI / 2);
  assert.ok(finisherRecovering.rootGlide > 0 && finisherRecovering.rootGlide < finisherHeld.rootGlide);
  assert.ok(finisherRecovering.rootShiftX > -0.72 && finisherRecovering.rootShiftX < 0);
  assert.equal(recovered.rootPitch, 0);
  assert.equal(recovered.rootGlide, 0);
  assert.equal(finisherRecovered.rootGlide, 0);
  assert.equal(recovered.rootShiftX, 0);
  assert.equal(finisherRecovered.rootShiftX, 0);
  assert.equal(groupFallback.rootPitch, 0);
  assert.equal(groupFallback.rootShiftX, 0);
  assert.ok(groupFallback.leftArmRoll < 0);
  assert.ok(groupFallback.rightArmRoll > 0);
});

test('RKO missing role assignments use a safe group pose', () => {
  const pose = getGoalCelebrationPose('rko', choreographyTime(1), null);
  assert.ok(pose.leftArmRoll < 0);
  assert.ok(pose.rightArmRoll > 0);
  assert.equal(pose.torsoRoll, 0);
  assert.equal(pose.rootPitch, 0);
  assert.equal(pose.rootShiftX, 0);
});

test('non-RKO ceremonies do not use horizontal root translation', () => {
  for (const ceremonyId of ['siuuu', 'takeTheL', 'slickback']) {
    assert.equal(getGoalCelebrationPose(ceremonyId, 1).rootShiftX, 0);
  }
});
