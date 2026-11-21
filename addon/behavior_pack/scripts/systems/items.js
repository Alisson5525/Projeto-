import { world, EquipmentSlot, ItemStack } from "@minecraft/server";
import { ITEM } from "../core/config.js";
import { Faction, getFaction, isVampire, isWerewolf, isHunter } from "../core/data.js";
import { safe, msg, sound, particleAt, getEquip, setEquip, isCreative, takeItem } from "../core/util.js";
import { infect, cure, clearInfection, infectionLeft } from "./factions.js";
import { castSkill, getSelected } from "./skills.js";
import { shootHunterBow } from "./hunter.js";
import { openCodex, openSkillMenu, openHunterMenu, openEyeMenu } from "../ui/menus.js";

// ---------------------------------------------------------------------------
// Right-click / tap-and-hold item actions
// ---------------------------------------------------------------------------

function useSkillItem(player, faction) {
  if (getFaction(player) !== faction) {
    msg(player, "vc.item.wrong_faction");
    return;
  }
  // Quick-cast: sneak + use casts the selected skill without opening a menu.
  if (player.isSneaking) {
    const sel = getSelected(player);
    if (sel) castSkill(player, sel);
    else msg(player, "vc.skill.none_selected");
    return;
  }
  if (faction === Faction.HUNTER) openHunterMenu(player);
  else openSkillMenu(player);
}

function infectWith(player, type, itemId) {
  const f = getFaction(player);
  if (f !== Faction.HUMAN) {
    msg(player, "vc.infect.not_human");
    return;
  }
  if (infectionLeft(player)) {
    msg(player, "vc.infect.already");
    return;
  }
  if (!takeItem(player, itemId, 1)) return;
  infect(player, type);
  particleAt(player, type === "hunter" ? "sunrise:holy_a" : "sunrise:bite_blood_particle", 1.4);
}

const ON_USE = {
  [ITEM.BOOK]: (p) => openCodex(p),
  [ITEM.VAMP_SKILL]: (p) => useSkillItem(p, Faction.VAMPIRE),
  [ITEM.WOLF_SKILL]: (p) => useSkillItem(p, Faction.WEREWOLF),
  [ITEM.HUNTER_SKILL]: (p) => useSkillItem(p, Faction.HUNTER),
  "sunrise:hunter_bow": (p) => shootHunterBow(p),
  "sunrise:change_stone": (p) => {
    if (!isVampire(p)) return msg(p, "vc.item.wrong_faction");
    openEyeMenu(p);
  },
  "sunrise:vampire_tooth": (p) => infectWith(p, "vampire", "sunrise:vampire_tooth"),
  "sunrise:werewolf_fang": (p) => infectWith(p, "werewolf", "sunrise:werewolf_fang"),
  "sunrise:garlic_syringe": (p) => infectWith(p, "hunter", "sunrise:garlic_syringe"),
};

world.afterEvents.itemUse.subscribe(({ itemStack, source }) => {
  if (source?.typeId !== "minecraft:player" || !itemStack) return;
  const fn = ON_USE[itemStack.typeId];
  if (fn) safe(() => fn(source), "itemUse " + itemStack.typeId);
});

// Hunter Trainer NPC: opens the hunter guild menu.
world.afterEvents.playerInteractWithEntity.subscribe(({ player, target }) => {
  if (target?.typeId !== "sunrise:hunter_treiner") return;
  safe(() => {
    if (isHunter(player)) openHunterMenu(player);
    else msg(player, getFaction(player) === Faction.HUMAN ? "vc.trainer.human" : "vc.trainer.monster");
  }, "trainer");
});

// ---------------------------------------------------------------------------
// Consumables (fires after the drink/eat animation completes)
// ---------------------------------------------------------------------------

const ON_CONSUME = {
  "minecraft:milk_bucket": (p) => {
    if (infectionLeft(p)) {
      clearInfection(p);
      msg(p, "vc.infect.cured_milk");
    }
  },
  "sunrise:vampire_cure": (p) => {
    if (isVampire(p)) cure(p);
    else msg(p, "vc.cure.nothing");
  },
  "sunrise:werewolf_cure": (p) => {
    if (isWerewolf(p)) cure(p);
    else msg(p, "vc.cure.nothing");
  },
  "sunrise:philosopher_water": (p) => {
    if (getFaction(p) !== Faction.HUMAN) cure(p);
    else if (infectionLeft(p)) clearInfection(p);
    p.removeTag("GarlicInTheVein");
  },
};

world.afterEvents.itemCompleteUse.subscribe(({ itemStack, source }) => {
  if (source?.typeId !== "minecraft:player" || !itemStack) return;
  const fn = ON_CONSUME[itemStack.typeId];
  if (fn) safe(() => fn(source), "consume " + itemStack.typeId);
});

// ---------------------------------------------------------------------------
// Blood weapons: lose their power as they wear down (recharge at the altar)
// ---------------------------------------------------------------------------

const DECAY = {
  "sunrise:vampire_sword": "sunrise:vampire_sword_m",
  "sunrise:vampire_sword_m": "sunrise:vampire_sword_e",
  "sunrise:werewolf_claws": "sunrise:werewolf_claws_m",
  "sunrise:werewolf_claws_m": "sunrise:werewolf_claws_e",
};

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity }) => {
  if (damagingEntity?.typeId !== "minecraft:player") return;
  safe(() => {
    const hand = getEquip(damagingEntity, EquipmentSlot.Mainhand);
    const next = hand && DECAY[hand.typeId];
    if (!next) return;
    const dur = hand.getComponent("minecraft:durability");
    if (!dur || dur.damage < dur.maxDurability * 0.9) return;
    const fresh = new ItemStack(next, 1);
    safe(() => {
      const ench = hand.getComponent("minecraft:enchantable");
      const fench = fresh.getComponent("minecraft:enchantable");
      if (ench && fench) fench.addEnchantments(ench.getEnchantments());
    });
    if (hand.nameTag) fresh.nameTag = hand.nameTag;
    setEquip(damagingEntity, EquipmentSlot.Mainhand, fresh);
    sound(damagingEntity, "random.break", 0.6, 1.4);
    msg(damagingEntity, "vc.weapon.drained");
  }, "weaponDecay");
});

export { isHunter };
