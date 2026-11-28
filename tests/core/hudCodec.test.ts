import { describe, expect, it } from "vitest";
import { ENERGY_LETTERS, encodeHud, fracChar, HUD_LENGTH, HUD_PREFIX, type HudState, OFFSET, unary } from "../../src/core/hudCodec";

const base = (): HudState => ({
  visible: true,
  awakened: false,
  infinity: false,
  energy: 0,
  energyMax: 240,
  slots: Array.from({ length: 8 }, () => ({ state: "1" as const, cooldown: 0 })),
  awakening: 0,
  hold: 0,
  slotNumbers: true,
  trial: null,
});

describe("HUD codec", () => {
  it("always produces the same length with the prefix", () => {
    const s = encodeHud(base());
    expect(s.startsWith(HUD_PREFIX)).toBe(true);
    expect(s).toHaveLength(HUD_LENGTH);
    expect(encodeHud({ ...base(), visible: false, awakening: 1, hold: 0.5, trial: { stage: "c", charge: 0.5, pulse: 2, mask: 3 } })).toHaveLength(HUD_LENGTH);
  });
  it("encodes the energy bar as 32 unique letters so each segment is a contains-test", () => {
    const bar = (energy: number) => encodeHud({ ...base(), energy }).slice(OFFSET.energy, OFFSET.energy + 32);
    expect(bar(0)).toBe(".".repeat(32));
    expect(bar(120)).toBe(ENERGY_LETTERS.slice(0, 16) + ".".repeat(16));
    expect(bar(240)).toBe(ENERGY_LETTERS);
    expect(bar(1)).toBe("A" + ".".repeat(31));
    expect(new Set(ENERGY_LETTERS).size).toBe(32);
  });
  it("encodes 15-step bars as unary letters", () => {
    expect(unary(0, 15)).toBe(".".repeat(15));
    expect(unary(1, 15)).toBe("ABCDEFGHIJKLMNO");
    expect(unary(0.5, 15)).toBe("ABCDEFGH" + ".".repeat(7));
  });
  it("maps fractions to 16 hex steps", () => {
    expect(fracChar(0)).toBe("0");
    expect(fracChar(0.5)).toBe("8");
    expect(fracChar(1)).toBe("f");
    expect(fracChar(0.001)).toBe("1");
  });
  it("encodes slot states and cooldowns in order", () => {
    const st = base();
    st.slots[0] = { state: "2", cooldown: 0 };
    st.slots[3] = { state: "r", cooldown: 0 };
    st.slots[1] = { state: "1", cooldown: 1 };
    const s = encodeHud(st);
    expect(s.slice(OFFSET.states, OFFSET.states + 8)).toBe("211r1111");
    expect(s[OFFSET.cooldowns + 1]).toBe("f");
  });
  it("places the trial fields at the end", () => {
    const s = encodeHud({ ...base(), trial: { stage: "c", charge: 1, pulse: 2, mask: 5 } });
    expect(s.slice(OFFSET.trial)).toBe("cf25");
  });
});
