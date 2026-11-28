import { describe, expect, it } from "vitest";
import {
  capsuleRuns,
  countCells,
  inCone,
  pointSegmentDistanceSq,
  redDomeCells,
  segmentBoxDistanceSq,
  sphereRuns,
} from "../../src/core/geometry";
import { arenaOrigin, closureThreshold, crossesSphere } from "../../src/core/domainRules";
import { infinityBlocks, infinitySpeedFactor } from "../../src/core/infinity";
import { directionFromRotation, toLocal, toWorld } from "../../src/core/vec";

const v = (x: number, y: number, z: number) => ({ x, y, z });

describe("vectors", () => {
  it("follows the Minecraft look direction convention", () => {
    const d = directionFromRotation(0, 0);
    expect(d.z).toBeCloseTo(1);
    expect(directionFromRotation(90, 0).y).toBeCloseTo(-1);
    expect(directionFromRotation(0, 90).x).toBeCloseTo(-1);
  });
  it("converts local (right, up, forward) offsets to world and back", () => {
    const origin = v(10, 64, -3);
    const w = toWorld(origin, 0, v(1, 2, 3));
    expect(w.x).toBeCloseTo(9);
    expect(w.z).toBeCloseTo(0);
    const back = toLocal(origin, 37, toWorld(origin, 37, v(1.5, 0.5, -2)));
    expect(back.x).toBeCloseTo(1.5);
    expect(back.z).toBeCloseTo(-2);
  });
});

describe("segment/box distance", () => {
  it("is zero when the segment crosses the box", () => {
    expect(segmentBoxDistanceSq(v(-5, 0.5, 0.5), v(5, 0.5, 0.5), v(0, 0, 0), v(1, 1, 1))).toBeCloseTo(0);
  });
  it("measures the gap to a box beside the segment", () => {
    expect(segmentBoxDistanceSq(v(-5, 3, 0.5), v(5, 3, 0.5), v(0, 0, 0), v(1, 1, 1))).toBeCloseTo(4);
  });
  it("measures point to segment distance", () => {
    expect(pointSegmentDistanceSq(v(0, 2, 0), v(-1, 0, 0), v(1, 0, 0))).toBeCloseTo(4);
    expect(pointSegmentDistanceSq(v(3, 0, 0), v(-1, 0, 0), v(1, 0, 0))).toBeCloseTo(4);
  });
});

describe("cone test", () => {
  it("accepts targets inside the half angle and rejects behind", () => {
    const cos22 = Math.cos((22 * Math.PI) / 180);
    expect(inCone(v(0, 0, 0), v(0, 0, 1), v(0.2, 0, 5), cos22)).toBe(true);
    expect(inCone(v(0, 0, 0), v(0, 0, 1), v(5, 0, 5), cos22)).toBe(false);
    expect(inCone(v(0, 0, 0), v(0, 0, 1), v(0, 0, -5), cos22)).toBe(false);
  });
});

describe("block runs", () => {
  it("covers a sphere's volume within 2% and stays inside the radius", () => {
    const c = v(0.5, 64.5, 0.5);
    const runs = sphereRuns(c, 24);
    const cells = countCells(runs);
    const volume = (4 / 3) * Math.PI * 24 ** 3;
    expect(Math.abs(cells - volume) / volume).toBeLessThan(0.02);
    for (const r of runs) {
      for (const x of [r.x0, r.x1]) {
        const dx = x + 0.5 - c.x;
        const dy = r.y + 0.5 - c.y;
        const dz = r.z + 0.5 - c.z;
        expect(dx * dx + dy * dy + dz * dz).toBeLessThanOrEqual(24 * 24 + 1e-6);
      }
    }
  });
  it("builds a capsule along a segment", () => {
    const runs = capsuleRuns(v(0, 64, 0), v(10, 64, 0), 2);
    expect(countCells(runs)).toBeGreaterThan(100);
    expect(runs.every((r) => r.y >= 61 && r.y <= 66)).toBe(true);
  });
  it("carves the Red dome with a noisy ground ring", () => {
    const cells = redDomeCells(v(0.5, 65.5, 0.5), 64);
    expect(cells.length).toBeGreaterThan(200);
    expect(cells.some((c) => c.y === 64)).toBe(true);
    expect(cells.every((c) => c.y >= 64 && c.y <= 70)).toBe(true);
  });
});

describe("Infinity", () => {
  it("slows approaching objects by the Java curve", () => {
    expect(infinitySpeedFactor(0.42)).toBe(0);
    expect(infinitySpeedFactor(5.2)).toBe(1);
    expect(infinitySpeedFactor(2.81)).toBeCloseTo(Math.pow(0.5, 1.55));
  });
  it("blocks melee and projectiles but not magic, fire or falling", () => {
    expect(infinityBlocks("entityAttack", false, true)).toBe(true);
    expect(infinityBlocks("projectile", true, true)).toBe(true);
    expect(infinityBlocks("entityExplosion", false, true)).toBe(true);
    expect(infinityBlocks("entityExplosion", false, false)).toBe(false);
    expect(infinityBlocks("fallingBlock", false, true)).toBe(true);
    expect(infinityBlocks("magic", false, true)).toBe(false);
    expect(infinityBlocks("fire", false, true)).toBe(false);
    expect(infinityBlocks("fall", false, true)).toBe(false);
  });
});

describe("domain rules", () => {
  it("detects crossing the barrier sphere only from inside to outside", () => {
    expect(crossesSphere(v(0, 0, 0), v(30, 0, 0), 24)).toBe(true);
    expect(crossesSphere(v(0, 0, 0), v(10, 0, 0), 24)).toBe(false);
    expect(crossesSphere(v(-30, 0, 0), v(30, 0, 0), 24)).toBe(true);
    expect(crossesSphere(v(-30, 30, 0), v(30, 30, 0), 24)).toBe(false);
  });
  it("places arenas 2048 blocks apart", () => {
    expect(arenaOrigin(0)).toEqual(v(0.5, 64, 0.5));
    expect(arenaOrigin(3)).toEqual(v(3 * 2048 + 0.5, 64, 0.5));
  });
  it("keeps the closure threshold near the Java range", () => {
    const t = closureThreshold(1, 0.5);
    expect(t).toBeGreaterThan(0.1);
    expect(t).toBeLessThan(0.8);
  });
});
