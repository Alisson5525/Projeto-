import { EquipmentSlot, GameMode } from '@minecraft/server';
import { AIR_STATES, CLOUD_Y, FLY, MACH2, PHYS, POW, ROLL_STATES, getSettings } from './config.js';
import { blast, breakSphere, debrisColor, debrisKind, groundColor, isFragile, waveBreak } from './destruction.js';
import { flashArea, later, particle, q, ringBurst, shake, shakeArea, sound } from './fx.js';
import { setFly, sync } from './state.js';
import { pushMobs } from './targets.js';
import { V, clamp } from './vec.js';

const UP = { x: 0, y: 1, z: 0 };

function applyVel(player, v) {
  try {
    player.applyKnockback({ x: v.x, z: v.z }, v.y);
  } catch (e) { /* jogador invalido */ }
}

function effect(player, id, dur, amp) {
  try {
    player.addEffect(id, dur, { amplifier: amp, showParticles: false });
  } catch (e) { /* */ }
}

/** Distancia ate o chao abaixo dos pes (undefined se nao houver ate maxDist). */
function groundDist(player, maxDist) {
  try {
    const l = player.location;
    const hit = player.dimension.getBlockFromRay({ x: l.x, y: l.y + 0.05, z: l.z }, { x: 0, y: -1, z: 0 }, {
      maxDistance: maxDist, includeLiquidBlocks: true, includePassableBlocks: false,
    });
    if (!hit) return undefined;
    return l.y - (hit.block.location.y + hit.faceLocation.y);
  } catch (e) {
    return undefined;
  }
}

function feet(player) {
  const l = player.location;
  return { x: l.x, y: l.y + 0.05, z: l.z };
}

/** Situacoes em que o voo do heroi fica desligado (elitro, montaria, espectador). */
function flightBlocked(player) {
  try {
    if (player.isGliding) return true;
    if (player.getComponent('minecraft:riding')) return true;
    if (player.getGameMode() === GameMode.Spectator) return true;
  } catch (e) { /* */ }
  return false;
}

function wearsElytra(player) {
  try {
    return player.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Chest)?.typeId === 'minecraft:elytra';
  } catch (e) {
    return false;
  }
}

/** Zera o voo (troca de dimensao, morte, teleporte). */
export function resetFlight(player, st) {
  setFly(player, st, FLY.NONE);
  st.fastTicks = 0;
  st.mach2 = false;
  st.vel = V.zero();
  st.prevLoc = undefined;
  st.meas = undefined;
  st.tunnelSeen.clear();
}

// ---------------------------------------------------------------- entradas publicas

/** Item "Voo" ou comandos externos. */
export function toggleFlight(player, st) {
  if (AIR_STATES.has(st.fly)) {
    if (st.fly === FLY.LANDPREP) setFly(player, st, FLY.HOVER);
    else setFly(player, st, FLY.LANDPREP);
    return;
  }
  if (player.isOnGround) {
    st.charge = 0;
    st.autoLaunch = true;
    setFly(player, st, FLY.CHARGE);
  } else {
    startAir(player, st);
  }
}

export function startDive(player, st) {
  setFly(player, st, FLY.DIVE);
  st.vel = V.add(st.vel, { x: 0, y: -0.8, z: 0 });
  sound(player.dimension, 'mob.warden.sonic_charge', player.location, 1, 1.4);
  sound(player.dimension, 'item.trident.riptide_3', player.location, 1, 0.8);
}

export function stopAll(player, st) {
  if (AIR_STATES.has(st.fly) && !player.isOnGround) effect(player, 'slow_falling', 160, 0);
  setFly(player, st, FLY.NONE);
  st.vel = V.zero();
  st.charge = 0;
  sync(player, st, 'charge', 0);
}

function startAir(player, st) {
  setFly(player, st, FLY.AIRSTART);
  const v = player.getVelocity();
  st.vel = { x: v.x * 0.5, y: 0.5, z: v.z * 0.5 };
  const dim = player.dimension;
  sound(dim, 'mob.enderdragon.flap', player.location, 0.8, 1.4);
  sound(dim, 'wind_charge.burst', player.location, 0.5, 1.3);
  particle(dim, 'superman:shockwave', feet(player), { radius: 2.5, color: { r: 0.9, g: 0.95, b: 1 } });
}

function launch(player, st) {
  const c = clamp(st.charge, 0.25, 1);
  const dim = player.dimension;
  const f = feet(player);
  setFly(player, st, FLY.LAUNCH);
  st.vel = { x: 0, y: 1.3 + 1.4 * c, z: 0 };
  st.charge = 0;
  st.autoLaunch = false;
  sync(player, st, 'charge', 0);
  // efeitos no chao
  ringBurst(dim, f, [3 + 6 * c, 5 + 9 * c], { r: 1, g: 0.95, b: 0.85 }, 3);
  particle(dim, 'superman:impact_flash', V.add(f, { x: 0, y: 0.5, z: 0 }), { radius: 2 + 2 * c });
  const gc = groundColor(dim, f);
  particle(dim, c > 0.5 ? 'superman:dust_wall' : 'superman:dust_ring', f, { radius: 2 + 3 * c, color: gc });
  particle(dim, 'superman:debris_burst', f, { color: gc, scale: 0.8 + c * 0.6 });
  particle(dim, 'superman:ground_crack', { x: f.x, y: Math.floor(f.y) + 0.06, z: f.z }, { radius: 1.5 + 2.5 * c });
  sound(dim, 'mace.heavy_smash_ground', f, 1.5, 0.8);
  sound(dim, 'item.trident.riptide_3', f, 1, 1.1);
  if (c > 0.6) sound(dim, 'mob.warden.sonic_boom', f, 0.8, 1.2);
  shakeArea(dim, f, 18, 0.35 + 0.6 * c, 0.5);
  if (getSettings().destruction) {
    if (c > 0.4) blast(dim, { x: f.x, y: f.y - 0.6, z: f.z }, 1.5 + 3 * c, player);
    else waveBreak(dim, f, 3.5, { filter: isFragile, speed: 1.2, visible: 6 });
  }
  pushMobs(player, f, 3 + 4 * c, 1 + 1.5 * c, 0.5 + 0.5 * c, 2 + 6 * c);
}

function softLand(player, st) {
  setFly(player, st, FLY.LANDSOFT);
  st.vel = V.zero();
  applyVel(player, st.vel);
  const dim = player.dimension;
  particle(dim, 'superman:dust_ring', feet(player), { radius: 1.6, color: groundColor(dim, feet(player)) });
  sound(dim, 'mob.breeze.land', player.location, 1, 0.8);
}

function heroLand(player, st, speed) {
  setFly(player, st, FLY.LANDHERO);
  const dim = player.dimension;
  const f = feet(player);
  const r = clamp(2 + speed * 2, 3, 9);
  st.vel = V.zero();
  applyVel(player, st.vel);
  ringBurst(dim, f, [r * 1.4, r * 2.2, r * 3], { r: 1, g: 0.9, b: 0.7 }, 3);
  particle(dim, 'superman:impact_flash', V.add(f, { x: 0, y: 0.8, z: 0 }), { radius: 2 + r * 0.5 });
  const gc = groundColor(dim, f);
  particle(dim, 'superman:dust_wall', f, { radius: r * 1.5, color: gc });
  later(6, () => particle(dim, 'superman:rising_debris', f, { radius: r, color: gc }));
  particle(dim, 'superman:sparks', f, { count: 8 + Math.round(r * 2) });
  if (speed > 1.4) flashArea(dim, f, 14, 0.6);
  particle(dim, 'superman:ground_crack', { x: f.x, y: Math.floor(f.y) + 0.06, z: f.z }, { radius: r });
  for (let i = 0; i < q(4); i++) particle(dim, 'superman:debris_burst', f, { color: gc, scale: 1 + r * 0.08 });
  sound(dim, 'mace.heavy_smash_ground', f, 2, 0.7);
  sound(dim, 'random.explode', f, 1, 0.8);
  if (speed > 1.4) sound(dim, 'mob.warden.sonic_boom', f, 1, 0.9);
  shakeArea(dim, f, 28, 0.5 + speed * 0.4, 0.9);
  if (getSettings().destruction && speed > 0.8) blast(dim, { x: f.x, y: f.y - 0.8, z: f.z }, r * 0.8, player);
  else blast(dim, f, r * 0.6, player, { noBlocks: true });
  pushMobs(player, f, r * 2.4, 2.4, 0.9, 6);
}

function goFast(player, st) {
  setFly(player, st, FLY.FAST);
  const dim = player.dimension;
  const l = player.location;
  const dir = player.getViewDirection();
  const mid = V.add(l, { x: 0, y: 0.9, z: 0 });
  particle(dim, 'superman:vapor_cone', mid, { dir });
  particle(dim, 'superman:impact_flash', mid, { radius: 2.5 });
  for (let i = 0; i < 3; i++) later(i * 2 + 1, () => particle(dim, 'superman:sonic_boom', V.sub(mid, V.mul(dir, i * 1.5)), { dir, radius: 3 + i * 1.5 }));
  particle(dim, 'superman:shockwave', mid, { radius: 6, color: { r: 0.85, g: 0.92, b: 1 } });
  sound(dim, 'mob.warden.sonic_boom', l, 1.2, 1.1);
  sound(dim, 'item.trident.riptide_3', l, 1, 1.3);
  shake(player, 0.6, 0.4);
  // o estrondo supersonico estilhaca vidros, folhas e plantas ao redor (em onda)
  waveBreak(dim, l, 8, { filter: isFragile, speed: 2, visible: 4, max: 160 });
}

/** Giro de esquiva: toque duplo para o lado durante o voo. */
function startRoll(player, st, side, look, tick) {
  const fast = st.fly === FLY.FAST;
  st.rollFrom = st.fly;
  setFly(player, st, side > 0 ? (fast ? FLY.ROLL_RF : FLY.ROLL_R) : (fast ? FLY.ROLL_LF : FLY.ROLL_L));
  st.rollSide = V.mul(V.basis(look).right, side);
  st.rollReadyAt = tick + 18;
  const dim = player.dimension;
  const mid = V.add(player.location, { x: 0, y: 0.9, z: 0 });
  particle(dim, 'superman:roll_swirl', mid, { dir: look });
  particle(dim, 'superman:sonic_boom', mid, { dir: look, radius: 1.6 });
  sound(dim, 'mob.phantom.swoop', mid, 1, 1.3);
  sound(dim, 'item.trident.riptide_1', mid, 0.7, 1.5);
}

/** Depois de alguns segundos no supersonico, o heroi rompe a segunda barreira (Mach 2). */
function machTwo(player, st, look) {
  st.mach2 = true;
  const dim = player.dimension;
  const mid = V.add(player.location, { x: 0, y: 0.9, z: 0 });
  particle(dim, 'superman:vapor_cone', mid, { dir: look });
  particle(dim, 'superman:impact_flash', mid, { radius: 3.5 });
  for (let i = 0; i < 4; i++) later(i * 2, () => particle(dim, 'superman:sonic_boom', V.sub(mid, V.mul(look, i * 2)), { dir: look, radius: 4 + i * 2 }));
  ringBurst(dim, mid, [6, 10], { r: 0.85, g: 0.92, b: 1 }, 3);
  sound(dim, 'mob.warden.sonic_boom', mid, 1.6, 0.8);
  sound(dim, 'firework.blast', mid, 1.2, 0.6);
  flashArea(dim, mid, 10, 0.35);
  shakeArea(dim, mid, 30, 0.7, 0.5);
  if (getSettings().destruction) waveBreak(dim, mid, 10, { filter: isFragile, speed: 2.5, visible: 4, max: 200 });
}

/** Efeitos do ambiente durante o voo: rastro na agua e no chao, nuvens, mergulho na agua, condensacao. */
function flightFx(player, st, tick, speed, look) {
  const dim = player.dimension;
  const s = getSettings();
  const l = player.location;
  const mid = V.add(l, { x: 0, y: 0.9, z: 0 });
  const rolling = ROLL_STATES.has(st.fly);
  const fastish = st.fly === FLY.FAST || st.fly === FLY.ROLL_LF || st.fly === FLY.ROLL_RF;
  const moving = fastish || rolling || st.fly === FLY.FLY;
  const hv = Math.hypot(st.vel.x, st.vel.z);

  // entrar e sair da agua: respingo grande; dentro dela, bolhas
  let inWater = false;
  try { inWater = player.isInWater; } catch (e) { /* */ }
  if (inWater !== st.inWater && speed > 0.35) {
    const p = Math.min(2, 0.5 + speed * 0.6);
    particle(dim, 'superman:water_splash', l, { power: p });
    particle(dim, 'superman:water_foam', l, { power: p });
    particle(dim, 'superman:shockwave', V.add(l, { x: 0, y: 0.2, z: 0 }), { radius: 2 + p * 2, color: { r: 0.8, g: 0.92, b: 1 } });
    sound(dim, 'random.splash', l, 0.6 + p * 0.3, 0.8);
  }
  st.inWater = inWater;
  if (inWater && speed > 0.3 && tick % 2 === 0) particle(dim, 'superman:bubbles', mid);

  // rastro na superficie embaixo do heroi (agua ou chao), mais forte quanto mais baixo e mais rapido
  if (moving && hv > 0.3 && !inWater) {
    let hit;
    try {
      hit = dim.getBlockFromRay({ x: l.x, y: l.y + 0.05, z: l.z }, { x: 0, y: -1, z: 0 }, {
        maxDistance: 7, includeLiquidBlocks: true, includePassableBlocks: false,
      });
    } catch (e) { /* */ }
    if (hit) {
      const id = hit.block.typeId;
      const top = hit.block.location.y + 1;
      const h = l.y - top;
      const k = clamp((7 - h) / 7, 0, 1) * clamp(hv / 0.9, 0.3, 1.8);
      const surf = { x: l.x, y: top + 0.05, z: l.z };
      const dir = V.norm({ x: st.vel.x, y: 0, z: st.vel.z });
      if (id.includes('water')) {
        if (k > 0.1) particle(dim, 'superman:water_spray', surf, { dir, power: k });
        if (tick % 2 === 0) particle(dim, 'superman:water_foam', surf, { power: k });
        if (fastish && h < 3 && tick % 6 === 0) sound(dim, 'random.splash', surf, 0.35, 1.3);
      } else if (k > 0.15 && tick % 2 === 0) {
        const kind = debrisKind(id);
        particle(dim, 'superman:ground_wake', surf, { dir, power: k, color: kind === 'turf' ? { r: 0.47, g: 0.33, b: 0.22 } : debrisColor(id) });
        if ((kind === 'turf' || kind === 'leaf') && tick % 4 === 0) particle(dim, 'superman:leaf_bits', surf, { color: debrisColor(id), count: 2 });
        // rasante supersonico corta a vegetacao embaixo
        if (fastish && h < 2.2 && s.destruction) breakSphere(dim, V.add(surf, { x: 0, y: 0.5, z: 0 }), 1.6, { filter: isFragile, visible: 2, max: 10 });
      }
    }
  }

  // camada de nuvens: atravessar levanta nuvens; dentro dela, o heroi rasga a nuvem
  if (dim.id === 'minecraft:overworld' && speed > 0.3) {
    const dy = l.y - CLOUD_Y;
    if (Math.abs(dy) < 4 && tick % 2 === 0) particle(dim, 'superman:cloud_puff', mid, { count: fastish ? 4 : 2 });
    const side = Math.sign(dy) || 1;
    if (st.cloudSide && side !== st.cloudSide && speed > 0.5) {
      particle(dim, 'superman:cloud_puff', mid, { count: 16 });
      particle(dim, 'superman:shockwave', mid, { radius: 6, color: { r: 1, g: 1, b: 1 } });
      sound(dim, 'wind_charge.burst', mid, 1, 0.7);
    }
    st.cloudSide = side;
  }

  // supersonico: linhas de velocidade e dois rastros de condensacao atras das botas
  if (fastish && speed > 0.8) {
    particle(dim, 'superman:speed_lines', V.add(mid, V.mul(look, 7)), { dir: look, count: q(st.mach2 ? 9 : 6) });
    const vd = V.norm(st.vel);
    let side = V.cross(vd, UP);
    side = V.len(side) < 0.2 ? V.basis(look).right : V.norm(side);
    const tail = V.sub(mid, V.mul(vd, 1.1));
    for (const sg of [-1, 1]) particle(dim, 'superman:contrail', V.add(tail, V.mul(side, 0.32 * sg)), { dir: vd, len: speed });
  }
}

// ---------------------------------------------------------------- tick

export function updateFlight(player, st, inp, tick) {
  const onGround = player.isOnGround;
  st.flyTicks++;
  // velocidade real medida pelo deslocamento entre ticks
  const loc = player.location;
  if (st.prevLoc) st.meas = V.sub(loc, st.prevLoc);
  st.prevLoc = { x: loc.x, y: loc.y, z: loc.z };
  if (onGround) { st.groundTicks++; st.airTicks = 0; } else { st.airTicks++; st.groundTicks = 0; }
  const jumpEdge = st.jumpEdge;
  st.jumpEdge = false;

  let creativeFly = false;
  try { creativeFly = player.isFlying; } catch (e) { /* */ }
  if (creativeFly || flightBlocked(player)) {
    if (st.fly !== FLY.NONE) resetFlight(player, st);
    return;
  }

  switch (st.fly) {
    case FLY.NONE:
    case FLY.SPEED:
      groundTick(player, st, inp, onGround, jumpEdge);
      break;
    case FLY.CHARGE:
      chargeTick(player, st, inp, onGround, jumpEdge);
      break;
    case FLY.LAUNCH:
      launchTick(player, st, inp);
      break;
    case FLY.AIRSTART:
      airstartTick(player, st, inp);
      break;
    case FLY.LANDSOFT:
      if (st.flyTicks < 5) applyVel(player, { x: 0, y: -0.15, z: 0 });
      if (st.flyTicks >= 16) setFly(player, st, FLY.NONE);
      break;
    case FLY.LANDHERO:
      landHeroTick(player, st);
      break;
    default:
      airTick(player, st, inp, onGround, jumpEdge, tick);
  }
}

function groundTick(player, st, inp, onGround, jumpEdge) {
  const dim = player.dimension;
  // super velocidade: correr transformado
  const keepSpeed = st.fly === FLY.SPEED && inp.sprint && st.power === POW.NONE;
  if ((onGround && inp.sprint && st.power === POW.NONE && !player.isInWater) || keepSpeed) {
    if (st.fly !== FLY.SPEED) {
      setFly(player, st, FLY.SPEED);
      sound(dim, 'item.trident.riptide_1', player.location, 0.8, 1.6);
      particle(dim, 'superman:dust_ring', feet(player), { radius: 1.5, color: groundColor(dim, feet(player)) });
    }
    if (st.flyTicks % 4 === 0) effect(player, 'speed', 10, 7);
    const v = player.getVelocity();
    const back = V.sub(feet(player), V.mul(V.norm({ x: v.x, y: 0, z: v.z }), 0.6));
    particle(dim, 'superman:speed_dust', back);
    if (st.flyTicks % 2 === 0) particle(dim, 'superman:speed_trail', V.add(player.location, { x: 0, y: 1, z: 0 }), { dir: V.norm(v) });
    if (getSettings().destruction && st.flyTicks % 2 === 0) {
      const ahead = V.add(player.location, V.add(V.mul(V.norm({ x: v.x, y: 0, z: v.z }), 1.6), { x: 0, y: 1, z: 0 }));
      breakSphere(dim, ahead, 1.5, { filter: isFragile, visible: 4, max: 12 });
    }
  } else if (st.fly === FLY.SPEED) {
    setFly(player, st, FLY.NONE);
    try { player.removeEffect('speed'); } catch (e) { /* */ }
  }

  // segurar agachar parado no chao = carregar a decolagem
  if (onGround && inp.sneak && inp.fwd === 0 && inp.right === 0 && st.power === POW.NONE) {
    st.sneakTicks++;
    if (st.sneakTicks >= 10) {
      st.charge = 0;
      st.autoLaunch = false;
      setFly(player, st, FLY.CHARGE);
    }
  } else {
    st.sneakTicks = 0;
  }

  // pulo duplo (pular de novo no ar) = comecar a voar (com elitro o pulo no ar e do elitro)
  if (!onGround && jumpEdge && st.airTicks >= 2 && st.power !== POW.TRANSFORM && !wearsElytra(player)) startAir(player, st);
}

function chargeTick(player, st, inp, onGround, jumpEdge) {
  const dim = player.dimension;
  const f = feet(player);
  const prev = st.charge;
  st.charge = Math.min(1, st.charge + (st.autoLaunch ? 1 / 14 : 1 / 30));
  sync(player, st, 'charge', Math.round(st.charge * 20) / 20);
  applyVel(player, { x: 0, y: -0.08, z: 0 });
  if (st.flyTicks === 1) sound(dim, 'respawn_anchor.charge', f, 0.8, 0.8);
  if (st.flyTicks % 3 === 0) particle(dim, 'superman:charge_dust', f, { radius: 0.8 + st.charge * 2 });
  if (st.flyTicks % 4 === 0 && st.charge > 0.25) particle(dim, 'superman:rising_debris', f, { radius: 1.5 + st.charge * 2.5, color: groundColor(dim, f) });
  if (st.flyTicks % 3 === 0) particle(dim, 'superman:aura', V.add(f, { x: 0, y: 1, z: 0 }), { radius: 0.9 });
  for (const th of [0.35, 0.7, 1.0]) {
    if (prev < th && st.charge >= th) {
      particle(dim, 'superman:ground_crack', { x: f.x, y: Math.floor(f.y) + 0.06, z: f.z }, { radius: 0.8 + th * 1.6 });
      sound(dim, 'mace.smash_ground', f, 0.6 + th * 0.4, 1.2 - th * 0.3);
      shake(player, 0.1 + th * 0.25, 0.3);
    }
  }
  if (jumpEdge || (st.autoLaunch && st.charge >= 0.75)) {
    launch(player, st);
    return;
  }
  if ((!inp.sneak && !st.autoLaunch && st.flyTicks > 2) || !onGround && st.flyTicks > 4) {
    st.charge = 0;
    sync(player, st, 'charge', 0);
    setFly(player, st, FLY.NONE);
  }
}

function launchTick(player, st, inp) {
  const dim = player.dimension;
  const look = player.getViewDirection();
  const { fwd, right } = V.basis(look);
  st.vel.y = Math.max(0.3, st.vel.y * 0.87);
  const h = V.add(V.mul(fwd, inp.fwdRaw * 0.25), V.mul(right, inp.rightRaw * 0.25));
  st.vel.x += (h.x - st.vel.x) * 0.2;
  st.vel.z += (h.z - st.vel.z) * 0.2;
  applyVel(player, st.vel);
  effect(player, 'slow_falling', 20, 0);
  particle(dim, 'superman:speed_trail', player.location, { dir: { x: 0, y: 1, z: 0 } });
  // atravessa tetos
  if (getSettings().destruction && st.vel.y > 0.5) {
    const top = V.add(player.location, { x: 0, y: 2.4 + st.vel.y, z: 0 });
    breakSphere(dim, top, 1.3, { visible: 4, max: 20 });
  }
  if (st.flyTicks >= 14 || st.vel.y <= 0.32) setFly(player, st, FLY.HOVER);
}

function airstartTick(player, st, inp) {
  st.vel.y = st.vel.y * 0.8;
  st.vel.x *= 0.85;
  st.vel.z *= 0.85;
  applyVel(player, st.vel);
  effect(player, 'slow_falling', 20, 0);
  if (st.flyTicks >= 9) setFly(player, st, FLY.HOVER);
}

function landHeroTick(player, st) {
  if (st.flyTicks < 26) {
    applyVel(player, { x: 0, y: -0.2, z: 0 });
    effect(player, 'slowness', 3, 6);
  }
  const dim = player.dimension;
  if (st.flyTicks === 4 || st.flyTicks === 10) particle(dim, 'superman:dust_ring', feet(player), { radius: 3, color: groundColor(dim, feet(player)) });
  if (st.flyTicks >= 36) setFly(player, st, FLY.NONE);
}

function airTick(player, st, inp, onGround, jumpEdge, tick) {
  const s = getSettings();
  const dim = player.dimension;
  const look = player.getViewDirection();
  const { fwd, right } = V.basis(look);
  const vert = inp.jump ? 1 : inp.sneak ? -1 : 0;
  let target;
  let acc;
  // visao de calor, sopro e o supremo sao usados pairando: o heroi freia e fica em pe no ar
  const channeling = st.power === POW.HEAT || st.power === POW.FREEZE || st.power === POW.NOVA_CHARGE || st.power === POW.NOVA;
  if (channeling && (st.fly === FLY.FLY || st.fly === FLY.FAST || ROLL_STATES.has(st.fly))) {
    setFly(player, st, FLY.HOVER);
    st.fwdTicks = 0;
    st.stopTicks = 0;
    sound(dim, 'wind_charge.burst', player.location, 0.6, 0.8);
  }
  // Mach 2 dura enquanto o supersonico (ou um giro dentro dele) continuar
  if (st.fly !== FLY.FAST && st.fly !== FLY.ROLL_LF && st.fly !== FLY.ROLL_RF) {
    st.fastTicks = 0;
    st.mach2 = false;
  }
  // toque duplo para o lado = giro de esquiva
  if (st.fly === FLY.FLY || st.fly === FLY.FAST) {
    const sr = inp.right;
    if (sr !== 0 && st.lastStrafe === 0) {
      if (st.tapDir === sr && tick - st.tapTick <= 7 && tick >= st.rollReadyAt) {
        startRoll(player, st, sr, look, tick);
        st.tapDir = 0;
      } else {
        st.tapDir = sr;
        st.tapTick = tick;
      }
    }
    st.lastStrafe = sr;
  } else {
    st.lastStrafe = 0;
  }

  switch (st.fly) {
    case FLY.HOVER: {
      target = V.add(V.add(V.mul(fwd, inp.fwdRaw * PHYS.hoverSpeed), V.mul(right, inp.rightRaw * PHYS.hoverSpeed)),
        V.mul(UP, vert * PHYS.hoverVertical + (vert === 0 ? 0.012 : 0)));
      acc = PHYS.accelHover;
      st.fwdTicks = inp.fwd > 0 ? st.fwdTicks + 1 : 0;
      if (channeling) st.fwdTicks = 0;
      else if (inp.sprint && inp.fwd > 0) { goFast(player, st); st.stopTicks = 0; } else if (st.fwdTicks >= 5) { setFly(player, st, FLY.FLY); st.stopTicks = 0; }
      break;
    }
    case FLY.FLY: {
      const sp = PHYS.flySpeed * Math.max(inp.fwdRaw, 0);
      target = V.add(V.add(V.mul(look, sp), V.mul(right, inp.rightRaw * PHYS.strafeSpeed)), V.mul(UP, vert * PHYS.flyVertical));
      acc = PHYS.accelFly;
      st.stopTicks = inp.fwd <= 0 ? st.stopTicks + 1 : 0;
      if (st.stopTicks >= 3) {
        setFly(player, st, FLY.HOVER);
        st.fwdTicks = 0;
        sound(dim, 'mob.phantom.flap', player.location, 0.6, 0.7);
      } else if (inp.sprint && inp.fwd > 0) {
        goFast(player, st);
      }
      if (st.flyTicks % 2 === 0) particle(dim, 'superman:wind_trail', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { dir: look });
      break;
    }
    case FLY.FAST: {
      st.fastTicks++;
      if (!st.mach2 && st.fastTicks >= 50) machTwo(player, st, look);
      target = V.add(V.mul(look, s.fastSpeed * (st.mach2 ? MACH2 : 1)), V.mul(right, inp.rightRaw * 0.25));
      acc = PHYS.accelFast;
      // campo de visao abre com a velocidade (efeito de velocidade; respeita a opcao de FOV do jogador)
      if (st.flyTicks % 4 === 0) effect(player, 'speed', 10, st.mach2 ? 6 : 4);
      st.stopTicks = inp.fwd <= 0 ? st.stopTicks + 1 : 0;
      st.fwdTicks = !inp.sprint ? st.fwdTicks + 1 : 0;
      if (st.stopTicks >= 3) {
        setFly(player, st, FLY.HOVER);
        particle(dim, 'superman:shockwave', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { radius: 3, color: { r: 0.9, g: 0.95, b: 1 } });
        sound(dim, 'wind_charge.burst', player.location, 0.9, 0.7);
      } else if (st.fwdTicks >= 8) {
        setFly(player, st, FLY.FLY);
      }
      particle(dim, 'superman:speed_trail', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { dir: look });
      particle(dim, 'superman:solar_trail', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { dir: look });
      if (st.flyTicks % 12 === 0) particle(dim, 'superman:sonic_boom', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { dir: look, radius: 2 });
      if (st.flyTicks % 20 === 0) sound(dim, 'elytra.loop', player.location, 0.6, 1.4);
      break;
    }
    case FLY.ROLL_L:
    case FLY.ROLL_R:
    case FLY.ROLL_LF:
    case FLY.ROLL_RF: {
      const k = Math.max(0, 1 - st.flyTicks / 9);
      const base = st.rollFrom === FLY.FAST ? s.fastSpeed * (st.mach2 ? MACH2 : 1) : PHYS.flySpeed;
      target = V.add(V.add(V.mul(look, base), V.mul(st.rollSide, 1.15 * k)), V.mul(UP, vert * PHYS.flyVertical));
      acc = 0.35;
      if (st.flyTicks % 2 === 0) particle(dim, 'superman:wind_trail', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { dir: look });
      if (st.flyTicks >= 9) setFly(player, st, st.rollFrom === FLY.FAST ? FLY.FAST : FLY.FLY);
      break;
    }
    case FLY.DIVE: {
      target = { x: look.x * 0.4, y: -PHYS.diveSpeed, z: look.z * 0.4 };
      acc = 0.25;
      particle(dim, 'superman:speed_trail', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { dir: { x: 0, y: -1, z: 0 } });
      if (st.flyTicks % 2 === 0) particle(dim, 'superman:meteor_trail', V.add(player.location, { x: 0, y: 0.6, z: 0 }));
      break;
    }
    case FLY.LANDPREP:
    default: {
      target = V.add(V.add(V.mul(fwd, inp.fwdRaw * 0.14), V.mul(right, inp.rightRaw * 0.14)), { x: 0, y: -0.55, z: 0 });
      acc = 0.2;
    }
  }

  if (st.power === POW.NOVA_CHARGE || st.power === POW.NOVA) {
    target = { x: 0, y: 0.012, z: 0 };
    acc = 0.3;
  }
  st.vel = V.lerp(st.vel, target, acc);
  const speed = V.len(st.vel);

  // contato com o chao
  const gd = groundDist(player, Math.max(3.5, -st.vel.y + 1));
  // no mergulho o chao e detectado antes do impacto: a cratera fica na superficie
  const diveHit = st.fly === FLY.DIVE && gd !== undefined && gd <= -st.vel.y + 0.4;
  if (onGround || diveHit || (gd !== undefined && gd < 0.3 && st.vel.y <= 0.05)) {
    if (st.fly === FLY.DIVE || (-st.vel.y > 0.75 && speed > 0.9)) {
      heroLand(player, st, Math.max(speed, st.fly === FLY.DIVE ? 2.4 : 0));
      return;
    }
    if ((st.fly === FLY.HOVER && vert < 0) || st.fly === FLY.LANDPREP || (st.fly === FLY.HOVER && onGround && vert <= 0 && st.flyTicks > 10)) {
      softLand(player, st);
      return;
    }
    st.vel.y = Math.max(st.vel.y, 0.08);
  }
  if (st.fly === FLY.LANDPREP && gd !== undefined && gd < 0.7) {
    softLand(player, st);
    return;
  }
  // poeira levantada ao pairar perto do chao
  if (gd !== undefined && gd < 3.5 && st.flyTicks % 3 === 0 && st.fly !== FLY.DIVE) {
    const l = player.location;
    particle(dim, 'superman:hover_dust', { x: l.x, y: l.y - gd + 0.1, z: l.z }, { radius: 1.2 + (3.5 - gd) * 0.5 });
  }

  // destruicao do cenario no caminho (voo rapido / mergulho)
  if (s.destruction && st.fly !== FLY.DIVE && (st.fly === FLY.FAST || speed > 0.75)) {
    const dir = V.norm(st.vel);
    const mid = V.add(player.location, { x: 0, y: 0.9, z: 0 });
    const radius = st.fly === FLY.FAST ? (st.mach2 ? 2.5 : 2.1) : 1.5;
    // posicoes ja verificadas nos ultimos ticks nao sao relidas (esferas se sobrepoem)
    if (st.flyTicks % 8 === 0) st.tunnelSeen.clear();
    let broke = 0;
    for (let d = 0.8; d <= speed + 1.3; d += 0.9) {
      broke += breakSphere(dim, V.add(mid, V.mul(dir, d)), radius, { visible: 3, debrisEvery: 2, max: 40, seen: st.tunnelSeen });
    }
    if (broke > 0) {
      if (tick % 3 === 0) sound(dim, 'random.explode', mid, 0.35, 1.5);
      if (broke > 8 && tick % 4 === 0) sound(dim, 'mob.wither.break_block', mid, 0.5, 1.2);
      if (tick % 3 === 0) shake(player, Math.min(0.5, 0.08 + broke * 0.015), 0.2);
      particle(dim, 'superman:debris_dust', V.add(mid, V.mul(dir, 1.5)), { color: { r: 0.6, g: 0.58, b: 0.55 }, count: 3, scale: 1.6 });
    }
  }

  flightFx(player, st, tick, speed, look);

  // autocalibracao: ajusta o ganho horizontal para que a velocidade real
  // fique igual a desejada, independente de como o jogo aplica o empurrao
  const hs = Math.hypot(st.vel.x, st.vel.z);
  if (st.meas && hs > 0.35 && st.flyTicks > 6 && !onGround) {
    const mh = Math.hypot(st.meas.x, st.meas.z);
    const f = mh / (hs * st.gain);
    if (f > 0.3 && f < 3) st.gain = clamp(st.gain + (1 / f - st.gain) * 0.07, 0.45, 1.3);
  }
  applyVel(player, { x: st.vel.x * st.gain, y: st.vel.y, z: st.vel.z * st.gain });
  effect(player, 'slow_falling', 12, 0);
}
