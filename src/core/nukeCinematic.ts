// Nuke Purple: tick timing, damage pulses and the full camera pose
// (GojoNukeCamera.sample: rise blend, impulse/explosion shake, return blend).
import { NUKE, nukeCamera, nukeEffectEnd, nukeEnd, nukeShake } from "./nukeTimeline";
import { lerp, smootherstep, toWorld, type V3 } from "./vec";

export const NUKE_TICKS = {
  /** The caster is released (21.3 s). */
  release: Math.round(NUKE.animationDuration * 20),
  explosion: Math.ceil(NUKE.explosionAt * 20),
  effectEnd: Math.ceil(nukeEffectEnd() * 20),
  /** Camera returned, everything over (36.5 s). */
  end: Math.ceil(nukeEnd() * 20),
} as const;

/** Bedrock hurt immunity is 10 ticks: one pulse every 10 ticks keeps the Java 6 damage per second. */
const PULSE = 10;

/** Damage per target on this tick of the cast (0 = no pulse). */
export function nukeDamageAt(tick: number): number {
  if (tick < NUKE_TICKS.explosion || tick >= NUKE_TICKS.effectEnd) return 0;
  if ((tick - NUKE_TICKS.explosion) % PULSE !== 0) return 0;
  return (NUKE.damagePerSecond * Math.min(PULSE, NUKE_TICKS.effectEnd - tick)) / 20;
}

export interface Pose {
  pos: V3;
  yaw: number;
  pitch: number;
}

export interface CameraContext {
  origin: V3;
  yaw: number;
  /** The player's camera when the cast started. */
  initial: Pose;
  /** Where the player's own camera is now (target of the return blend). */
  normal: Pose;
}

const remainder = (x: number, m: number): number => x - m * Math.round(x / m);

function blend(a: Pose, b: Pose, u: number): Pose {
  return { pos: lerp(a.pos, b.pos, u), yaw: a.yaw + remainder(b.yaw - a.yaw, 360) * u, pitch: a.pitch + remainder(b.pitch - a.pitch, 360) * u };
}

/** Camera pose at `t` seconds into the cast. */
export function cameraPose(t: number, ctx: CameraContext): Pose {
  const frame = nukeCamera(t);
  let pose: Pose = { pos: toWorld(ctx.origin, ctx.yaw, frame.pos), yaw: ctx.yaw + frame.yawOffset, pitch: frame.pitch };
  if (t < NUKE.cameraRiseDuration) pose = blend(ctx.initial, pose, smootherstep(t / NUKE.cameraRiseDuration));

  const impulse =
    t >= NUKE.chargeAt && t < NUKE.chargeAt + NUKE.shakeImpulseDuration
      ? NUKE.shakeImpulse * Math.sin((Math.PI * (t - NUKE.chargeAt)) / NUKE.shakeImpulseDuration) ** 2
      : 0;
  const explosion = nukeShake(t);
  if (impulse > 0 || explosion > 0) {
    const phase = t * NUKE.shakeFrequency * Math.PI * 2;
    const p = impulse + NUKE.shakePosition * explosion;
    const r = NUKE.shakeDegrees * explosion + impulse;
    pose = {
      pos: { x: pose.pos.x + Math.sin(phase) * p, y: pose.pos.y + Math.sin(phase * 1.31) * p * 0.65, z: pose.pos.z + Math.sin(phase * 0.79) * p * 0.5 },
      yaw: pose.yaw + Math.sin(phase * 0.91) * r,
      pitch: pose.pitch + Math.sin(phase * 1.13) * r,
    };
  }

  const effectEnd = nukeEffectEnd();
  if (t >= effectEnd) {
    const weight = smootherstep((t - effectEnd) / NUKE.cameraReturnDuration);
    const reference = ctx.yaw + nukeCamera(effectEnd).yawOffset;
    const target = { ...ctx.normal, yaw: reference + remainder(ctx.normal.yaw - reference, 360) };
    pose = { pos: lerp(pose.pos, target.pos, weight), yaw: pose.yaw + (target.yaw - pose.yaw) * weight, pitch: pose.pitch + (target.pitch - pose.pitch) * weight };
  }
  return pose;
}
