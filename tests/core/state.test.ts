import { describe, expect, it } from "vitest";
import { CastRegistry } from "../../src/core/castRegistry";
import { ComboState } from "../../src/core/combo";
import { HotbarTrigger } from "../../src/core/hotbarTrigger";
import { ReversalTrial } from "../../src/core/rct";
import { rollDirectionFromVector, rollSpeed } from "../../src/core/roll";

describe("ReversalTrial", () => {
  const pulse = (t: ReversalTrial, at: number, held: number) => {
    t.charge(at);
    t.release(at + held);
    return at + held;
  };
  it("passes with 2 of 3 timed releases", () => {
    const t = new ReversalTrial();
    t.start(0);
    let now = pulse(t, 10, 15); // window 12..22 → hit
    now = pulse(t, now + 5, 10); // window 22..31 → miss
    pulse(t, now + 5, 20); // window 16..24 → hit
    expect(t.successes()).toBe(2);
    expect(t.stage).toBe("PASSED");
  });
  it("fails with only 1 success", () => {
    const t = new ReversalTrial();
    t.start(0);
    let now = pulse(t, 1, 5);
    now = pulse(t, now + 1, 25);
    pulse(t, now + 1, 30);
    expect(t.stage).toBe("FAILED");
  });
  it("counts a charge held for 50 ticks as a miss", () => {
    const t = new ReversalTrial();
    t.start(0);
    t.charge(10);
    expect(t.tick(59)).toBe(false);
    expect(t.tick(60)).toBe(true);
    expect(t.attempts).toBe(1);
    expect(t.successMask).toBe(0);
    expect(t.stage).toBe("READY");
  });
  it("is interrupted after 600 idle ticks", () => {
    const t = new ReversalTrial();
    t.start(0);
    expect(t.tick(600)).toBe(true);
    expect(t.stage).toBe("INTERRUPTED");
  });
});

describe("ComboState", () => {
  it("chains four hits with Java timings and contact ticks", () => {
    const c = new ComboState();
    expect(c.press(0, true).started).toBe(1);
    expect(c.tick(3, true).contact).toBe(1);
    c.press(7, true); // buffered (nextAllowed 9 - 3)
    expect(c.tick(9, true).started).toBe(2);
    expect(c.tick(12, true).contact).toBe(2);
    c.press(16, true);
    expect(c.tick(18, true).started).toBe(3);
    c.press(25, true);
    expect(c.tick(27, true).started).toBe(4);
    expect(c.tick(33, true).contact).toBe(4);
    expect(c.isAttacking(38)).toBe(true);
    expect(c.isAttacking(39)).toBe(false);
  });
  it("needs the heavy recovery before restarting", () => {
    const c = new ComboState();
    c.press(0, true);
    c.press(7, true);
    c.tick(9, true);
    c.press(16, true);
    c.tick(18, true);
    c.press(25, true);
    c.tick(27, true);
    expect(c.press(40, true).started).toBeUndefined();
    expect(c.press(44, true).started).toBeUndefined();
    expect(c.tick(47, true).started).toBe(1);
  });
  it("resets the chain when no input arrives within the window", () => {
    const c = new ComboState();
    c.press(0, true);
    for (let t = 1; t <= 25; t++) c.tick(t, true);
    expect(c.combo).toBe(0);
    expect(c.press(26, true).started).toBe(1);
  });
  it("does not attack when attacking is not allowed", () => {
    const c = new ComboState();
    expect(c.press(0, false).started).toBeUndefined();
  });
});

describe("roll", () => {
  it("maps local input to forward/back/left/right with neutral as back", () => {
    expect(rollDirectionFromVector(0, 0)).toBe(1);
    expect(rollDirectionFromVector(0.9, 0.1)).toBe(0);
    expect(rollDirectionFromVector(-0.5, 0.2)).toBe(1);
    expect(rollDirectionFromVector(0.1, 0.9)).toBe(3);
    expect(rollDirectionFromVector(0.1, -0.9)).toBe(2);
  });
  it("decays speed from 0.72 to 0 over 10 ticks", () => {
    expect(rollSpeed(0)).toBeCloseTo(0.72);
    expect(rollSpeed(5)).toBeCloseTo(0.72 * Math.pow(0.5, 1.25));
    expect(rollSpeed(10)).toBe(0);
  });
});

describe("HotbarTrigger", () => {
  it("reports a tapped slot and ignores the script's own snap back", () => {
    const h = new HotbarTrigger(8);
    expect(h.onChange(8, 2, 100)).toBe(2);
    h.expectSelfChange(8);
    expect(h.onChange(2, 8, 101)).toBeNull();
  });
  it("debounces a repeat tap on the same slot within 4 ticks", () => {
    const h = new HotbarTrigger(8);
    h.onChange(8, 3, 100);
    expect(h.onChange(8, 3, 103)).toBeNull();
    expect(h.onChange(8, 3, 105)).toBe(3);
  });
  it("treats moving onto the home slot as no tap", () => {
    const h = new HotbarTrigger(8);
    expect(h.onChange(4, 8, 50)).toBeNull();
  });
});

describe("CastRegistry", () => {
  it("runs every cleanup once even if one throws", () => {
    const r = new CastRegistry<string>();
    const ran: string[] = [];
    r.set("p1", "lock", () => ran.push("lock"));
    r.set("p1", "camera", () => {
      ran.push("camera");
      throw new Error("boom");
    });
    r.set("p1", "hud", () => ran.push("hud"));
    r.set("p2", "lock", () => ran.push("other"));
    expect(r.interruptAll("p1")).toBe(3);
    expect(ran.sort()).toEqual(["camera", "hud", "lock"]);
    expect(r.has("p1", "lock")).toBe(false);
    expect(r.interruptAll("p1")).toBe(0);
    expect(r.has("p2", "lock")).toBe(true);
  });
  it("clear removes without running and interrupt runs one", () => {
    const r = new CastRegistry<string>();
    let count = 0;
    r.set("p", "a", () => count++);
    r.clear("p", "a");
    expect(r.interrupt("p", "a")).toBe(false);
    r.set("p", "b", () => count++);
    expect(r.interrupt("p", "b")).toBe(true);
    expect(count).toBe(1);
  });
});

describe("rollVector", () => {
  it("uses Minecraft yaw (0 = south): right of south is west", async () => {
    const { rollVector } = await import("../../src/core/roll");
    const f = rollVector(0, 0);
    const r = rollVector(3, 0);
    const l = rollVector(2, 0);
    expect(f.x).toBeCloseTo(0);
    expect(f.z).toBeCloseTo(1);
    expect(r.x).toBeCloseTo(-1);
    expect(l.x).toBeCloseTo(1);
    expect(rollVector(1, 90).x).toBeCloseTo(1);
  });
});
