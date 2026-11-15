// Motor de habilidades: primitivas reutilizadas por feitiços, raças, classes, armas, criaturas e chefes.
import { system, world } from "@minecraft/server";
import { V, ok, tick, rand, isPlayer, health, heal, effect, clamp, NS } from "../core/util.js";
import { particle, line, sound, COLORS, SCHOOL_FX } from "../core/fx.js";
import { dealDamage, canHit, enemiesNear, alliesNear, setAggro } from "../core/damage.js";

const projectiles = [];
const zones = [];
const MAX_PROJ = 60;
const MAX_ZONES = 40;
const summons = new Map(); // entityId -> {owner, until}

// ------------------------------------------------------------------ mira
/** Retorna o alvo sob a mira (ou ponto no chão/ar) até `range` blocos. */
export function aim(src, range = 20, area = false) {
  const from = src.getHeadLocation();
  const dir = src.getViewDirection();
  let entity;
  try {
    const hits = src.dimension.getEntitiesFromRay(from, dir, { maxDistance: range });
    hits.sort((a, b) => a.distance - b.distance);
    entity = hits.map((h) => h.entity).find((e) => e.id !== src.id && canHit(src, e, area));
  } catch {
    entity = undefined;
  }
  let point;
  let blockDist = range;
  try {
    const b = src.dimension.getBlockFromRay(from, dir, { maxDistance: range, includePassableBlocks: false, includeLiquidBlocks: false });
    if (b) {
      point = V.add(b.block.location, b.faceLocation);
      blockDist = V.dist(from, point);
    }
  } catch {
    /* sem bloco */
  }
  if (entity && V.dist(from, entity.location) > blockDist + 1.5) entity = undefined;
  if (!point) point = V.add(from, V.mul(dir, range));
  return { entity, point: entity ? entity.location : point, dir, from };
}

/** Ponto no chão abaixo de `loc` (até 12 blocos). */
export function ground(dim, loc) {
  try {
    const b = dim.getBlockFromRay(V.up(loc, 0.5), { x: 0, y: -1, z: 0 }, { maxDistance: 14, includePassableBlocks: false });
    if (b) return { x: loc.x, y: b.block.location.y + 1, z: loc.z };
  } catch {
    /* fora do mundo */
  }
  return loc;
}

// ------------------------------------------------------------------ projéteis
/**
 * @param {import("@minecraft/server").Entity} src
 * @param {any} o {from, dir, speed, range, radius, element, damage, aoe, trail, impact, homing, gravity, pierce, onHit, onImpact, color, kind}
 */
export function launch(src, o) {
  if (projectiles.length >= MAX_PROJ) projectiles.shift();
  const fx = SCHOOL_FX[o.element] || SCHOOL_FX.physical;
  projectiles.push({
    src, dim: src.dimension, pos: { ...o.from }, vel: V.mul(V.norm(o.dir), o.speed ?? 1.2),
    speed: o.speed ?? 1.2, range: o.range ?? 24, travel: 0, radius: o.radius ?? 0.6, element: o.element || "arcane",
    damage: o.damage || 0, aoe: o.aoe || 0, trail: o.trail ?? fx[0], impact: o.impact ?? fx[1], homing: o.homing || 0,
    gravity: o.gravity || 0, pierce: !!o.pierce, onHit: o.onHit, onImpact: o.onImpact, color: o.color || o.element,
    hit: new Set(), kind: o.kind || "spell", explodeAtEnd: o.explodeAtEnd ?? !!o.aoe, life: 0, area: o.area ?? true,
  });
}

function projectileStep(p) {
  const dim = p.dim;
  const steps = Math.max(1, Math.ceil(p.speed / 0.5));
  for (let s = 0; s < steps; s++) {
    if (p.homing > 0 && p.life % 2 === 0 && s === 0) {
      const tgt = enemiesNear(p.src, p.pos, 10, true).filter((e) => !p.hit.has(e.id))
        .sort((a, b) => V.dist(a.location, p.pos) - V.dist(b.location, p.pos))[0];
      if (tgt) {
        const want = V.norm(V.sub(V.up(tgt.location, 0.9), p.pos));
        const cur = V.norm(p.vel);
        p.vel = V.mul(V.norm(V.lerp(cur, want, p.homing)), p.speed);
      }
    }
    if (p.gravity) p.vel = { x: p.vel.x, y: p.vel.y - p.gravity / steps, z: p.vel.z };
    const delta = V.mul(p.vel, 1 / steps);
    const len = V.len(delta);
    const dir = V.norm(delta);
    try {
      const b = dim.getBlockFromRay(p.pos, dir, { maxDistance: len + 0.05, includePassableBlocks: false, includeLiquidBlocks: false });
      if (b) {
        p.pos = V.add(b.block.location, b.faceLocation);
        return "block";
      }
    } catch {
      return "block";
    }
    const next = V.add(p.pos, delta);
    let ents = [];
    try {
      ents = dim.getEntities({ location: next, maxDistance: p.radius + 4 });
    } catch {
      return "block";
    }
    for (const e of ents) {
      if (p.hit.has(e.id) || !canHit(p.src, e, false)) continue;
      let top;
      try {
        top = e.getHeadLocation().y + 0.3;
      } catch {
        top = e.location.y + 1.8;
      }
      const cy = clamp(next.y, e.location.y, top);
      const d = Math.hypot(next.x - e.location.x, next.y - cy, next.z - e.location.z);
      if (d > p.radius + 0.45) continue;
      p.hit.add(e.id);
      if (p.damage) dealDamage(p.src, e, p.damage, p.element, { kind: p.kind });
      if (p.onHit) p.onHit(e, p);
      if (!p.pierce) {
        p.pos = next;
        return "entity";
      }
    }
    p.pos = next;
    p.travel += len;
    if (p.travel >= p.range) return "end";
  }
  return null;
}

function impact(p, how) {
  const dim = p.dim;
  if (how === "end" && !p.explodeAtEnd) return;
  if (p.impact) particle(dim, p.impact, p.pos, { color: p.color, radius: Math.max(0.6, p.aoe) });
  if (p.aoe > 0 && ok(p.src)) {
    for (const e of enemiesNear(p.src, p.pos, p.aoe + 0.8, p.area)) {
      if (p.hit.has(e.id)) continue;
      const fall = 1 - 0.4 * clamp(V.dist(e.location, p.pos) / (p.aoe + 0.8), 0, 1);
      if (p.damage) dealDamage(p.src, e, p.damage * fall, p.element, { kind: p.kind });
      if (p.onHit) p.onHit(e, p);
    }
  }
  if (p.onImpact) p.onImpact(p.pos, p);
}

// ------------------------------------------------------------------ zonas persistentes
/** o: {center, follow, radius, duration, interval, pulse(z, n), particle, color, every(z), onEnd(z)} */
export function zone(src, o) {
  if (zones.length >= MAX_ZONES) zones.shift();
  const z = { src, dim: src.dimension, center: o.center ? { ...o.center } : src.location, follow: o.follow, radius: o.radius ?? 3,
    until: tick() + (o.duration ?? 100), interval: o.interval ?? 10, next: tick() + (o.delay ?? 0), pulse: o.pulse,
    particle: o.particle, color: o.color, pEvery: o.particleEvery ?? 6, onEnd: o.onEnd, n: 0, data: o.data || {} };
  zones.push(z);
  return z;
}

function zoneStep(z, now) {
  if (z.follow) {
    if (!ok(z.follow)) return true;
    z.center = z.follow.location;
    z.dim = z.follow.dimension;
  }
  if (z.particle && (now - z.until) % z.pEvery === 0) particle(z.dim, z.particle, z.center, { color: z.color, radius: z.radius });
  if (now >= z.next) {
    z.next = now + z.interval;
    if (z.pulse && ok(z.src)) z.pulse(z, z.n++);
  }
  return now >= z.until;
}

// ------------------------------------------------------------------ ações instantâneas
export function areaDamage(src, center, radius, damage, element, o = {}) {
  const hits = enemiesNear(src, center, radius, o.area ?? true);
  for (const e of hits) {
    if (o.exclude && o.exclude.has(e.id)) continue;
    dealDamage(src, e, damage, element, { kind: o.kind || "spell" });
    if (o.onHit) o.onHit(e);
  }
  return hits;
}

export function chain(src, first, count, range, damage, element, o = {}) {
  let cur = first;
  let from = o.from || src.getHeadLocation();
  const hit = new Set();
  let dmg = damage;
  for (let i = 0; i < count && ok(cur); i++) {
    hit.add(cur.id);
    const to = V.up(cur.location, 1);
    line(src.dimension, from, to, o.particle || "cor_ponto", { color: o.color || element }, 0.4);
    dealDamage(src, cur, dmg, element, { kind: o.kind || "spell" });
    if (o.onHit) o.onHit(cur, i);
    from = to;
    dmg *= o.decay ?? 0.85;
    cur = enemiesNear(src, cur.location, range, true).filter((e) => !hit.has(e.id))
      .sort((a, b) => V.dist(a.location, to) - V.dist(b.location, to))[0];
  }
  return hit.size;
}

/** Raio instantâneo em linha reta; atinge o primeiro alvo (ou todos com pierce). */
export function beam(src, range, damage, element, o = {}) {
  const a = aim(src, range, false);
  const from = o.from || V.add(src.getHeadLocation(), V.mul(a.dir, 0.6));
  let targets = [];
  if (o.pierce) {
    try {
      targets = src.dimension.getEntitiesFromRay(src.getHeadLocation(), a.dir, { maxDistance: range })
        .map((h) => h.entity).filter((e) => canHit(src, e, false));
    } catch {
      targets = [];
    }
  } else if (a.entity) targets = [a.entity];
  const end = a.entity && !o.pierce ? V.up(a.entity.location, 1) : a.point;
  line(src.dimension, from, end, o.particle || "cor_ponto", { color: o.color || element }, 0.35);
  for (const t of targets) {
    dealDamage(src, t, damage, element, { kind: o.kind || "spell" });
    if (o.onHit) o.onHit(t);
  }
  return { targets, end };
}

export function knockFrom(target, center, h = 1, v = 0.4) {
  try {
    const d = V.flat(V.sub(target.location, center));
    target.applyKnockback({ x: d.x * h, z: d.z * h }, v);
  } catch {
    /* imune */
  }
}

export function root(target, ticks) {
  effect(target, "slowness", ticks, 6);
  if (!isPlayer(target)) effect(target, "weakness", ticks, 1);
  else effect(target, "jump_boost", ticks, 128);
}

export function stun(target, ticks) {
  root(target, ticks);
  effect(target, "mining_fatigue", ticks, 2);
  particle(target.dimension, "cor_anel", V.up(target.location, 2.1), { color: "gold", radius: 0.5 });
}

export function dash(entity, dir, h = 1.6, v = 0.25) {
  try {
    const d = V.flat(dir);
    entity.applyKnockback({ x: d.x * h, z: d.z * h }, v);
  } catch {
    /* imune */
  }
}

/** Teleporte seguro na direção do olhar, parando antes de paredes. */
export function blink(src, dist) {
  const dir = V.flat(src.getViewDirection());
  let target = src.location;
  for (let d = dist; d >= 1; d -= 0.5) {
    const p = V.add(src.location, V.mul(dir, d));
    try {
      const feet = src.dimension.getBlock(p);
      const headB = src.dimension.getBlock(V.up(p, 1));
      if (feet && headB && (feet.isAir || feet.isLiquid) && (headB.isAir || headB.isLiquid)) {
        try {
          const b = src.dimension.getBlockFromRay(V.up(src.location, 0.5), dir, { maxDistance: d, includePassableBlocks: false });
          if (b) continue;
        } catch {
          /* ok */
        }
        target = p;
        break;
      }
    } catch {
      /* chunk descarregado */
    }
  }
  particle(src.dimension, "arcano_explosao", V.up(src.location, 1), { radius: 0.6 });
  try {
    src.teleport(target, { keepVelocity: false, checkForBlocks: true });
  } catch {
    /* falhou */
  }
  particle(src.dimension, "arcano_explosao", V.up(target, 1), { radius: 0.6 });
  sound(src.dimension, "mob.endermen.portal", target, 1.2, 0.8);
}

const healHooks = [];
/** Curas feitas por habilidades: fn(origem, alvo, quantidade pedida, quantidade curada). */
export function onHeal(fn) {
  healHooks.push(fn);
}
export function healTarget(src, target, amount) {
  const got = heal(target, amount);
  if (got > 0) particle(target.dimension, "cura", V.up(target.location, 1));
  for (const fn of healHooks) {
    try { fn(src, target, amount, got); } catch (e) { console.warn(`[Valdoria] cura: ${e}`); }
  }
  return got;
}

export function healArea(src, center, radius, amount) {
  let n = 0;
  for (const a of alliesNear(src, center, radius)) {
    healTarget(src, a, amount);
    n++;
  }
  return n;
}

export function buffAllies(src, center, radius, effects) {
  for (const a of alliesNear(src, center, radius)) for (const [id, t, amp] of effects) effect(a, id, t, amp, true);
}

// ------------------------------------------------------------------ invocações
export function summon(owner, typeId, count, seconds, mult = 1) {
  const out = [];
  const mine = [...summons.entries()].filter(([, s]) => s.owner === owner.id);
  if (mine.length + count > 5) {
    for (const [id] of mine.slice(0, mine.length + count - 5)) {
      const e = world.getEntity(id);
      if (ok(e)) e.remove();
      summons.delete(id);
    }
  }
  for (let i = 0; i < count; i++) {
    const ang = rand(0, 360);
    const loc = V.add(owner.location, V.rotY({ x: 1.8, y: 0.2, z: 0 }, ang));
    try {
      const e = owner.dimension.spawnEntity(typeId, loc);
      e.getComponent("minecraft:tameable")?.tame(owner);
      e.setDynamicProperty(`${NS}:dono`, owner.id);
      const hp = health(e);
      if (hp && mult > 1) effect(e, "health_boost", seconds * 20 + 40, Math.min(4, Math.floor((mult - 1) * 4)));
      if (mult > 1) effect(e, "strength", seconds * 20, Math.min(2, Math.floor((mult - 1) * 3)));
      e.nameTag = `§b${owner.name}`;
      summons.set(e.id, { owner: owner.id, until: tick() + Math.round(seconds * 20 * mult) });
      particle(owner.dimension, "invocacao", loc, {});
      out.push(e);
    } catch (err) {
      console.warn(`[Valdoria] invocação falhou: ${err}`);
    }
  }
  sound(owner.dimension, "mob.evocation_illager.prepare_summon", owner.location, 1, 1);
  return out;
}

export function summonsOf(owner) {
  const out = [];
  for (const [id, s] of summons) {
    if (s.owner !== owner.id) continue;
    const e = world.getEntity(id);
    if (ok(e)) out.push(e);
  }
  return out;
}

export function summonOwner(entity) {
  const s = summons.get(entity.id);
  if (s) return world.getEntity(s.owner);
  try {
    const id = entity.getDynamicProperty(`${NS}:dono`);
    if (typeof id === "string") return world.getEntity(id);
  } catch {
    /* sem dono */
  }
  return undefined;
}

// ------------------------------------------------------------------ laço principal
export function startEngine() {
  system.runInterval(() => {
    const now = tick();
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const p = projectiles[i];
      p.life++;
      let how = null;
      if (!ok(p.src)) how = "end";
      else {
        try {
          how = projectileStep(p);
        } catch {
          how = "block";
        }
      }
      if (p.trail && !how) particle(p.dim, p.trail, p.pos, { color: p.color });
      if (how || p.life > 200) {
        try {
          impact(p, how || "end");
        } catch (e) {
          console.warn(`[Valdoria] impacto: ${e}`);
        }
        projectiles.splice(i, 1);
      }
    }
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      let end = true;
      try {
        end = zoneStep(z, now);
      } catch (e) {
        console.warn(`[Valdoria] zona: ${e}`);
      }
      if (end) {
        if (z.onEnd) {
          try { z.onEnd(z); } catch { /* */ }
        }
        zones.splice(i, 1);
      }
    }
  }, 1);

  // expiração das invocações
  system.runInterval(() => {
    const now = tick();
    for (const [id, s] of summons) {
      const e = world.getEntity(id);
      if (!ok(e)) {
        summons.delete(id);
        continue;
      }
      if (s.until <= now || !ok(world.getEntity(s.owner))) {
        particle(e.dimension, "invocacao", e.location, {});
        e.remove();
        summons.delete(id);
      }
    }
  }, 20);

  // invocações órfãs (após recarregar o mundo) são removidas
  world.afterEvents.entityLoad.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || !e.matches({ families: ["valdoria_ally"] })) return;
    if (!summons.has(e.id)) system.runTimeout(() => ok(e) && !summons.has(e.id) && e.remove(), 2);
  });
}

export { setAggro, COLORS };
