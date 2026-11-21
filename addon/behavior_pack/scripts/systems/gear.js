import { world, system, EquipmentSlot } from "@minecraft/server";
import { LOOP_TICKS } from "../core/config.js";
import { isVampire, isWerewolf, isHunter, getFaction, Faction, addBlood } from "../core/data.js";
import { safe, every, players, getEquip, heal, effect, particleAt, sound, hasFamily, isNight, isValid, msg, chance } from "../core/util.js";
import { bonusDamage, isGuarded, isSupernaturalEntity } from "./skills.js";

// ---------------------------------------------------------------------------
// Weapons with identity
//   Vampiric Sword: drinks the blood of whoever it hits (life steal; vampires
//                   also gain blood).
//   Werewolf Claws: rend flesh (bleeding); a werewolf in beast form hits harder.
//   Hunter weapons vs supernatural are handled in hunter.js.
// ---------------------------------------------------------------------------

const SWORD_STEAL = { "sunrise:vampire_sword": 2, "sunrise:vampire_sword_m": 1, "sunrise:vampire_sword_e": 0 };
const CLAWS_BLEED = { "sunrise:werewolf_claws": 60, "sunrise:werewolf_claws_m": 40, "sunrise:werewolf_claws_e": 15 };

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity: p, hitEntity: target }) => {
  if (p?.typeId !== "minecraft:player" || !isValid(target) || isGuarded(target.id)) return;
  safe(() => {
    const hand = getEquip(p, EquipmentSlot.Mainhand)?.typeId;
    if (!hand) return;
    const steal = SWORD_STEAL[hand];
    if (steal) {
      heal(p, steal);
      if (isVampire(p)) addBlood(p, 0.5);
      particleAt(target, "sunrise:bite_blood_particle", 1);
    }
    const bleed = CLAWS_BLEED[hand];
    if (bleed !== undefined && chance(bleed)) {
      target.addEffect("wither", 60, { amplifier: 0 });
      particleAt(target, "sunrise:werewolf_cut", 1);
      if (isWerewolf(p) && p.hasTag("vc_wolf_form")) bonusDamage(target, 3, p);
    }
  }, "weapons");
});

// ---------------------------------------------------------------------------
// Eclipse armour set bonuses (helmet + boots are shared, chest/legs pick a side)
//   Solar set:  vampires are immune to sunlight; others get fire resistance.
//   Lunar set:  night vision + strength at night; werewolves also resist damage.
// ---------------------------------------------------------------------------

function wearing(p, slot, ids) {
  const it = getEquip(p, slot);
  return !!it && ids.includes(it.typeId);
}

export function armorSet(p) {
  if (!wearing(p, EquipmentSlot.Head, ["sunrise:eclipse_armor_helmet"]) || !wearing(p, EquipmentSlot.Feet, ["sunrise:eclipse_armor_boots"])) return undefined;
  const sun = wearing(p, EquipmentSlot.Chest, ["sunrise:sun_eclipse_armor_chestplate"]) && wearing(p, EquipmentSlot.Legs, ["sunrise:sun_eclipse_armor_leggings"]);
  const moon = wearing(p, EquipmentSlot.Chest, ["sunrise:moon_eclipse_armor_chestplate"]) && wearing(p, EquipmentSlot.Legs, ["sunrise:moon_eclipse_armor_leggings"]);
  return sun ? "sun" : moon ? "moon" : undefined;
}

const announced = new Map();

every(LOOP_TICKS * 2, () => {
  for (const p of players()) {
    safe(() => {
      const set = armorSet(p);
      if (set !== announced.get(p.id)) {
        announced.set(p.id, set);
        if (set) {
          msg(p, `vc.armor.${set}.on`);
          sound(p, "beacon.activate", 0.6, set === "sun" ? 1.4 : 0.7);
        }
      }
      if (set === "sun") {
        effect(p, "fire_resistance", 4, 0);
        if (isVampire(p)) safe(() => p.extinguishFire(true));
      } else if (set === "moon") {
        const cur = p.getEffect("night_vision");
        if (!cur || cur.duration < 240) p.addEffect("night_vision", 20 * 30, { amplifier: 0, showParticles: false });
        if (isNight()) effect(p, "strength", 4, 0);
        if (isWerewolf(p)) effect(p, "resistance", 4, 0);
      }
    }, "armorSet");
  }
}, "armorSets");

// ---------------------------------------------------------------------------
// Garlic: holding it weakens nearby vampires (players and creatures)
// ---------------------------------------------------------------------------

every(20, () => {
  for (const p of players()) {
    safe(() => {
      const main = getEquip(p, EquipmentSlot.Mainhand)?.typeId;
      const off = getEquip(p, EquipmentSlot.Offhand)?.typeId;
      if (main !== "sunrise:garlic" && off !== "sunrise:garlic") return;
      if (isVampire(p)) {
        effect(p, "nausea", 6, 0);
        effect(p, "weakness", 3, 0);
        return;
      }
      const near = p.dimension.getEntities({ location: p.location, maxDistance: 5 });
      for (const e of near) {
        if (e.id === p.id) continue;
        const vamp = e.typeId === "minecraft:player" ? isVampire(e) : hasFamily(e, "vampiro") || hasFamily(e, "vampire");
        if (!vamp) continue;
        effect(e, "weakness", 3, 1);
        effect(e, "slowness", 3, 0);
        if (system.currentTick % 60 === 0) particleAt(e, "sunrise:holy_a", 1.2);
      }
    }, "garlic");
  }
}, "garlic");

export { getFaction, Faction, isHunter, isSupernaturalEntity };
