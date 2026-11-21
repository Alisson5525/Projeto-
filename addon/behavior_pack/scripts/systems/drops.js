import { world, ItemStack } from "@minecraft/server";
import { getFaction, Faction } from "../core/data.js";
import { safe, chance, randInt } from "../core/util.js";

// Extra drops for vanilla creatures, added by script so no vanilla loot table
// has to be overridden (keeps other add-ons and future updates compatible).
//   [item, chance %, min, max, condition]
const VAMP_OR_WOLF = (killer) => {
  const f = getFaction(killer);
  return f === Faction.VAMPIRE || f === Faction.WEREWOLF;
};
const ANY = () => true;

const TABLE = {
  "minecraft:villager_v2": [["sunrise:weak_human_heart", 60, 1, 1, VAMP_OR_WOLF], ["sunrise:human_heart", 15, 1, 1, VAMP_OR_WOLF]],
  "minecraft:villager": [["sunrise:weak_human_heart", 60, 1, 1, VAMP_OR_WOLF], ["sunrise:human_heart", 15, 1, 1, VAMP_OR_WOLF]],
  "minecraft:wandering_trader": [["sunrise:weak_human_heart", 70, 1, 1, VAMP_OR_WOLF], ["sunrise:human_heart", 25, 1, 1, VAMP_OR_WOLF]],
  "minecraft:pillager": [["sunrise:weak_human_heart", 30, 1, 1, ANY], ["sunrise:human_heart", 6, 1, 1, ANY]],
  "minecraft:vindicator": [["sunrise:weak_human_heart", 35, 1, 1, ANY], ["sunrise:human_heart", 10, 1, 1, ANY]],
  "minecraft:evocation_illager": [["sunrise:human_heart", 50, 1, 2, ANY], ["sunrise:philosopher_stone", 8, 1, 1, ANY]],
  "minecraft:witch": [["sunrise:weak_human_heart", 30, 1, 1, ANY], ["sunrise:philosopher_stone", 4, 1, 1, ANY], ["sunrise:garlic", 20, 1, 2, ANY]],
  "minecraft:zombie_villager_v2": [["sunrise:weak_human_heart", 12, 1, 1, ANY]],
  "minecraft:wolf": [["sunrise:liver", 10, 1, 1, ANY]],
  "minecraft:bat": [["sunrise:vampire_blood", 8, 1, 1, ANY]],
  "minecraft:cow": [["sunrise:blood_bottle_1", 4, 1, 1, (k) => getFaction(k) === Faction.VAMPIRE]],
  "minecraft:player": [["sunrise:human_heart", 100, 1, 1, (k, dead) => getFaction(dead) === Faction.HUMAN && VAMP_OR_WOLF(k)]],
};

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  const killer = damageSource?.damagingEntity;
  if (killer?.typeId !== "minecraft:player") return;
  const rows = TABLE[deadEntity.typeId];
  if (!rows) return;
  safe(() => {
    const loc = deadEntity.location;
    const dim = deadEntity.dimension;
    for (const [item, pct, lo, hi, cond] of rows) {
      if (!cond(killer, deadEntity) || !chance(pct)) continue;
      dim.spawnItem(new ItemStack(item, randInt(lo, hi)), { x: loc.x, y: loc.y + 0.5, z: loc.z });
    }
  }, "extraDrops");
});
