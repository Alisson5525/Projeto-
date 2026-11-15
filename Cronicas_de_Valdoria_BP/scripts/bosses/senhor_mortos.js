// Chefe da Cripta: Malachar, o Senhor dos Mortos - 3 fases, ataques telegrafados, escudo de filactérios, invocações e tempestade de almas.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, hpPct } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { dealDamage, onBeforeHurt, addVulnerable, canHit } from "../core/damage.js";
import { launch, ground, knockFrom } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

export const LICH = `${NS}:senhor_mortos`;
export const PHYL = `${NS}:filacterio`;
const NAME = "Malachar, o Senhor dos Mortos";
const A = { none: 0, bolt: 1, spikes: 2, summon: 3, teleport: 4, shield: 5, storm: 6, death: 7, intro: 8, nova: 9 };
export const BTAG = (siteId) => `vb_${siteId}`;
const states = new Map();
const defeatHooks = [];
/** @type {(siteId: string) => any} */
let resolver = () => undefined;

/** O registro da masmorra informa a arena (caixa, centro e pedestais) de cada local. */
export function setArenaResolver(fn) {
  resolver = fn;
}
export function onLichDefeated(fn) {
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
    if (!siteId) { // gerado por ovo/comando: identificador próprio para marcar servos e filactérios
      siteId = `e${boss.id}`;
      try {
        boss.setDynamicProperty(`${NS}:local`, siteId);
        boss.addTag(BTAG(siteId));
      } catch { /* */ }
    }
    const info = resolver(siteId);
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), dying: false, shield: false, siteId,
      arena: info?.arena, home: info?.center || { ...boss.location }, pedestals: info?.pedestals || [] };
    try {
      s.phase = Number(boss.getProperty(`${NS}:phase`)) || 1;
    } catch { /* */ }
    states.set(boss.id, s);
    if (s.phase === 2) s.shield = phylacteries(boss, s).length > 0; // mundo recarregado no meio da fase II
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
  boss.nameTag = `§5${NAME} §7- Fase ${["I", "II", "III"][s.phase - 1]}${s.shield ? " §b[Escudo]" : ""}`;
}
function facing(boss, target) {
  try {
    boss.teleport(boss.location, { facingLocation: V.up(target.location, 1), keepVelocity: false });
  } catch { /* */ }
}
const ready = (s, key) => (s.cds[key] || 0) <= tick();
function cd(s, key, sec) {
  s.cds[key] = tick() + Math.round(sec * 20 * (s.phase === 3 ? 0.7 : 1));
}
function finish(boss, s, after) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, after);
  s.busy = tick() + after + 6;
}
function hitList(boss, c, r) {
  try {
    return boss.dimension.getEntities({ location: c, maxDistance: r + 0.5 }).filter((e) => canHit(boss, e, false));
  } catch {
    return [];
  }
}
/** Ponto livre (2 blocos de ar acima do chão) para teleporte ou invocação. */
function free(dim, loc) {
  try {
    const b = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
    return [0, 1, 2].every((dy) => dim.getBlock({ x: b.x, y: b.y + dy, z: b.z })?.isAir);
  } catch {
    return false;
  }
}

function staffTip(boss) {
  const f = V.flat(boss.getViewDirection());
  const right = { x: -f.z, y: 0, z: f.x };
  return V.add(V.up(boss.location, 3.1), V.add(V.mul(f, 0.4), V.mul(right, -0.5)));
}

// ------------------------------------------------------------------ ataques
function bolts(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.bolt);
  particle(boss.dimension, "cor_carga", staffTip(boss), { color: "dark" });
  sound(boss.dimension, "mob.evocation_illager.prepare_attack", boss.location, 0.7, 1.5);
  const n = s.phase === 3 ? 5 : 3;
  for (let i = 0; i < n; i++) {
    system.runTimeout(() => {
      if (!ok(boss) || s.dying || !ok(target)) return;
      const from = staffTip(boss);
      launch(boss, { from, dir: V.sub(V.up(target.location, 1), from), speed: 0.85, radius: 0.55, element: "dark", damage: 7 * diff(),
        trail: "alma_rastro", impact: "alma_explosao", range: 40, homing: 0.12, area: false });
      sound(boss.dimension, "mob.wither.shoot", from, 1.3, 0.8);
    }, 10 + i * 6);
  }
  cd(s, "bolt", 4.5);
  finish(boss, s, 12 + n * 6);
}

function spikes(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.spikes);
  sound(boss.dimension, "mob.evocation_illager.cast_spell", boss.location, 0.6, 1.5);
  const pts = [];
  for (const p of players.slice(0, 4)) {
    const dir = V.flat(V.sub(p.location, boss.location));
    const len = Math.min(16, V.dist2d(p.location, boss.location) + 3);
    for (let d = 2; d <= len; d += 1.6) pts.push(ground(boss.dimension, V.add(boss.location, V.mul(dir, d))));
    if (s.phase === 3) {
      const side = { x: -dir.z, y: 0, z: dir.x };
      for (let d = -4; d <= 4; d += 1.6) if (Math.abs(d) > 0.5) pts.push(ground(boss.dimension, V.add(p.location, V.mul(side, d))));
    }
  }
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 0.9 });
  system.runTimeout(() => pts.forEach((pt) => ok(boss) && particle(boss.dimension, "alerta_anel", pt, { radius: 0.9 })), 10);
  pts.forEach((pt, i) => {
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      particle(boss.dimension, "espinhos_osso", pt, { radius: 0.8 });
      if (i % 3 === 0) sound(boss.dimension, "hit.bone_block", pt, 0.7, 1);
      for (const e of hitList(boss, pt, 1.2)) {
        dealDamage(boss, e, 9 * diff(), "physical", { kind: "weapon" });
        knockFrom(e, pt, 0.1, 0.75);
      }
    }, 22 + Math.floor(i / 2));
  });
  cd(s, "spikes", 7);
  finish(boss, s, 34);
}

function nova(boss, s) {
  lock(boss, true);
  setAnim(boss, A.nova);
  particle(boss.dimension, "alerta_anel", boss.location, { radius: 5 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "alma_explosao", V.up(boss.location, 1), { radius: 4 });
    particle(boss.dimension, "onda_choque", boss.location, { radius: 2.5 });
    sound(boss.dimension, "mob.warden.attack", boss.location, 0.8, 1.5);
    for (const e of hitList(boss, boss.location, 5)) {
      dealDamage(boss, e, 8 * diff(), "dark");
      knockFrom(e, boss.location, 1.6, 0.4);
    }
  }, 12);
  cd(s, "nova", 6);
  finish(boss, s, 18);
}

function minions(boss) {
  const s = st(boss);
  if (!s.siteId) return [];
  try {
    return boss.dimension.getEntities({ tags: [BTAG(s.siteId)], location: boss.location, maxDistance: 48 })
      .filter((e) => e.typeId !== LICH && e.typeId !== PHYL);
  } catch {
    return [];
  }
}
function tagged(boss, e) {
  const s = st(boss);
  if (s.siteId) e.addTag(BTAG(s.siteId));
}

function summonDead(boss, s) {
  lock(boss, true);
  setAnim(boss, A.summon);
  sound(boss.dimension, "mob.evocation_illager.prepare_summon", boss.location, 0.6, 2);
  const n = s.phase === 3 ? 3 : 2;
  const pts = [];
  for (let i = 0; i < n * 4 && pts.length < n; i++) {
    const pt = ground(boss.dimension, V.add(boss.location, V.rotY({ x: 3.5, y: 0, z: 0 }, rand(0, 360))));
    if (free(boss.dimension, pt)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "cor_circulo_magico", pt, { color: "dark", radius: 1 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const [i, pt] of pts.entries()) {
      try {
        const e = boss.dimension.spawnEntity(i === 2 ? "minecraft:stray" : "minecraft:skeleton", pt, { initialPersistence: true });
        tagged(boss, e);
        particle(boss.dimension, "sombra_explosao", V.up(pt, 0.5), { radius: 1 });
      } catch { /* */ }
    }
  }, 26);
  cd(s, "summon", 14);
  finish(boss, s, 40);
}

function teleport(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.teleport);
  particle(boss.dimension, "sombra_explosao", V.up(boss.location, 1.5), { radius: 1.5 });
  sound(boss.dimension, "mob.endermen.portal", boss.location, 0.6, 1.5);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    let best = s.home;
    let bestD = -1;
    for (let i = 0; i < 10; i++) {
      const c = V.add(s.home, { x: rand(-7, 7), y: 0, z: rand(-7, 7) });
      if (!free(boss.dimension, c)) continue;
      const d = Math.min(...players.map((p) => V.dist2d(p.location, c)));
      if (d > bestD) {
        bestD = d;
        best = c;
      }
    }
    try {
      boss.teleport(best, { facingLocation: players[0]?.location });
    } catch { /* */ }
    particle(boss.dimension, "sombra_explosao", V.up(best, 1.5), { radius: 1.5 });
  }, 10);
  cd(s, "teleport", 9);
  finish(boss, s, 22);
}

function storm(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.storm);
  sound(boss.dimension, "mob.wither.ambient", boss.location, 0.5, 2);
  for (const p of players) {
    p.onScreenDisplay.setActionBar("§bTempestade de Almas! §fFuja dos círculos marcados.");
    shake(p, 0.2, 2);
  }
  const pts = [];
  for (const p of players) pts.push(ground(boss.dimension, p.location));
  while (pts.length < 10) pts.push(ground(boss.dimension, V.add(s.home, { x: rand(-9, 9), y: 0, z: rand(-9, 9) })));
  for (const [i, pt] of pts.entries()) {
    const delay = 8 + i * 3;
    system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_area", pt, { radius: 1.8 }), delay);
    system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", pt, { radius: 1.8 }), delay + 12);
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      particle(boss.dimension, "alma_pilar", pt, {});
      particle(boss.dimension, "alma_explosao", V.up(pt, 0.5), { radius: 1.6 });
      sound(boss.dimension, "mob.vex.charge", pt, 0.6, 0.8);
      for (const e of hitList(boss, pt, 1.9)) dealDamage(boss, e, 9 * diff(), "dark");
    }, delay + 26);
  }
  cd(s, "storm", 15);
  finish(boss, s, 8 + pts.length * 3 + 30);
}

// ------------------------------------------------------------------ escudo de filactérios (fase II)
function phylacteries(boss, s) {
  if (!s.siteId) return [];
  try {
    return boss.dimension.getEntities({ type: PHYL, tags: [BTAG(s.siteId)], location: boss.location, maxDistance: 48 });
  } catch {
    return [];
  }
}
function raiseShield(boss, s) {
  s.shield = true;
  const pts = s.pedestals.length ? s.pedestals : [0, 120, 240].map((a) => V.add(s.home, V.rotY({ x: 6, y: 1, z: 0 }, a)));
  for (const pos of pts) {
    try {
      const e = boss.dimension.spawnEntity(PHYL, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
      tagged(boss, e);
      particle(boss.dimension, "alma_pilar", pos, {});
      particle(boss.dimension, "invocacao", pos, {});
    } catch { /* */ }
  }
  updateName(boss, s);
}
function breakShield(boss, s) {
  s.shield = false;
  updateName(boss, s);
  lock(boss, true);
  setAnim(boss, A.shield);
  addVulnerable(boss, 0.5, 4);
  particle(boss.dimension, "alma_explosao", V.up(boss.location, 1.5), { radius: 3 });
  sound(boss.dimension, "random.glass", boss.location, 0.5, 2);
  for (const p of fighters(boss, s, 40)) {
    p.onScreenDisplay.setTitle(" ", { subtitle: "§bO escudo de almas se partiu! §f(+50% de dano por 4 s)", fadeInDuration: 3, stayDuration: 40, fadeOutDuration: 10 });
    shake(p, 0.3, 0.6);
  }
  s.busy = tick() + 86;
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, 80);
}

function phaseChange(boss, s, phase) {
  s.phase = phase;
  s.invuln = tick() + 50;
  s.busy = tick() + 56;
  lock(boss, true);
  setAnim(boss, phase === 2 ? A.summon : A.storm);
  try {
    boss.setProperty(`${NS}:phase`, phase);
    boss.triggerEvent(phase === 2 ? "valdoria:fase2" : "valdoria:fase3");
  } catch { /* */ }
  sound(boss.dimension, "mob.wither.spawn", boss.location, 0.7, 1.5);
  particle(boss.dimension, "sombra_explosao", V.up(boss.location, 2), { radius: 3 });
  for (const p of fighters(boss, s, 40)) {
    shake(p, 0.4, 1);
    p.onScreenDisplay.setTitle(" ", {
      subtitle: phase === 2 ? "§5Malachar ergue um escudo de almas! §7Destrua os 3 filactérios." : "§cMalachar libera a Tempestade de Almas!",
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
  }
  if (phase === 2) system.runTimeout(() => ok(boss) && !s.dying && raiseShield(boss, s), 20);
  updateName(boss, s);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, 50);
}

function intro(boss) {
  const s = st(boss);
  s.intro = true;
  s.invuln = tick() + 62;
  s.busy = tick() + 66;
  lock(boss, true);
  setAnim(boss, A.intro);
  updateName(boss, s);
  particle(boss.dimension, "sombra_zona", boss.location, { radius: 3 });
  for (let i = 0; i < 4; i++) system.runTimeout(() => ok(boss) && particle(boss.dimension, "alma_pilar", boss.location, {}), i * 12);
  sound(boss.dimension, "mob.warden.emerge", boss.location, 0.7, 2);
  for (const p of fighters(boss, s, 48)) {
    shake(p, 0.25, 2.5);
    p.onScreenDisplay.setTitle("§5§lMALACHAR", { subtitle: "§7O Senhor dos Mortos desperta", fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
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
  sound(boss.dimension, "mob.wither.death", boss.location, 0.4, 1.5);
  for (const e of minions(boss).concat(phylacteries(boss, s))) {
    try { e.kill(); } catch { /* */ }
  }
  for (let i = 0; i < 6; i++) system.runTimeout(() => ok(boss) && particle(boss.dimension, "alma_explosao", V.up(boss.location, rand(0.5, 3)), { radius: 1 }), i * 9);
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "alma_pilar", loc, {});
    particle(dim, "sombra_explosao", V.up(loc, 1), { radius: 3 });
    const players = rewards(s, loc, dim);
    states.delete(boss.id);
    boss.remove();
    for (const fn of defeatHooks) {
      try { fn(s.siteId, players, dim); } catch (e) { console.warn(`[Valdoria] vitória da cripta: ${e}`); }
    }
  }, 62);
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
    addXP(p, Math.round(1800 * share), "Senhor dos Mortos");
    const d = getData(p);
    d.chefes++;
    d.abates[LICH] = (d.abates[LICH] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§5§lVITÓRIA", { subtitle: "§7Malachar retorna ao pó", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:fragmento_alma`, randInt(3, 6));
  drop(`${NS}:moeda_ouro`, randInt(60, 120));
  drop(`${NS}:lingote_mithril`, randInt(3, 6));
  drop(`${NS}:pedra_aprimoramento`, randInt(2, 4));
  if (chance(0.35 + maxLuck)) drop(`${NS}:coroa_mortos`, 1);
  for (let i = 0; i < 25; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-1, 1), y: 1, z: rand(-1, 1) }));
  world.sendMessage(`§5[Valdoria] §f${NAME}§f foi derrotado por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
  return players.map(([p]) => p);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying) return;
  if (s.shield && !phylacteries(boss, s).length && s.busy <= tick()) return breakShield(boss, s);
  if (s.busy > tick()) return;
  const players = fighters(boss, s);
  if (!players.length) return;
  if (!inArena(s, boss.location) || V.dist(boss.location, s.home) > 16) {
    particle(boss.dimension, "sombra_explosao", V.up(boss.location, 1), { radius: 1 });
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  const hp = hpPct(boss);
  if (s.phase === 1 && hp <= 0.66) return phaseChange(boss, s, 2);
  if (s.phase === 2 && hp <= 0.33 && !s.shield) return phaseChange(boss, s, 3);
  const target = players.sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location))[0];
  const dist = V.dist2d(target.location, boss.location);
  const close = players.filter((p) => V.dist(p.location, boss.location) < 4.5).length;
  if (close && ready(s, "nova")) return nova(boss, s);
  if (s.phase === 3 && ready(s, "storm")) return storm(boss, s, players);
  if (s.phase >= 2 && ready(s, "summon") && minions(boss).length < 4) return summonDead(boss, s);
  if (s.phase >= 2 && close && ready(s, "teleport")) return teleport(boss, s, players);
  if (ready(s, "spikes") && (dist > 5 || chance(0.4))) return spikes(boss, s, players);
  if (ready(s, "bolt")) return bolts(boss, s, target);
}

// ------------------------------------------------------------------ API para a masmorra
export function spawnLich(dim, pos, siteId) {
  const boss = dim.spawnEntity(LICH, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
  boss.setDynamicProperty(`${NS}:local`, siteId);
  boss.addTag(BTAG(siteId));
  states.delete(boss.id);
  intro(boss);
  return boss;
}
export function lichOf(dim, siteId) {
  try {
    return dim.getEntities({ type: LICH, tags: [BTAG(siteId)] })[0];
  } catch {
    return undefined;
  }
}
/** Remove o chefe, filactérios e servos (reinício da luta). */
export function despawnLich(dim, siteId) {
  try {
    for (const e of dim.getEntities({ tags: [BTAG(siteId)] })) {
      states.delete(e.id);
      e.remove();
    }
  } catch { /* */ }
}

export function startLich() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId !== LICH) return;
    const s = st(e);
    if (s.dying || s.invuln > tick()) {
      ev.cancel = true;
      return;
    }
    if (s.shield) {
      ev.cancel = true;
      particle(e.dimension, "escudo", e.location, {});
      if (ok(ev.src) && isPlayer(ev.src)) ev.src.onScreenDisplay.setActionBar("§bEscudo de almas! §fDestrua os filactérios nos pedestais.");
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
    for (const boss of world.getDimension("minecraft:overworld").getEntities({ type: LICH })) {
      try { think(boss); } catch (err) { console.warn(`[Valdoria] Senhor dos Mortos: ${err}`); }
    }
  }, 5);
  // filactérios: aura visual
  system.runInterval(() => {
    for (const ph of world.getDimension("minecraft:overworld").getEntities({ type: PHYL })) {
      particle(ph.dimension, "almas", V.up(ph.location, 0.8), {});
    }
  }, 10);
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === LICH) updateName(ev.entity, st(ev.entity));
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== LICH) return;
    system.runTimeout(() => ok(e) && !st(e).intro && intro(e), 2);
  });
}
