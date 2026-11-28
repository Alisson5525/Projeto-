import { describe, expect, it } from "vitest";
import {
  debrisStep,
  debrisVariant,
  DEBRIS_TEXTURES,
  fieldPullVelocity,
  isPullableBlock,
  MAX_BLUE,
  MaxBluePhase,
  sortedOffsets,
} from "../../src/core/maxBlueRules";
import { MAX_RED, maxRedSegment } from "../../src/core/maxRedRules";
import { ceilingLift, steerVelocity } from "../../src/core/motion";
import { length, sub } from "../../src/core/vec";

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe("Max Red beam", () => {
  it("sweeps 3 blocks per tick up to 48 blocks (16 ticks)", () => {
    const root = { x: 0, y: 0, z: 0 };
    const dir = { x: 0, y: 0, z: 1 };
    const s0 = maxRedSegment(root, dir, 0)!;
    close(s0.a.z, 0);
    close(s0.b.z, 3);
    close(maxRedSegment(root, dir, 15)!.b.z, 48);
    expect(maxRedSegment(root, dir, 16)).toBeNull();
  });

  it("fires on its own after a long charge on touch screens", () => {
    expect(MAX_RED.autoFire).toBe(200);
  });
});

describe("Max Blue phases", () => {
  it("casts for 169 ticks, then stays as a stationary field until 785", () => {
    const p = new MaxBluePhase(0);
    expect(p.phase(0)).toBe("casting");
    expect(p.phase(MAX_BLUE.cast - 1)).toBe("casting");
    expect(p.phase(MAX_BLUE.cast)).toBe("stationary");
    expect(p.phase(MAX_BLUE.life)).toBe("ended");
  });

  it("can only be cancelled while casting, then dissolves for 28 ticks", () => {
    const p = new MaxBluePhase(0);
    expect(p.release(50)).toBe(true);
    expect(p.phase(50 + MAX_BLUE.cancel - 1)).toBe("dissolving");
    expect(p.phase(50 + MAX_BLUE.cancel)).toBe("ended");
    const late = new MaxBluePhase(0);
    expect(late.release(MAX_BLUE.cast + 1)).toBe(false);
  });
});

describe("Max Blue pull", () => {
  it("drags entities toward the center and damps their motion", () => {
    const v = fieldPullVelocity({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 5 });
    expect(v.z).toBeGreaterThan(0);
    close(v.x, Math.pow(0.32, 0.65));
  });

  it("moves debris toward the center and removes it on arrival", () => {
    const far = debrisStep({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 8 });
    expect(far.arrived).toBe(false);
    expect(far.position.z).toBeGreaterThan(0);
    expect(length(far.velocity)).toBeLessThanOrEqual(0.91 + 1e-9);
    expect(debrisStep({ x: 0, y: 0, z: 7.8 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 8 }).arrived).toBe(true);
  });

  it("never overshoots the center", () => {
    const s = debrisStep({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 5 }, { x: 0, y: 0, z: 0.5 });
    expect(length(sub(s.position, { x: 0, y: 0, z: 0.5 }))).toBeLessThan(1e-9);
  });

  it("scans block offsets from the nearest outward", () => {
    const offsets = sortedOffsets(3);
    const d = offsets.map((o) => o.x * o.x + o.y * o.y + o.z * o.z);
    expect(d[0]).toBe(1);
    for (let i = 1; i < d.length; i++) expect(d[i]!).toBeGreaterThanOrEqual(d[i - 1]!);
    expect(offsets.every((o) => o.x * o.x + o.y * o.y + o.z * o.z <= 9)).toBe(true);
  });

  it("rips only full solid blocks", () => {
    expect(isPullableBlock("minecraft:stone")).toBe(true);
    expect(isPullableBlock("minecraft:grass_block")).toBe(true);
    for (const id of ["minecraft:air", "minecraft:water", "minecraft:oak_slab", "minecraft:stone_stairs", "minecraft:torch", "minecraft:short_grass", "minecraft:oak_fence", "minecraft:glass_pane", "minecraft:snow_layer", "minecraft:poppy"]) {
      expect(isPullableBlock(id)).toBe(false);
    }
  });

  it("shows ripped blocks with a matching texture", () => {
    expect(DEBRIS_TEXTURES[debrisVariant("minecraft:grass_block")]).toContain("grass");
    expect(DEBRIS_TEXTURES[debrisVariant("minecraft:oak_log")]).toContain("log");
    expect(DEBRIS_TEXTURES[debrisVariant("minecraft:deepslate")]).toContain("deepslate");
    expect(DEBRIS_TEXTURES[debrisVariant("minecraft:something_new")]).toContain("stone");
  });
});

describe("caster motion", () => {
  it("steers toward a target position, capped per tick", () => {
    const v = steerVelocity({ x: 0, y: 0, z: 0 }, { x: 0, y: 0.5, z: 0 }, 1);
    close(v.y, 0.5);
    const capped = steerVelocity({ x: 0, y: 0, z: 0 }, { x: 0, y: 10, z: 0 }, 1);
    close(capped.y, 1);
  });

  it("limits the awakening lift by the ceiling in 0.25 steps up to 10 blocks", () => {
    close(ceilingLift(Infinity), 10);
    close(ceilingLift(3.1), 3);
    close(ceilingLift(0.2), 0);
  });
});
