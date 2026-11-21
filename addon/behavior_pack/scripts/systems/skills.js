import { system, EquipmentSlot, ItemStack, ItemLockMode } from "@minecraft/server";
import { TAG, DP, ITEM } from "../core/config.js";
import { Faction, getFaction, getLevel, getBlood, addBlood, getJSON, setJSON, getStr, setStr, setNum, isVampire, isWerewolf } from "../core/data.js";
import {
  safe, v3, msg, sound, particleAt, ring, playAnim, effect, removeEffect, heal, hasFamily, isCreative, isValid, later,
  takeItems, hasItems, getEquip, setEquip, getInventory,
} from "../core/util.js";

// ---------------------------------------------------------------------------
// Skill registry
// ---------------------------------------------------------------------------

const H = "sunrise:human_heart";
const WH = "sunrise:weak_human_heart";
const VB = "sunrise:vampire_blood";
const PB = "sunrise:pure_vampire_blood";
const LV = "sunrise:liver";
const cost = (...pairs) => pairs.map(([item, amount]) => ({ item, amount }));

/**
 * kind: passive (always on once unlocked) | active (cast, has cooldown)
 * cost: items consumed at the Blood Altar to unlock
 * blood: blood consumed per cast (vampires)
 */
export const SKILLS = {
  vampire: [
    { id: "nightvision", kind: "passive", level: 1, cost: cost([WH, 1]) },
    { id: "fly", kind: "active", level: 2, cost: cost([WH, 2]), cooldown: 3, blood: 1, toggle: true },
    { id: "blooddrinker", kind: "passive", level: 2, cost: cost([WH, 3], [VB, 2]) },
    { id: "rage", kind: "active", level: 3, cost: cost([WH, 5], [VB, 5]), cooldown: 60, blood: 4 },
    { id: "waterproof", kind: "passive", level: 3, cost: cost([WH, 3], [VB, 3]) },
    { id: "indetectavel", kind: "passive", level: 3, cost: cost([WH, 3], [VB, 3]) },
    { id: "servantsbat", kind: "active", level: 4, cost: cost([WH, 5], [VB, 5]), cooldown: 40, blood: 4 },
    { id: "poucasede", kind: "passive", level: 4, cost: cost([H, 1], [PB, 1]) },
    { id: "acrobata", kind: "passive", level: 4, cost: cost([H, 1], [PB, 1]) },
    { id: "teleport", kind: "active", level: 5, cost: cost([H, 3], [PB, 2]), cooldown: 12, blood: 2 },
    { id: "sunresistence", kind: "passive", level: 5, cost: cost([WH, 5], [VB, 5]) },
    { id: "icetouch", kind: "active", level: 6, cost: cost([H, 3], [PB, 3]), cooldown: 45, blood: 3 },
    { id: "regeneration", kind: "active", level: 6, cost: cost([H, 4], [PB, 3]), cooldown: 35, blood: 4 },
    { id: "absorption", kind: "passive", level: 7, cost: cost([H, 5], [PB, 3]) },
    { id: "invisibilidade", kind: "active", level: 7, cost: cost([H, 5], [PB, 4]), cooldown: 50, blood: 5 },
    { id: "hypnosis", kind: "active", level: 8, cost: cost([H, 6], [PB, 4]), cooldown: 30, blood: 4 },
    { id: "blood_nova", kind: "active", level: 9, cost: cost([H, 8], [PB, 5]), cooldown: 45, blood: 8 },
  ],
  werewolf: [
    { id: "transform", kind: "active", level: 1, cost: [], cooldown: 4, free: true },
    { id: "nightvision", kind: "passive", level: 1, cost: cost([WH, 1]) },
    { id: "absorption", kind: "passive", level: 2, cost: cost([WH, 2]) },
    { id: "waterproof", kind: "passive", level: 2, cost: cost([WH, 2]) },
    { id: "rage", kind: "active", level: 3, cost: cost([WH, 5]), cooldown: 60 },
    { id: "howl", kind: "active", level: 4, cost: cost([H, 2], [LV, 2]), cooldown: 40 },
    { id: "poucafome", kind: "passive", level: 4, cost: cost([H, 1]) },
    { id: "acrobata", kind: "passive", level: 4, cost: cost([H, 1]) },
    { id: "onehit", kind: "active", level: 5, cost: cost([H, 2]), cooldown: 20 },
    { id: "suntransform", kind: "passive", level: 5, cost: cost([WH, 5], [LV, 3]) },
    { id: "defencive", kind: "active", level: 6, cost: cost([H, 4]), cooldown: 45 },
    { id: "lunge", kind: "active", level: 6, cost: cost([H, 2], [LV, 3]), cooldown: 8 },
    { id: "sangramento", kind: "passive", level: 7, cost: cost([H, 5]) },
    { id: "regeneration", kind: "active", level: 8, cost: cost([H, 5]), cooldown: 40 },
    { id: "invisibilidade", kind: "active", level: 9, cost: cost([H, 6]), cooldown: 60 },
  ],
  hunter: [
    { id: "hunter_sense", kind: "active", level: 2, cost: [], cooldown: 30, free: true },
    { id: "divine", kind: "active", level: 5, cost: [], cooldown: 60, free: true },
    { id: "holy_burst", kind: "active", level: 8, cost: [], cooldown: 45, free: true },
  ],
};

export function skillDef(faction, id) {
  return (SKILLS[faction] || []).find((s) => s.id === id);
}

export function skillIcon(id) {
  return `textures/ui/skill_${id}`;
}

// ---------------------------------------------------------------------------
// Unlocked skills storage (per faction, JSON dynamic property)
// ---------------------------------------------------------------------------

const unlockedKey = (faction) => `vc:skills_${faction}`;

export function getUnlocked(player, faction = getFaction(player)) {
  const list = getJSON(player, unlockedKey(faction), { list: [] }).list || [];
  // Free skills are always owned once the level allows it.
  for (const s of SKILLS[faction] || []) {
    if (s.free && getLevel(player) >= s.level && !list.includes(s.id)) list.push(s.id);
  }
  return list;
}

export function hasSkill(player, id, faction = getFaction(player)) {
  return getUnlocked(player, faction).includes(id);
}

export function grantSkill(player, id, faction = getFaction(player)) {
  const stored = getJSON(player, unlockedKey(faction), { list: [] }).list || [];
  if (!stored.includes(id)) stored.push(id);
  setJSON(player, unlockedKey(faction), { list: stored });
}

export function clearSkills(player, faction) {
  setJSON(player, unlockedKey(faction), { list: [] });
}

/** Try to unlock a skill paying its cost. Returns a lang key describing the outcome. */
export function tryUnlock(player, faction, id) {
  const def = skillDef(faction, id);
  if (!def) return "vc.skill.unknown";
  if (hasSkill(player, id, faction)) return "vc.skill.already";
  if (getLevel(player) < def.level) return "vc.skill.need_level";
  if (!hasItems(player, def.cost)) return "vc.skill.need_items";
  takeItems(player, def.cost);
  grantSkill(player, id, faction);
  sound(player, "random.levelup", 1, 0.7);
  particleAt(player, "sunrise:magic_altar", 1);
  return "vc.skill.unlocked";
}

// ---------------------------------------------------------------------------
// Cooldowns (in memory, keyed by player id)
// ---------------------------------------------------------------------------

const cooldowns = new Map();

export function cooldownLeft(player, id) {
  const m = cooldowns.get(player.id);
  const until = m?.get(id) ?? 0;
  return Math.max(0, Math.ceil((until - system.currentTick) / 20));
}

function setCooldown(player, id, seconds) {
  if (!cooldowns.has(player.id)) cooldowns.set(player.id, new Map());
  cooldowns.get(player.id).set(id, system.currentTick + Math.round(seconds * 20));
}

export function forgetCooldowns(playerId) {
  cooldowns.delete(playerId);
}

export function getSelected(player) {
  return getStr(player, DP.SKILL_SEL, "");
}

export function setSelected(player, id) {
  setStr(player, DP.SKILL_SEL, id);
}

// ---------------------------------------------------------------------------
// Casting
// ---------------------------------------------------------------------------

/** Temporary combat states (in memory). */
export const state = {
  /** playerId -> tick until which Ice Touch is active */
  iceTouch: new Map(),
  /** playerId -> tick until which the next hit is a heavy blow */
  heavyBlow: new Map(),
  /** playerId -> tick until which Hunter Sense is active */
  sense: new Map(),
  /** playerId -> tick until which divine protection is active */
  divine: new Map(),
};

export function castSkill(player, id) {
  const faction = getFaction(player);
  const def = skillDef(faction, id);
  if (!def || def.kind !== "active" || !hasSkill(player, id, faction)) return false;

  const left = cooldownLeft(player, id);
  if (left > 0 && !isCreative(player)) {
    msg(player, "vc.skill.cooldown", left);
    sound(player, "note.bass", 0.6, 0.6);
    return false;
  }
  if (faction === Faction.VAMPIRE && def.blood && !isCreative(player) && getBlood(player) < def.blood) {
    // Leaving bat form must always be possible.
    if (!(id === "fly" && player.hasTag(TAG.BAT_FORM))) {
      msg(player, "vc.skill.no_blood");
      sound(player, "note.bass", 0.6, 0.5);
      return false;
    }
  }

  const impl = CASTERS[`${faction}:${id}`];
  if (!impl) return false;
  const ok = safe(() => impl(player), "cast " + id);
  if (ok === false) return false;

  if (faction === Faction.VAMPIRE && def.blood && !isCreative(player) && !(id === "fly" && !player.hasTag(TAG.BAT_FORM))) {
    addBlood(player, -def.blood);
  }
  setCooldown(player, id, def.cooldown ?? 5);
  return true;
}

// ---------------------------------------------------------------------------
// Shared helpers for skill effects
// ---------------------------------------------------------------------------

/** Living, non-allied entities around a point. */
export function enemiesAround(player, radius, center = player.location) {
  return safe(() =>
    player.dimension.getEntities({ location: center, maxDistance: radius, excludeTypes: ["minecraft:item", "minecraft:xp_orb", "minecraft:arrow"] })
      .filter((e) => e.id !== player.id && isValid(e) && e.getComponent("minecraft:health") && !isAlly(player, e)),
  ) ?? [];
}

export function isAlly(player, other) {
  if (other.typeId === "minecraft:player") {
    // Same-faction players are allies; everyone else is fair game only if PvP is on (vanilla decides).
    return getFaction(other) === getFaction(player) && getFaction(player) !== Faction.HUMAN;
  }
  const owner = safe(() => other.getDynamicProperty("vc:owner"));
  if (owner === player.id) return true;
  if (other.typeId === "minecraft:wolf" && safe(() => other.getComponent("minecraft:tameable")?.tamedToPlayerId) === player.id) return true;
  if (isVampire(player) && (hasFamily(other, "vampiro") || other.typeId === "sunrise:bat_minion")) return true;
  if (isWerewolf(player) && hasFamily(other, "lobisomem")) return true;
  if (hasFamily(other, "villager") || hasFamily(other, "inanimate")) return getFaction(player) === Faction.HUNTER;
  return false;
}

function viewTargets(player, range, coneDot = 0.8) {
  const head = player.getHeadLocation();
  const dir = player.getViewDirection();
  return enemiesAround(player, range).filter((e) => {
    const to = v3.norm(v3.sub({ x: e.location.x, y: e.location.y + 1, z: e.location.z }, head));
    return to.x * dir.x + to.y * dir.y + to.z * dir.z >= coneDot;
  });
}

const guardedDamage = new Set();

/** Apply extra damage without retriggering our own hurt listeners. */
export function bonusDamage(target, amount, attacker, cause = "entityAttack") {
  if (!isValid(target) || amount <= 0) return;
  guardedDamage.add(target.id);
  safe(() => target.applyDamage(amount, attacker ? { cause, damagingEntity: attacker } : { cause }), "bonusDamage");
  guardedDamage.delete(target.id);
}

export function isGuarded(entityId) {
  return guardedDamage.has(entityId);
}

// ---------------------------------------------------------------------------
// Head-slot forms (bat / wolf). Moves a worn helmet to the inventory first.
// ---------------------------------------------------------------------------

const COSMETIC_HEADS = new Set([ITEM.BAT_HEAD, ...ITEM.EYE_HEADS, "sunrise:trans_lob", "sunrise:trans_lob_blue", "sunrise:trans_lob_black"]);

export function isCosmeticHead(typeId) {
  return COSMETIC_HEADS.has(typeId);
}

const helmetWarn = new Map();

/** Put a locked cosmetic item on the head. Returns false if a helmet can't be stored. */
export function putHead(player, typeId) {
  const current = getEquip(player, EquipmentSlot.Head);
  if (current && current.typeId === typeId) return true;
  if (current && !isCosmeticHead(current.typeId)) {
    const inv = getInventory(player);
    if (!inv || inv.emptySlotsCount === 0) {
      // Throttled: this is called every loop while a form is active.
      const last = helmetWarn.get(player.id) ?? -1000;
      if (system.currentTick - last > 200) {
        helmetWarn.set(player.id, system.currentTick);
        msg(player, "vc.form.helmet_full");
      }
      return false;
    }
    inv.addItem(current);
    // Remember it so the helmet goes back on when the form ends.
    setStr(player, "vc:stored_helmet", current.typeId);
  }
  const stack = new ItemStack(typeId, 1);
  // Inventory lock: dragging it off the head slot removes it (see purgeLooseCosmetics),
  // so players can still swap it for a real helmet.
  stack.lockMode = ItemLockMode.inventory;
  stack.keepOnDeath = true;
  setEquip(player, EquipmentSlot.Head, stack);
  return true;
}

/** Put back the helmet that a form moved to the inventory. */
export function restoreHelmet(player) {
  const id = getStr(player, "vc:stored_helmet", "");
  if (!id) return;
  setStr(player, "vc:stored_helmet", "");
  if (getEquip(player, EquipmentSlot.Head)) return;
  const inv = getInventory(player);
  if (!inv) return;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && it.typeId === id) {
      inv.setItem(i, undefined);
      setEquip(player, EquipmentSlot.Head, it);
      return;
    }
  }
}

/** Cosmetic heads must only exist on the head slot; delete copies left in the inventory. */
export function purgeLooseCosmetics(player) {
  const inv = getInventory(player);
  if (!inv) return;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && COSMETIC_HEADS.has(it.typeId)) inv.setItem(i, undefined);
  }
}

export function clearHead(player, onlyType) {
  const current = getEquip(player, EquipmentSlot.Head);
  if (!current || !isCosmeticHead(current.typeId)) return;
  if (onlyType && current.typeId !== onlyType) return;
  setEquip(player, EquipmentSlot.Head, undefined);
}

// ---------------------------------------------------------------------------
// Skill implementations
// ---------------------------------------------------------------------------

const T = (s) => Math.round(s * 20);

const CASTERS = {
  // ----------------------------- VAMPIRE ---------------------------------
  "vampire:fly": (p) => {
    if (p.hasTag(TAG.BAT_FORM)) {
      exitBatForm(p);
      return true;
    }
    if (!putHead(p, ITEM.BAT_HEAD)) return false;
    p.addTag(TAG.BAT_FORM);
    effect(p, "invisibility", 99999, 0);
    particleAt(p, "sunrise:transform_smoke", 1);
    sound(p, "mob.bat.takeoff", 1, 0.8);
    msg(p, "vc.skill.fly.on");
    return true;
  },

  "vampire:rage": (p) => {
    p.addEffect("strength", T(30), { amplifier: 1, showParticles: false });
    p.addEffect("speed", T(30), { amplifier: 1, showParticles: false });
    playAnim(p, "animation.skill.player.rage");
    ring(p.dimension, "sunrise:bite_blood_particle", p.location, 1.5, 12, 1);
    sound(p, "mob.ravager.roar", 0.8, 1.4);
    return true;
  },

  "vampire:servantsbat": (p) => {
    playAnim(p, "animation.skill.player.servantsbat");
    particleAt(p, "sunrise:transform_smoke", 1);
    sound(p, "mob.bat.idle", 1, 0.7);
    const count = 2 + Math.floor(getLevel(p) / 4);
    for (let i = 0; i < count; i++) {
      const loc = { x: p.location.x + (Math.random() - 0.5) * 2, y: p.location.y + 1.5, z: p.location.z + (Math.random() - 0.5) * 2 };
      const bat = p.dimension.spawnEntity("sunrise:servantsbat", loc);
      bat.setDynamicProperty("vc:owner", p.id);
      bat.addTag("vc_servant");
      later(T(25), () => {
        if (isValid(bat)) {
          particleAt(bat, "sunrise:transform_smoke", 0.3);
          bat.remove();
        }
      });
    }
    return true;
  },

  "vampire:teleport": (p) => {
    const range = 20 + getLevel(p) * 2;
    const head = p.getHeadLocation();
    const dir = p.getViewDirection();
    const hit = p.dimension.getBlockFromRay(head, dir, { maxDistance: range, includeLiquidBlocks: false, includePassableBlocks: false });
    let dest;
    if (hit) {
      const b = hit.block.location;
      const face = hit.face;
      dest = { x: b.x + 0.5, y: b.y + 1, z: b.z + 0.5 };
      if (face !== "Up") {
        // Land in front of the wall instead of inside it.
        dest = v3.add(head, v3.scale(dir, Math.max(0, v3.dist(head, b) - 1.2)));
        dest.y = Math.floor(dest.y - 1.0);
      }
    } else {
      dest = v3.add(head, v3.scale(dir, range));
      dest.y -= 1.6;
    }
    const from = { ...p.location };
    const ok = p.tryTeleport(dest, { checkForBlocks: true, keepVelocity: false });
    if (!ok) {
      msg(p, "vc.skill.teleport.blocked");
      return false;
    }
    p.dimension.spawnParticle("sunrise:teleport", { x: from.x, y: from.y + 1, z: from.z });
    particleAt(p, "sunrise:teleport", 1);
    sound(p, "mob.endermen.portal", 1, 0.8);
    return true;
  },

  "vampire:icetouch": (p) => {
    state.iceTouch.set(p.id, system.currentTick + T(30));
    particleAt(p, "sunrise:vamp_ice_frost", 1);
    sound(p, "random.glass", 0.8, 0.6);
    msg(p, "vc.skill.icetouch.on");
    return true;
  },

  "vampire:regeneration": (p) => {
    p.addEffect("regeneration", T(8), { amplifier: 2, showParticles: true });
    playAnim(p, "animation.vc.player.cast");
    particleAt(p, "sunrise:bite_blood_particle", 1);
    sound(p, "mob.zombie.unfect", 0.7, 1.4);
    return true;
  },

  "vampire:invisibilidade": (p) => {
    p.addEffect("invisibility", T(20), { amplifier: 0, showParticles: false });
    p.addEffect("speed", T(20), { amplifier: 0, showParticles: false });
    particleAt(p, "sunrise:transform_smoke", 1);
    sound(p, "mob.bat.takeoff", 0.7, 0.6);
    return true;
  },

  "vampire:hypnosis": (p) => {
    const targets = viewTargets(p, 12, 0.75);
    if (!targets.length) {
      msg(p, "vc.skill.no_target");
      return false;
    }
    playAnim(p, "animation.vc.player.cast");
    sound(p, "mob.evocation_illager.prepare_attack", 1, 1.3);
    for (const e of targets) {
      e.addEffect("slowness", T(8), { amplifier: 4 });
      e.addEffect("weakness", T(8), { amplifier: 1 });
      if (e.typeId === "minecraft:player") e.addEffect("nausea", T(8), { amplifier: 0 });
      particleAt(e, "sunrise:vamp_spell", 1.8);
    }
    return true;
  },

  "vampire:blood_nova": (p) => {
    const lvl = getLevel(p);
    const dmg = 6 + Math.floor(lvl / 2);
    playAnim(p, "animation.vc.player.cast");
    sound(p, "mob.warden.sonic_boom", 0.6, 1.6);
    for (let r = 1; r <= 6; r += 1.25) ring(p.dimension, "sunrise:bite_blood_particle", p.location, r, Math.round(r * 6), 0.4);
    let healed = 0;
    for (const e of enemiesAround(p, 6)) {
      bonusDamage(e, dmg, p, "magic");
      const d = v3.norm(v3.sub(e.location, p.location));
      safe(() => e.applyKnockback({ x: d.x * 1.2, z: d.z * 1.2 }, 0.35));
      healed += 2;
    }
    heal(p, Math.min(10, healed));
    return true;
  },

  // ----------------------------- WEREWOLF --------------------------------
  "werewolf:transform": (p) => {
    // Delegated to werewolf.js to keep all form rules in one place.
    return WOLF_HOOKS.toggle ? WOLF_HOOKS.toggle(p) : false;
  },

  "werewolf:rage": (p) => {
    p.addEffect("strength", T(30), { amplifier: 2, showParticles: false });
    p.addEffect("haste", T(30), { amplifier: 1, showParticles: false });
    particleAt(p, "sunrise:werewolf_cut", 1);
    sound(p, "mob.wolf.growl", 1, 0.6);
    return true;
  },

  "werewolf:howl": (p) => {
    sound(p, "vc.wolf.howl", 1.5, 1);
    sound(p, "mob.wolf.growl", 1, 0.5);
    for (let r = 2; r <= 10; r += 2) ring(p.dimension, "sunrise:howl_wave", p.location, r, Math.round(r * 4), 1);
    ring(p.dimension, "sunrise:transform_smoke", p.location, 3, 12, 0.5);
    const near = safe(() => p.dimension.getEntities({ location: p.location, maxDistance: 10 })) ?? [];
    for (const e of near) {
      if (e.id === p.id || !e.getComponent("minecraft:health")) continue;
      if (isAlly(p, e)) {
        e.addEffect("strength", T(15), { amplifier: 0 });
        e.addEffect("speed", T(15), { amplifier: 0 });
      } else {
        e.addEffect("slowness", T(8), { amplifier: 1 });
        e.addEffect("weakness", T(8), { amplifier: 0 });
      }
    }
    p.addEffect("strength", T(15), { amplifier: 0 });
    return true;
  },

  "werewolf:onehit": (p) => {
    state.heavyBlow.set(p.id, system.currentTick + T(10));
    particleAt(p, "sunrise:werewolf_cut", 1.2);
    sound(p, "mob.wolf.growl", 1, 0.8);
    msg(p, "vc.skill.onehit.on");
    return true;
  },

  "werewolf:defencive": (p) => {
    p.addEffect("resistance", T(8), { amplifier: 3, showParticles: false });
    p.addEffect("slowness", T(8), { amplifier: 0, showParticles: false });
    sound(p, "armor.equip_netherite", 1, 0.7);
    particleAt(p, "sunrise:transform_smoke", 1);
    return true;
  },

  "werewolf:lunge": (p) => {
    const d = p.getViewDirection();
    p.applyKnockback({ x: d.x * 2.6, z: d.z * 2.6 }, 0.45);
    sound(p, "mob.wolf.bark", 1, 0.6);
    particleAt(p, "sunrise:werewolf_cut", 0.8);
    const dmg = 5 + getLevel(p);
    const hitIds = new Set();
    for (const delay of [4, 8, 12]) {
      later(delay, () => {
        for (const e of enemiesAround(p, 2.4)) {
          if (hitIds.has(e.id)) continue;
          hitIds.add(e.id);
          bonusDamage(e, dmg, p);
          particleAt(e, "sunrise:werewolf_cut", 1);
        }
      });
    }
    return true;
  },

  "werewolf:regeneration": (p) => {
    p.addEffect("regeneration", T(8), { amplifier: 2, showParticles: true });
    sound(p, "mob.wolf.whine", 1, 0.7);
    return true;
  },

  "werewolf:invisibilidade": (p) => {
    // The wolf body is a head attachable: hide it while invisible.
    clearHead(p);
    p.addTag("vc_wolf_hidden");
    p.addEffect("invisibility", T(20), { amplifier: 0, showParticles: false });
    particleAt(p, "sunrise:transform_smoke", 1);
    later(T(20), () => {
      if (isValid(p)) p.removeTag("vc_wolf_hidden");
    });
    return true;
  },

  // ----------------------------- HUNTER ----------------------------------
  "hunter:hunter_sense": (p) => {
    state.sense.set(p.id, system.currentTick + T(20));
    sound(p, "mob.evocation_illager.cast_spell", 0.8, 1.6);
    playAnim(p, "animation.vc.player.cast");
    msg(p, "vc.skill.hunter_sense.on");
    return true;
  },

  "hunter:divine": (p) => {
    state.divine.set(p.id, system.currentTick + T(15));
    p.addTag(TAG.DIVINE);
    later(T(15), () => isValid(p) && p.removeTag(TAG.DIVINE));
    sound(p, "beacon.activate", 1, 1.2);
    ring(p.dimension, "sunrise:holy_a", p.location, 2, 12, 0.3);
    return true;
  },

  "hunter:holy_burst": (p) => {
    playAnim(p, "animation.vc.player.cast");
    sound(p, "beacon.power", 1, 1.5);
    for (let r = 1; r <= 7; r += 1.5) ring(p.dimension, "sunrise:holy_a", p.location, r, Math.round(r * 5), 0.4);
    const lvl = getLevel(p);
    for (const e of enemiesAround(p, 7)) {
      if (isSupernaturalEntity(e)) {
        bonusDamage(e, 8 + lvl, p, "magic");
        safe(() => e.setOnFire(4, true));
      }
    }
    return true;
  },
};

export function isSupernaturalEntity(e) {
  if (e.typeId === "minecraft:player") return isVampire(e) || isWerewolf(e);
  return hasFamily(e, "vampiro") || hasFamily(e, "vampire") || hasFamily(e, "lobisomem") || hasFamily(e, "undead");
}

export function exitBatForm(p) {
  if (!p.hasTag(TAG.BAT_FORM)) return;
  p.removeTag(TAG.BAT_FORM);
  clearHead(p, ITEM.BAT_HEAD);
  restoreHelmet(p);
  setNum(p, "vc:eyes_placed", 0); // let the vampire eyes come back
  removeEffect(p, "invisibility");
  removeEffect(p, "slow_falling");
  particleAt(p, "sunrise:transform_smoke", 1);
  sound(p, "mob.bat.takeoff", 0.8, 1.2);
}

/** Late-bound hooks to avoid circular imports. */
export const WOLF_HOOKS = { toggle: undefined };
