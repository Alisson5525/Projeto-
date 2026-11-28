import { describe, expect, it } from "vitest";
import { budget, defaultWorldSettings, parseWorldSettings } from "../../src/core/worldSettings";

describe("world settings", () => {
  it("defaults to the weak-phone profile and light terrain destruction", () => {
    expect(defaultWorldSettings()).toEqual({ perf: "leve", terrain: "leve" });
    expect(parseWorldSettings(undefined)).toEqual(defaultWorldSettings());
    expect(parseWorldSettings("{bad")).toEqual(defaultWorldSettings());
  });
  it("keeps valid values and rejects unknown ones", () => {
    expect(parseWorldSettings(JSON.stringify({ perf: "alto", terrain: "completa" }))).toEqual({ perf: "alto", terrain: "completa" });
    expect(parseWorldSettings(JSON.stringify({ perf: "ultra", terrain: "x" }))).toEqual(defaultWorldSettings());
  });
});

describe("performance budgets", () => {
  it("uses the Java values on the high profile", () => {
    const b = budget({ perf: "alto", terrain: "completa" });
    expect(b.nukeRadius).toBe(64);
    expect(b.maxBlueBlocksPerScan).toBe(8);
    expect(b.maxDebris).toBe(256);
    expect(b.particles).toBe(1);
  });
  it("scales work down for weak phones", () => {
    const b = budget({ perf: "leve", terrain: "leve" });
    expect(b.particles).toBeLessThan(0.6);
    expect(b.blocksPerTick).toBeLessThanOrEqual(400);
    expect(b.nukeRadius).toBeLessThanOrEqual(32);
    expect(b.maxDebris).toBeLessThanOrEqual(48);
  });
  it("turns terrain destruction off entirely", () => {
    const b = budget({ perf: "alto", terrain: "desligada" });
    expect(b.destroyTerrain).toBe(false);
  });
});
