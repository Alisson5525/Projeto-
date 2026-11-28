import { describe, expect, it } from "vitest";
import {
  BARRAGE,
  BLUE,
  bluePullDestination,
  bluePullVelocity,
  closestPointOnBox,
  grabOrder,
  HitPool,
  palmAnchor,
  pickBlueTarget,
  pinAnchor,
  pinStep,
  PunchCursor,
  redBlast,
  redPushDirection,
  selfPullMomentum,
  turnToward,
} from "../../src/core/skillRules";
import { TL } from "../../src/core/timelines";
import { length, sub } from "../../src/core/vec";

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe("palm anchor (Blue/Red FX and blast origin)", () => {
  it("is 0.74 ahead, 0.29 to the right and 0.28 below the eyes", () => {
    // yaw 0 looks south (+Z); the right hand side is west (-X).
    const p = palmAnchor({ x: 0, y: 10, z: 0 }, 0);
    close(p.x, -0.29);
    close(p.y, 9.72);
    close(p.z, 0.74);
  });
});

describe("Blue targeting", () => {
  const eye = { x: 0, y: 1.62, z: 0 };
  const look = { x: 0, y: 0, z: 1 };

  it("picks the candidate closest to the crosshair inside the 22 degree cone", () => {
    const id = pickBlueTarget(eye, look, [
      { id: "far-off-axis", center: { x: 3, y: 1.62, z: 8 } },
      { id: "on-axis", center: { x: 0.2, y: 1.62, z: 10 } },
    ]);
    expect(id).toBe("on-axis");
  });

  it("ignores targets outside 16 blocks, behind, or outside the cone", () => {
    expect(pickBlueTarget(eye, look, [{ id: "far", center: { x: 0, y: 1.62, z: 16.5 } }])).toBeNull();
    expect(pickBlueTarget(eye, look, [{ id: "behind", center: { x: 0, y: 1.62, z: -3 } }])).toBeNull();
    expect(pickBlueTarget(eye, look, [{ id: "wide", center: { x: 5, y: 1.62, z: 5 } }])).toBeNull();
  });
});

describe("Blue pull", () => {
  it("pulls toward the destination at most 1.35 blocks per tick", () => {
    const v = bluePullVelocity({ x: 0, y: 0, z: 10 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    close(length(v), 1.35);
    expect(v.z).toBeLessThan(0);
  });

  it("slows down near the destination (0.19 + 0.48 * distance)", () => {
    const v = bluePullVelocity({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 });
    close(length(v), Math.min(0.19 + 0.48, 1));
  });

  it("damps the previous motion once it arrived", () => {
    const v = bluePullVelocity({ x: 0, y: 0, z: 0.1 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    close(v.x, 0.12);
    close(v.y, 0.2);
    close(v.z, 0.12);
  });

  it("brings the target 1.55 blocks in front of the caster, slightly raised", () => {
    const d = bluePullDestination({ x: 0, y: 64, z: 0 }, 0);
    close(d.x, 0);
    close(d.y, 64.35);
    close(d.z, BLUE.pullDistance);
  });
});

describe("Blue self pull", () => {
  it("accelerates by 0.3 per tick toward the destination", () => {
    const m = selfPullMomentum({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 }, 10, false, 0);
    expect(m).not.toBeNull();
    close(m!.z, 0.3);
  });

  it("never exceeds 1.35 blocks per tick", () => {
    const m = selfPullMomentum({ x: 0, y: 0, z: 1.3 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 20 }, 20, false, 0);
    expect(length(m!)).toBeLessThanOrEqual(1.35 + 1e-9);
  });

  it("brakes so it never overshoots the remaining gap", () => {
    const m = selfPullMomentum({ x: 0, y: 0, z: 1.3 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0.5 }, 0.5, false, 0);
    expect(length(m!)).toBeLessThanOrEqual(0.5 + 1e-9);
  });

  it("halts when within 0.12 blocks", () => {
    expect(selfPullMomentum({ x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0.1 }, 0.1, false, 0)).toBeNull();
  });

  it("does not dive into the ground while standing", () => {
    const m = selfPullMomentum({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: -5, z: 5 }, 7, true, 0);
    close(m!.y, 0);
  });
});

describe("Red blast", () => {
  it("deals 13 at the center and 6 at the edge, nothing outside", () => {
    close(redBlast(0)!.damage, 13);
    close(redBlast(5)!.damage, 6);
    expect(redBlast(5.01)).toBeNull();
  });

  it("pushes harder near the center", () => {
    close(redBlast(0)!.horizontal, 2.1);
    close(redBlast(0)!.vertical, 0.59);
    close(redBlast(5)!.horizontal, 0.65);
    close(redBlast(5)!.vertical, 0.24);
  });

  it("measures distance to the closest point of the target box", () => {
    const p = closestPointOnBox({ x: 0, y: 0, z: 0 }, { x: 3, y: 0.9, z: 0 }, { x: 0.3, y: 0.9, z: 0.3 });
    close(p.x, 2.7);
    close(p.y, 0);
    close(p.z, 0);
  });

  it("pushes away from the blast horizontally, along the look when centered", () => {
    const d = redPushDirection({ x: 3, y: 1, z: 4 }, { x: 0, y: 0, z: 0 }, 0);
    close(d.x, 0.6);
    close(d.z, 0.8);
    const c = redPushDirection({ x: 0, y: 0.001, z: 0 }, { x: 0, y: 0, z: 0 }, 0);
    close(c.x, 0);
    close(c.z, 1);
  });
});

describe("Barrage", () => {
  it("grabs the closest target in a narrow frontal cone", () => {
    const order = grabOrder({ x: 0, y: 0.9, z: 0 }, { x: 0, y: 0, z: 1 }, [
      { id: "side", center: { x: 2, y: 0.9, z: 0.5 }, halfWidth: 0.3 },
      { id: "far", center: { x: 0, y: 0.9, z: 2.6 }, halfWidth: 0.3 },
      { id: "near", center: { x: 0.2, y: 0.9, z: 1.5 }, halfWidth: 0.3 },
      { id: "high", center: { x: 0, y: 3, z: 1 }, halfWidth: 0.3 },
    ]);
    expect(order).toEqual(["near", "far"]);
  });

  it("keeps the victim 1.42 blocks ahead of the caster", () => {
    const a = pinAnchor({ x: 0, y: 64, z: 0 }, 0, 0.2, 0.3);
    close(a.z, BARRAGE.pinDistance);
    close(a.y, 64.2);
  });

  it("slides the victim 42% of the way, at most 0.58 per tick", () => {
    const s = pinStep({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    close(s.z, 0.42);
    const f = pinStep({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 10 });
    close(length(sub(f, { x: 0, y: 0, z: 0 })), 0.58);
  });

  it("turns the pin yaw 42% toward the caster's yaw through the short side", () => {
    close(turnToward(0, 90), (Math.PI / 2) * 0.42);
    close(turnToward(Number.NaN, 90), Math.PI / 2);
    const wrapped = turnToward((170 * Math.PI) / 180, -170);
    expect(wrapped).toBeGreaterThan((170 * Math.PI) / 180);
  });

  it("fires every punch once and the kick after them", () => {
    const cursor = new PunchCursor();
    const fired: number[] = [];
    for (let t = 0; t <= TL.barrage.hit; t++) fired.push(...cursor.advance(t));
    expect(fired).toEqual(TL.barrage.punches.map((_, i) => i));
  });

  it("pools rapid punches so none is lost to hurt immunity", () => {
    const pool = new HitPool(10);
    expect(pool.add(0.2, 100)).toBeCloseTo(0.2);
    expect(pool.add(0.2, 104)).toBe(0);
    expect(pool.add(0.2, 108)).toBe(0);
    expect(pool.add(0.2, 112)).toBeCloseTo(0.6);
    expect(pool.add(0.2, 116)).toBe(0);
    expect(pool.flush()).toBeCloseTo(0.2);
    expect(pool.flush()).toBe(0);
  });
});
