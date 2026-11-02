import { GOAL_CELEBRATION_DURATION_SECONDS, GOAL_CELEBRATION_IDS } from './goalCelebrations.js';

const CHOREOGRAPHY_DURATION_SECONDS = 3;
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const smoothstep = (value) => {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (from, to, amount) => from + (to - from) * amount;

function blendToVictory(pose, time, amount) {
  const victory = victoryPose(time);
  return Object.fromEntries(Object.keys(neutralPose()).map((field) => [
    field,
    mix(pose[field] ?? 0, victory[field] ?? 0, amount),
  ]));
}

function glideOutAndReturn(time, distance, returnStart) {
  if (time <= returnStart) return -distance * time / returnStart;
  const returnProgress = smoothstep((time - returnStart) / (CHOREOGRAPHY_DURATION_SECONDS - returnStart));
  return -distance * (1 - returnProgress);
}

function neutralPose() {
  return {
    torsoPitch: 0,
    torsoRoll: 0,
    headPitch: 0,
    leftArmPitch: 0,
    rightArmPitch: 0,
    leftArmRoll: 0,
    rightArmRoll: 0,
    leftElbowPitch: 0,
    rightElbowPitch: 0,
    leftLegPitch: 0,
    rightLegPitch: 0,
    leftFootPitch: 0,
    rightFootPitch: 0,
    rootLift: 0,
    rootShiftX: 0,
    rootGlide: 0,
    rootYaw: 0,
    rootPitch: 0,
  };
}

function victoryPose(time) {
  const arms = smoothstep(time / 0.5) * 1.42;
  return {
    leftArmPitch: -0.48,
    rightArmPitch: -0.48,
    leftArmRoll: -arms,
    rightArmRoll: arms,
    leftElbowPitch: -0.12,
    rightElbowPitch: -0.12,
    torsoPitch: -0.08,
    rootLift: 0.025 * Math.abs(Math.sin(Math.PI * time)),
  };
}

function getRkoPose(time, role) {
  if (role === 'target') {
    if (time < 0.2) return {};
    if (time < 0.45) {
      const impact = smoothstep((time - 0.2) / 0.25);
      return {
        torsoPitch: 0.2 * impact,
        headPitch: 0.38 * impact,
        leftArmPitch: -0.4 * impact,
        rightArmPitch: -0.55 * impact,
        leftArmRoll: -0.24 * impact,
        rightArmRoll: 0.24 * impact,
        leftElbowPitch: -0.78 * impact,
        rightElbowPitch: -0.78 * impact,
      };
    }
    if (time < 0.82) {
      const bend = smoothstep((time - 0.45) / 0.37);
      return {
        torsoPitch: mix(0.2, 0.86, bend),
        headPitch: mix(0.38, 0.72, bend),
        leftArmPitch: mix(-0.4, -0.72, bend),
        rightArmPitch: mix(-0.55, -0.72, bend),
        leftArmRoll: mix(-0.24, -0.46, bend),
        rightArmRoll: mix(0.24, 0.46, bend),
        leftElbowPitch: mix(-0.78, -1.12, bend),
        rightElbowPitch: mix(-0.78, -1.12, bend),
      };
    }
    if (time < 1.1) {
      return {
        torsoPitch: 0.86,
        headPitch: 0.72,
        leftArmPitch: -0.72,
        rightArmPitch: -0.72,
        leftArmRoll: -0.46,
        rightArmRoll: 0.46,
        leftElbowPitch: -1.12,
        rightElbowPitch: -1.12,
      };
    }
    if (time < 1.65) {
      const fall = smoothstep((time - 1.1) / 0.55);
      return {
        torsoPitch: mix(0.86, 0.18, fall),
        headPitch: mix(0.72, -0.12, fall),
        leftArmPitch: mix(-0.72, -0.16, fall),
        rightArmPitch: mix(-0.72, -0.16, fall),
        leftArmRoll: mix(-0.46, -0.92, fall),
        rightArmRoll: mix(0.46, 0.92, fall),
        leftElbowPitch: mix(-1.12, -0.32, fall),
        rightElbowPitch: mix(-1.12, -0.32, fall),
        leftLegPitch: 0.48 * fall,
        rightLegPitch: -0.28 * fall,
        rootPitch: -1.38 * fall,
        rootLift: 0.035 * fall,
      };
    }
    if (time < 2.1) {
      return {
        torsoPitch: 0.18,
        headPitch: -0.12,
        leftArmPitch: -0.16,
        rightArmPitch: -0.16,
        leftArmRoll: -0.92,
        rightArmRoll: 0.92,
        leftElbowPitch: -0.32,
        rightElbowPitch: -0.32,
        leftLegPitch: 0.48,
        rightLegPitch: -0.28,
        rootPitch: -1.38,
        rootLift: 0.035,
      };
    }
    const recover = smoothstep((time - 2.1) / 0.55);
    return blendToVictory({
      rootPitch: -1.38,
      rootLift: 0.035,
      torsoPitch: 0.18,
      headPitch: -0.12,
      leftArmRoll: -0.92,
      rightArmRoll: 0.92,
      leftLegPitch: 0.48,
      rightLegPitch: -0.28,
    }, time, recover);
  }

  if (role === 'striker') {
    if (time >= 2) return victoryPose(time);
    const extend = smoothstep((time - 0.12) / 0.14);
    const retract = smoothstep((time - 0.34) / 0.36);
    const punch = extend * (1 - retract);
    const strikePose = {
      torsoPitch: 0.24 * punch,
      leftArmPitch: mix(0.18, 0.72, punch),
      rightArmPitch: mix(0.16, -1.28, punch),
      leftArmRoll: -0.2 - 0.24 * punch,
      rightArmRoll: 0.18 + 0.18 * punch,
      rightElbowPitch: -0.62 * punch,
      leftLegPitch: -0.12 * punch,
      rightLegPitch: 0.16 * punch,
    };
    return blendToVictory(strikePose, time, smoothstep((time - 0.84) / 1.06));
  }

  if (role === 'finisher') {
    if (time < 0.65) return {};
    if (time < 1.1) {
      const approach = smoothstep((time - 0.65) / 0.45);
      return {
        torsoPitch: 0.18 * approach,
        leftArmPitch: mix(0.14, -1.02, approach),
        rightArmPitch: mix(0.14, -0.92, approach),
        leftArmRoll: -0.78 * approach,
        rightArmRoll: 0.78 * approach,
        leftElbowPitch: -0.88 * approach,
        rightElbowPitch: -0.78 * approach,
        leftLegPitch: -0.12 * approach,
        rightLegPitch: 0.12 * approach,
        rootShiftX: -0.72 * approach,
        rootGlide: 0.48 * approach,
        rootYaw: -0.12 * approach,
      };
    }
    if (time < 1.65) {
      const fall = smoothstep((time - 1.1) / 0.55);
      return {
        torsoPitch: mix(0.18, -0.12, fall),
        leftArmPitch: -1.02,
        rightArmPitch: -0.92,
        leftArmRoll: -0.78,
        rightArmRoll: 0.78,
        leftElbowPitch: -0.88,
        rightElbowPitch: -0.78,
        leftLegPitch: mix(-0.12, 0.44, fall),
        rightLegPitch: mix(0.12, -0.34, fall),
        rootShiftX: -0.72,
        rootGlide: 0.48,
        rootPitch: -1.38 * fall,
        rootLift: 0.035 * fall,
        rootYaw: -0.12,
      };
    }
    if (time < 2.1) {
      return {
        torsoPitch: -0.12,
        leftArmPitch: -1.02,
        rightArmPitch: -0.92,
        leftArmRoll: -0.78,
        rightArmRoll: 0.78,
        leftElbowPitch: -0.88,
        rightElbowPitch: -0.78,
        leftLegPitch: 0.44,
        rightLegPitch: -0.34,
        rootShiftX: -0.72,
        rootGlide: 0.48,
        rootPitch: -1.38,
        rootLift: 0.035,
        rootYaw: -0.12,
      };
    }
    const recover = smoothstep((time - 2.1) / 0.55);
    return blendToVictory({
      rootShiftX: -0.72,
      rootGlide: 0.48,
      rootPitch: -1.38,
      rootLift: 0.035,
      rootYaw: -0.12,
      leftArmPitch: -1.02,
      rightArmPitch: -0.92,
      leftArmRoll: -0.78,
      rightArmRoll: 0.78,
      leftElbowPitch: -0.88,
      rightElbowPitch: -0.78,
      leftLegPitch: 0.44,
      rightLegPitch: -0.34,
    }, time, recover);
  }

  // Missing role data falls back to a safe group pose, never a partial RKO.
  return victoryPose(time);
}
/** Return one deterministic pose for the shared five-second celebration clock. */
export function getGoalCelebrationPose(ceremonyId, elapsedSeconds, role = null) {
  if (!GOAL_CELEBRATION_IDS.includes(ceremonyId) || !Number.isFinite(elapsedSeconds)) return null;
  const time = clamp(elapsedSeconds, 0, GOAL_CELEBRATION_DURATION_SECONDS)
    * CHOREOGRAPHY_DURATION_SECONDS / GOAL_CELEBRATION_DURATION_SECONDS;
  const pose = neutralPose();

  if (ceremonyId === 'siuuu') {
    if (time < 0.34) {
      const crouch = smoothstep(time / 0.34);
      Object.assign(pose, {
        torsoPitch: mix(-0.05, 0.2, crouch),
        leftArmPitch: mix(-0.28, 0.3, crouch),
        rightArmPitch: mix(-0.28, 0.3, crouch),
        leftArmRoll: -0.28,
        rightArmRoll: 0.28,
        leftLegPitch: 0.26 * crouch,
        rightLegPitch: 0.26 * crouch,
      });
    } else if (time < 0.9) {
      const leap = (time - 0.34) / 0.56;
      const turn = smoothstep(leap);
      Object.assign(pose, {
        rootLift: 0.42 * Math.sin(Math.PI * leap),
        rootYaw: (Math.PI / 2) * turn,
        leftArmPitch: -0.78,
        rightArmPitch: -0.78,
        leftArmRoll: mix(-0.28, -1.48, turn),
        rightArmRoll: mix(0.28, 1.48, turn),
        leftLegPitch: mix(0.26, -0.42, leap),
        rightLegPitch: mix(0.26, 0.28, leap),
        leftFootPitch: -0.18,
        rightFootPitch: -0.12,
      });
    } else if (time < 1.16) {
      const landing = smoothstep((time - 0.9) / 0.26);
      Object.assign(pose, {
        rootLift: 0.025 * Math.sin(Math.PI * landing),
        rootYaw: Math.PI / 2,
        torsoPitch: mix(0.08, -0.1, landing),
        leftArmPitch: -0.5,
        rightArmPitch: -0.5,
        leftArmRoll: -1.48,
        rightArmRoll: 1.48,
        leftLegPitch: mix(-0.3, 0.04, landing),
        rightLegPitch: mix(0.22, 0.04, landing),
      });
    } else {
      const exitTurn = smoothstep((time - 2.45) / 0.55);
      Object.assign(pose, victoryPose(time), { rootYaw: (Math.PI / 2) * (1 - exitTurn) });
    }
  } else if (ceremonyId === 'takeTheL') {
    const phase = 2 * Math.PI * 1.5 * time;
    const bounce = Math.abs(Math.sin(phase));
    const step = Math.sin(phase);
    Object.assign(pose, {
      leftArmPitch: -0.3,
      rightArmPitch: -0.18,
      leftArmRoll: -2.7,
      rightArmRoll: 0.32,
      leftElbowPitch: -0.62,
      rightElbowPitch: -0.52,
      leftLegPitch: -0.23 * step,
      rightLegPitch: 0.23 * step,
      leftFootPitch: -0.18 * Math.max(0, step),
      rightFootPitch: -0.18 * Math.max(0, -step),
      torsoRoll: 0.07 * step,
      rootLift: 0.045 * bounce,
    });
  } else if (ceremonyId === 'slickback') {
    const phase = 2 * Math.PI * 1.5 * time;
    const step = Math.sin(phase);
    const leftLift = Math.max(0, step);
    const rightLift = Math.max(0, -step);
    Object.assign(pose, {
      torsoPitch: -0.08,
      torsoRoll: 0.1 * step,
      leftArmPitch: -0.14 - 0.07 * step,
      rightArmPitch: -0.14 + 0.07 * step,
      leftArmRoll: -0.12 - 0.12 * step,
      rightArmRoll: 0.12 - 0.12 * step,
      leftElbowPitch: -0.16,
      rightElbowPitch: -0.16,
      leftLegPitch: -0.82 * leftLift + 0.2 * rightLift,
      rightLegPitch: -0.82 * rightLift + 0.2 * leftLift,
      leftFootPitch: -0.68 * leftLift + 0.32 * rightLift,
      rightFootPitch: -0.68 * rightLift + 0.32 * leftLift,
      rootLift: 0.2 * Math.abs(step),
      rootGlide: glideOutAndReturn(time, 0.62, 2.45) + 0.07 * Math.sin(phase),
    });
  } else {
    Object.assign(pose, getRkoPose(time, role));
  }

  return pose;
}
