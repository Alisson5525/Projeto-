// Chefe de Kar'Dum: Durgan, o Rei Sob a Montanha. Espírito do último rei anão, preso ao próprio juramento.
// Fase I: martelada (círculo à frente), fenda (linha de erupções até o alvo), martelo arremessado (atordoa) e giro quando cercado.
// Fase II (50%): chama os Juramentados (fantasmas anões; enquanto vivos, o rei fica de joelhos e imune) e a Fúria da Montanha
// (estalactites caem em pontos marcados). Todos os golpes de área são marcados no chão antes de acertar.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, hpPct } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { dealDamage, onBeforeHurt, canHit } from "../core/damage.js";
import { launch, ground, knockFrom, stun } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

export const KING = `${NS}:rei_durgan`;
export const SWORN = `${NS}:fantasma_anao`;
const NAME = "Durgan, o Rei Sob a Montanha";
const A = { none: 0, martelada: 1, giro: 2, arremesso: 3, fenda: 4, invocar: 5, furia: 6, escudo: 7, intro: 8, morte: 9 };
export const KTAG = (siteId) => `vk_${siteId}`;
const states = new Map();
const defeatHooks = [];
/** @type {(siteId: string) => any} */
let resolver = () => undefined;

/** As Ruínas de Kar'Dum informam a arena (caixa, centro e pontos das estalactites) de cada local. */
export function setKingArenaResolver(fn) {
  resolver = fn;
}
export function onKingDefeated(fn) {
  defeatHooks.push(fn);
}

function siteOf(boss) {
  try {
    const v = boss.getDynamicProperty(`${NS}:local`);
    return typeof v === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}
function st(boss) {
  let s = states.get(boss.id);
  if (!s) {
    let siteId = siteOf(boss);
    if (!siteId) { // gerado por ovo/comando
      siteId = `e${boss.id}`;
      try {
        boss.setDynamicProperty(`${NS}:local`, siteId);
        boss.addTag(KTAG(siteId));
      } catch { /* */ }
    }
    const info = resolver(siteId);
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), dying: false, shield: false, siteId,
      arena: info?.arena, home: info?.center || { ...boss.location }, rocks: info?.rocks || [] };
    try { s.phase = Number(boss.getProperty(`${NS}:phase`)) || 1; } catch { /* */ }
    states.set(boss.id, s);
    if (s.phase === 2) s.shield = sworn(boss, s).length > 0;
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
function inArena(s, loc) {
  if (!s.arena) return true;
  const [a, b] = s.arena;
  return loc.x >= a.x - 1 && loc.x <= b.x + 2 && loc.z >= a.z - 1 && loc.z <= b.z + 2 && loc.y >= a.y - 3 && loc.y <= b.y + 3;
}
function fighters(boss, s, r = 34) {
  return boss.dimension.getPlayers({ location: boss.location, maxDistance: r }).filter((p) => isActivePlayer(p) && inArena(s, p.location));
}
function updateName(boss, s) {
  boss.nameTag = `§b${NAME} §7- Fase ${s.phase === 1 ? "I" : "II"}${s.shield ? " §3[Juramento]" : ""}`;
}
function facing(boss, target) {
  try { boss.teleport(boss.location, { facingLocation: V.up(target.location, 1), keepVelocity: false }); } catch { /* */ }
}
const ready = (s, key) => (s.cds[key] || 0) <= tick();
function cd(s, key, sec) {
  s.cds[key] = tick() + Math.round(sec * 20 * (s.phase === 2 ? 0.8 : 1));
}
function finish(boss, s, after) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, s.shield ? A.escudo : A.none);
    if (!s.shield) lock(boss, false);
  }, after);
  s.busy = tick() + after + 6;
}
function hitList(boss, c, r) {
  try {
    return boss.dimension.getEntities({ location: c, maxDistance: r + 0.5 }).filter((e) => canHit(boss, e, false) && e.typeId !== SWORN);
  } catch {
    return [];
  }
}
function free(dim, loc) {
  try {
    const b = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
    return [0, 1].every((dy) => dim.getBlock({ x: b.x, y: b.y + dy, z: b.z })?.isAir);
  } catch {
    return false;
  }
}
const fwd = (boss) => V.flat(boss.getViewDirection());

// ------------------------------------------------------------------ ataques
function martelada(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.martelada);
  const c = ground(boss.dimension, V.add(boss.location, V.mul(fwd(boss), 2.6)));
  particle(boss.dimension, "alerta_area", c, { radius: 3.2 });
  sound(boss.dimension, "mob.irongolem.throw", boss.location, 0.6, 1.2);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "onda_choque", c, { radius: 3 });
    particle(boss.dimension, "detritos", c, {});
    sound(boss.dimension, "mace.heavy_smash_ground", c, 0.7, 1.5);
    for (const p of boss.dimension.getPlayers({ location: c, maxDistance: 10 })) shake(p, 0.3, 0.4);
    for (const e of hitList(boss, c, 3.2)) {
      dealDamage(boss, e, 12 * diff(), "earth", { kind: "weapon" });
      knockFrom(e, c, 0.4, 0.7);
    }
  }, 19);
  cd(s, "martelada", 3.5);
  finish(boss, s, 26);
}

function giro(boss, s) {
  lock(boss, true);
  setAnim(boss, A.giro);
  particle(boss.dimension, "alerta_anel", boss.location, { radius: 4.5 });
  sound(boss.dimension, "mob.ravager.roar", boss.location, 1.4, 0.8);
  for (const t of [10, 16, 22]) {
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      particle(boss.dimension, "poeira", boss.location, { radius: 4 });
      sound(boss.dimension, "mob.irongolem.throw", boss.location, 0.9, 1);
      for (const e of hitList(boss, boss.location, 4.5)) {
        dealDamage(boss, e, 6 * diff(), "physical", { kind: "weapon" });
        knockFrom(e, boss.location, 1.3, 0.35);
      }
    }, t);
  }
  cd(s, "giro", 8);
  finish(boss, s, 30);
}

function arremesso(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.arremesso);
  sound(boss.dimension, "mob.irongolem.throw", boss.location, 0.7, 1.4);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying || !ok(target)) return;
    const from = V.add(V.up(boss.location, 3), V.mul(fwd(boss), 1));
    launch(boss, { from, dir: V.sub(V.up(target.location, 1), from), speed: 0.9, radius: 0.8, element: "earth", damage: 10 * diff(),
      trail: "poeira", impact: "detritos", range: 30, homing: 0.08, area: false,
      onHit: (e) => ok(e) && stun(e, 25) });
  }, 14);
  cd(s, "arremesso", 6);
  finish(boss, s, 22);
}

function fenda(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.fenda);
  sound(boss.dimension, "mob.warden.dig", boss.location, 0.8, 1.5);
  const pts = [];
  for (const p of players.slice(0, 3)) {
    const dir = V.flat(V.sub(p.location, boss.location));
    const len = Math.min(18, V.dist2d(p.location, boss.location) + 3);
    for (let d = 2; d <= len; d += 1.8) pts.push(ground(boss.dimension, V.add(boss.location, V.mul(dir, d))));
  }
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 1 });
  pts.forEach((pt, i) => {
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      particle(boss.dimension, "detritos", pt, {});
      particle(boss.dimension, "cor_explosao", V.up(pt, 0.3), { color: "earth", radius: 0.8 });
      if (i % 3 === 0) sound(boss.dimension, "dig.stone", pt, 0.6, 1.2);
      for (const e of hitList(boss, pt, 1.3)) {
        dealDamage(boss, e, 9 * diff(), "earth");
        knockFrom(e, pt, 0.1, 0.8);
      }
    }, 20 + Math.floor(i / 2) * 2);
  });
  cd(s, "fenda", 7);
  finish(boss, s, 34);
}

function sworn(boss, s) {
  if (!s.siteId) return [];
  try {
    return boss.dimension.getEntities({ type: SWORN, tags: [KTAG(s.siteId)], location: boss.location, maxDistance: 48 });
  } catch {
    return [];
  }
}

function invocar(boss, s) {
  lock(boss, true);
  setAnim(boss, A.invocar);
  sound(boss.dimension, "mob.evocation_illager.prepare_summon", boss.location, 0.7, 2);
  for (const p of fighters(boss, s)) p.onScreenDisplay.setTitle(" ", { subtitle: "§3Os Juramentados respondem ao rei! §7Derrote-os para quebrar o juramento",
    fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
  const pts = [];
  for (let i = 0; i < 16 && pts.length < 3; i++) {
    const pt = ground(boss.dimension, V.add(s.home, V.rotY({ x: 5, y: 0, z: 0 }, rand(0, 360))));
    if (free(boss.dimension, pt)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "cor_circulo_magico", pt, { color: "ice", radius: 1 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    let n = 0;
    for (const pt of pts) {
      try {
        const e = boss.dimension.spawnEntity(SWORN, pt, { initialPersistence: true });
        e.addTag(KTAG(s.siteId));
        e.nameTag = "Juramentado";
        particle(boss.dimension, "alma_explosao", V.up(pt, 0.5), { radius: 1 });
        n++;
      } catch { /* */ }
    }
    if (n) {
      s.shield = true;
      setAnim(boss, A.escudo);
      updateName(boss, s);
    }
  }, 30);
  cd(s, "invocar", 32);
  s.busy = tick() + 40;
}

function breakShield(boss, s) {
  s.shield = false;
  lock(boss, false);
  setAnim(boss, A.furia);
  s.invuln = 0;
  updateName(boss, s);
  sound(boss.dimension, "mob.ravager.stun", boss.location, 0.6, 1.5);
  particle(boss.dimension, "cor_explosao", V.up(boss.location, 2), { color: "ice", radius: 2.5 });
  for (const p of fighters(boss, s)) p.onScreenDisplay.setActionBar("§bO juramento cede! §fDurgan está vulnerável.");
  s.busy = tick() + 40;
  system.runTimeout(() => ok(boss) && !s.dying && setAnim(boss, A.none), 40);
}

function furia(boss, s, players) {
  const pool = (s.rocks.length ? s.rocks.map((r) => ({ x: r.x + 0.5, y: r.y, z: r.z + 0.5 })) : [])
    .concat(players.map((p) => ground(boss.dimension, p.location)));
  const pts = pool.sort(() => Math.random() - 0.5).slice(0, 3 + Math.min(3, players.length));
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 1.6 });
  sound(boss.dimension, "mob.warden.dig", boss.location, 0.6, 1.2);
  for (const p of players) shake(p, 0.15, 1);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const pt of pts) {
      particle(boss.dimension, "detritos", V.up(pt, 4), {});
      particle(boss.dimension, "poeira", pt, { radius: 1.6 });
      sound(boss.dimension, "random.anvil_land", pt, 0.6, 0.8);
      for (const e of hitList(boss, pt, 1.7)) {
        dealDamage(boss, e, 10 * diff(), "earth");
        knockFrom(e, pt, 0.5, 0.2);
      }
    }
  }, 28);
  cd(s, "furia", 6);
}

function phaseChange(boss, s) {
  s.phase = 2;
  try {
    boss.setProperty(`${NS}:phase`, 2);
    boss.triggerEvent("valdoria:fase2");
  } catch { /* */ }
  lock(boss, true);
  setAnim(boss, A.furia);
  s.invuln = tick() + 40;
  sound(boss.dimension, "mob.ravager.roar", boss.location, 0.6, 2);
  for (const p of fighters(boss, s)) {
    shake(p, 0.35, 1.5);
    p.onScreenDisplay.setTitle("§bA Fúria da Montanha", { subtitle: "§7\"Pela pedra e pelo ouro, o juramento não se quebra!\"",
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  }
  updateName(boss, s);
  s.cds.invocar = tick() + 50;
  finish(boss, s, 40);
}

function intro(boss) {
  const s = st(boss);
  s.intro = true;
  lock(boss, true);
  setAnim(boss, A.intro);
  s.invuln = tick() + 60;
  sound(boss.dimension, "mob.vex.ambient", boss.location, 0.4, 2);
  particle(boss.dimension, "cor_explosao", V.up(boss.location, 1.5), { color: "ice", radius: 2 });
  for (const p of boss.dimension.getPlayers({ location: boss.location, maxDistance: 32 })) {
    p.onScreenDisplay.setTitle(`§b${NAME}`, { subtitle: "§7\"Quem ousa pisar no salão de Kar'Dum?\"", fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
  }
  updateName(boss, s);
  finish(boss, s, 60);
}

function startDeath(boss, s) {
  if (s.dying) return;
  s.dying = true;
  lock(boss, true);
  setAnim(boss, A.morte);
  const h = health(boss);
  if (h) h.setCurrentValue(1);
  sound(boss.dimension, "mob.vex.death", boss.location, 0.4, 1.5);
  for (const e of sworn(boss, s)) {
    try { e.kill(); } catch { /* */ }
  }
  for (const p of fighters(boss, s, 40)) p.onScreenDisplay.setTitle(" ", { subtitle: "§7\"O juramento... está cumprido. Kar'Dum pode descansar.\"",
    fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15 });
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "cor_explosao", V.up(loc, 2), { color: "ice", radius: 3 });
    particle(dim, "nivel_anel", loc, {});
    const players = rewards(s, loc, dim);
    states.delete(boss.id);
    boss.remove();
    for (const fn of defeatHooks) {
      try { fn(s.siteId, players, dim); } catch (e) { console.warn(`[Valdoria] vitória de Kar'Dum: ${e}`); }
    }
  }, 60);
}

function rewards(s, loc, dim) {
  let maxLuck = 0;
  const players = [];
  for (const [pid, done] of s.contrib) {
    const p = world.getEntity(pid);
    if (!ok(p) || V.dist(p.location, loc) > 80) continue;
    players.push([p, done]);
  }
  for (const p of dim.getPlayers({ location: loc, maxDistance: 30 })) if (!players.some(([q]) => q.id === p.id)) players.push([p, 0]);
  const total = players.reduce((a, [, d]) => a + d, 0) || 1;
  for (const [p, done] of players) {
    const share = Math.max(0.4, done / total);
    addXP(p, Math.round(2000 * share), "Rei Durgan");
    const d = getData(p);
    d.chefes++;
    d.abates[KING] = (d.abates[KING] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§b§lVITÓRIA", { subtitle: "§7O último rei de Kar'Dum encontra o descanso", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:moeda_ouro`, randInt(80, 150));
  drop(`${NS}:lingote_mithril`, randInt(4, 7));
  drop(`${NS}:pedra_aprimoramento`, randInt(2, 4));
  drop(`${NS}:engrenagem_runica`, randInt(2, 4));
  if (chance(0.25 + maxLuck)) drop(`${NS}:martelo_durgan`, 1);
  for (let i = 0; i < 28; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-1.5, 1.5), y: 1, z: rand(-1.5, 1.5) }));
  world.sendMessage(`§b[Valdoria] §f${NAME}§f foi libertado por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
  return players.map(([p]) => p);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying) return;
  if (s.shield && !sworn(boss, s).length && s.busy <= tick()) return breakShield(boss, s);
  if (s.busy > tick()) return;
  const players = fighters(boss, s);
  if (!players.length) return;
  if (!inArena(s, boss.location) || V.dist(boss.location, s.home) > 18) {
    particle(boss.dimension, "cor_explosao", V.up(boss.location, 1), { color: "ice", radius: 1 });
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  if (s.phase === 1 && hpPct(boss) <= 0.5) return phaseChange(boss, s);
  if (s.shield) { // ajoelhado: só a Fúria da Montanha continua
    if (ready(s, "furia")) furia(boss, s, players);
    return;
  }
  const target = players.sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location))[0];
  const dist = V.dist2d(target.location, boss.location);
  const close = players.filter((p) => V.dist(p.location, boss.location) < 4).length;
  if (s.phase === 2 && ready(s, "invocar")) return invocar(boss, s);
  if (s.phase === 2 && ready(s, "furia")) furia(boss, s, players);
  if ((close >= 2 || (close && s.phase === 2)) && ready(s, "giro")) return giro(boss, s);
  if (dist < 4.5 && ready(s, "martelada")) return martelada(boss, s, target);
  if (dist > 7 && ready(s, "arremesso")) return arremesso(boss, s, target);
  if (ready(s, "fenda") && (dist > 5 || chance(0.35))) return fenda(boss, s, players);
}

// ------------------------------------------------------------------ API para as ruínas
export function spawnKing(dim, pos, siteId) {
  const boss = dim.spawnEntity(KING, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
  boss.setDynamicProperty(`${NS}:local`, siteId);
  boss.addTag(KTAG(siteId));
  states.delete(boss.id);
  intro(boss);
  return boss;
}
export function kingOf(dim, siteId) {
  try {
    return dim.getEntities({ type: KING, tags: [KTAG(siteId)] })[0];
  } catch {
    return undefined;
  }
}
/** Remove o rei e os Juramentados (reinício da luta). */
export function despawnKing(dim, siteId) {
  try {
    for (const e of dim.getEntities({ tags: [KTAG(siteId)] })) {
      states.delete(e.id);
      e.remove();
    }
  } catch { /* */ }
}
export function kingState(boss) {
  return st(boss);
}

export function startKing() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId !== KING) return;
    const s = st(e);
    if (s.dying || s.invuln > tick()) {
      ev.cancel = true;
      return;
    }
    if (s.shield) {
      ev.cancel = true;
      particle(e.dimension, "escudo", e.location, {});
      if (ok(ev.src) && isPlayer(ev.src)) ev.src.onScreenDisplay.setActionBar("§3O juramento protege o rei! §fDerrote os Juramentados.");
      return;
    }
    if (ok(ev.src) && isPlayer(ev.src)) s.contrib.set(ev.src.id, (s.contrib.get(ev.src.id) || 0) + ev.damage);
    const h = health(e);
    if (h && h.currentValue - ev.damage <= 1) {
      ev.cancel = true;
      system.run(() => ok(e) && startDeath(e, s));
    }
  });
  system.runInterval(() => {
    for (const dimId of ["minecraft:overworld", "minecraft:nether"]) {
      let list = [];
      try { list = world.getDimension(dimId).getEntities({ type: KING }); } catch { continue; }
      for (const boss of list) {
        try { think(boss); } catch (err) { console.warn(`[Valdoria] Rei Durgan: ${err}`); }
      }
    }
  }, 5);
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === KING) updateName(ev.entity, st(ev.entity));
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== KING) return;
    system.runTimeout(() => ok(e) && !st(e).intro && intro(e), 2);
  });
}
