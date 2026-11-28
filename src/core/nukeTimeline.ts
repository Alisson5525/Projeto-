// Nuke Purple choreography with the default GojoNukeSettings, ported from
// GojoNukeTimeline, GojoNukeMerge, GojoNukeCameraPath and GojoNukeCamera.
// Times in seconds; points are local (x right, y up, z forward) from the
// caster's starting feet position.
import { deg, smootherstep as smooth, type V3, v3 } from "./vec";

export const NUKE = {
  animationDuration: 21.3,
  riseDuration: 4,
  riseBlocks: 15,
  headHeight: 1.62,
  primaryArrive: 4,
  overheadBlocks: 17,
  primarySpiralRadius: 6,
  primarySpiralTurns: 1.1,
  blueAppear: 4,
  blueLaunch: 5,
  blueBend: 5.35,
  blueOrbitJoin: 5.9,
  redAppear: 8,
  redLaunch: 9,
  redBend: 9.35,
  redOrbitJoin: 9.75,
  fusionAt: 10,
  secondarySpiralAt: 12,
  chargeAt: 13,
  explosionAt: 19,
  explosionDuration: 15,
  damageRadius: 64,
  damagePerSecond: 6,
  casterHealthCost: 0.5,
  damageIntervalTicks: 5,
  terrainSweepFraction: 0.8,
  armSide: 0.29,
  armForward: 0.74,
  armHeight: 1.34,
  armFrontOffset: 0.15,
  blueStraight: 2.75,
  redStraight: 2.5,
  redChaseLag: 0.1,
  launchExitSpeed: 0.85,
  orbitEntryDegrees: 10,
  orbitRadius: 4.5,
  orbitHeight: 1.4,
  orbitTurnsPerSecond: 0.22,
  secondarySpiralTurns: 0.35,
  mergeOverlap: 0.35,
  mergeFadeLead: 0.18,
  mergeFadeDuration: 0.24,
  cameraRiseDuration: 1,
  cameraAbove: 10,
  cameraTurnAt: 8,
  cameraDownAt: 10,
  cameraFrontAt: 13,
  cameraFrontDistance: 25,
  cameraFrontHeight: 5,
  cameraUpPitch: 90,
  cameraDownPitch: 90,
  cameraFrontFocus: 0.5,
  cameraOrbitRadius: 55,
  cameraOrbitHeight: 12,
  cameraOrbitSpeed: 8,
  cameraOrbitAcceleration: 5,
  cameraExplosionTransitionAt: 18,
  cameraReturnDuration: 2.5,
  shakeImpulseDuration: 0.9,
  shakeImpulse: 0.45,
  shakePosition: 1.65,
  shakeDegrees: 3.2,
  shakeFrequency: 3.8,
  shakeFadeDuration: 3.5,
  shakeAttackDuration: 0.5,
  viewRange: 256,
  fallProtectionSeconds: 30,
} as const;

const S = NUKE;
const unit = (t: number): number => Math.min(1, Math.max(0, t));
export const nukeEffectEnd = (): number => S.explosionAt + S.explosionDuration;
export const nukeEnd = (): number => Math.max(S.animationDuration, nukeEffectEnd() + S.cameraReturnDuration);

export const nukeLift = (t: number): number => S.riseBlocks * smooth(t / S.riseDuration);
export const nukeOverhead = (): V3 => v3(0, S.riseBlocks + S.headHeight + S.overheadBlocks, 0);

export function nukePrimary(t: number, initial: V3): V3 {
  const u = unit(t / S.primaryArrive);
  const blend = smooth(u);
  const a = Math.atan2(initial.z, initial.x) + blend * Math.PI * 2 * S.primarySpiralTurns;
  const r = Math.hypot(initial.x, initial.z) * (1 - blend) + S.primarySpiralRadius * Math.sin(Math.PI * u) ** 2;
  return v3(Math.cos(a) * r, initial.y + (nukeOverhead().y - initial.y) * blend, Math.sin(a) * r);
}

const arm = (t: number, red: boolean): V3 => v3((red ? 1 : -1) * S.armSide, nukeLift(t) + S.armHeight, S.armForward + S.armFrontOffset);
const omega = (): number => Math.PI * 2 * S.orbitTurnsPerSecond;
const phase = (t: number): number => Math.PI + (S.orbitEntryDegrees * Math.PI) / 180 + omega() * (t - S.blueOrbitJoin);

function orbit(t: number): V3 {
  const a = phase(t);
  return v3(S.orbitRadius * Math.cos(a), S.riseBlocks + S.orbitHeight, S.orbitRadius * Math.sin(a));
}

function straight(t: number, red: boolean): V3 {
  const start = red ? S.redLaunch : S.blueLaunch;
  const bend = red ? S.redBend : S.blueBend;
  const len = red ? S.redStraight : S.blueStraight;
  const u = unit((t - start) / (bend - start));
  const v = S.launchExitSpeed;
  const travel = len * (u ** 3 * (10 - 4 * v) + u ** 4 * (-15 + 7 * v) + u ** 5 * (6 - 3 * v));
  const base = arm(start, red);
  return red ? v3(base.x, base.y, base.z + travel) : v3(base.x - travel, base.y, base.z);
}

function straightVelocity(red: boolean): V3 {
  const speed = (S.launchExitSpeed * (red ? S.redStraight : S.blueStraight)) / ((red ? S.redBend : S.blueBend) - (red ? S.redLaunch : S.blueLaunch));
  return red ? v3(0, 0, speed) : v3(-speed, 0, 0);
}

function hermite(a: number, av: number, b: number, bv: number, u: number, d: number): number {
  const u2 = u * u;
  const u3 = u2 * u;
  return a * (2 * u3 - 3 * u2 + 1) + av * d * (u3 - 2 * u2 + u) + b * (-2 * u3 + 3 * u2) + bv * d * (u3 - u2);
}

function turnIntoOrbit(t: number, red: boolean): V3 {
  const bend = red ? S.redBend : S.blueBend;
  const join = red ? S.redOrbitJoin : S.blueOrbitJoin;
  const duration = join - bend;
  const u = unit((t - bend) / duration);
  const targetTime = red ? join - S.redChaseLag : join;
  const start = straight(bend, red);
  const vel = straightVelocity(red);
  const radius = Math.hypot(start.x, start.z);
  const angle = Math.atan2(start.z, start.x);
  const radial = (start.x * vel.x + start.z * vel.z) / radius;
  const angular = (start.x * vel.z - start.z * vel.x) / (radius * radius);
  const turn = Math.PI * 2;
  let advance = (phase(targetTime) - angle) % turn;
  if (advance < 0) advance += turn;
  let target = angle + advance;
  while (target - angle < Math.max(0.01, (duration * (angular + omega())) / 3)) target += turn;
  const r = hermite(radius, radial, S.orbitRadius, 0, u, duration);
  const a = hermite(angle, angular, target, omega(), u, duration);
  return v3(r * Math.cos(a), start.y + (S.riseBlocks + S.orbitHeight - start.y) * smooth(u), r * Math.sin(a));
}

export function nukeBlue(t: number): V3 {
  if (t <= S.blueLaunch) return arm(t, false);
  if (t < S.blueBend) return straight(t, false);
  return t < S.blueOrbitJoin ? turnIntoOrbit(t, false) : orbit(t);
}

export function nukeRed(t: number): V3 {
  if (t <= S.redLaunch) return arm(t, true);
  if (t < S.redBend) return straight(t, true);
  if (t < S.redOrbitJoin) return turnIntoOrbit(t, true);
  const u = smooth((t - S.redOrbitJoin) / (S.fusionAt - S.redOrbitJoin));
  return orbit(t - S.redChaseLag * (1 - u));
}

function mergePath(t: number, start: V3): V3 {
  const duration = S.chargeAt - S.secondarySpiralAt;
  const u = unit((t - S.secondarySpiralAt) / duration);
  const blend = smooth(u);
  const angle =
    Math.atan2(start.z, start.x) +
    omega() * duration * (u - 6 * u ** 3 + 8 * u ** 4 - 3 * u ** 5) +
    Math.PI * 2 * S.secondarySpiralTurns * blend;
  const radius = S.orbitRadius * (1 - blend);
  return v3(radius * Math.cos(angle), start.y + (nukeOverhead().y - start.y) * blend, radius * Math.sin(angle));
}

/** The fused (secondary) purple between fusion and charge. */
export function nukeSecondary(t: number): V3 {
  if (t <= S.secondarySpiralAt) return orbit(t);
  return t >= S.chargeAt ? nukeOverhead() : mergePath(t, orbit(S.secondarySpiralAt));
}

export const nukeChargeOpacity = (t: number): number => smooth((t - S.chargeAt) / S.mergeOverlap);

export function nukeOrbitAngle(t: number): number {
  if (t > nukeEffectEnd()) {
    const age = nukeEffectEnd() - S.explosionAt;
    const u = unit((t - nukeEffectEnd()) / S.cameraReturnDuration);
    const atEnd = S.cameraOrbitSpeed * age + 0.5 * S.cameraOrbitAcceleration * age * age;
    const speed = S.cameraOrbitSpeed + S.cameraOrbitAcceleration * age;
    return ((atEnd + speed * S.cameraReturnDuration * (u - 0.5 * u * u)) * Math.PI) / 180;
  }
  const age = t - S.explosionAt;
  const acc = Math.max(0, age);
  return ((S.cameraOrbitSpeed * age + 0.5 * S.cameraOrbitAcceleration * acc * acc) * Math.PI) / 180;
}

export interface CameraFrame {
  pos: V3;
  yawOffset: number;
  pitch: number;
}

/** GojoNukeCameraPath.sample: camera position (local) and angles at time t. */
export function nukeCamera(t: number): CameraFrame {
  const eye = nukeLift(t) + S.headHeight;
  const front = v3(0, S.riseBlocks + S.headHeight + S.cameraFrontHeight, S.cameraFrontDistance);
  const focus = S.overheadBlocks * S.cameraFrontFocus;
  const frontPitch = deg(Math.atan2(S.cameraFrontHeight - focus, S.cameraFrontDistance));
  if (t <= S.cameraDownAt) {
    const u = smooth((t - S.cameraTurnAt) / (S.cameraDownAt - S.cameraTurnAt));
    return { pos: v3(0, eye + S.cameraAbove, 0), yawOffset: 180 * u, pitch: S.cameraUpPitch + (S.cameraDownPitch - S.cameraUpPitch) * u };
  }
  if (t < S.cameraFrontAt) {
    const u = smooth((t - S.cameraDownAt) / (S.cameraFrontAt - S.cameraDownAt));
    const a = u * Math.PI * 0.5;
    const z = S.cameraFrontDistance * Math.sin(a);
    const y = S.cameraFrontHeight + (S.cameraAbove - S.cameraFrontHeight) * Math.cos(a);
    return { pos: v3(0, eye + y, z), yawOffset: 180, pitch: deg(Math.atan2(y - focus * u, z)) + (S.cameraDownPitch - 90) * (1 - u) };
  }
  if (t <= S.cameraExplosionTransitionAt) return { pos: front, yawOffset: 180, pitch: frontPitch };
  const a = nukeOrbitAngle(t);
  const over = nukeOverhead();
  const orbitPos = v3(over.x + S.cameraOrbitRadius * Math.sin(a), over.y + S.cameraOrbitHeight, over.z + S.cameraOrbitRadius * Math.cos(a));
  const u = smooth((t - S.cameraExplosionTransitionAt) / (S.explosionAt - S.cameraExplosionTransitionAt));
  return {
    pos: v3(front.x + (orbitPos.x - front.x) * u, front.y + (orbitPos.y - front.y) * u, front.z + (orbitPos.z - front.z) * u),
    yawOffset: 180 + deg(a) * u,
    pitch: frontPitch + (deg(Math.atan2(S.cameraOrbitHeight, S.cameraOrbitRadius)) - frontPitch) * u,
  };
}

/** Explosion shake envelope (0..1). */
export function nukeShake(t: number): number {
  if (t < S.explosionAt || t >= nukeEffectEnd()) return 0;
  return smooth((t - S.explosionAt) / S.shakeAttackDuration) * smooth((nukeEffectEnd() - t) / S.shakeFadeDuration);
}
