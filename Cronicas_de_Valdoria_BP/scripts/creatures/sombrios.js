// Criaturas do Reino Sombrio com comportamento por script:
// - Cavaleiro Corrompido: ergue o escudo quando o alvo está perto (bloqueia 60% dos golpes vindos da frente) e, de tempos em
//   tempos, faz uma Investida Sombria contra alvos a média distância.
// - Gárgula: nasce como estátua (imóvel e imune); desperta quando alguém chega a 7 blocos ou a golpeia; depois salta sobre o alvo.
import { world, system } from "@minecraft/server";
import { NS, V, ok, tick, isPlayer, isActivePlayer } from "../core/util.js";
import { particle, sound } from "../core/fx.js";
import { onBeforeHurt, dealDamage, canHit } from "../core/damage.js";
import { knockFrom } from "../abilities/engine.js";

export const KNIGHT = `${NS}:cavaleiro_corrompido`;
export const GARGOYLE = `${NS}:gargula`;
const DIMS = ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"];
const st = new Map(); // id -> { next, busy }

function anim(e, a) {
  try { e.setProperty(`${NS}:anim`, a); } catch { /* */ }
}
function nearestTarget(e, r) {
  try {
    return e.dimension.getPlayers({ location: e.location, maxDistance: r }).filter(isActivePlayer)
      .sort((a, b) => V.dist(a.location, e.location) - V.dist(b.location, e.location))[0];
  } catch {
    return undefined;
  }
}
export function isAwake(g) {
  try { return !!g.getProperty(`${NS}:acordada`); } catch { return true; }
}
/** Desperta uma gárgula (estátua -> criatura). */
export function awaken(g) {
  if (!ok(g) || isAwake(g)) return false;
  try {
    g.triggerEvent("valdoria:despertar");
    g.setProperty(`${NS}:acordada`, true);
  } catch { /* */ }
  particle(g.dimension, "detritos", V.up(g.location, 0.8), {});
  sound(g.dimension, "dig.stone", g.location, 0.7, 1);
  st.set(g.id, { next: tick() + 30, busy: 0 });
  return true;
}

function knightTick(k) {
  const s = st.get(k.id) || { next: tick() + 60, busy: 0 };
  st.set(k.id, s);
  if (s.busy > tick()) return;
  const t = nearestTarget(k, 16);
  if (!t) {
    anim(k, 0);
    return;
  }
  const d = V.dist(k.location, t.location);
  if (d >= 4 && d <= 12 && tick() >= s.next) {
    // Investida Sombria
    s.next = tick() + 160;
    s.busy = tick() + 20;
    anim(k, 2);
    particle(k.dimension, "sombra_rastro", V.up(k.location, 1), {});
    sound(k.dimension, "mob.irongolem.throw", k.location, 0.7, 0.8);
    const dir = V.norm(V.flat(V.sub(t.location, k.location)));
    try { k.applyKnockback({ x: dir.x * 2.2, z: dir.z * 2.2 }, 0.15); } catch { /* */ }
    system.runTimeout(() => {
      if (!ok(k)) return;
      anim(k, 0);
      for (const e of k.dimension.getEntities({ location: k.location, maxDistance: 2.6 })) {
        if (!canHit(k, e, false)) continue;
        dealDamage(k, e, 10, "dark", { kind: "weapon" });
        knockFrom(e, k.location, 1.0, 0.35);
      }
    }, 10);
    return;
  }
  anim(k, d < 6 ? 1 : 0);
}

function gargoyleTick(g) {
  if (!isAwake(g)) {
    const t = nearestTarget(g, 7);
    if (t) awaken(g);
    return;
  }
  const s = st.get(g.id) || { next: tick() + 40, busy: 0 };
  st.set(g.id, s);
  if (s.busy > tick() || tick() < s.next) return;
  const t = nearestTarget(g, 14);
  if (!t) return;
  const d = V.dist(g.location, t.location);
  if (d < 3.5 || d > 11) return;
  // Salto: as asas abrem, ela se lança e cai sobre o alvo
  s.next = tick() + 120;
  s.busy = tick() + 24;
  anim(g, 1);
  sound(g.dimension, "mob.enderdragon.flap", g.location, 0.8, 0.8);
  const dir = V.norm(V.flat(V.sub(t.location, g.location)));
  const h = Math.min(2.4, d * 0.22);
  try { g.applyKnockback({ x: dir.x * h, z: dir.z * h }, 0.7); } catch { /* */ }
  system.runTimeout(() => {
    if (!ok(g)) return;
    anim(g, 0);
    particle(g.dimension, "poeira", g.location, { radius: 2 });
    for (const e of g.dimension.getEntities({ location: g.location, maxDistance: 2.4 })) {
      if (!canHit(g, e, false)) continue;
      dealDamage(g, e, 7, "physical", { kind: "weapon" });
    }
  }, 18);
}

export function startShadowCreatures() {
  // escudo do Cavaleiro Corrompido: golpes vindos da frente perdem 60% enquanto ele está em guarda
  onBeforeHurt((ev) => {
    const k = ev.hurtEntity;
    if (k.typeId !== KNIGHT || !ok(ev.src)) return;
    let guard = 0;
    try { guard = Number(k.getProperty(`${NS}:anim`)) || 0; } catch { /* */ }
    if (guard !== 1) return;
    const view = V.flat(k.getViewDirection());
    const to = V.norm(V.flat(V.sub(ev.src.location, k.location)));
    if (V.dot(view, to) < 0.45) return;
    ev.damage *= 0.4;
    particle(k.dimension, "bloqueio", V.add(V.up(k.location, 1.2), V.mul(view, 0.6)), {});
    sound(k.dimension, "item.shield.block", k.location, 0.9, 0.8);
    if (isPlayer(ev.src)) ev.src.onScreenDisplay.setActionBar("§7O escudo do Cavaleiro Corrompido aparou o golpe. §fAtaque pelos lados ou por trás.");
  });
  world.afterEvents.entityHitEntity.subscribe((ev) => {
    const t = ev.hitEntity;
    if (ok(t) && t.typeId === GARGOYLE && isPlayer(ev.damagingEntity)) awaken(t);
  });
  world.afterEvents.entityDie.subscribe((ev) => st.delete(ev.deadEntity.id));
  system.runInterval(() => {
    for (const dimId of DIMS) {
      let list = [];
      try {
        list = world.getDimension(dimId).getEntities({ type: KNIGHT }).concat(world.getDimension(dimId).getEntities({ type: GARGOYLE }));
      } catch { continue; }
      for (const e of list) {
        try {
          if (e.typeId === KNIGHT) knightTick(e);
          else gargoyleTick(e);
        } catch (err) { console.warn(`[Valdoria] sombrios: ${err}`); }
      }
    }
  }, 10);
}
