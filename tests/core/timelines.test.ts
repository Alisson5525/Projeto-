import { describe, expect, it } from "vitest";
import { maxBlueGrowth, maxBlueLocal, maxBlueRise, orbitWeight } from "../../src/core/maxBluePath";
import {
  NUKE,
  nukeBlue,
  nukeCamera,
  nukeLift,
  nukeOverhead,
  nukePrimary,
  nukeRed,
  nukeSecondary,
  nukeShake,
} from "../../src/core/nukeTimeline";
import { TL, liftFraction, purpleRadiusMultiplier, awakeningHeight } from "../../src/core/timelines";

describe("timeline constants", () => {
  it("come from the Java animation markers", () => {
    expect(TL.blue).toMatchObject({ cast: 45, fx: 5, pull: 30 });
    expect(TL.red).toMatchObject({ cast: 23, impact: 20 });
    expect(TL.barrage.punches).toEqual([12, 26, 30, 34, 38, 41, 45, 49, 53, 56, 60, 64, 68]);
    expect(TL.barrage).toMatchObject({ start: 20, contact: 5, hitAt: 10, hit: 119, kick: 84 });
    expect(TL.purple).toMatchObject({ fusion: 123, ready: 149, windup: 20, maxTravel: 80 });
    expect(TL.maxBlue).toMatchObject({ cast: 169, orbit: 69, life: 785, cancel: 28, scan: 5, debrisLife: 55 });
    expect(TL.nuke).toMatchObject({ total: 426, explosionAt: 380 });
  });
  it("lifts the caster with smootherstep", () => {
    expect(liftFraction(0)).toBe(0);
    expect(liftFraction(11)).toBeCloseTo(0.5);
    expect(liftFraction(22)).toBe(1);
  });
  it("shrinks the purple projectile during its last 5 ticks", () => {
    expect(purpleRadiusMultiplier(70, 80)).toBe(1);
    expect(purpleRadiusMultiplier(80, 80)).toBeCloseTo(0.5);
  });
  it("raises and lowers Gojo during the awakening", () => {
    expect(awakeningHeight(20, 10)).toBeCloseTo(0);
    expect(awakeningHeight(100, 10)).toBeCloseTo(10);
    expect(awakeningHeight(110, 10)).toBe(10);
    expect(awakeningHeight(157, 10)).toBeCloseTo(0);
  });
});

describe("Max Blue path", () => {
  it("starts at the chest and ends 9 blocks ahead after the orbit", () => {
    expect(maxBlueLocal(0)).toEqual({ x: 0, y: 1.25, z: 0.4 });
    const end = maxBlueLocal(69);
    expect(end.x).toBeCloseTo(0);
    expect(end.y).toBeCloseTo(1.45);
    expect(end.z).toBeCloseTo(9);
  });
  it("swings behind Gojo mid-orbit", () => {
    const mid = maxBlueLocal(30);
    expect(mid.z).toBeLessThan(-1);
  });
  it("grows to full size and fades at the end of its life", () => {
    expect(maxBlueGrowth(0)).toBeCloseTo(0.1025);
    expect(maxBlueGrowth(82 / 0.65)).toBeCloseTo(1);
    expect(maxBlueGrowth(786)).toBe(0);
    expect(maxBlueRise(34)).toBeCloseTo(1.7);
  });
  it("blends the scroll distance in after the orbit begins", () => {
    expect(orbitWeight(0, 69)).toBe(0);
    expect(orbitWeight(69, 69)).toBe(1);
  });
});

describe("Nuke Purple timeline", () => {
  it("rises 15 blocks in 4 seconds and centers 17 blocks above the head", () => {
    expect(nukeLift(0)).toBe(0);
    expect(nukeLift(4)).toBeCloseTo(15);
    expect(nukeOverhead().y).toBeCloseTo(33.62);
    expect(NUKE.explosionAt).toBe(19);
  });
  it("starts blue in the left hand and red in the right hand", () => {
    expect(nukeBlue(4.5).x).toBeLessThan(0);
    expect(nukeRed(8.5).x).toBeGreaterThan(0);
  });
  it("joins the orbit radius 4.5 and merges overhead at charge time", () => {
    const b = nukeBlue(7);
    expect(Math.hypot(b.x, b.z)).toBeCloseTo(4.5);
    const s = nukeSecondary(13);
    expect(s.y).toBeCloseTo(33.62);
    expect(Math.hypot(s.x, s.z)).toBeCloseTo(0);
  });
  it("brings the primary purple overhead by 4 seconds", () => {
    const p = nukePrimary(4, { x: 3, y: 2, z: 5 });
    expect(p.y).toBeCloseTo(33.62);
  });
  it("moves the camera above, then in front, then orbits", () => {
    expect(nukeCamera(9).pitch).toBeGreaterThan(80);
    const front = nukeCamera(15);
    expect(front.pos.z).toBeCloseTo(25);
    const orbit = nukeCamera(25);
    expect(Math.hypot(orbit.pos.x, orbit.pos.z)).toBeCloseTo(55);
  });
  it("shakes only during the explosion", () => {
    expect(nukeShake(10)).toBe(0);
    expect(nukeShake(25)).toBeGreaterThan(0.5);
  });
});
