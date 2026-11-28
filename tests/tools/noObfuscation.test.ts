import { describe, expect, it } from "vitest";

declare global {
  interface ImportMeta {
    glob(pattern: string | string[], options: { query: string; import: string; eager: true }): Record<string, string>;
  }
}

// §k turns text into scrambled glyphs, and Bedrock does not reliably end it
// with §r (it broke the technique-choice menu title). It must never be sent.
describe("player-facing text", () => {
  it("never uses the obfuscated formatting code", () => {
    const files = {
      ...import.meta.glob(["../../src/**/*.ts"], { query: "?raw", import: "default", eager: true }),
      ...import.meta.glob(["../../packs/JJK_RP/texts/*.lang", "../../packs/JJK_RP/ui/*.json", "../../tools/gen_lang.py"], { query: "?raw", import: "default", eager: true }),
    };
    expect(Object.keys(files).length).toBeGreaterThan(20);
    const offenders = Object.entries(files).filter(([, text]) => text.includes("§k")).map(([path]) => path);
    expect(offenders).toEqual([]);
  });
});
