import { world, system, EquipmentSlot, ItemStack, GameMode, ItemLockMode } from "@minecraft/server";

// ---------------------------------------------------------------------------
// Safety
// ---------------------------------------------------------------------------

/** Run fn and swallow errors from entities that unloaded mid-tick. */
export function safe(fn, label = "") {
  try {
    return fn();
  } catch (e) {
    if (DEBUG.on) console.warn(`[VampireCraft] ${label}: ${e}`);
    return undefined;
  }
}

export const DEBUG = { on: false };

export function isValid(entity) {
  try {
    return !!entity && entity.isValid;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Math
// ---------------------------------------------------------------------------

export const v3 = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  len: (a) => Math.hypot(a.x, a.y, a.z),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
  norm: (a) => {
    const l = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / l, y: a.y / l, z: a.z / l };
  },
};

export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const chance = (pct) => Math.random() * 100 < pct;
export const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// ---------------------------------------------------------------------------
// Messaging (always localized through rawtext)
// ---------------------------------------------------------------------------

/** Build a translate rawtext, optionally with %s parameters. */
export function tr(key, ...with_) {
  return with_.length ? { translate: key, with: with_.map(String) } : { translate: key };
}

export function msg(player, key, ...params) {
  safe(() => player.sendMessage({ rawtext: [{ text: "§8[§4VC§8]§r " }, tr(key, ...params)] }), "msg");
}

export function title(player, titleKey, subKey, ...params) {
  safe(() => {
    player.onScreenDisplay.setTitle({ rawtext: [tr(titleKey)] }, {
      subtitle: subKey ? { rawtext: [tr(subKey, ...params)] } : undefined,
      fadeInDuration: 10,
      stayDuration: 50,
      fadeOutDuration: 15,
    });
  }, "title");
}

export function sound(entity, id, volume = 1, pitch = 1) {
  safe(() => entity.dimension.playSound(id, entity.location, { volume, pitch }), "sound");
}

export function particle(dimension, id, location) {
  safe(() => dimension.spawnParticle(id, location), "particle");
}

/** Particle burst around an entity, at body height. */
export function particleAt(entity, id, yOffset = 1) {
  safe(() => {
    const l = entity.location;
    entity.dimension.spawnParticle(id, { x: l.x, y: l.y + yOffset, z: l.z });
  }, "particleAt");
}

export function ring(dimension, id, center, radius, points = 16, y = 0.2) {
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    particle(dimension, id, { x: center.x + Math.cos(a) * radius, y: center.y + y, z: center.z + Math.sin(a) * radius });
  }
}

export function playAnim(player, anim, blendOut = 0.2) {
  safe(() => player.playAnimation(anim, { blendOutTime: blendOut }), "anim");
}

// ---------------------------------------------------------------------------
// Player helpers
// ---------------------------------------------------------------------------

export function isCreative(player) {
  return safe(() => player.getGameMode() === GameMode.Creative) ?? false;
}

export function isSurvivalLike(player) {
  const gm = safe(() => player.getGameMode());
  return gm === GameMode.Survival || gm === GameMode.Adventure;
}

export function getEquip(entity, slot = EquipmentSlot.Mainhand) {
  return safe(() => entity.getComponent("minecraft:equippable")?.getEquipment(slot));
}

export function setEquip(entity, slot, item) {
  return safe(() => entity.getComponent("minecraft:equippable")?.setEquipment(slot, item));
}

export function getInventory(player) {
  return safe(() => player.getComponent("minecraft:inventory")?.container);
}

/** Count items of a type in a player's inventory. */
export function countItem(player, typeId) {
  const inv = getInventory(player);
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && it.typeId === typeId) n += it.amount;
  }
  return n;
}

/** Remove `amount` items of a type. Returns true when the full amount was removed. */
export function takeItem(player, typeId, amount = 1) {
  if (isCreative(player)) return true;
  const inv = getInventory(player);
  if (!inv || countItem(player, typeId) < amount) return false;
  let left = amount;
  for (let i = 0; i < inv.size && left > 0; i++) {
    const it = inv.getItem(i);
    if (!it || it.typeId !== typeId) continue;
    if (it.amount > left) {
      it.amount -= left;
      inv.setItem(i, it);
      left = 0;
    } else {
      left -= it.amount;
      inv.setItem(i, undefined);
    }
  }
  return true;
}

/** Check a list of {item, amount} requirements. */
export function hasItems(player, reqs) {
  if (isCreative(player)) return true;
  return reqs.every((r) => countItem(player, r.item) >= r.amount);
}

export function takeItems(player, reqs) {
  if (!hasItems(player, reqs)) return false;
  for (const r of reqs) takeItem(player, r.item, r.amount);
  return true;
}

/** Give an item; drops it at the player's feet when the inventory is full. */
export function giveItem(player, typeId, amount = 1, opts = {}) {
  safe(() => {
    const stack = new ItemStack(typeId, amount);
    if (opts.lock) stack.lockMode = ItemLockMode.inventory;
    if (opts.keepOnDeath) stack.keepOnDeath = true;
    const inv = getInventory(player);
    const rest = inv ? inv.addItem(stack) : stack;
    if (rest) player.dimension.spawnItem(rest, player.location);
  }, "giveItem");
}

/** Remove every copy of an item type from inventory and armor slots. */
export function purgeItem(player, typeId) {
  safe(() => {
    const inv = getInventory(player);
    if (inv) {
      for (let i = 0; i < inv.size; i++) {
        const it = inv.getItem(i);
        if (it && it.typeId === typeId) inv.setItem(i, undefined);
      }
    }
    const eq = player.getComponent("minecraft:equippable");
    if (eq) {
      for (const slot of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet, EquipmentSlot.Offhand]) {
        if (eq.getEquipment(slot)?.typeId === typeId) eq.setEquipment(slot, undefined);
      }
    }
  }, "purgeItem");
}

/** Ensure the player owns one copy of a soulbound item. */
export function ensureItem(player, typeId) {
  if (countItem(player, typeId) > 0) return;
  if (getEquip(player, EquipmentSlot.Offhand)?.typeId === typeId) return;
  giveItem(player, typeId, 1, { lock: true, keepOnDeath: true });
}

/** Add an effect without particles, refreshing only when needed (cheap on mobile). */
export function effect(entity, id, seconds, amplifier = 0, showParticles = false) {
  safe(() => {
    const cur = entity.getEffect(id);
    // Avoid re-applying every tick: refresh only when stronger or close to expiring.
    if (cur && cur.amplifier === amplifier && cur.duration > 60) return;
    if (cur && cur.amplifier > amplifier && cur.duration > 60) return;
    entity.addEffect(id, Math.round(seconds * 20), { amplifier, showParticles });
  }, "effect");
}

export function removeEffect(entity, id) {
  safe(() => entity.removeEffect(id), "removeEffect");
}

export function heal(entity, amount) {
  safe(() => {
    const h = entity.getComponent("minecraft:health");
    if (h) h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + amount));
  }, "heal");
}

export function hasFamily(entity, family) {
  return safe(() => entity.getComponent("minecraft:type_family")?.hasTypeFamily(family)) ?? false;
}

/** Is it day in the overworld (sun up)? */
export function isDay() {
  const t = world.getTimeOfDay();
  return t < 12500 || t > 23300;
}

export function isNight() {
  const t = world.getTimeOfDay();
  return t >= 13000 && t <= 23000;
}

/** Can this entity see the sky straight above? */
export function seesSky(entity) {
  return safe(() => {
    const loc = entity.location;
    const top = entity.dimension.getTopmostBlock({ x: loc.x, z: loc.z });
    if (!top) return false;
    return top.location.y < loc.y + 1.5;
  }) ?? false;
}

export function runCmd(entity, cmd) {
  return safe(() => entity.runCommand(cmd), "cmd:" + cmd);
}

/** Schedule a repeating job that never throws. */
export function every(ticks, fn, label) {
  return system.runInterval(() => safe(fn, label), ticks);
}

export function later(ticks, fn, label) {
  return system.runTimeout(() => safe(fn, label), ticks);
}

export function players() {
  return world.getAllPlayers();
}
