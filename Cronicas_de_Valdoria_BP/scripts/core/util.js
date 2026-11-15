// Utilitários gerais: vetores, aleatoriedade, formatação e acesso seguro a entidades.
import { system, world, EquipmentSlot, GameMode } from "@minecraft/server";

export const NS = "valdoria";

/** @typedef {{x:number,y:number,z:number}} V3 */

export const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  mul: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  len: (a) => Math.hypot(a.x, a.y, a.z),
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
  dist2d: (a, b) => Math.hypot(a.x - b.x, a.z - b.z),
  norm: (a) => {
    const l = Math.hypot(a.x, a.y, a.z) || 1;
    return { x: a.x / l, y: a.y / l, z: a.z / l };
  },
  flat: (a) => {
    const l = Math.hypot(a.x, a.z) || 1;
    return { x: a.x / l, y: 0, z: a.z / l };
  },
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  up: (a, h) => ({ x: a.x, y: a.y + h, z: a.z }),
  rotY: (a, deg) => {
    const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return { x: a.x * c - a.z * s, y: a.y, z: a.x * s + a.z * c };
  },
};

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const chance = (p) => Math.random() < p;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const tick = () => system.currentTick;

export function ok(entity) {
  try {
    return !!entity && entity.isValid;
  } catch {
    return false;
  }
}

export function isPlayer(e) {
  return ok(e) && e.typeId === "minecraft:player";
}

export function health(e) {
  try {
    return e.getComponent("minecraft:health");
  } catch {
    return undefined;
  }
}

export function hpPct(e) {
  const h = health(e);
  return h ? h.currentValue / Math.max(1, h.effectiveMax) : 1;
}

export function heal(e, amount) {
  const h = health(e);
  if (!h || amount <= 0) return 0;
  const before = h.currentValue;
  h.setCurrentValue(Math.min(h.effectiveMax, before + amount));
  return h.currentValue - before;
}

export function heldItem(player) {
  try {
    return player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot.Mainhand);
  } catch {
    return undefined;
  }
}

export function equipment(player, slot) {
  try {
    return player.getComponent("minecraft:equippable")?.getEquipment(slot);
  } catch {
    return undefined;
  }
}

export function inventory(player) {
  return player.getComponent("minecraft:inventory")?.container;
}

export function countItem(player, typeId) {
  const inv = inventory(player);
  if (!inv) return 0;
  let n = 0;
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (it && it.typeId === typeId) n += it.amount;
  }
  return n;
}

export function takeItem(player, typeId, amount) {
  const inv = inventory(player);
  if (!inv || countItem(player, typeId) < amount) return false;
  for (let i = 0; i < inv.size && amount > 0; i++) {
    const it = inv.getItem(i);
    if (!it || it.typeId !== typeId) continue;
    const take = Math.min(it.amount, amount);
    amount -= take;
    if (it.amount - take <= 0) inv.setItem(i, undefined);
    else {
      it.amount -= take;
      inv.setItem(i, it);
    }
  }
  return true;
}

export function giveItem(player, itemStack) {
  const inv = inventory(player);
  const rest = inv ? inv.addItem(itemStack) : itemStack;
  if (rest) player.dimension.spawnItem(rest, player.location);
}

/** Opções de teste globais (Modo de Teste): permitem que criaturas e chefes mirem jogadores no criativo. */
export const TEST = { creativeTarget: false };

export function isActivePlayer(p) {
  try {
    const gm = p.getGameMode();
    if (gm === GameMode.Creative) return TEST.creativeTarget;
    return gm !== GameMode.Spectator;
  } catch {
    return true;
  }
}

export function effect(e, id, ticks, amp = 0, particles = false) {
  try {
    e.addEffect(id, Math.max(1, Math.floor(ticks)), { amplifier: amp, showParticles: particles });
  } catch {
    /* entidade sem suporte a efeitos */
  }
}

export function forward(e) {
  return V.flat(e.getViewDirection());
}

export function bar(frac, len = 12, on = "§a", off = "§8") {
  const n = Math.round(clamp(frac, 0, 1) * len);
  return on + "|".repeat(n) + off + "|".repeat(len - n);
}

export function fmt(n, d = 0) {
  return Number(n).toFixed(d);
}

export function pct(n) {
  return `${Math.round(n * 100)}%`;
}

export function playersNear(dim, loc, r) {
  return dim.getPlayers({ location: loc, maxDistance: r });
}

export function say(player, msg) {
  try {
    player.sendMessage(msg);
  } catch {
    /* jogador saiu */
  }
}

export function broadcast(msg) {
  world.sendMessage(msg);
}

export function safeRun(fn, label = "") {
  try {
    fn();
  } catch (e) {
    console.warn(`[Valdoria] ${label}: ${e}`);
  }
}
