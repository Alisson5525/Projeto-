// Packs the combat HUD state into a fixed-width title string read by the JSON
// UI (title text is the only script→HUD channel). Bars are "unary" strings of
// unique letters so each UI segment needs a single contains-test.

export const HUD_PREFIX = "jjkhud:";
export const ENERGY_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
export const STEP_LETTERS = "ABCDEFGHIJKLMNO";

export const OFFSET = {
  visible: 7,
  awakened: 8,
  infinity: 9,
  energy: 10,
  states: 42,
  cooldowns: 50,
  awakening: 58,
  hold: 73,
  slotNumbers: 88,
  trial: 89,
} as const;
export const HUD_LENGTH = 93;

export type SlotState = "0" | "1" | "2" | "r" | "v";
export type TrialStageChar = "-" | "r" | "c" | "p" | "f" | "i";

export interface HudState {
  visible: boolean;
  awakened: boolean;
  infinity: boolean;
  energy: number;
  energyMax: number;
  /** Slots 1..8: state + remaining cooldown fraction (0 = ready, 1 = just used). */
  slots: { state: SlotState; cooldown: number }[];
  /** Remaining awakening fraction (0 when not awakened). */
  awakening: number;
  /** Charge/hold progress of the technique being held (0 = none). */
  hold: number;
  slotNumbers: boolean;
  trial: { stage: TrialStageChar; charge: number; pulse: number; mask: number } | null;
}

/** 0 → "0", any positive fraction → at least "1", 1 → "f". */
export function fracChar(f: number): string {
  const v = Math.min(15, Math.max(0, Math.ceil(Math.min(1, Math.max(0, f)) * 15)));
  return v.toString(16);
}

/** First round(f*n) step letters, padded with dots (at least one letter when f > 0). */
export function unary(f: number, n: number, letters: string = STEP_LETTERS): string {
  const c = Math.min(1, Math.max(0, f));
  const k = c <= 0 ? 0 : Math.min(n, Math.max(1, Math.round(c * n)));
  return letters.slice(0, k) + ".".repeat(n - k);
}

export function encodeHud(s: HudState): string {
  const energy = s.energyMax > 0 ? s.energy / s.energyMax : 0;
  const slots = Array.from({ length: 8 }, (_, i) => s.slots[i] ?? { state: "0" as const, cooldown: 0 });
  const t = s.trial;
  return (
    HUD_PREFIX +
    (s.visible ? "1" : "0") +
    (s.awakened ? "1" : "0") +
    (s.infinity ? "1" : "0") +
    unary(energy, 32, ENERGY_LETTERS) +
    slots.map((x) => x.state).join("") +
    slots.map((x) => fracChar(x.cooldown)).join("") +
    unary(s.awakening, 15) +
    unary(s.hold, 15) +
    (s.slotNumbers ? "1" : "0") +
    (t ? t.stage : "-") +
    (t ? fracChar(t.charge) : "0") +
    String(t ? Math.min(3, Math.max(0, t.pulse)) : 0) +
    String(t ? t.mask & 7 : 0)
  );
}
