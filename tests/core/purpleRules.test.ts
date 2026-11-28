import { describe, expect, it } from "vitest";
import { countCells, segmentBoxDistanceSq } from "../../src/core/geometry";
import { fusesWithBlue, PURPLE, purpleShotSegment, SELF_PURPLE, SelfPurpleClock, sweptRuns } from "../../src/core/purpleRules";

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe("Hollow Purple shot", () => {
  it("launches 20 ticks after the 149 tick charge (auto release on touch)", () => {
    expect(PURPLE.launchAt).toBe(169);
  });

  it("advances 2 blocks per tick with radius 3.4 (5.3 awakened)", () => {
    const s = purpleShotSegment({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 0, false);
    close(s.b.z, 2);
    close(s.radius, 3.4);
    close(purpleShotSegment({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 0, true).radius, 5.3);
  });

  it("shrinks to half its radius over the last 5 ticks", () => {
    close(purpleShotSegment({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 74, false).radius, 3.4);
    const last = purpleShotSegment({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, 79, false).radius;
    expect(last).toBeLessThan(3.4);
    expect(last).toBeGreaterThanOrEqual(1.7);
  });
});

describe("swept terrain of a moving sphere", () => {
  const r = 2;

  it("returns the whole capsule for the first segment", () => {
    const runs = sweptRuns(null, { x: 0.5, y: 10.5, z: 0.5 }, { x: 0.5, y: 10.5, z: 2.5 }, r);
    for (const run of runs) {
      for (let x = run.x0; x <= run.x1; x++) {
        const d = segmentBoxDistanceSq({ x: 0.5, y: 10.5, z: 0.5 }, { x: 0.5, y: 10.5, z: 2.5 }, { x, y: run.y, z: run.z }, { x: x + 1, y: run.y + 1, z: run.z + 1 });
        expect(d).toBeLessThanOrEqual(r * r);
      }
    }
    expect(countCells(runs)).toBeGreaterThan(30);
  });

  it("only adds the cells the next segment newly covers", () => {
    const first = { a: { x: 0.5, y: 10.5, z: 0.5 }, b: { x: 0.5, y: 10.5, z: 2.5 } };
    const full = countCells(sweptRuns(null, first.b, { x: 0.5, y: 10.5, z: 4.5 }, r));
    const fresh = countCells(sweptRuns(first, first.b, { x: 0.5, y: 10.5, z: 4.5 }, r));
    expect(fresh).toBeGreaterThan(0);
    expect(fresh).toBeLessThan(full / 2);
  });
});

describe("Self Purple", () => {
  it("fuses when the Max Red beam passes within 6.86 blocks of the Max Blue", () => {
    const blue = { x: 0, y: 0, z: 10 };
    expect(fusesWithBlue(blue, { x: 6, y: 0, z: 0 }, { x: 6, y: 0, z: 20 })).toBe(true);
    expect(fusesWithBlue(blue, { x: 7, y: 0, z: 0 }, { x: 7, y: 0, z: 20 })).toBe(false);
  });

  it("allows the Nuke during the 100 tick hold, detonates 20 ticks later and ends after its FX", () => {
    const clock = new SelfPurpleClock(1000);
    expect(clock.canStartNuke(1099)).toBe(true);
    expect(clock.canStartNuke(1100)).toBe(false);
    expect(clock.detonate(1119)).toBe(false);
    expect(clock.detonate(1120)).toBe(true);
    expect(clock.detonate(1121)).toBe(false);
    expect(clock.canStartNuke(1050)).toBe(false);
    expect(clock.fxEnded(1000 + SELF_PURPLE.hold + SELF_PURPLE.fx - 1)).toBe(false);
    expect(clock.fxEnded(1000 + SELF_PURPLE.hold + SELF_PURPLE.fx)).toBe(true);
  });
});
