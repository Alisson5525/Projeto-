import { system, world, EquipmentSlot, ItemStack } from "@minecraft/server";
import { isVampire, isWerewolf, getFaction } from "../core/data.js";
import { safe, sound, particle, getEquip, setEquip, takeItem, countItem, giveItem, isCreative, msg, later } from "../core/util.js";

/**
 * UI is late-bound so this module only depends on @minecraft/server: block
 * components are registered even if something in the UI layer fails to load.
 */
export const BLOCK_UI = { openUnlockMenu: undefined };

/** Custom block states are not in the vanilla typings — read/write them as numbers. */
function getS(block, name) {
  return Number(/** @type {any} */ (block.permutation).getState(name));
}
function setS(block, name, value) {
  block.setPermutation(/** @type {any} */ (block.permutation).withState(name, value));
}

const center = (b, dy = 0.5) => ({ x: b.location.x + 0.5, y: b.location.y + dy, z: b.location.z + 0.5 });

/** Consume one item from the player's main hand. */
function useHand(player, typeId) {
  if (isCreative(player)) return true;
  const it = getEquip(player, EquipmentSlot.Mainhand);
  if (!it || it.typeId !== typeId) return false;
  if (it.amount > 1) {
    it.amount -= 1;
    setEquip(player, EquipmentSlot.Mainhand, it);
  } else setEquip(player, EquipmentSlot.Mainhand, undefined);
  return true;
}

system.beforeEvents.startup.subscribe(({ blockComponentRegistry: reg }) => {
  // -------------------------------------------------------------------------
  // Blood Altar: fill with blood (10 levels), then offer a fang to unlock skills
  // -------------------------------------------------------------------------
  reg.registerCustomComponent("sunrise:blood_altar_component", {
    onPlayerInteract: ({ block, player }) => {
      if (!player) return;
      const level = getS(block, "sunrise:blood_altar_level");
      const hand = getEquip(player, EquipmentSlot.Mainhand);
      const id = hand?.typeId;

      if (level < 10) {
        if (id === "sunrise:blood_bottle_4" || id === "sunrise:liver") {
          useHand(player, id);
          if (id === "sunrise:blood_bottle_4") giveItem(player, "minecraft:glass_bottle", 1);
          setS(block, "sunrise:blood_altar_level", level + 1);
          sound(player, "bucket.fill_lava", 0.6, 1.5);
          particle(block.dimension, "sunrise:bite_blood_particle", center(block, 1));
        } else {
          msg(player, "vc.altar.fill", level, 10);
        }
        return;
      }

      const offering = (id === "sunrise:vampire_tooth" && isVampire(player)) || (id === "sunrise:werewolf_fang" && isWerewolf(player));
      if (!offering) {
        msg(player, isVampire(player) ? "vc.altar.need_tooth" : isWerewolf(player) ? "vc.altar.need_fang" : "vc.altar.not_supernatural");
        return;
      }
      useHand(player, id);
      const faction = getFaction(player);
      particle(block.dimension, "sunrise:magic_altar", center(block, 1));
      sound(player, "block.enchanting_table.use", 1, 0.6);
      sound(player, "mob.evocation_illager.prepare_summon", 0.6, 0.8);
      setS(block, "sunrise:blood_altar_level", 8);
      later(30, () => setS(block, "sunrise:blood_altar_level", 4));
      later(50, () => {
        setS(block, "sunrise:blood_altar_level", 0);
        if (BLOCK_UI.openUnlockMenu) BLOCK_UI.openUnlockMenu(player, faction);
        else msg(player, "vc.diag.ui_missing");
      });
    },
  });

  // -------------------------------------------------------------------------
  // Recharging Altar: restore drained vampire swords / werewolf claws
  // -------------------------------------------------------------------------
  const RECHARGE = {
    "sunrise:vampire_sword_m": "sunrise:vampire_sword",
    "sunrise:vampire_sword_e": "sunrise:vampire_sword",
    "sunrise:werewolf_claws_m": "sunrise:werewolf_claws",
    "sunrise:werewolf_claws_e": "sunrise:werewolf_claws",
  };
  reg.registerCustomComponent("sunrise:recharging_altar_component", {
    onPlayerInteract: ({ block, player }) => {
      if (!player) return;
      const hand = getEquip(player, EquipmentSlot.Mainhand);
      const target = hand && RECHARGE[hand.typeId];
      if (!target) {
        msg(player, "vc.recharge.hint");
        return;
      }
      const fuel = countItem(player, "sunrise:blood_bottle_4") >= 4 ? "sunrise:blood_bottle_4" : countItem(player, "sunrise:liver") >= 4 ? "sunrise:liver" : undefined;
      if (!fuel && !isCreative(player)) {
        msg(player, "vc.recharge.need_fuel");
        return;
      }
      if (fuel) takeItem(player, fuel, 4);
      if (fuel === "sunrise:blood_bottle_4") giveItem(player, "minecraft:glass_bottle", 4);
      const fresh = new ItemStack(target, 1);
      safe(() => {
        const ench = hand.getComponent("minecraft:enchantable");
        const fench = fresh.getComponent("minecraft:enchantable");
        if (ench && fench) fench.addEnchantments(ench.getEnchantments());
      });
      if (hand.nameTag) fresh.nameTag = hand.nameTag;
      setEquip(player, EquipmentSlot.Mainhand, fresh);
      sound(player, "hit.copper", 1, 0.8);
      sound(player, "block.enchanting_table.use", 0.8, 1.2);
      particle(block.dimension, "sunrise:magic_altar", center(block, 1.2));
    },
  });

  // -------------------------------------------------------------------------
  // Coffin
  // -------------------------------------------------------------------------
  reg.registerCustomComponent("sunrise:put_support_coffin_collision_up", {
    onPlace: ({ block }) => {
      const up = block.above(1);
      if (up && up.isAir) up.setType("sunrise:caixao_up_collision");
    },
  });
  reg.registerCustomComponent("sunrise:break_support_coffin_collision_up", {
    onPlayerBreak: ({ block }) => {
      const up = block.above(1);
      if (up?.typeId === "sunrise:caixao_up_collision") up.setType("minecraft:air");
    },
  });
  reg.registerCustomComponent("sunrise:support_coffin_collision_up", {
    onPlayerBreak: ({ block, player }) => {
      const below = block.below(1);
      if (!below || !below.typeId.includes("caixao")) return;
      if (!player || !isCreative(player)) {
        const item = below.getItemStack(1);
        if (item) block.dimension.spawnItem(item, center(below));
      }
      below.setType("minecraft:air");
    },
  });
  reg.registerCustomComponent("sunrise:sleep_coffin", {
    onPlayerInteract: ({ block, player }) => {
      if (!player) return;
      if (!isVampire(player) && !isWerewolf(player)) {
        msg(player, "vc.coffin.human");
        return;
      }
      const t = world.getTimeOfDay();
      const day = t < 12500 || t > 23300;
      safe(() => player.setSpawnPoint({ dimension: block.dimension, x: block.location.x + 0.5, y: block.location.y + 1, z: block.location.z + 0.5 }));
      msg(player, "vc.coffin.spawn");
      if (!day) return;
      safe(() => player.camera.fade({ fadeTime: { fadeInTime: 0.5, holdTime: 2, fadeOutTime: 1 }, fadeColor: { red: 0, green: 0, blue: 0 } }));
      sound(player, "random.door_close", 0.8, 0.6);
      later(40, () => {
        world.setTimeOfDay(13000);
        msg(player, "vc.coffin.slept");
      });
    },
  });

  // -------------------------------------------------------------------------
  // Meat grinder: 4 raw meat + glass bottle → full blood bottle
  // -------------------------------------------------------------------------
  const MEATS = ["minecraft:beef", "minecraft:porkchop", "minecraft:mutton", "minecraft:chicken", "minecraft:rabbit"];
  reg.registerCustomComponent("sunrise:meat_grinder", {
    onPlayerInteract: ({ block, player }) => {
      if (!player) return;
      const meat = MEATS.find((m) => countItem(player, m) >= 4);
      if (!meat || (countItem(player, "minecraft:glass_bottle") < 1 && !isCreative(player))) {
        msg(player, "vc.grinder.hint");
        return;
      }
      takeItem(player, meat, 4);
      takeItem(player, "minecraft:glass_bottle", 1);
      giveItem(player, "sunrise:blood_bottle_4", 1);
      particle(block.dimension, "sunrise:bite_blood_particle", center(block, 1));
      sound(player, "mob.vampire.bite", 0.8, 0.5);
      sound(player, "block.grindstone.use", 0.8, 0.8);
    },
  });

  // -------------------------------------------------------------------------
  // Garlic crop (by thini)
  // -------------------------------------------------------------------------
  reg.registerCustomComponent("thini:crop", {
    onPlayerInteract: ({ block, player }) => {
      if (!player) return;
      const growth = getS(block, "thini:growth_stage");
      const hand = getEquip(player, EquipmentSlot.Mainhand);
      if (growth >= 3 || hand?.typeId !== "minecraft:bone_meal") return;
      useHand(player, "minecraft:bone_meal");
      particle(block.dimension, "minecraft:crop_growth_emitter", center(block));
      sound(player, "item.bone_meal.use", 1, 1);
      if (Math.random() < 0.8) setS(block, "thini:growth_stage", growth + 1);
    },
    onRandomTick: ({ block }) => {
      const growth = getS(block, "thini:growth_stage");
      if (growth < 3 && Math.random() < 0.6) setS(block, "thini:growth_stage", growth + 1);
    },
  });

  // -------------------------------------------------------------------------
  // Hunter campfire: occasionally attracts a hunter (capped to avoid floods)
  // -------------------------------------------------------------------------
  reg.registerCustomComponent("sunrise:summon_hunters_component", {
    onRandomTick: ({ block, dimension }) => {
      if (Math.random() > 0.15) return;
      const near = dimension.getEntities({ location: center(block), maxDistance: 24, type: "sunrise:hunter" });
      if (near.length >= 2) return;
      dimension.spawnEntity("sunrise:hunter", { x: block.location.x + 0.5, y: block.location.y + 1, z: block.location.z + 1.5 });
    },
  });

  // Kept for blocks that still declare it.
  reg.registerCustomComponent("sunrise:item_usable_component", { onPlayerInteract: () => {} });
});
