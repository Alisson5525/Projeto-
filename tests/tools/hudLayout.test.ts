import { describe, expect, it } from "vitest";
import * as codec from "../../src/core/hudCodec";
// @ts-expect-error plain JS generator module without types
import * as gen from "../../tools/gen_hud_ui.mjs";

describe("HUD JSON UI generator", () => {
  it("uses the same offsets and letters as the codec", () => {
    expect(gen.OFFSET).toEqual(codec.OFFSET);
    expect(gen.ENERGY_LETTERS).toBe(codec.ENERGY_LETTERS);
    expect(gen.STEP_LETTERS).toBe(codec.STEP_LETTERS);
  });
  it("reads the title through the global binding everywhere it uses it", () => {
    const text = JSON.stringify(gen.files.hudFile);
    expect(text).toContain("#hud_title_text_string");
    expect(text.match(/'%\.(\d+)s'/g)?.length ?? 0).toBeGreaterThan(50);
  });
  it("shows the Unlimited Void comic panel only for jjkvoid: titles and hides that data title", () => {
    const comic = JSON.stringify(gen.files.hudFile.comic);
    expect(comic).toContain("jjkvoid:");
    expect(comic).toContain("textures/jjk/domain/unlimited_void");
    expect(JSON.stringify(gen.files.hudScreen.hud_title_text)).toContain("jjkvoid:");
    expect(JSON.stringify(gen.files.hudFile.root)).toContain("comic@jjk_hud.comic");
  });
  it("hides data titles and injects the overlays", () => {
    const s = gen.files.hudScreen;
    expect(JSON.stringify(s.hud_title_text)).toContain("jjkhud:");
    expect(s.root_panel.modifications[0].operation).toBe("insert_back");
    expect(s.gui_hotbar_grid_item_pocket.modifications[0].value[0]).toHaveProperty("jjk_slot_overlay@jjk_hud.slot_overlay");
  });
});
