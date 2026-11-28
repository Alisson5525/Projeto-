import { describe, expect, it } from "vitest";
import { boxGap, clearancePoint, mobPushOptions, slowedProjectileVelocity } from "../../src/core/infinity";
import { length } from "../../src/core/vec";

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);
const body = { min: { x: -0.3, y: 0, z: -0.3 }, max: { x: 0.3, y: 1.8, z: 0.3 } };

describe("Infinity: distance between boxes", () => {
  it("is the euclidean gap between separated boxes and 0 when they touch", () => {
    close(boxGap(body.min, body.max, { x: 3.3, y: 0, z: -0.3 }, { x: 4, y: 1, z: 0.3 }), 3);
    close(boxGap(body.min, body.max, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }), 0);
  });
});

describe("Infinity: approaching projectiles", () => {
  const toward = { x: 0, y: 0, z: -1 };

  it("leaves projectiles outside 5.2 blocks alone", () => {
    expect(slowedProjectileVelocity({ x: 0, y: 0, z: -1 }, toward, 5.3)).toBeNull();
  });

  it("leaves projectiles flying away alone unless they are very close", () => {
    expect(slowedProjectileVelocity({ x: 0, y: 0, z: 1 }, toward, 3)).toBeNull();
    expect(slowedProjectileVelocity({ x: 0, y: 0, z: 1 }, toward, 1)).not.toBeNull();
  });

  it("scales the speed by ((gap - 0.42) / 4.78)^1.55", () => {
    const v = slowedProjectileVelocity({ x: 0, y: 0, z: -1 }, toward, 3)!;
    close(length(v), Math.pow(2.58 / 4.78, 1.55));
  });

  it("caps the approach speed at 0.38 * (gap - 0.42)", () => {
    const v = slowedProjectileVelocity({ x: 0, y: 0, z: -10 }, toward, 1)!;
    close(-v.z, 0.38 * 0.58);
  });

  it("stops projectiles at the 0.42 block boundary", () => {
    const v = slowedProjectileVelocity({ x: 0, y: 0, z: -2 }, toward, 0.42)!;
    close(length(v), 0);
  });
});

describe("Infinity: clearance around the body", () => {
  it("moves an object that got inside back to the boundary", () => {
    const safe = clearancePoint({ x: 0.5, y: 0.9, z: 0 }, body.min, body.max, 0.47, { x: -1, y: 0, z: 0 })!;
    close(safe.x, 0.79);
    close(safe.y, 0.9);
    close(safe.z, 0);
  });

  it("does nothing outside the boundary", () => {
    expect(clearancePoint({ x: 1, y: 0.9, z: 0 }, body.min, body.max, 0.47, { x: -1, y: 0, z: 0 })).toBeNull();
  });
});

describe("Infinity: mobs pressing against the body", () => {
  it("offers the shortest push out of the 0.44 padding first", () => {
    const options = mobPushOptions(body.min, body.max, { x: 0.4, y: 0, z: -0.3 }, { x: 1, y: 1.8, z: 0.3 });
    close(options[0]!.dx, 0.34);
    close(options[0]!.dz, 0);
    expect(options).toHaveLength(4);
  });

  it("ignores mobs above or below the body", () => {
    expect(mobPushOptions(body.min, body.max, { x: 0, y: 1.9, z: 0 }, { x: 0.6, y: 2.5, z: 0.6 })).toEqual([]);
  });

  it("ignores mobs outside the padding", () => {
    expect(mobPushOptions(body.min, body.max, { x: 0.8, y: 0, z: -0.3 }, { x: 1.4, y: 1.8, z: 0.3 })).toEqual([]);
  });
});
