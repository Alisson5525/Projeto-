import * as mc from "@minecraft/server";

mc.system.afterEvents.scriptEventReceive.subscribe(event => {
  if (!event.id.startsWith("tnt:")) return;
  const tnt = event.id.slice(4);
  const source = event.sourceEntity;
  if (!source || !source.isValid) return;

  if (tnt === "skill_2_kurama_1") {
    hitInFront(source, {length: 4, radius: 2, damage: 15, particle: true});
  }

 if (tnt === "skill_2_kurama_4") {
    hitInFront(source, {length: 3, radius: 2, damage: 15, particle: false});
  }

 if (tnt === "bola_fogo") {
    hitInFront(source, {length: 6, radius: 3, damage: 5, particle: false});
  }

 if (tnt === "aniquilacao_fogo") {
    hitInFront(source, {length: 10, radius: 7, damage: 15, particle: false});
  }

   if (tnt === "corte_de_agua") {
    hitInFront(source, {length: 8, radius: 2, damage: 3, particle: false});
  }
  
});

export function hitInFront(player, cfg = {}) {
  const dimension = player.dimension;
  const L = cfg.length ?? 1;
  const r = cfg.radius ?? 1;
  const dmg = cfg.damage ?? 1;
  const debug = cfg.particle ?? false;

  const head = player.getHeadLocation();
  const dir = normalize(player.getViewDirection());
  const origin = add(head, scale(dir, 0.6));

  const candidates = dimension.getEntities({
    location: origin,
    maxDistance: L + r,
  });

  let hits = 0;

  for (const e of candidates) {
    if (!e?.isValid) continue;
    if (e.id === player.id) continue;
    if (typeof e.applyDamage !== "function") continue;
    
    const p = e.location;
    const op = subtract(p, origin);
    const t = clamp(dot(op, dir), 0, L);
    const closest = add(origin, scale(dir, t));
    const d2 = distanceSquared(p, closest);

    if (d2 <= r * r) {
      try {
        e.applyDamage(dmg, { cause: "entityAttack", damagingEntity: player });
      } catch {}
      hits++;
    }
  }

  if (debug) {
    const step = 0.5;
    for (let s = 0; s <= L; s += step) {
      const pos = add(origin, scale(dir, s));
      dimension.spawnParticle("tnt:rastro_braco_kurama_4", pos);
    }
  }

  return hits;
}

function add(a, b) { return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }; }
function subtract(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
function scale(a, k) { return { x: a.x * k, y: a.y * k, z: a.z * k }; }
function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function len(a) { return Math.sqrt(dot(a, a)); }
function normalize(a) { const l = len(a); return l > 0 ? scale(a, 1 / l) : { x: 0, y: 0, z: 0 }; }
function clamp(x, min, max) { return x < min ? min : x > max ? max : x; }
function distanceSquared(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}