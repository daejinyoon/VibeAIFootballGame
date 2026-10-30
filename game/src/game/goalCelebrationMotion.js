import { GOAL_CELEBRATION_IDS } from './goalCelebrations.js';

const DURATION_SECONDS = 3;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const smoothstep = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (from, to, amount) => from + (to - from) * amount;

function neutralPose() {
  return {
    torsoPitch: 0,
    torsoRoll: 0,
    headPitch: 0,
    leftArmPitch: 0,
    rightArmPitch: 0,
    leftArmRoll: 0,
    rightArmRoll: 0,
    leftLegPitch: 0,
    rightLegPitch: 0,
    rootLift: 0,
    rootGlide: 0,
    rootYaw: 0,
  };
}

function victoryPose(time) {
  const arms = smoothstep(time / 0.55) * 0.68;
  return {
    leftArmPitch: -0.55,
    rightArmPitch: -0.55,
    leftArmRoll: -arms,
    rightArmRoll: arms,
    torsoPitch: -0.1,
    rootLift: 0.035 * Math.abs(Math.sin(Math.PI * time)),
  };
}

function getRkoPose(time, role) {
  if (role === 'target') {
    if (time < 0.55) {
      const bend = smoothstep(time / 0.55);
      return {
        torsoPitch: -0.75 * bend,
        headPitch: -0.45 * bend,
        leftArmPitch: 0.48 * bend,
        rightArmPitch: 0.48 * bend,
      };
    }
    if (time < 1.35) {
      const fall = smoothstep((time - 0.55) / 0.8);
      return {
        torsoPitch: mix(-0.75, -0.22, fall),
        torsoRoll: 1.15 * fall,
        headPitch: mix(-0.45, -0.12, fall),
        leftArmPitch: mix(0.48, -0.55, fall),
        rightArmPitch: mix(0.48, -0.55, fall),
        rootLift: -0.22 * fall,
      };
    }
    if (time < 2) {
      return { torsoPitch: -0.22, torsoRoll: 1.15, headPitch: -0.12, rootLift: -0.22 };
    }
    const recover = smoothstep((time - 2) / 1);
    return {
      ...victoryPose(time),
      torsoPitch: mix(-0.22, 0, recover),
      torsoRoll: mix(1.15, 0, recover),
      headPitch: mix(-0.12, 0, recover),
      rootLift: mix(-0.22, 0, recover),
    };
  }

  if (role === 'striker') {
    if (time >= 2) return victoryPose(time);
    const hit = smoothstep(time / 0.35);
    const follow = 1 - smoothstep(Math.max(0, (time - 0.35) / 0.35));
    const release = 1 - smoothstep((time - 0.7) / 0.45);
    return {
      torsoPitch: -0.22 * hit * (0.55 + follow * 0.45),
      leftArmPitch: mix(-0.15, -1.05, hit) * release,
      rightArmPitch: mix(-0.15, -1.05, hit) * release,
      leftArmRoll: -0.45 * hit * release,
      rightArmRoll: 0.45 * hit * release,
    };
  }

  if (role === 'finisher') {
    if (time >= 2) return victoryPose(time);
    const approach = smoothstep((time - 0.35) / 0.45);
    const hook = smoothstep((time - 0.55) / 0.35);
    const followThrough = smoothstep((time - 1.35) / 0.5);
    return {
      torsoPitch: -0.12 * approach + 0.18 * followThrough,
      leftArmPitch: mix(0, -1.2, hook),
      rightArmPitch: mix(0, -1.2, hook),
      leftArmRoll: -0.8 * hook,
      rightArmRoll: 0.8 * hook,
      leftLegPitch: -0.16 * approach + 0.2 * followThrough,
      rightLegPitch: 0.16 * approach - 0.2 * followThrough,
    };
  }

  // Missing role data falls back to a safe group celebration, never a partial RKO.
  return victoryPose(time);
}

/** Return one deterministic pose for the shared three-second celebration clock. */
export function getGoalCelebrationPose(ceremonyId, elapsedSeconds, role = null) {
  if (!GOAL_CELEBRATION_IDS.includes(ceremonyId) || !Number.isFinite(elapsedSeconds)) return null;
  const time = clamp(elapsedSeconds, 0, DURATION_SECONDS);
  const pose = neutralPose();

  if (ceremonyId === 'siuuu') {
    const jump = time <= 0.55 ? Math.sin(Math.PI * time / 0.55) : 0;
    const sweep = smoothstep(time / 0.55);
    Object.assign(pose, {
      rootLift: 0.38 * jump,
      leftArmPitch: -0.55,
      rightArmPitch: -0.55,
      leftArmRoll: -1.1 * sweep,
      rightArmRoll: 1.1 * sweep,
      torsoPitch: -0.14,
    });
  } else if (ceremonyId === 'moonwalk') {
    const step = 0.22 * Math.sin(2 * Math.PI * 2.5 * time);
    Object.assign(pose, {
      leftLegPitch: step,
      rightLegPitch: -step,
      leftArmPitch: -0.12,
      rightArmPitch: -0.12,
      leftArmRoll: -0.08,
      rightArmRoll: 0.08,
      rootGlide: -0.42 * time / DURATION_SECONDS,
    });
  } else if (ceremonyId === 'takeTheL') {
    const step = 0.28 * Math.sin(2 * Math.PI * 2 * time);
    Object.assign(pose, {
      leftArmPitch: -0.35,
      rightArmPitch: 0.18,
      leftArmRoll: -1.15,
      rightArmRoll: 0.25,
      leftLegPitch: step,
      rightLegPitch: -step,
      rootLift: 0.04 * Math.abs(Math.sin(2 * Math.PI * 2 * time)),
    });
  } else if (ceremonyId === 'slickback') {
    const step = 0.2 * Math.sin(2 * Math.PI * 3 * time);
    Object.assign(pose, {
      torsoPitch: -0.12,
      leftArmPitch: -0.2,
      rightArmPitch: -0.2,
      leftArmRoll: -0.12,
      rightArmRoll: 0.12,
      leftLegPitch: step,
      rightLegPitch: -step,
      rootGlide: 0.24 * Math.sin(2 * Math.PI * time),
    });
  } else {
    Object.assign(pose, getRkoPose(time, role));
  }

  return pose;
}
