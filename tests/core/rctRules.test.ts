import { describe, expect, it } from "vitest";
import { movedTooFar, rctHealAmount, SixEyesConfirm, sneakEdge } from "../../src/core/rctRules";
import { ReversalTrial, TRIAL } from "../../src/core/rct";

describe("Reversal Trial on touch (sneak = the Java hold key)", () => {
  it("charges when sneaking starts and releases when it stops", () => {
    expect(sneakEdge(false, true)).toBe("charge");
    expect(sneakEdge(true, false)).toBe("release");
    expect(sneakEdge(true, true)).toBeNull();
    expect(sneakEdge(false, false)).toBeNull();
  });

  it("passes with 2 of 3 releases inside the green zones", () => {
    const trial = new ReversalTrial();
    trial.start(0);
    let t = 10;
    for (const held of [15, 25, 40]) {
      trial.charge(t);
      trial.release(t + held);
      t += held + 5;
    }
    expect(trial.stage).toBe("PASSED");
    expect(trial.attempts).toBe(TRIAL.pulses);
  });

  it("is interrupted by moving more than 0.6 blocks", () => {
    expect(movedTooFar({ x: 0, y: 64, z: 0 }, { x: 0.5, y: 64, z: 0.3 })).toBe(false);
    expect(movedTooFar({ x: 0, y: 64, z: 0 }, { x: 0.61, y: 64, z: 0 })).toBe(true);
  });
});

describe("Reverse healing", () => {
  it("heals 4 health per pulse without overhealing and nothing at full health", () => {
    expect(rctHealAmount(10, 20)).toBe(4);
    expect(rctHealAmount(18, 20)).toBe(2);
    expect(rctHealAmount(20, 20)).toBe(0);
  });
});

describe("Six Eyes rebirth confirmation", () => {
  it("asks first, then reborns on a second use from the same hotbar slot", () => {
    const c = new SixEyesConfirm();
    expect(c.press("p", 3)).toBe("warn");
    expect(c.press("p", 3)).toBe("rebirth");
    expect(c.press("p", 3)).toBe("warn");
  });

  it("forgets the confirmation when the selected slot changes", () => {
    const c = new SixEyesConfirm();
    c.press("p", 3);
    c.check("p", 4);
    expect(c.press("p", 3)).toBe("warn");
    expect(c.pending("p")).toBe(true);
    c.clear("p");
    expect(c.pending("p")).toBe(false);
  });
});
