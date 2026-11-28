import { describe, expect, it } from "vitest";
import { cameraPose, NUKE_TICKS, nukeDamageAt } from "../../src/core/nukeCinematic";
import { nukeCamera, NUKE } from "../../src/core/nukeTimeline";
import { toWorld } from "../../src/core/vec";

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

const ctx = {
  origin: { x: 100, y: 64, z: -20 },
  yaw: 90,
  initial: { pos: { x: 100, y: 66, z: -23 }, yaw: 90, pitch: 10 },
  normal: { pos: { x: 101, y: 66, z: -22 }, yaw: 45, pitch: 5 },
};

describe("Nuke cinematic timing", () => {
  it("releases the caster at 21.3 s and ends after the explosion and the camera return", () => {
    expect(NUKE_TICKS.release).toBe(426);
    expect(NUKE_TICKS.explosion).toBe(380);
    expect(NUKE_TICKS.effectEnd).toBe(680);
    expect(NUKE_TICKS.end).toBe(730);
  });

  it("hurts every 10 ticks during the explosion with the Java damage per second", () => {
    expect(nukeDamageAt(NUKE_TICKS.explosion - 1)).toBe(0);
    expect(nukeDamageAt(NUKE_TICKS.explosion)).toBeCloseTo((NUKE.damagePerSecond * 10) / 20);
    expect(nukeDamageAt(NUKE_TICKS.explosion + 5)).toBe(0);
    expect(nukeDamageAt(NUKE_TICKS.explosion + 10)).toBeCloseTo(3);
    expect(nukeDamageAt(NUKE_TICKS.effectEnd)).toBe(0);
    let total = 0;
    for (let t = 0; t < NUKE_TICKS.end; t++) total += nukeDamageAt(t);
    expect(total).toBeCloseTo(NUKE.damagePerSecond * NUKE.explosionDuration, 0);
  });
});

describe("Nuke camera", () => {
  it("starts from the player's own camera", () => {
    const p = cameraPose(0, ctx);
    close(p.pos.x, ctx.initial.pos.x);
    close(p.pos.y, ctx.initial.pos.y);
    close(p.yaw, 90);
    close(p.pitch, 10);
  });

  it("follows the Java camera path once the rise blend is over", () => {
    const t = 5;
    const frame = nukeCamera(t);
    const p = cameraPose(t, ctx);
    const expected = toWorld(ctx.origin, ctx.yaw, frame.pos);
    close(p.pos.x, expected.x);
    close(p.pos.y, expected.y);
    close(p.pos.z, expected.z);
    close(p.pitch, frame.pitch);
  });

  it("shakes only during the explosion", () => {
    const calm = cameraPose(15, ctx);
    const frame = nukeCamera(15);
    close(calm.pos.y, toWorld(ctx.origin, ctx.yaw, frame.pos).y);
    const shaken = cameraPose(NUKE.explosionAt + 3, ctx);
    const still = toWorld(ctx.origin, ctx.yaw, nukeCamera(NUKE.explosionAt + 3).pos);
    expect(Math.hypot(shaken.pos.x - still.x, shaken.pos.y - still.y, shaken.pos.z - still.z)).toBeGreaterThan(0.01);
  });

  it("hands the view back to the player's camera at the end", () => {
    const p = cameraPose(NUKE_TICKS.end / 20, ctx);
    close(p.pos.x, ctx.normal.pos.x, 1e-3);
    close(p.pos.y, ctx.normal.pos.y, 1e-3);
    close(p.pitch, ctx.normal.pitch, 1e-3);
  });
});
