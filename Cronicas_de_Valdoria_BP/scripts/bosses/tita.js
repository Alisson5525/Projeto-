// Chefe: Titã de Pedra - 3 fases, ataques telegrafados (evitáveis), investida com atordoamento e derrota animada.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, say, hpPct, inventory } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { dealDamage, onBeforeHurt, addVulnerable, canHit } from "../core/damage.js";
import { launch, ground, knockFrom } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

const ID = `${NS}:tita_pedra`;
const NAME = "Titã de Pedra";
const A = { none: 0, slam: 1, stomp: 2, throw: 3, roar: 4, charge: 5, death: 6, intro: 7, stun: 8 };
const states = new Map();

function st(boss) {
  let s = states.get(boss.id);
  if (!s) {
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), home: { ...boss.location }, seen: tick(), dying: false, stomps: 0 };
    states.set(boss.id, s);
  }
  return s;
}

function diff() {
  try {
    const d = String(world.getDifficulty()).toLowerCase();
    return d === "easy" ? 0.7 : d === "hard" ? 1.3 : d === "peaceful" ? 0.5 : 1;
  } catch {
    return 1;
  }
}

function setAnim(boss, a) {
  try { boss.setProperty(`${NS}:anim`, a); } catch { /* */ }
}
function lock(boss, on) {
  try { boss.triggerEvent(on ? "valdoria:travar" : "valdoria:destravar"); } catch { /* */ }
}
function nearbyPlayers(boss, r = 40) {
  return boss.dimension.getPlayers({ location: boss.location, maxDistance: r }).filter(isActivePlayer);
}
function updateName(boss, s) {
  boss.nameTag = `§6${NAME} §7- Fase ${["I", "II", "III"][s.phase - 1]}`;
}
function facing(boss, target) {
  try {
    boss.teleport(boss.location, { facingLocation: V.up(target.location, 1), keepVelocity: false });
  } catch { /* */ }
}
function ready(s, key) {
  return (s.cds[key] || 0) <= tick();
}
function cd(s, key, sec) {
  s.cds[key] = tick() + Math.round(sec * 20 * (s.phase === 3 ? 0.7 : 1));
}
function finishAttack(boss, s, after) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, after);
  s.busy = tick() + after + 6;
}

// ------------------------------------------------------------------ ataques
function slam(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.slam);
  const dir = V.flat(V.sub(target.location, boss.location));
  const pt = ground(boss.dimension, V.add(boss.location, V.mul(dir, 3.6)));
  particle(boss.dimension, "alerta_area", pt, { radius: 3.2 });
  particle(boss.dimension, "alerta_anel", pt, { radius: 3.2 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "onda_choque", pt, { radius: 1.6 });
    particle(boss.dimension, "detritos", pt);
    particle(boss.dimension, "poeira", pt, { radius: 2.5 });
    sound(boss.dimension, "mace.heavy_smash_ground", pt, 0.5, 2);
    for (const p of nearbyPlayers(boss, 14)) shake(p, 0.4, 0.4);
    for (const e of hitList(boss, pt, 3.4)) {
      dealDamage(boss, e, 14 * diff(), "earth", { kind: "weapon" });
      knockFrom(e, pt, 0.6, 0.6);
    }
  }, 17);
  cd(s, "slam", 5);
  finishAttack(boss, s, 32);
}

function stomp(boss, s) {
  lock(boss, true);
  setAnim(boss, A.stomp);
  particle(boss.dimension, "alerta_anel", boss.location, { radius: 7 });
  if (s.stomps++ === 0) for (const p of nearbyPlayers(boss, 20)) p.onScreenDisplay.setActionBar("§eDica: §fpule para evitar o Pisotear do Titã!");
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const c = boss.location;
    particle(boss.dimension, "onda_choque", c, { radius: 3 });
    particle(boss.dimension, "poeira", c, { radius: 4 });
    sound(boss.dimension, "mace.heavy_smash_ground", c, 0.4, 2);
    for (const p of nearbyPlayers(boss, 16)) shake(p, 0.5, 0.5);
    for (const e of hitList(boss, c, 7.2)) {
      if (isPlayer(e) && !e.isOnGround) continue; // pular evita a onda de choque
      dealDamage(boss, e, 9 * diff(), "earth", { kind: "weapon" });
      knockFrom(e, c, 1.6, 0.45);
    }
  }, 14);
  cd(s, "stomp", 7);
  finishAttack(boss, s, 28);
}

function throwRock(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.throw);
  const aimPt = ground(boss.dimension, target.location);
  system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_area", aimPt, { radius: 2.6 }), 8);
  system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", aimPt, { radius: 2.6 }), 18);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const from = V.add(V.up(boss.location, 5.5), V.mul(V.flat(V.sub(aimPt, boss.location)), 1.5));
    const flat = V.dist2d(from, aimPt);
    const T = Math.max(12, flat / 0.9);
    const g = 0.035;
    const vel = { x: (aimPt.x - from.x) / T, y: (aimPt.y - from.y) / T + 0.5 * g * T, z: (aimPt.z - from.z) / T };
    const speed = V.len(vel);
    sound(boss.dimension, "mob.irongolem.throw", from, 0.5, 2);
    launch(boss, { from, dir: vel, speed, gravity: g * 1.0, radius: 1.0, element: "earth", damage: 11 * diff(), aoe: 2.6,
      trail: "poeira", impact: "detritos", range: 60, area: false, kind: "weapon",
      onImpact: (pt) => { particle(boss.dimension, "poeira", pt, { radius: 2.5 }); sound(boss.dimension, "random.explode", pt, 0.7, 1.2); } });
  }, 27);
  cd(s, "throw", 6.5);
  finishAttack(boss, s, 40);
}

function fissures(boss, s) {
  lock(boss, true);
  setAnim(boss, A.roar);
  sound(boss.dimension, "mob.ravager.roar", boss.location, 0.5, 2);
  const pts = [];
  for (const p of nearbyPlayers(boss, 30)) pts.push(ground(boss.dimension, V.add(p.location, { x: rand(-1, 1), y: 0, z: rand(-1, 1) })));
  while (pts.length < 5) pts.push(ground(boss.dimension, V.add(boss.location, { x: rand(-10, 10), y: 0, z: rand(-10, 10) })));
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 2.1 });
  system.runTimeout(() => pts.forEach((pt) => ok(boss) && particle(boss.dimension, "alerta_anel", pt, { radius: 2.1 })), 15);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const pt of pts) {
      particle(boss.dimension, "detritos", pt);
      particle(boss.dimension, "nucleo_brilho", V.up(pt, 0.5));
      for (const e of hitList(boss, pt, 2.2)) {
        dealDamage(boss, e, 9 * diff(), "earth", { kind: "weapon" });
        knockFrom(e, pt, 0.2, 0.8);
      }
    }
    sound(boss.dimension, "mace.heavy_smash_ground", boss.location, 0.6, 2);
  }, 32);
  cd(s, "fissures", 11);
  finishAttack(boss, s, 50);
}

function charge(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.charge);
  const dir = V.flat(V.sub(target.location, boss.location));
  for (let i = 2; i <= 16; i += 2) particle(boss.dimension, "alerta_area", ground(boss.dimension, V.add(boss.location, V.mul(dir, i))), { radius: 1.3 });
  sound(boss.dimension, "mob.ravager.roar", boss.location, 0.7, 2);
  const hit = new Set();
  s.busy = tick() + 200;
  system.runTimeout(() => {
    let n = 0;
    const run = system.runInterval(() => {
      if (!ok(boss) || s.dying) return system.clearRun(run);
      n++;
      let blocked = false;
      try {
        const b = boss.dimension.getBlockFromRay(V.up(boss.location, 1.5), dir, { maxDistance: 2.2, includePassableBlocks: false });
        if (b) blocked = true;
      } catch { blocked = true; }
      if (!blocked) {
        const next = V.add(boss.location, V.mul(dir, 0.75));
        try { boss.teleport(next, { facingLocation: V.add(next, V.mul(dir, 5)), checkForBlocks: false }); } catch { blocked = true; }
        particle(boss.dimension, "poeira", boss.location, { radius: 1.2 });
        for (const e of hitList(boss, boss.location, 3)) {
          if (hit.has(e.id)) continue;
          hit.add(e.id);
          dealDamage(boss, e, 13 * diff(), "earth", { kind: "weapon" });
          knockFrom(e, boss.location, 2.4, 0.6);
        }
      }
      if (blocked || n >= 28) {
        system.clearRun(run);
        if (blocked) stunned(boss, s);
        else {
          setAnim(boss, A.none);
          lock(boss, false);
          s.busy = tick() + 10;
        }
      }
    }, 1);
  }, 22);
  cd(s, "charge", 10);
}

function stunned(boss, s) {
  setAnim(boss, A.stun);
  addVulnerable(boss, 0.5, 3);
  particle(boss.dimension, "detritos", V.up(boss.location, 3));
  sound(boss.dimension, "mob.irongolem.hit", boss.location, 0.3, 2);
  for (const p of nearbyPlayers(boss, 30)) {
    shake(p, 0.6, 0.6);
    p.onScreenDisplay.setActionBar("§6O Titã bateu na parede e está ATORDOADO! §f(+50% de dano)");
  }
  s.busy = tick() + 70;
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, 60);
}

function hitList(boss, center, r) {
  try {
    return boss.dimension.getEntities({ location: center, maxDistance: r + 0.5 }).filter((e) => canHit(boss, e, false));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ fases, entrada e derrota
function phaseChange(boss, s, phase) {
  s.phase = phase;
  s.invuln = tick() + 50;
  s.busy = tick() + 56;
  lock(boss, true);
  setAnim(boss, A.roar);
  try {
    boss.setProperty(`${NS}:phase`, phase);
    boss.triggerEvent(phase === 2 ? "valdoria:fase2" : "valdoria:fase3");
  } catch { /* */ }
  updateName(boss, s);
  particle(boss.dimension, "nucleo_brilho", V.up(boss.location, 3));
  particle(boss.dimension, "onda_choque", boss.location, { radius: 3 });
  sound(boss.dimension, "mob.ravager.roar", boss.location, 0.4, 2);
  for (const p of nearbyPlayers(boss, 40)) {
    shake(p, 0.5, 1.2);
    p.onScreenDisplay.setTitle(" ", { subtitle: phase === 2 ? "§6O Titã desperta sua fúria! §7(Fissuras)" : "§cO núcleo do Titã está exposto! §7(Investidas)",
      fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
  }
  const n = phase === 2 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    try {
      boss.dimension.spawnEntity(`${NS}:fragmento_pedra`, V.add(boss.location, V.rotY({ x: 4, y: 0.5, z: 0 }, i * (360 / n) + 30)));
    } catch { /* */ }
  }
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, 50);
}

function intro(boss) {
  const s = st(boss);
  s.invuln = tick() + 62;
  s.busy = tick() + 64;
  lock(boss, true);
  setAnim(boss, A.intro);
  updateName(boss, s);
  particle(boss.dimension, "poeira", boss.location, { radius: 4 });
  for (let i = 0; i < 4; i++) system.runTimeout(() => ok(boss) && particle(boss.dimension, "detritos", boss.location), i * 10);
  sound(boss.dimension, "mob.ravager.roar", boss.location, 0.35, 2);
  for (const p of nearbyPlayers(boss, 48)) {
    shake(p, 0.4, 2.5);
    p.onScreenDisplay.setTitle("§6§lTITÃ DE PEDRA", { subtitle: "§7Guardião das Montanhas Antigas", fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
  }
  system.runTimeout(() => {
    if (!ok(boss)) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, 60);
}

function startDeath(boss, s) {
  if (s.dying) return;
  s.dying = true;
  lock(boss, true);
  setAnim(boss, A.death);
  const h = health(boss);
  if (h) h.setCurrentValue(1);
  sound(boss.dimension, "mob.irongolem.death", boss.location, 0.4, 2);
  for (const p of nearbyPlayers(boss, 48)) shake(p, 0.3, 3);
  for (let i = 0; i < 6; i++) system.runTimeout(() => ok(boss) && particle(boss.dimension, "detritos", V.up(boss.location, rand(0.5, 3))), i * 9);
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "poeira", loc, { radius: 4 });
    particle(dim, "nucleo_brilho", V.up(loc, 1));
    sound(dim, "random.explode", loc, 0.5, 1.5);
    rewards(boss, s, loc, dim);
    states.delete(boss.id);
    boss.remove();
  }, 62);
}

function rewards(boss, s, loc, dim) {
  let maxLuck = 0;
  const players = [];
  for (const [pid, dmgDone] of s.contrib) {
    const p = world.getEntity(pid);
    if (!ok(p) || V.dist(p.location, loc) > 80) continue;
    players.push([p, dmgDone]);
  }
  const total = players.reduce((a, [, d]) => a + d, 0) || 1;
  for (const [p, dmgDone] of players) {
    const share = Math.max(0.4, dmgDone / total);
    addXP(p, Math.round(1500 * share), "Titã de Pedra");
    const d = getData(p);
    d.chefes++;
    d.abates[ID] = (d.abates[ID] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§6§lVITÓRIA", { subtitle: "§7O Titã de Pedra foi derrotado", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:fragmento_tita`, randInt(3, 6));
  drop(`${NS}:moeda_ouro`, randInt(40, 80));
  drop(`${NS}:nucleo_tita`, 1);
  drop(`${NS}:lingote_mithril`, randInt(4, 8));
  drop(`${NS}:pedra_aprimoramento`, randInt(2, 4));
  if (chance(0.25 + maxLuck)) drop(`${NS}:coracao_pedra`, 1);
  if (chance(0.12 + maxLuck)) drop(`${NS}:punho_tita`, 1);
  for (let i = 0; i < 25; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-1, 1), y: 1, z: rand(-1, 1) }));
  world.sendMessage(`§6[Valdoria] §fO §6Titã de Pedra§f foi derrotado por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying || s.busy > tick()) return;
  const players = nearbyPlayers(boss, 40);
  if (!players.length) {
    if (tick() - s.seen > 1200) {
      const h = health(boss);
      if (h) h.resetToMaxValue();
      try { boss.teleport(s.home); } catch { /* */ }
      s.phase = 1;
      s.contrib.clear();
      try { boss.setProperty(`${NS}:phase`, 1); } catch { /* */ }
      updateName(boss, s);
      s.seen = tick();
    }
    return;
  }
  s.seen = tick();
  if (V.dist(boss.location, s.home) > 40) {
    particle(boss.dimension, "poeira", boss.location, { radius: 2 });
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  const hp = hpPct(boss);
  if (s.phase === 1 && hp <= 0.6) return phaseChange(boss, s, 2);
  if (s.phase === 2 && hp <= 0.25) return phaseChange(boss, s, 3);
  const target = players.sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location))[0];
  const dist = V.dist2d(target.location, boss.location);
  const close = players.filter((p) => V.dist(p.location, boss.location) < 7).length;
  if (dist <= 5.5) {
    if (ready(s, "stomp") && (close >= 2 || chance(0.4))) return stomp(boss, s);
    if (ready(s, "slam")) return slam(boss, s, target);
    if (ready(s, "stomp")) return stomp(boss, s);
  } else {
    if (s.phase === 3 && ready(s, "charge") && dist >= 7 && dist <= 22) return charge(boss, s, target);
    if (s.phase >= 2 && ready(s, "fissures") && chance(0.5)) return fissures(boss, s);
    if (ready(s, "throw") && dist <= 28) return throwRock(boss, s, target);
  }
}

// ------------------------------------------------------------------ invocação pelo Ídolo
export function useIdol(player) {
  if (player.dimension.id !== "minecraft:overworld") {
    player.onScreenDisplay.setActionBar("§cO Ídolo só responde no mundo da superfície.");
    return;
  }
  const others = player.dimension.getEntities({ type: ID, location: player.location, maxDistance: 160 });
  if (others.length) {
    player.onScreenDisplay.setActionBar("§cUm Titã já está desperto nesta região.");
    return;
  }
  const dir = V.flat(player.getViewDirection());
  const spot = ground(player.dimension, V.add(player.location, V.mul(dir, 8)));
  for (const off of [{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: -2, z: 0 }, { x: 0, z: 2 }, { x: 0, z: -2 }]) {
    for (let y = 0; y < 5; y++) {
      try {
        const b = player.dimension.getBlock(V.add(spot, { x: off.x, y, z: off.z }));
        if (b && !b.isAir && !b.isLiquid && !b.typeId.includes("grass") && !b.typeId.includes("flower")) {
          player.onScreenDisplay.setActionBar("§cÉ preciso um espaço aberto (5 blocos de altura) à sua frente.");
          return;
        }
      } catch {
        return;
      }
    }
  }
  const inv = inventory(player);
  const slot = player.selectedSlotIndex;
  const it = inv.getItem(slot);
  if (!it || it.typeId !== `${NS}:idolo_tita`) return;
  inv.setItem(slot, undefined);
  particle(player.dimension, "cor_circulo_magico", spot, { color: "earth", radius: 3 });
  particle(player.dimension, "alerta_anel", spot, { radius: 3 });
  sound(player.dimension, "mob.evocation_illager.prepare_summon", spot, 0.5, 2);
  system.runTimeout(() => {
    try {
      const boss = player.dimension.spawnEntity(ID, spot);
      intro(boss);
    } catch (e) {
      say(player, `§cO Titã não pôde despertar aqui: ${e}`);
    }
  }, 40);
}

export function startBoss() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId !== ID) return;
    const s = st(e);
    if (s.dying || s.invuln > tick()) {
      ev.cancel = true;
      return;
    }
    let src = ev.src;
    if (ok(src) && isPlayer(src)) s.contrib.set(src.id, (s.contrib.get(src.id) || 0) + ev.damage);
    const h = health(e);
    if (h && h.currentValue - ev.damage <= 1) {
      ev.cancel = true;
      system.run(() => ok(e) && startDeath(e, s));
    }
  });
  system.runInterval(() => {
    for (const boss of world.getDimension("minecraft:overworld").getEntities({ type: ID })) {
      try { think(boss); } catch (err) { console.warn(`[Valdoria] Titã: ${err}`); }
    }
  }, 5);
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== ID) return;
    system.runTimeout(() => ok(e) && !states.get(e.id)?.busy && intro(e), 2);
  });
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === ID) updateName(ev.entity, st(ev.entity));
  });
}
