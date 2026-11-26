import { EntityDamageCause, EquipmentSlot, GameMode, ItemStack, system } from '@minecraft/server';
import { AIR_STATES, FLY, ITEM, POWER_ITEMS, POW, getSettings } from './config.js';
import { blast, breakBlocks, breakSphere, debrisColor, isBreakable, isFragile, sphereBlocks } from './destruction.js';
import { startDive, stopAll, toggleFlight } from './flight.js';
import { actionbar, flash, particle, q, shake, shakeArea, sound } from './fx.js';
import { setOn, setPower, sync } from './state.js';
import { openSettings } from './ui.js';
import { V, clamp } from './vec.js';

const UP = { x: 0, y: 1, z: 0 };

const EFFECTS = [
  ['strength', 3], ['regeneration', 1], ['fire_resistance', 0], ['water_breathing', 0],
  ['jump_boost', 2], ['saturation', 0], ['haste', 2],
];

export function maintainEffects(player, st, tick) {
  if (tick - st.effectTick < 40) return;
  st.effectTick = tick;
  const list = getSettings().invulnerable ? EFFECTS.concat([['resistance', 4]]) : EFFECTS;
  for (const [id, amp] of list) {
    try { player.addEffect(id, 90, { amplifier: amp, showParticles: false }); } catch (e) { /* */ }
  }
}

function clearEffects(player) {
  for (const [id] of EFFECTS.concat([['resistance', 4], ['slow_falling', 0], ['speed', 0]])) {
    try { player.removeEffect(id); } catch (e) { /* */ }
  }
}

function mainhand(player) {
  try {
    return player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand)?.typeId;
  } catch (e) {
    return undefined;
  }
}

/** Da os itens de poder que estiverem faltando no inventario. */
export function giveItems(player, list) {
  try {
    const inv = player.getComponent('minecraft:inventory')?.container;
    if (!inv) return;
    const have = new Set();
    for (let i = 0; i < inv.size; i++) {
      const it = inv.getItem(i);
      if (it) have.add(it.typeId);
    }
    for (const id of list) if (!have.has(id)) inv.addItem(new ItemStack(id, 1));
  } catch (e) { /* */ }
}

// ---------------------------------------------------------------- uso de itens

export function onItemUse(player, st, id, tick) {
  if (id === ITEM.EMBLEM) {
    if (player.isSneaking) { openSettings(player); return; }
    if (st.power === POW.TRANSFORM || st.power === POW.DETRANSFORM) return;
    if (!st.on) startTransform(player, st);
    else startDetransform(player, st);
    return;
  }
  if (!st.on) {
    actionbar(player, '§cTransforme-se primeiro: use o §eEmblema do Superman§c.');
    return;
  }
  if (st.power === POW.TRANSFORM || st.power === POW.DETRANSFORM) return;
  switch (id) {
    case ITEM.FLIGHT:
      toggleFlight(player, st);
      break;
    case ITEM.HEAT:
      if (st.power === POW.HEAT) stopPower(player, st);
      else beginPower(player, st, POW.HEAT, tick + 20 * 10);
      break;
    case ITEM.FREEZE:
      if (st.power === POW.FREEZE) stopPower(player, st);
      else beginPower(player, st, POW.FREEZE, tick + 20 * 7);
      break;
    case ITEM.PUNCH:
      if (st.power === POW.CHARGE) releasePunch(player, st);
      else beginPower(player, st, POW.CHARGE, tick + 40);
      break;
    case ITEM.IMPACT:
      if (AIR_STATES.has(st.fly) && st.fly !== FLY.DIVE) {
        startDive(player, st);
      } else if (!AIR_STATES.has(st.fly)) {
        beginPower(player, st, player.isSneaking ? POW.SLAM : POW.CLAP, 0);
      }
      break;
    default:
  }
}

function beginPower(player, st, p, timeout) {
  st.charge = 0;
  st.powerTimeout = timeout;
  st.heat.clear();
  setPower(player, st, p);
  if (st.fly === FLY.SPEED) st.fly = FLY.NONE; // poderes interrompem a super velocidade
}

function stopPower(player, st) {
  setPower(player, st, POW.NONE);
  st.charge = 0;
  sync(player, st, 'charge', 0);
}

// ---------------------------------------------------------------- transformacao

function startTransform(player, st) {
  setPower(player, st, POW.TRANSFORM);
}

function startDetransform(player, st) {
  stopAll(player, st);
  setPower(player, st, POW.DETRANSFORM);
}

/** Restaura o estado transformado (ao reentrar no mundo / renascer) sem animacao. */
export function restore(player, st) {
  setOn(player, st, true);
  giveItems(player, POWER_ITEMS);
}

function transformTick(player, st) {
  const t = st.powTicks;
  const dim = player.dimension;
  const c = V.add(player.location, { x: 0, y: 1, z: 0 });
  if (player.isOnGround) {
    try { player.applyKnockback({ x: 0, z: 0 }, 0); } catch (e) { /* */ }
  }
  if (t === 1) {
    sound(dim, 'beacon.power', c, 1, 1.2);
    sound(dim, 'mob.breeze.inhale', c, 0.8, 0.6);
  }
  if (t < 20 && t % 2 === 0) particle(dim, 'superman:transform_gather', c);
  if (t === 10) sound(dim, 'respawn_anchor.charge', c, 1, 1.1);
  if (t > 8 && t < 20 && t % 4 === 0) shake(player, 0.05 + t * 0.006, 0.2);
  if (t === 20) {
    setOn(player, st, true);
    flash(player, 1, 1, 1, 0.05, 0.05, 0.5);
    particle(dim, 'superman:transform_burst', c);
    particle(dim, 'superman:shockwave', V.add(player.location, { x: 0, y: 0.1, z: 0 }), { radius: 6, color: { r: 0.4, g: 0.6, b: 1 } });
    particle(dim, 'superman:shockwave', c, { radius: 4, color: { r: 1, g: 0.3, b: 0.2 } });
    sound(dim, 'item.trident.thunder', c, 0.7, 1.3);
    sound(dim, 'beacon.activate', c, 1, 1);
    sound(dim, 'random.explode', c, 0.4, 1.6);
    shakeArea(dim, c, 12, 0.5, 0.5);
    st.effectTick = -1000;
    maintainEffects(player, st, system.currentTick);
    giveItems(player, POWER_ITEMS);
    try {
      player.onScreenDisplay.setTitle('§9§lSUPERMAN', {
        subtitle: '§7Pulo duplo para voar  §8|  §7itens de poder na barra',
        fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 15,
      });
    } catch (e) { /* */ }
  }
  if (t >= 40) setPower(player, st, POW.NONE);
}

function detransformTick(player, st) {
  const t = st.powTicks;
  const dim = player.dimension;
  const c = V.add(player.location, { x: 0, y: 1, z: 0 });
  if (t === 1) sound(dim, 'beacon.deactivate', c, 1, 1);
  if (t === 12) {
    setOn(player, st, false);
    flash(player, 0.7, 0.8, 1, 0.05, 0.05, 0.4);
    particle(dim, 'superman:transform_burst', c);
    clearEffects(player);
    if (!player.isOnGround) {
      try { player.addEffect('slow_falling', 160, { amplifier: 0, showParticles: false }); } catch (e) { /* */ }
    }
  }
  if (t >= 24) setPower(player, st, POW.NONE);
}

// ---------------------------------------------------------------- visao de calor

const FACE = {
  Up: { x: 0, y: 1, z: 0 }, Down: { x: 0, y: -1, z: 0 }, North: { x: 0, y: 0, z: -1 },
  South: { x: 0, y: 0, z: 1 }, East: { x: 1, y: 0, z: 0 }, West: { x: -1, y: 0, z: 0 },
};

const STONE_RE = /^minecraft:(stone|cobblestone|mossy_cobblestone|deepslate|cobbled_deepslate|granite|diorite|andesite|tuff|netherrack|blackstone|basalt|smooth_basalt|calcite|dripstone_block|end_stone|sandstone|red_sandstone|gravel|.*_bricks|polished_.*|.*_ore)$/;
const FLAMMABLE_RE = /(log|wood|planks|leaves|wool|hay|carpet|bookshelf|stem|hyphae|fence|door|stairs|slab|grass|fern|bush|vine|flower|sapling|crafting_table|scaffolding|target|bed)/;

function heatRule(id) {
  if (STONE_RE.test(id)) return [[16, 'minecraft:magma'], [40, 'minecraft:lava']];
  if (id === 'minecraft:magma') return [[22, 'minecraft:lava']];
  if (id === 'minecraft:sand') return [[10, 'minecraft:glass']];
  if (id === 'minecraft:red_sand') return [[10, 'minecraft:orange_stained_glass']];
  if (/(ice|snow)/.test(id)) return [[6, id.includes('snow_layer') ? 'minecraft:air' : 'minecraft:water']];
  if (/(obsidian)/.test(id)) return [[80, 'minecraft:lava']];
  if (/glass/.test(id)) return [[22, 'break']];
  if (/(dirt|grass_block|podzol|mycelium|mud|clay|path|farmland)/.test(id)) return [[18, 'minecraft:coarse_dirt'], [45, 'minecraft:magma']];
  if (FLAMMABLE_RE.test(id)) return [[5, 'ignite'], [30, 'break']];
  return [[45, 'break']];
}

function heatBlock(player, st, hit) {
  const s = getSettings();
  if (!s.fire && !s.destruction) return;
  const b = hit.block;
  const dim = player.dimension;
  const l = b.location;
  const key = `${l.x},${l.y},${l.z}`;
  const h = (st.heat.get(key) || 0) + 1;
  st.heat.set(key, h);
  if (st.heat.size > 24) st.heat.delete(st.heat.keys().next().value);
  const id = b.typeId;
  if (!isBreakable(id)) return;
  for (const [th, res] of heatRule(id)) {
    if (h !== th) continue;
    const pc = V.center(l);
    if (res === 'ignite') {
      if (!s.fire) continue;
      const off = FACE[hit.face] || UP;
      try {
        const nb = dim.getBlock(V.add(l, off));
        if (nb && nb.isAir) nb.setType('minecraft:fire');
      } catch (e) { /* */ }
      sound(dim, 'fire.ignite', pc, 1, 1);
    } else if (res === 'break') {
      if (!s.destruction) continue;
      breakBlocks(dim, [b], { visible: 1 });
      particle(dim, 'superman:melt_burst', pc);
    } else {
      if (!s.fire) continue;
      try { b.setType(res); } catch (e) { /* */ }
      particle(dim, 'superman:melt_burst', pc);
      sound(dim, 'random.fizz', pc, 0.8, 0.8);
      st.heat.set(key, h);
    }
  }
}

function heatTick(player, st, tick) {
  const t = st.powTicks;
  const dim = player.dimension;
  const head = player.getHeadLocation();
  if (t === 1) sound(dim, 'beacon.ambient', head, 1, 1.8);
  if (t < 7) return; // olhos acendendo (animacao de inicio)
  const dir = player.getViewDirection();
  const side = V.norm(V.cross(dir, UP));
  const range = 48;
  let dist = range;
  let blockHit;
  try {
    blockHit = dim.getBlockFromRay(head, dir, { maxDistance: range, includeLiquidBlocks: false, includePassableBlocks: true });
  } catch (e) { /* */ }
  if (blockHit) dist = V.dist(head, V.add(blockHit.block.location, blockHit.faceLocation));
  let ent;
  try {
    const list = dim.getEntitiesFromRay(head, dir, { maxDistance: dist })
      .filter((h) => h.entity.id !== player.id && h.entity.typeId !== 'minecraft:item' && h.entity.typeId !== 'minecraft:xp_orb')
      .sort((a, b) => a.distance - b.distance);
    ent = list[0];
  } catch (e) { /* */ }
  if (ent) dist = ent.distance;
  const hitPoint = V.add(head, V.mul(dir, dist));
  for (const sgn of [1, -1]) {
    const eye = V.add(V.add(head, V.mul(side, 0.13 * sgn)), V.add(V.mul(dir, 0.3), { x: 0, y: -0.04, z: 0 }));
    particle(dim, 'superman:heat_beam', eye, { dir, len: Math.max(0.5, dist - 0.3) });
    if (t % 2 === 0) particle(dim, 'superman:eye_glow', eye);
  }
  particle(dim, 'superman:heat_impact', V.sub(hitPoint, V.mul(dir, 0.15)));
  if (t % 8 === 0) sound(dim, 'fire.fire', hitPoint, 1.4, 1.3);
  if (t % 14 === 0) sound(dim, 'mob.blaze.breathe', head, 0.6, 1.6);
  if (t % 20 === 0) shake(player, 0.06, 0.4);
  if (ent && t % 4 === 0) {
    try {
      ent.entity.setOnFire(5, true);
      ent.entity.applyDamage(4, { cause: EntityDamageCause.fire, damagingEntity: player });
    } catch (e) { /* */ }
  } else if (blockHit) {
    heatBlock(player, st, blockHit);
  }
}

// ---------------------------------------------------------------- sopro congelante

function freezeTick(player, st, tick) {
  const t = st.powTicks;
  const dim = player.dimension;
  const head = player.getHeadLocation();
  if (t === 1) sound(dim, 'mob.breeze.inhale', head, 1, 0.7);
  if (t < 12) {
    if (t % 2 === 0) particle(dim, 'superman:inhale', head);
    return;
  }
  const dir = player.getViewDirection();
  const mouth = V.add(V.add(head, V.mul(dir, 0.35)), { x: 0, y: -0.18, z: 0 });
  particle(dim, 'superman:frost_breath', mouth, { dir });
  if (t % 10 === 0) sound(dim, 'mob.breeze.idle_air', mouth, 1, 0.6);
  if (t % 6 === 0) sound(dim, 'mob.player.hurt_freeze', mouth, 0.3, 1.6);
  const range = 14;
  // entidades no cone
  try {
    for (const e of dim.getEntities({ location: mouth, maxDistance: range })) {
      if (e.id === player.id || e.typeId === 'minecraft:item' || e.typeId === 'minecraft:xp_orb') continue;
      const rel = V.sub(V.add(e.location, { x: 0, y: 0.8, z: 0 }), mouth);
      const d = V.len(rel);
      if (d < 0.1 || V.dot(V.norm(rel), dir) < Math.cos((26 * Math.PI) / 180)) continue;
      try {
        e.addEffect('slowness', 70, { amplifier: 4, showParticles: false });
        e.extinguishFire(true);
        if (t % 5 === 0) e.applyDamage(1.5, { cause: EntityDamageCause.freezing, damagingEntity: player });
        e.applyKnockback({ x: dir.x * 0.25, z: dir.z * 0.25 }, 0.05);
      } catch (err) { /* */ }
      if (t % 3 === 0) particle(dim, 'superman:frost_hit', V.add(e.location, { x: 0, y: 1, z: 0 }));
    }
  } catch (e) { /* */ }
  // blocos: raios aleatorios dentro do cone
  const s = getSettings();
  for (let i = 0; i < q(5); i++) {
    const rd = V.cone(dir, 20);
    let hit;
    try {
      hit = dim.getBlockFromRay(mouth, rd, { maxDistance: range, includeLiquidBlocks: true, includePassableBlocks: true });
    } catch (e) { /* */ }
    if (!hit) continue;
    const b = hit.block;
    const id = b.typeId;
    const pc = V.add(b.location, hit.faceLocation);
    try {
      if (id === 'minecraft:water' || id === 'minecraft:flowing_water') {
        b.setType('minecraft:ice');
        particle(dim, 'superman:frost_hit', pc);
      } else if (id === 'minecraft:lava' || id === 'minecraft:flowing_lava') {
        b.setType('minecraft:obsidian');
        particle(dim, 'superman:melt_burst', pc);
        sound(dim, 'random.fizz', pc, 1, 1);
      } else if (id === 'minecraft:fire' || id === 'minecraft:soul_fire') {
        b.setType('minecraft:air');
        sound(dim, 'random.fizz', pc, 0.6, 1.4);
      } else if (id === 'minecraft:magma') {
        b.setType('minecraft:stone');
        sound(dim, 'random.fizz', pc, 0.6, 1.2);
      } else if (s.destruction && hit.face === 'Up' && Math.random() < 0.35 && !b.isAir && !isFragile(id)) {
        const above = dim.getBlock(V.add(b.location, UP));
        if (above && above.isAir) above.setType('minecraft:snow_layer');
      }
    } catch (e) { /* */ }
  }
}

// ---------------------------------------------------------------- super soco

function chargeTick(player, st) {
  const t = st.powTicks;
  const dim = player.dimension;
  st.charge = Math.min(1, t / 30);
  sync(player, st, 'charge', Math.round(st.charge * 20) / 20);
  const look = player.getViewDirection();
  const { fwd, right } = V.basis(look);
  const fist = V.add(player.location, V.add(V.add(V.mul(right, 0.45), V.mul(fwd, -0.35)), { x: 0, y: 1.05, z: 0 }));
  if (t % 2 === 0) particle(dim, 'superman:charge_energy', fist, { power: st.charge });
  if (t === 1) sound(dim, 'crossbow.quick_charge.start', fist, 1, 0.8);
  if (t === 12) sound(dim, 'crossbow.quick_charge.middle', fist, 1, 0.8);
  if (t === 26) sound(dim, 'crossbow.quick_charge.end', fist, 1, 0.8);
  if (t === 30) { sound(dim, 'respawn_anchor.charge', fist, 1, 1.4); shake(player, 0.15, 0.3); }
  if (t > 30 && t % 6 === 0) shake(player, 0.06, 0.2);
  if (t >= 40) releasePunch(player, st);
}

function releasePunch(player, st) {
  st.punchCharge = Math.max(0.15, st.charge);
  setPower(player, st, POW.PUNCH);
  st.charge = 0;
}

function punchImpact(player, st) {
  const c = st.punchCharge || 0.3;
  sync(player, st, 'charge', 0);
  const dim = player.dimension;
  const origin = player.getHeadLocation();
  const dir = player.getViewDirection();
  const range = 3.5 + 9 * c;
  const fistPos = V.add(V.add(origin, V.mul(dir, 1.3)), { x: 0, y: -0.3, z: 0 });
  // entidades no caminho do soco
  try {
    const mid = V.add(origin, V.mul(dir, range / 2));
    for (const e of dim.getEntities({ location: mid, maxDistance: range / 2 + 2.5 })) {
      if (e.id === player.id || e.typeId === 'minecraft:item' || e.typeId === 'minecraft:xp_orb') continue;
      const rel = V.sub(V.add(e.location, { x: 0, y: 0.9, z: 0 }), origin);
      const along = V.dot(rel, dir);
      if (along < 0 || along > range + 1.5) continue;
      if (V.len(V.sub(rel, V.mul(dir, along))) > 1.6 + c) continue;
      try {
        e.applyDamage(8 + 24 * c, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
        e.applyKnockback({ x: dir.x * (1.6 + 4.2 * c), z: dir.z * (1.6 + 4.2 * c) }, 0.35 + 0.9 * c + Math.max(0, dir.y) * 2);
      } catch (err) { /* */ }
      particle(dim, 'superman:punch_impact', V.add(e.location, { x: 0, y: 1, z: 0 }));
    }
  } catch (e) { /* */ }
  // cenario
  let hit;
  try { hit = dim.getBlockFromRay(origin, dir, { maxDistance: range, includeLiquidBlocks: false, includePassableBlocks: false }); } catch (e) { /* */ }
  if (hit) {
    const hp = V.add(hit.block.location, hit.faceLocation);
    const hd = V.dist(origin, hp);
    blast(dim, hp, 1.2 + 2.6 * c, player);
    particle(dim, 'superman:debris_burst', hp, { color: debrisColor(hit.block.typeId) });
    if (getSettings().destruction && c > 0.4) {
      for (let d = hd + 1.2; d <= range + 2 * c; d += 1.4) {
        breakSphere(dim, V.add(origin, V.mul(dir, d)), 1.0 + 1.3 * c, { visible: 3, max: 30 });
      }
    }
  }
  particle(dim, 'superman:sonic_boom', fistPos, { dir, radius: 1 + 2.5 * c });
  particle(dim, 'superman:punch_wave', fistPos, { dir, power: c });
  sound(dim, 'game.player.attack.strong', fistPos, 1, 0.8);
  sound(dim, 'random.explode', fistPos, 0.5 + 0.6 * c, 1.3 - 0.4 * c);
  if (c > 0.5) sound(dim, 'mob.warden.sonic_boom', fistPos, 0.6 + 0.6 * c, 1.2);
  shake(player, 0.2 + 0.8 * c, 0.35 + 0.3 * c);
  shakeArea(dim, fistPos, 16, 0.4 * c, 0.4);
}

// ---------------------------------------------------------------- palma trovao e pancada no chao

function clapImpact(player, st) {
  const dim = player.dimension;
  const look = player.getViewDirection();
  const { fwd } = V.basis(look);
  const center = V.add(player.location, V.add(V.mul(fwd, 1.1), { x: 0, y: 1.3, z: 0 }));
  particle(dim, 'superman:clap_wave', center, { dir: fwd });
  particle(dim, 'superman:sonic_boom', center, { dir: fwd, radius: 5 });
  particle(dim, 'superman:shockwave', V.add(player.location, { x: 0, y: 0.1, z: 0 }), { radius: 9, color: { r: 0.95, g: 0.97, b: 1 } });
  sound(dim, 'mob.warden.sonic_boom', center, 1.4, 1.1);
  sound(dim, 'ambient.weather.thunder', center, 0.6, 1.4);
  sound(dim, 'random.explode', center, 0.7, 1.3);
  shakeArea(dim, center, 20, 0.7, 0.6);
  try {
    for (const e of dim.getEntities({ location: center, maxDistance: 16 })) {
      if (e.id === player.id || e.typeId === 'minecraft:item' || e.typeId === 'minecraft:xp_orb') continue;
      const rel = V.sub(e.location, player.location);
      const h = V.norm({ x: rel.x, y: 0, z: rel.z });
      if (V.dot(h, fwd) < 0.15) continue;
      const f = 1 - Math.min(1, V.len(rel) / 16) * 0.7;
      try {
        e.applyKnockback({ x: h.x * 3.2 * f, z: h.z * 3.2 * f }, 0.55 * f);
        e.applyDamage(6 * f, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
      } catch (err) { /* */ }
    }
  } catch (e) { /* */ }
  if (getSettings().destruction) {
    const blocks = sphereBlocks(dim, V.add(center, V.mul(fwd, 4)), 6.5, isFragile);
    breakBlocks(dim, blocks, { visible: 14, max: 120 });
  }
}

function slamImpact(player, st) {
  const dim = player.dimension;
  const look = player.getViewDirection();
  const { fwd } = V.basis(look);
  const p = V.add(player.location, V.add(V.mul(fwd, 1.3), { x: 0, y: -0.4, z: 0 }));
  blast(dim, p, 3.2, player);
  particle(dim, 'superman:shockwave', V.add(p, { x: 0, y: 0.5, z: 0 }), { radius: 12, color: { r: 1, g: 1, b: 1 } });
  particle(dim, 'superman:shockwave', V.add(p, { x: 0, y: 0.5, z: 0 }), { radius: 6, color: { r: 1, g: 0.8, b: 0.55 } });
  particle(dim, 'superman:dust_ring', V.add(p, { x: 0, y: 0.5, z: 0 }), { radius: 5 });
  particle(dim, 'superman:ground_crack', { x: p.x, y: Math.floor(player.location.y) + 0.06, z: p.z }, { radius: 3.5 });
  for (let i = 0; i < q(4); i++) particle(dim, 'superman:debris_burst', V.add(p, { x: 0, y: 0.6, z: 0 }), { color: { r: 0.5, g: 0.45, b: 0.4 } });
  sound(dim, 'mace.heavy_smash_ground', p, 2, 0.6);
  sound(dim, 'mob.warden.sonic_boom', p, 1, 0.8);
  shakeArea(dim, p, 26, 1.1, 0.8);
  try {
    for (const e of dim.getEntities({ location: p, maxDistance: 10 })) {
      if (e.id === player.id || e.typeId === 'minecraft:item' || e.typeId === 'minecraft:xp_orb') continue;
      const rel = V.sub(e.location, p);
      const h = V.norm({ x: rel.x, y: 0, z: rel.z });
      const f = 1 - Math.min(1, V.len(rel) / 10) * 0.6;
      try {
        e.applyKnockback({ x: h.x * 1.2 * f, z: h.z * 1.2 * f }, 1.2 * f);
        e.applyDamage(9 * f, { cause: EntityDamageCause.entityAttack, damagingEntity: player });
      } catch (err) { /* */ }
    }
  } catch (e) { /* */ }
}

// ---------------------------------------------------------------- combos corpo a corpo

export function onMeleeHit(player, st, target, tick) {
  if (!st.on) return;
  const busy = st.power !== POW.NONE && !(st.power >= POW.COMBO1 && st.power <= POW.COMBO3);
  st.combo = tick - st.lastHitTick < 24 ? (st.combo % 3) + 1 : 1;
  st.lastHitTick = tick;
  if (!busy) {
    setPower(player, st, POW.COMBO1 + st.combo - 1);
    st.powerTimeout = tick + (st.combo === 3 ? 10 : 7);
  }
  const dim = player.dimension;
  try {
    const rel = V.sub(target.location, player.location);
    const h = V.norm({ x: rel.x, y: 0, z: rel.z });
    const k = [1.8, 2.2, 1.0][st.combo - 1];
    const up = [0.35, 0.45, 1.5][st.combo - 1];
    target.applyKnockback({ x: h.x * k, z: h.z * k }, up);
    const hp = V.add(target.location, { x: 0, y: 1, z: 0 });
    particle(dim, 'superman:punch_impact', hp);
    sound(dim, 'game.player.attack.strong', hp, 1, 0.7 + st.combo * 0.1);
    if (st.combo === 3) {
      sound(dim, 'mace.smash_air', hp, 1, 1);
      particle(dim, 'superman:sonic_boom', hp, { dir: { x: h.x * 0.3, y: 0.95, z: h.z * 0.3 }, radius: 1.6 });
    }
    shake(player, 0.08 + st.combo * 0.06, 0.2);
  } catch (e) { /* */ }
}

/** Super forca: socos quebram blocos instantaneamente. */
export function onBlockPunch(player, st, block) {
  if (!st.on || !getSettings().punchBreak) return;
  const hand = mainhand(player);
  if (hand && !hand.startsWith('superman:')) return;
  try {
    if (player.getGameMode() === GameMode.Creative) return;
  } catch (e) { /* */ }
  const dim = player.dimension;
  const id = block.typeId;
  if (!isBreakable(id)) return;
  breakBlocks(dim, [block], { visible: 1, force: true });
  particle(dim, 'superman:debris_burst', V.center(block.location), { color: debrisColor(id) });
}

// ---------------------------------------------------------------- tick dos poderes

export function updatePowers(player, st, inp, tick) {
  if (st.power === POW.NONE) return;
  st.powTicks++;
  const hand = mainhand(player);
  switch (st.power) {
    case POW.TRANSFORM:
      transformTick(player, st);
      break;
    case POW.DETRANSFORM:
      detransformTick(player, st);
      break;
    case POW.HEAT:
      if (hand !== ITEM.HEAT || tick > st.powerTimeout) stopPower(player, st);
      else heatTick(player, st, tick);
      break;
    case POW.FREEZE:
      if (hand !== ITEM.FREEZE || tick > st.powerTimeout) stopPower(player, st);
      else freezeTick(player, st, tick);
      break;
    case POW.CHARGE:
      if (hand !== ITEM.PUNCH) stopPower(player, st);
      else chargeTick(player, st);
      break;
    case POW.PUNCH:
      if (st.powTicks === 3) punchImpact(player, st);
      if (st.powTicks >= 14) setPower(player, st, POW.NONE);
      break;
    case POW.CLAP:
      if (st.powTicks === 9) clapImpact(player, st);
      if (st.powTicks >= 20) setPower(player, st, POW.NONE);
      break;
    case POW.SLAM:
      if (st.powTicks === 11) slamImpact(player, st);
      if (st.powTicks >= 24) setPower(player, st, POW.NONE);
      break;
    default:
      if (tick >= st.powerTimeout) setPower(player, st, POW.NONE);
  }
}

export const POWER_NAMES = {
  [POW.HEAT]: '§cVisão de calor', [POW.FREEZE]: '§bSopro congelante', [POW.CHARGE]: '§6Carregando soco',
  [POW.PUNCH]: '§6Super soco', [POW.CLAP]: '§fPalma trovão', [POW.SLAM]: '§fPancada no chão',
};
