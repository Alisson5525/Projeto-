// Poderes de combate: agarrar e arremessar, inimigos-projetil e estilhacar congelados.
import { EntityDamageCause } from '@minecraft/server';
import { POW, getSettings } from './config.js';
import { blast, groundColor } from './destruction.js';
import { actionbar, flashArea, later, particle, ringBurst, shake, shakeArea, sound } from './fx.js';
import { setPower } from './state.js';
import { canHit, hurt, nearby } from './targets.js';
import { V, clamp } from './vec.js';

// grandes demais para agarrar
const NO_GRAB = new Set(['minecraft:ender_dragon', 'minecraft:wither', 'minecraft:elder_guardian', 'minecraft:ghast', 'minecraft:happy_ghast']);
const ICE_RE = /^minecraft:(ice|packed_ice|blue_ice)$/;

const center = (e) => V.add(e.location, { x: 0, y: 0.9, z: 0 });

// ---------------------------------------------------------------- congelados e estilhacar

const frozen = new Map(); // id da entidade -> tick ate quando esta congelada

export function markFrozen(e, until) {
  try { frozen.set(e.id, Math.max(frozen.get(e.id) || 0, until)); } catch (err) { /* */ }
}

export function isFrozen(e, tick) {
  try { return (frozen.get(e.id) || 0) >= tick; } catch (err) { return false; }
}

/** Golpe num inimigo congelado: o gelo explode em cacos e ele leva dano extra. */
export function shatter(player, e, tick) {
  if (!isFrozen(e, tick)) return false;
  frozen.delete(e.id);
  const dim = player.dimension;
  const c = center(e);
  const ice = { r: 0.72, g: 0.88, b: 1 };
  hurt(player, e, 22, EntityDamageCause.freezing);
  try { e.removeEffect('slowness'); } catch (err) { /* */ }
  // a jaula de gelo em volta se parte
  const l = V.floor(e.location);
  for (let x = -1; x <= 1; x++) for (let y = 0; y <= 2; y++) for (let z = -1; z <= 1; z++) {
    try {
      const b = dim.getBlock({ x: l.x + x, y: l.y + y, z: l.z + z });
      if (b && ICE_RE.test(b.typeId)) {
        b.setType('minecraft:air');
        particle(dim, 'superman:shards', V.center(b.location), { color: ice });
      }
    } catch (err) { /* */ }
  }
  for (let i = 0; i < 3; i++) particle(dim, 'superman:shards', c, { color: ice });
  particle(dim, 'superman:ice_burst', c);
  particle(dim, 'superman:frost_hit', c);
  particle(dim, 'superman:impact_flash', c, { radius: 2.2 });
  particle(dim, 'superman:shockwave', c, { radius: 4, color: ice });
  sound(dim, 'random.glass', c, 1.2, 0.7);
  later(2, () => sound(dim, 'random.glass', c, 1, 1.2));
  sound(dim, 'mob.player.hurt_freeze', c, 0.8, 0.6);
  actionbar(player, '§b§lESTILHAÇADO!');
  shake(player, 0.3, 0.3);
  return true;
}

// ---------------------------------------------------------------- inimigos-projetil

const flying = [];

/**
 * Lanca uma criatura como projetil: ela voa, atropela quem estiver no caminho e abre uma cratera
 * quando bate no chao ou numa parede.
 */
export function launchProjectile(player, e, dir, power, tick) {
  try {
    const h = Math.hypot(dir.x, dir.z) > 0.05 ? V.norm({ x: dir.x, y: 0, z: dir.z }) : { x: 0, y: 0, z: 0 };
    const horiz = 2.5 + power * 2;
    e.applyKnockback({ x: h.x * horiz * Math.hypot(dir.x, dir.z), z: h.z * horiz * Math.hypot(dir.x, dir.z) },
      clamp(dir.y * (1.5 + power * 1.5) + 0.35, -3, 3));
    for (let i = flying.length - 1; i >= 0; i--) if (flying[i].e === e) flying.splice(i, 1);
    flying.push({ e, player, power, from: tick + 3, until: tick + 70, hit: new Set([e.id]), last: e.location });
  } catch (err) { /* */ }
}

function crash(f, loc) {
  const { e, player, power } = f;
  const dim = e.dimension;
  const p = { x: loc.x, y: loc.y + 0.3, z: loc.z };
  const gc = groundColor(dim, V.add(p, { x: 0, y: 0.6, z: 0 }));
  blast(dim, { x: p.x, y: p.y - 0.3, z: p.z }, clamp(1.6 + power * 0.5, 1.6, 3.5), player);
  particle(dim, 'superman:dust_wall', p, { radius: 2.5 + power, color: gc });
  particle(dim, 'superman:debris_burst', p, { color: gc, scale: 1 + power * 0.2 });
  particle(dim, 'superman:impact_flash', V.add(p, { x: 0, y: 0.6, z: 0 }), { radius: 2 + power * 0.4 });
  ringBurst(dim, V.add(p, { x: 0, y: 0.1, z: 0 }), [3 + power, 5 + power * 1.5], { r: 1, g: 0.92, b: 0.8 }, 2);
  particle(dim, 'superman:sparks', p, { count: 12 });
  sound(dim, 'mace.heavy_smash_ground', p, 1.4, 0.8);
  sound(dim, 'random.explode', p, 0.7, 1.1);
  shakeArea(dim, p, 18, 0.35 + power * 0.1, 0.4);
  hurt(player, e, 8 + power * 5);
}

/** Acompanha os inimigos arremessados (chamado uma vez por tick). */
export function updateProjectiles(tick) {
  for (let i = flying.length - 1; i >= 0; i--) {
    const f = flying[i];
    let done = tick > f.until;
    try {
      if (!f.e.isValid) { flying.splice(i, 1); continue; }
      const e = f.e;
      const dim = e.dimension;
      const l = e.location;
      const v = e.getVelocity();
      const sp = V.len(v);
      if (tick % 2 === 0 && sp > 0.4) particle(dim, 'superman:speed_trail', V.add(l, { x: 0, y: 0.8, z: 0 }), { dir: V.norm(v) });
      // atropela outros inimigos no caminho
      for (const o of nearby(f.player, V.add(l, { x: 0, y: 0.8, z: 0 }), 1.8)) {
        if (f.hit.has(o.id)) continue;
        f.hit.add(o.id);
        hurt(f.player, o, 8 + f.power * 3);
        const hd = V.norm({ x: v.x, y: 0, z: v.z });
        try { o.applyKnockback({ x: hd.x * 2.5, z: hd.z * 2.5 }, 0.6); } catch (err) { /* */ }
        particle(dim, 'superman:punch_impact', V.add(o.location, { x: 0, y: 1, z: 0 }));
        sound(dim, 'game.player.attack.strong', o.location, 1, 0.8);
      }
      if (!done && tick >= f.from) {
        let wall;
        if (sp > 0.3) {
          try {
            wall = dim.getBlockFromRay(V.add(l, { x: 0, y: 0.5, z: 0 }), V.norm(v), {
              maxDistance: sp + 0.7, includeLiquidBlocks: false, includePassableBlocks: false,
            });
          } catch (err) { /* */ }
        }
        if (wall) {
          crash(f, V.add(wall.block.location, wall.faceLocation));
          done = true;
        } else if (e.isOnGround || (tick >= f.from + 4 && sp < 0.15)) {
          crash(f, l);
          done = true;
        }
      }
      f.last = l;
    } catch (err) {
      done = true;
    }
    if (done) flying.splice(i, 1);
  }
}

// ---------------------------------------------------------------- agarrar e arremessar

export function canGrab(player, e) {
  try {
    return canHit(player, e) && !NO_GRAB.has(e.typeId);
  } catch (err) {
    return false;
  }
}

export function startGrab(player, st, target, tick) {
  st.grab = target;
  st.powerTimeout = tick + 120;
  setPower(player, st, POW.GRAB);
  const dim = player.dimension;
  const c = center(target);
  particle(dim, 'superman:impact_flash', c, { radius: 1.2 });
  particle(dim, 'superman:punch_impact', c);
  sound(dim, 'mace.smash_air', c, 0.8, 0.7);
  sound(dim, 'armor.equip_netherite', c, 1, 0.7);
  shake(player, 0.15, 0.2);
  actionbar(player, '§6Agarrado! §fSolte o agachar para §6§larremessar');
}

/** Segura o inimigo acima da cabeca; soltar o agachar arremessa para onde o heroi olha. */
export function grabTick(player, st, tick) {
  const e = st.grab;
  if (!e || !e.isValid) {
    st.grab = undefined;
    setPower(player, st, POW.NONE);
    return;
  }
  const look = player.getViewDirection();
  const f = V.norm({ x: look.x, y: 0, z: look.z });
  const hold = V.add(player.location, V.add(V.mul(f, 0.2), { x: 0, y: 2.45, z: 0 }));
  try {
    e.teleport(hold, { keepVelocity: false });
    if (st.powTicks % 10 === 1) {
      e.addEffect('slowness', 20, { amplifier: 10, showParticles: false });
      e.addEffect('weakness', 20, { amplifier: 10, showParticles: false });
    }
  } catch (err) { /* */ }
  if (st.powTicks % 5 === 0) particle(player.dimension, 'superman:aura', V.add(hold, { x: 0, y: 0.6, z: 0 }), { radius: 0.8 });
  const released = st.powTicks > 4 && !player.isSneaking;
  if (released || tick > st.powerTimeout) {
    st.powerTimeout = tick + 15;
    setPower(player, st, POW.THROW);
  }
}

export function throwTick(player, st, tick) {
  if (st.powTicks === 4 && st.grab) {
    const e = st.grab;
    st.grab = undefined;
    const dim = player.dimension;
    const look = player.getViewDirection();
    const hand = V.add(player.location, V.add(V.mul(look, 1.4), { x: 0, y: 1.7, z: 0 }));
    try { e.teleport(hand, { keepVelocity: false }); } catch (err) { /* */ }
    const power = getSettings().intensity >= 2 ? 3 : 2.4;
    launchProjectile(player, e, look, power, tick);
    hurt(player, e, 6);
    particle(dim, 'superman:sonic_boom', hand, { dir: look, radius: 2.2 });
    particle(dim, 'superman:impact_flash', hand, { radius: 1.6 });
    for (let i = 1; i <= 2; i++) later(i * 2, () => particle(dim, 'superman:sonic_boom', V.add(hand, V.mul(look, i * 2)), { dir: look, radius: 2 + i }));
    sound(dim, 'item.trident.throw', hand, 1, 0.6);
    sound(dim, 'mace.smash_air', hand, 1, 0.8);
    flashArea(dim, hand, 6, 0.2);
    shake(player, 0.3, 0.25);
  }
  if (tick >= st.powerTimeout) setPower(player, st, POW.NONE);
}

/** Solta o inimigo (o heroi destransformou, morreu ou trocou de dimensao). */
export function dropGrab(st) {
  st.grab = undefined;
}


