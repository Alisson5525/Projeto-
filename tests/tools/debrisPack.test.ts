import { describe, expect, it } from "vitest";
import { DEBRIS_TEXTURES } from "../../src/core/maxBlueRules";
import bpEntity from "../../packs/JJK_BP/entities/debris.json";
import clientEntity from "../../packs/JJK_RP/entity/debris.entity.json";
import renderControllers from "../../packs/JJK_RP/render_controllers/jjk_debris.render_controllers.json";

describe("ripped block entity (jjk:debris)", () => {
  it("renders each jjk:variant with the texture the script picked", () => {
    const textures: Record<string, string> = clientEntity["minecraft:client_entity"].description.textures;
    const controller = renderControllers.render_controllers["controller.render.jjk.debris"];
    const order = controller.arrays.textures["Array.blocks"].map((t) => textures[t.replace("Texture.", "")]);
    expect(order).toEqual([...DEBRIS_TEXTURES]);
  });

  it("accepts every variant index the script can set", () => {
    const variant = bpEntity["minecraft:entity"].description.properties["jjk:variant"];
    expect(variant.range).toEqual([0, DEBRIS_TEXTURES.length - 1]);
  });
});
