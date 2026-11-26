import { EntityDamageCause } from '@minecraft/server';
import { AIR_STATES, FLY, PHYS, POW, getSettings } from './config.js';
import { blast, breakBlocks, breakSphere, isFragile, sphereBlocks } from './destruction.js';
import { particle, q, shake, shakeArea, sound } from './fx.js';
import { setFly, sync } from './state.js';
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

function pushMobs(player, center, radius, strength, lift, damage) {
  try {
    for (const e of player.dimension.getEntities({ location: center, maxDistance: radius })) {
      if (e.id === player.id || e.typeId === 'minecraft:item' || e.typeId === 'minecraft:xp_orb') continue;
      const d = V.sub(e.location, center);
      const h = V.norm({ x: d.x, y: 0, z: d.z });
      const f = 1 - Math.min(1, V.len(d) / radius) * 0.6;
      try { e.applyKnockback({ x: h.x * strength * f, z: h.z * strength * f }, lift * f); } catch (err) { /* */ }
      if (damage > 0) {
        try { e.applyDamage(damage * f, { cause: EntityDamageCause.entityAttack, damagingEntity: player }); } catch (err) { /* */ }
      }
    }
  } catch (e) { /* */ }
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
  particle(dim, 'superman:shockwave', f, { radius: 3 + 6 * c, color: { r: 1, g: 1, b: 1 } });
  particle(dim, 'superman:dust_ring', f, { radius: 2 + 3 * c });
  particle(dim, 'superman:ground_crack', { x: f.x, y: Math.floor(f.y) + 0.06, z: f.z }, { radius: 1.5 + 2.5 * c });
  sound(dim, 'mace.heavy_smash_ground', f, 1.5, 0.8);
  sound(dim, 'item.trident.riptide_3', f, 1, 1.1);
  if (c > 0.6) sound(dim, 'mob.warden.sonic_boom', f, 0.8, 1.2);
  shakeArea(dim, f, 18, 0.35 + 0.6 * c, 0.5);
  if (getSettings().destruction) {
    if (c > 0.45) blast(dim, { x: f.x, y: f.y - 0.6, z: f.z }, 1.2 + 2.0 * c, player);
    else breakBlocks(dim, sphereBlocks(dim, f, 3, isFragile), { visible: 10 });
  }
  pushMobs(player, f, 3 + 4 * c, 1 + 1.5 * c, 0.5 + 0.5 * c, 2 + 6 * c);
}

function softLand(player, st) {
  setFly(player, st, FLY.LANDSOFT);
  st.vel = V.zero();
  applyVel(player, st.vel);
  const dim = player.dimension;
  particle(dim, 'superman:dust_ring', feet(player), { radius: 1.6 });
  sound(dim, 'mob.breeze.land', player.location, 1, 0.8);
}

function heroLand(player, st, speed) {
  setFly(player, st, FLY.LANDHERO);
  const dim = player.dimension;
  const f = feet(player);
  const r = clamp(1.2 + speed * 1.5, 2, 6.5);
  st.vel = V.zero();
  applyVel(player, st.vel);
  particle(dim, 'superman:shockwave', f, { radius: r * 2.6, color: { r: 1, g: 1, b: 1 } });
  particle(dim, 'superman:shockwave', f, { radius: r * 1.4, color: { r: 1, g: 0.85, b: 0.6 } });
  particle(dim, 'superman:dust_ring', f, { radius: r * 1.5 });
  particle(dim, 'superman:ground_crack', { x: f.x, y: Math.floor(f.y) + 0.06, z: f.z }, { radius: r });
  for (let i = 0; i < q(4); i++) particle(dim, 'superman:debris_burst', f, { color: { r: 0.5, g: 0.45, b: 0.4 } });
  sound(dim, 'mace.heavy_smash_ground', f, 2, 0.7);
  sound(dim, 'random.explode', f, 1, 0.8);
  if (speed > 1.4) sound(dim, 'mob.warden.sonic_boom', f, 1, 0.9);
  shakeArea(dim, f, 28, 0.5 + speed * 0.4, 0.9);
  if (getSettings().destruction && speed > 0.8) blast(dim, { x: f.x, y: f.y - 0.8, z: f.z }, r * 0.75, player);
  else blast(dim, f, r * 0.6, player, { noBlocks: true });
  pushMobs(player, f, r * 2.2, 1.6, 0.7, 0);
}

function goFast(player, st) {
  setFly(player, st, FLY.FAST);
  const dim = player.dimension;
  const l = player.location;
  const dir = player.getViewDirection();
  particle(dim, 'superman:sonic_boom', V.add(l, { x: 0, y: 0.9, z: 0 }), { dir, radius: 4 });
  particle(dim, 'superman:shockwave', V.add(l, { x: 0, y: 0.9, z: 0 }), { radius: 6, color: { r: 0.85, g: 0.92, b: 1 } });
  sound(dim, 'mob.warden.sonic_boom', l, 1.2, 1.1);
  sound(dim, 'item.trident.riptide_3', l, 1, 1.3);
  shake(player, 0.6, 0.4);
  // o estrondo supersonico estilhaca vidros, folhas e plantas ao redor
  if (getSettings().destruction) breakBlocks(dim, sphereBlocks(dim, l, 6, isFragile), { visible: 12, max: 60 });
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
  if (creativeFly) {
    if (st.fly !== FLY.NONE) setFly(player, st, FLY.NONE);
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
      particle(dim, 'superman:dust_ring', feet(player), { radius: 1.5 });
    }
    effect(player, 'speed', 6, 7);
    const v = player.getVelocity();
    const back = V.sub(feet(player), V.mul(V.norm({ x: v.x, y: 0, z: v.z }), 0.6));
    particle(dim, 'superman:speed_dust', back);
    if (st.flyTicks % 2 === 0) particle(dim, 'superman:speed_trail', V.add(player.location, { x: 0, y: 1, z: 0 }), { dir: V.norm(v) });
    if (getSettings().destruction && st.flyTicks % 2 === 0) {
      const ahead = V.add(player.location, V.add(V.mul(V.norm({ x: v.x, y: 0, z: v.z }), 1.6), { x: 0, y: 1, z: 0 }));
      breakBlocks(dim, sphereBlocks(dim, ahead, 1.5, isFragile), { visible: 4, max: 12 });
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

  // pulo duplo (pular de novo no ar) = comecar a voar
  if (!onGround && jumpEdge && st.airTicks >= 2 && st.power !== POW.TRANSFORM) startAir(player, st);
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
  if (st.flyTicks === 4 || st.flyTicks === 10) particle(dim, 'superman:dust_ring', feet(player), { radius: 3 });
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

  switch (st.fly) {
    case FLY.HOVER: {
      target = V.add(V.add(V.mul(fwd, inp.fwdRaw * PHYS.hoverSpeed), V.mul(right, inp.rightRaw * PHYS.hoverSpeed)),
        V.mul(UP, vert * PHYS.hoverVertical + (vert === 0 ? 0.012 : 0)));
      acc = PHYS.accelHover;
      st.fwdTicks = inp.fwd > 0 ? st.fwdTicks + 1 : 0;
      if (inp.sprint && inp.fwd > 0) { goFast(player, st); st.stopTicks = 0; } else if (st.fwdTicks >= 5) { setFly(player, st, FLY.FLY); st.stopTicks = 0; }
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
      target = V.add(V.mul(look, s.fastSpeed), V.mul(right, inp.rightRaw * 0.25));
      acc = PHYS.accelFast;
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
      if (st.flyTicks % 12 === 0) particle(dim, 'superman:sonic_boom', V.add(player.location, { x: 0, y: 0.9, z: 0 }), { dir: look, radius: 2 });
      if (st.flyTicks % 20 === 0) sound(dim, 'elytra.loop', player.location, 0.6, 1.4);
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

  st.vel = V.lerp(st.vel, target, acc);
  const speed = V.len(st.vel);

  // contato com o chao
  const gd = groundDist(player, 3.5);
  if (onGround || (gd !== undefined && gd < 0.3 && st.vel.y <= 0.05)) {
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
  if (s.destruction && (st.fly === FLY.FAST || st.fly === FLY.DIVE || speed > 0.75)) {
    const dir = V.norm(st.vel);
    const mid = V.add(player.location, { x: 0, y: 0.9, z: 0 });
    const radius = st.fly === FLY.DIVE ? 1.9 : st.fly === FLY.FAST ? 1.5 : 1.25;
    let broke = 0;
    for (let d = 0.8; d <= speed + 1.3; d += 0.9) {
      broke += breakSphere(dim, V.add(mid, V.mul(dir, d)), radius, { visible: 3, debrisEvery: 2, max: 24 });
    }
    if (broke > 0) {
      if (tick % 3 === 0) sound(dim, 'random.explode', mid, 0.35, 1.5);
      if (broke > 8 && tick % 4 === 0) sound(dim, 'mob.wither.break_block', mid, 0.5, 1.2);
      if (tick % 3 === 0) shake(player, Math.min(0.5, 0.08 + broke * 0.015), 0.2);
      particle(dim, 'superman:debris_burst', V.add(mid, V.mul(dir, 1.5)), { color: { r: 0.55, g: 0.52, b: 0.5 } });
    }
  }

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
