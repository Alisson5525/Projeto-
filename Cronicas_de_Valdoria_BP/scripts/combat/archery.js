// Arcos e bestas do add-on. O disparo é do próprio jogo (componente minecraft:shooter com flechas comuns); este módulo
// reconhece a flecha recém-disparada pelo dono e grava nela o dano (pelo tempo puxado), o elemento e o efeito especial:
// tiro duplo, brasas, corrente de raio, virote perfurante, leque de três virotes ou raízes (Arco de Ylthariel).
import { world, system } from "@minecraft/server";
import { NS, V, ok, isPlayer, heldItem, tick } from "../core/util.js";
import { particle, sound, line } from "../core/fx.js";
import { dealDamage, enemiesNear } from "../core/damage.js";
import { root } from "../abilities/engine.js";
import { ITEM_DATA } from "../data/items_gen.js";

const ARROW = "minecraft:arrow";
const P = { dano: `${NS}:dano`, el: `${NS}:el`, esp: `${NS}:esp`, extra: `${NS}:extra` };
const drawStart = new Map(); // jogador -> tick em que começou a puxar
const released = new Map(); // jogador -> { t, item, frac }

export function rangedData(it) {
  const d = it ? ITEM_DATA[it.typeId] : undefined;
  return d && d.k === "ranged" ? d : undefined;
}
/** Dano de um disparo: cresce com o tempo puxado até o tempo cheio do arco/besta (mínimo 20%). */
export function shotDamage(d, ticks) {
  const frac = Math.max(0.2, Math.min(1, ticks / Math.max(1, d.tempo * 20)));
  return { frac, dano: Math.round(d.dmg * frac * 10) / 10 };
}

function mark(arrow, d, dano, extra = false) {
  arrow.setDynamicProperty(P.dano, dano);
  arrow.setDynamicProperty(P.el, d.el);
  if (d.esp) arrow.setDynamicProperty(P.esp, d.esp);
  if (extra) arrow.setDynamicProperty(P.extra, true);
}
function rotY(v, deg) {
  const r = (deg * Math.PI) / 180;
  return { x: v.x * Math.cos(r) - v.z * Math.sin(r), y: v.y, z: v.x * Math.sin(r) + v.z * Math.cos(r) };
}
/** Flecha extra (tiro duplo e leque): não pode ser recolhida (some ao bater num bloco). */
function extraArrow(owner, from, vel, d, dano) {
  try {
    const a = owner.dimension.spawnEntity(ARROW, from);
    const pc = a.getComponent("minecraft:projectile");
    if (pc) {
      pc.owner = owner;
      pc.shoot(vel);
    }
    mark(a, d, dano, true);
    return a;
  } catch {
    return undefined;
  }
}

/** Chamado quando uma flecha surge: se o dono acabou de soltar um arco/besta do add-on, a flecha é dele. */
export function onArrow(arrow) {
  let owner;
  try { owner = arrow.getComponent("minecraft:projectile")?.owner; } catch { return false; }
  if (!isPlayer(owner)) return false;
  const r = released.get(owner.id);
  if (!r || tick() - r.t > 3) return false;
  released.delete(owner.id);
  const d = rangedData(r.item);
  if (!d) return false;
  mark(arrow, d, r.dano);
  const vel = arrow.getVelocity();
  const from = { ...arrow.location };
  if (d.esp === "duplo" && Math.random() < 0.25) {
    system.runTimeout(() => ok(owner) && extraArrow(owner, from, rotY(vel, 4), d, r.dano), 3);
    owner.onScreenDisplay.setActionBar("§aTiro duplo!");
  } else if (d.esp === "leque") {
    for (const deg of [-9, 9]) extraArrow(owner, from, rotY(vel, deg), d, r.dano);
  }
  if (d.el === "fire") particle(owner.dimension, "fogo_rastro", from, {});
  return true;
}

function onHit(arrow, target, owner) {
  let esp;
  try { esp = arrow.getDynamicProperty(P.esp); } catch { return; }
  if (!esp || !ok(target)) return;
  const dano = Number(arrow.getDynamicProperty(P.dano)) || 0;
  const dim = target.dimension;
  if (esp === "brasas") {
    try { target.setOnFire(5, true); } catch { /* */ }
    particle(dim, "fogo_explosao", V.up(target.location, 0.8), { radius: 1.5 });
    sound(dim, "mob.ghast.fireball", target.location, 0.6, 1.4);
    if (ok(owner)) for (const e of enemiesNear(owner, target.location, 2.5, true)) if (e.id !== target.id) dealDamage(owner, e, dano * 0.4, "fire");
  } else if (esp === "corrente" && ok(owner)) {
    let from = target;
    const hit = new Set([target.id]);
    for (let i = 0; i < 2; i++) {
      const next = enemiesNear(owner, from.location, 6, true).find((e) => !hit.has(e.id));
      if (!next) break;
      hit.add(next.id);
      line(dim, V.up(from.location, 1), V.up(next.location, 1), "raio_rastro", {}, 0.6);
      particle(dim, "raio_explosao", V.up(next.location, 1), {});
      dealDamage(owner, next, dano * 0.5, "lightning");
      from = next;
    }
    sound(dim, "ambient.weather.lightning.impact", target.location, 0.4, 1.6);
  } else if (esp === "raizes") {
    root(target, 40);
    particle(dim, "natureza_espinhos", target.location, { radius: 1.2 });
    sound(dim, "dig.grass", target.location, 0.8, 1);
  } else if (esp === "perfurante") {
    if (ok(owner)) {
      const dir = V.flat(V.sub(target.location, owner.location));
      try { target.applyKnockback({ x: dir.x * 1.2, z: dir.z * 1.2 }, 0.25); } catch { /* */ }
    }
    particle(dim, "detritos", V.up(target.location, 0.8), {});
  }
}

export function startArchery() {
  world.afterEvents.itemStartUse.subscribe((ev) => {
    if (rangedData(ev.itemStack) && isPlayer(ev.source)) drawStart.set(ev.source.id, tick());
  });
  world.afterEvents.itemReleaseUse.subscribe((ev) => {
    const p = ev.source;
    const d = rangedData(ev.itemStack);
    if (!d || !isPlayer(p)) return;
    const t0 = drawStart.get(p.id);
    drawStart.delete(p.id);
    const { frac, dano } = shotDamage(d, t0 === undefined ? 0 : tick() - t0);
    released.set(p.id, { t: tick(), item: ev.itemStack, frac, dano });
    if (frac >= 1 && d.type === "besta") sound(p.dimension, "crossbow.shoot", p.location, 1, 0.9);
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== ARROW) return;
    // o dono é definido junto com o disparo; confere no tick seguinte se ainda não estiver
    if (!onArrow(e)) system.run(() => ok(e) && onArrow(e));
  });
  world.afterEvents.projectileHitEntity.subscribe((ev) => {
    const a = ev.projectile;
    if (!ok(a) || a.typeId !== ARROW) return;
    const target = ev.getEntityHit()?.entity;
    if (target) onHit(a, target, ev.source);
  });
  world.afterEvents.projectileHitBlock.subscribe((ev) => {
    const a = ev.projectile;
    try {
      if (ok(a) && a.getDynamicProperty(P.extra)) system.run(() => ok(a) && a.remove());
    } catch { /* */ }
  });
}
export { released, drawStart, onHit };
export const _heldRanged = (p) => rangedData(heldItem(p));
