// Chefe do Santuário Celestial: Auriel, o Guardião Celestial (Plataforma do Guardião).
// Fase I: Estocada (linha marcada à frente), Lanças de Luz (círculos marcados sob cada jogador) e Investida Alada (voa e cai num
// círculo marcado).
// Fase II (66%): Rajada das Asas (empurra todos para longe; quem estiver agachado se firma) e Chamado (desce duas Sentinelas).
// Fase III (33%): Ascensão e Juízo Celestial: sobe acima da plataforma e canaliza por 7 s; quem estiver longe dele (fora do círculo
// de luz marcado em volta) recebe um golpe enorme. Ao contrário do Eclipse de Azrakar, aqui o lugar seguro é PERTO do chefe, e ele
// não fica protegido enquanto canaliza. Todo ataque de área é marcado antes de acertar.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, hpPct } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { dealDamage, onBeforeHurt, canHit } from "../core/damage.js";
import { ground, knockFrom } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

export const AURIEL = `${NS}:guardiao_celeste`;
const SENTINEL = `${NS}:sentinela_celeste`;
const NAME = "Auriel, o Guardião Celestial";
const A = { none: 0, estocada: 1, investida: 2, lancas: 3, rajada: 4, chamado: 5, juizo: 6, intro: 7, morte: 8, ascensao: 9 };
export const UTAG = (siteId) => `vu_${siteId}`;
export const JUIZO_R = 5.5; // raio do círculo seguro em volta de Auriel no Juízo
const states = new Map();
const defeatHooks = [];
/** @type {(siteId: string) => any} */
let resolver = () => undefined;

export function setAurielArenaResolver(fn) {
  resolver = fn;
}
export function onAurielDefeated(fn) {
  defeatHooks.push(fn);
}

function st(boss) {
  let s = states.get(boss.id);
  if (!s) {
    let siteId;
    try { siteId = boss.getDynamicProperty(`${NS}:local`); } catch { /* */ }
    if (typeof siteId !== "string") {
      siteId = `e${boss.id}`;
      try {
        boss.setDynamicProperty(`${NS}:local`, siteId);
        boss.addTag(UTAG(siteId));
      } catch { /* */ }
    }
    const info = resolver(siteId);
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), dying: false, siteId, juizo: null,
      arena: info?.arena, home: info?.center || { ...boss.location } };
    try { s.phase = Number(boss.getProperty(`${NS}:phase`)) || 1; } catch { /* */ }
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
function inArena(s, loc) {
  if (!s.arena) return true;
  const [a, b] = s.arena;
  return loc.x >= a.x - 1 && loc.x <= b.x + 2 && loc.z >= a.z - 1 && loc.z <= b.z + 2 && loc.y >= a.y - 3 && loc.y <= b.y + 3;
}
function fighters(boss, s, r = 36) {
  return boss.dimension.getPlayers({ location: boss.location, maxDistance: r }).filter((p) => isActivePlayer(p) && inArena(s, p.location));
}
const PHASE_TXT = ["", "I", "II", "III"];
function updateName(boss, s) {
  boss.nameTag = `§e${NAME} §7- Fase ${PHASE_TXT[s.phase]}${s.juizo ? " §6[Juízo]" : ""}`;
}
function facing(boss, target) {
  try { boss.teleport(boss.location, { facingLocation: V.up(target.location, 1.5), keepVelocity: false }); } catch { /* */ }
}
const ready = (s, k) => (s.cds[k] || 0) <= tick();
function cd(s, k, sec) {
  s.cds[k] = tick() + Math.round(sec * 20 * (s.phase === 3 ? 0.75 : s.phase === 2 ? 0.88 : 1));
}
function finish(boss, s, after) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying || s.juizo) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, after);
  s.busy = tick() + after + 6;
}
function hitList(boss, c, r) {
  try {
    return boss.dimension.getEntities({ location: c, maxDistance: r + 0.5 }).filter((e) => canHit(boss, e, false) && e.typeId !== SENTINEL);
  } catch {
    return [];
  }
}
const fwd = (boss) => V.flat(boss.getViewDirection());
function sentinels(boss, s) {
  try {
    return boss.dimension.getEntities({ type: SENTINEL, tags: [UTAG(s.siteId)], location: boss.location, maxDistance: 48 });
  } catch {
    return [];
  }
}
/** Distância de um ponto ao segmento [a, b] no plano horizontal. */
function segDist(p, a, b) {
  const ab = { x: b.x - a.x, z: b.z - a.z };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.z - a.z) * ab.z) / (ab.x * ab.x + ab.z * ab.z || 1)));
  return Math.hypot(p.x - (a.x + ab.x * t), p.z - (a.z + ab.z * t));
}

// ------------------------------------------------------------------ ataques
function estocada(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.estocada);
  const dir = fwd(boss);
  const a = { ...boss.location };
  const b = V.add(a, V.mul(dir, 9));
  for (let k = 1; k <= 9; k++) particle(boss.dimension, "alerta_area", ground(boss.dimension, V.add(a, V.mul(dir, k))), { radius: 0.9 });
  sound(boss.dimension, "item.trident.riptide_1", a, 0.6, 1);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (let k = 1; k <= 9; k += 2) particle(boss.dimension, "sagrado_rastro", V.up(V.add(a, V.mul(dir, k)), 1.2), {});
    particle(boss.dimension, "sagrado_explosao", V.up(b, 1), { radius: 1.2 });
    sound(boss.dimension, "item.trident.throw", a, 0.6, 0.8);
    for (const e of hitList(boss, V.add(a, V.mul(dir, 4.5)), 6)) {
      if (segDist(e.location, a, b) > 1.4) continue;
      dealDamage(boss, e, 16 * diff(), "physical", { kind: "weapon" });
      knockFrom(e, boss.location, 1.1, 0.3);
    }
  }, 16);
  cd(s, "estocada", 5);
  finish(boss, s, 24);
}

function lancas(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.lancas);
  sound(boss.dimension, "beacon.power", boss.location, 0.6, 1.4);
  const pts = players.map((p) => ground(boss.dimension, p.location));
  const extra = s.phase >= 2 ? 3 : 1;
  for (let i = 0; i < extra; i++) {
    const pt = ground(boss.dimension, V.add(s.home, V.rotY({ x: rand(2, 7), y: 0, z: 0 }, rand(0, 360))));
    if (inArena(s, pt)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 2.2 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const hit = new Set();
    for (const pt of pts) {
      particle(boss.dimension, "sagrado_pilar", pt, {});
      particle(boss.dimension, "sagrado_explosao", V.up(pt, 0.4), { radius: 2 });
      for (const e of hitList(boss, pt, 2.3)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        dealDamage(boss, e, 14 * diff(), "holy");
      }
    }
    sound(boss.dimension, "item.trident.thunder", boss.location, 0.4, 1.4);
  }, 28);
  cd(s, "lancas", 8);
  finish(boss, s, 32);
}

function investida(boss, s, target) {
  lock(boss, true);
  setAnim(boss, A.investida);
  const pt = ground(boss.dimension, target.location);
  particle(boss.dimension, "alerta_area", pt, { radius: 4 });
  sound(boss.dimension, "mob.enderdragon.flap", boss.location, 0.6, 1.3);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    try { boss.teleport(pt, { keepVelocity: false }); } catch { /* */ }
    particle(boss.dimension, "onda_choque", pt, { radius: 4 });
    particle(boss.dimension, "sagrado_explosao", V.up(pt, 0.5), { radius: 3.5 });
    sound(boss.dimension, "random.anvil_land", pt, 0.5, 0.8);
    for (const p of fighters(boss, s)) shake(p, 0.3, 0.6);
    for (const e of hitList(boss, pt, 4.2)) {
      dealDamage(boss, e, 18 * diff(), "holy");
      knockFrom(e, pt, 1.3, 0.5);
    }
  }, 24);
  cd(s, "investida", 9);
  finish(boss, s, 34);
}

function rajada(boss, s) {
  lock(boss, true);
  setAnim(boss, A.rajada);
  particle(boss.dimension, "alerta_anel", ground(boss.dimension, boss.location), { radius: 9 });
  sound(boss.dimension, "mob.phantom.swoop", boss.location, 0.8, 0.6);
  for (const p of fighters(boss, s)) {
    p.onScreenDisplay.setTitle(" ", { subtitle: "§bRajada das Asas! §fAgache-se para se firmar", fadeInDuration: 0, stayDuration: 25, fadeOutDuration: 5 });
  }
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "vento_explosao", V.up(boss.location, 2), { radius: 8 });
    particle(boss.dimension, "vento_tornado", boss.location, { radius: 3 });
    sound(boss.dimension, "mob.enderdragon.flap", boss.location, 1, 0.5);
    for (const e of hitList(boss, boss.location, 12)) {
      if (isPlayer(e) && e.isSneaking) {
        dealDamage(boss, e, 3 * diff(), "wind");
        if (isPlayer(e)) e.onScreenDisplay.setActionBar("§bVocê se firmou contra o vento.");
        continue;
      }
      dealDamage(boss, e, 8 * diff(), "wind");
      knockFrom(e, boss.location, 2.4, 0.55);
    }
  }, 32);
  cd(s, "rajada", 16);
  finish(boss, s, 40);
}

function chamado(boss, s) {
  lock(boss, true);
  setAnim(boss, A.chamado);
  sound(boss.dimension, "beacon.activate", boss.location, 0.6, 0.8);
  const pts = [];
  for (let i = 0; i < 10 && pts.length < 2; i++) {
    const pt = ground(boss.dimension, V.add(s.home, V.rotY({ x: rand(3, 6), y: 0, z: 0 }, rand(0, 360))));
    if (inArena(s, pt)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "cor_circulo_magico", pt, { color: "holy", radius: 1.2 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const pt of pts) {
      try {
        const k = boss.dimension.spawnEntity(SENTINEL, pt, { initialPersistence: true });
        k.addTag(UTAG(s.siteId));
        particle(boss.dimension, "sagrado_pilar", pt, {});
      } catch { /* */ }
    }
  }, 30);
  cd(s, "chamado", 32);
  finish(boss, s, 40);
}

function ascensao(boss, s) {
  lock(boss, true);
  setAnim(boss, A.ascensao);
  s.invuln = tick() + 48;
  sound(boss.dimension, "beacon.activate", boss.location, 0.8, 0.6);
  particle(boss.dimension, "sagrado_explosao", V.up(boss.location, 3), { radius: 4 });
  for (const p of fighters(boss, s)) {
    shake(p, 0.3, 1.2);
    p.onScreenDisplay.setTitle("§6Ascensão", { subtitle: "§7\"Ajoelhe-se à luz.\" §fNo Juízo, fique PERTO dele: longe, a luz queima",
      fadeInDuration: 5, stayDuration: 70, fadeOutDuration: 15 });
  }
  s.cds.juizo = tick() + 70;
  finish(boss, s, 48);
}

function juizo(boss, s) {
  try { boss.teleport(s.home, { keepVelocity: false }); } catch { /* */ }
  lock(boss, true);
  setAnim(boss, A.juizo);
  s.juizo = { until: tick() + 140, next: tick() };
  sound(boss.dimension, "beacon.ambient", boss.location, 1, 0.6);
  for (const p of fighters(boss, s)) {
    p.onScreenDisplay.setTitle("§6JUÍZO CELESTIAL", { subtitle: "§fCorra para o círculo de luz em volta dele!", fadeInDuration: 5, stayDuration: 45,
      fadeOutDuration: 10 });
  }
  updateName(boss, s);
}
export const underWings = (s, loc) => V.dist2d(loc, s.home) <= JUIZO_R && Math.abs(loc.y - s.home.y) < 6;
function juizoTick(boss, s) {
  const now = tick();
  if (now >= s.juizo.next) {
    s.juizo.next = now + 10;
    particle(boss.dimension, "cor_circulo_magico", { x: s.home.x, y: s.home.y + 0.05, z: s.home.z }, { color: "holy", radius: JUIZO_R });
    particle(boss.dimension, "halo", V.up(boss.location, 6), {});
    const left = Math.ceil((s.juizo.until - now) / 20);
    for (const p of fighters(boss, s)) {
      p.onScreenDisplay.setActionBar(underWings(s, p.location) ? `§eVocê está sob as asas dele. §7(${left}s)` : `§6Aproxime-se dele! §f${left}s`);
    }
  }
  if (now < s.juizo.until) return;
  s.juizo = null;
  particle(boss.dimension, "sagrado_explosao", V.up(boss.location, 2), { radius: 10 });
  sound(boss.dimension, "item.trident.thunder", boss.location, 1, 0.7);
  for (const p of fighters(boss, s)) {
    shake(p, 0.5, 1);
    if (underWings(s, p.location)) {
      particle(p.dimension, "halo", V.up(p.location, 2), {});
      continue;
    }
    particle(p.dimension, "sagrado_pilar", p.location, {});
    dealDamage(boss, p, 36 * diff(), "holy");
  }
  cd(s, "juizo", 42);
  setAnim(boss, A.none);
  lock(boss, false);
  s.busy = tick() + 20;
  updateName(boss, s);
}

function phaseChange(boss, s, phase) {
  s.phase = phase;
  try {
    boss.setProperty(`${NS}:phase`, phase);
    boss.triggerEvent(phase === 2 ? "valdoria:fase2" : "valdoria:fase3");
  } catch { /* */ }
  s.invuln = tick() + 30;
  updateName(boss, s);
  if (phase === 2) {
    sound(boss.dimension, "mob.phantom.swoop", boss.location, 0.6, 0.5);
    for (const p of fighters(boss, s)) p.onScreenDisplay.setTitle("§bOs ventos se erguem", { subtitle: "§7\"O céu não pertence a vocês.\"",
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
    s.cds.rajada = tick() + 40;
    s.cds.chamado = tick() + 80;
    s.busy = tick() + 30;
  } else {
    ascensao(boss, s);
  }
}

function intro(boss) {
  const s = st(boss);
  s.intro = true;
  lock(boss, true);
  setAnim(boss, A.intro);
  s.invuln = tick() + 64;
  sound(boss.dimension, "beacon.activate", boss.location, 0.8, 0.5);
  particle(boss.dimension, "sagrado_pilar", boss.location, {});
  for (const p of boss.dimension.getPlayers({ location: boss.location, maxDistance: 36 })) {
    p.onScreenDisplay.setTitle(`§e${NAME}`, { subtitle: "§7\"Quem tocou na Aetherita podre não passa.\"", fadeInDuration: 10, stayDuration: 50,
      fadeOutDuration: 15 });
  }
  updateName(boss, s);
  finish(boss, s, 64);
}

function startDeath(boss, s) {
  if (s.dying) return;
  s.dying = true;
  s.juizo = null;
  lock(boss, true);
  setAnim(boss, A.morte);
  const h = health(boss);
  if (h) h.setCurrentValue(1);
  sound(boss.dimension, "beacon.deactivate", boss.location, 0.8, 0.8);
  for (const k of sentinels(boss, s)) {
    try { k.kill(); } catch { /* */ }
  }
  for (const p of fighters(boss, s, 40)) p.onScreenDisplay.setTitle(" ", { subtitle: "§7\"Então... a luz escolheu você.\"",
    fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15 });
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "sagrado_explosao", V.up(loc, 2), { radius: 4 });
    particle(dim, "sagrado_pilar", loc, {});
    particle(dim, "nivel_anel", loc, {});
    const players = rewards(s, loc, dim);
    states.delete(boss.id);
    boss.remove();
    for (const fn of defeatHooks) {
      try { fn(s.siteId, players, dim); } catch (e) { console.warn(`[Valdoria] vitória no Santuário Celestial: ${e}`); }
    }
  }, 60);
}

function rewards(s, loc, dim) {
  let maxLuck = 0;
  const players = [];
  for (const [pid] of s.contrib) {
    const p = world.getEntity(pid);
    if (!ok(p) || V.dist(p.location, loc) > 80) continue;
    players.push([p, s.contrib.get(pid)]);
  }
  for (const p of dim.getPlayers({ location: loc, maxDistance: 32 })) if (!players.some(([q]) => q.id === p.id)) players.push([p, 0]);
  const total = players.reduce((a, [, d]) => a + d, 0) || 1;
  for (const [p, dmg] of players) {
    const share = Math.max(0.4, dmg / total);
    addXP(p, Math.round(3500 * share), "Auriel");
    const d = getData(p);
    d.chefes++;
    d.abates[AURIEL] = (d.abates[AURIEL] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§6§lVITÓRIA", { subtitle: "§7O Guardião Celestial se curva", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:moeda_ouro`, randInt(140, 220));
  drop(`${NS}:pluma_auriel`, 1 + (chance(0.25 + maxLuck) ? 1 : 0));
  drop(`${NS}:pena_celeste`, randInt(6, 10));
  drop(`${NS}:pedra_aprimoramento`, randInt(3, 5));
  if (chance(0.25 + maxLuck)) drop(`${NS}:lanca_auriel`, 1);
  for (let i = 0; i < 40; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-1.5, 1.5), y: 1, z: rand(-1.5, 1.5) }));
  world.sendMessage(`§e[Valdoria] §f${NAME}§f foi vencido por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
  return players.map(([p]) => p);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying) return;
  if (s.juizo) return juizoTick(boss, s);
  if (s.busy > tick()) return;
  const players = fighters(boss, s);
  if (!players.length) return;
  if (!inArena(s, boss.location)) {
    particle(boss.dimension, "sagrado_explosao", V.up(boss.location, 1), { radius: 1 });
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  const hp = hpPct(boss);
  if (s.phase === 1 && hp <= 0.66) return phaseChange(boss, s, 2);
  if (s.phase === 2 && hp <= 0.33) return phaseChange(boss, s, 3);
  const target = players.sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location))[0];
  const dist = V.dist2d(target.location, boss.location);
  if (s.phase === 3 && ready(s, "juizo")) return juizo(boss, s);
  if (s.phase >= 2 && ready(s, "chamado") && sentinels(boss, s).length < 2) return chamado(boss, s);
  if (s.phase >= 2 && ready(s, "rajada") && dist < 7) return rajada(boss, s);
  if (dist < 6 && ready(s, "estocada")) return estocada(boss, s, target);
  if (dist > 6 && ready(s, "investida")) return investida(boss, s, target);
  if (ready(s, "lancas") && (dist > 5 || chance(0.3))) return lancas(boss, s, players);
}

// ------------------------------------------------------------------ API para o Santuário
export function spawnAuriel(dim, pos, siteId) {
  const boss = dim.spawnEntity(AURIEL, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
  boss.setDynamicProperty(`${NS}:local`, siteId);
  boss.addTag(UTAG(siteId));
  states.delete(boss.id);
  intro(boss);
  return boss;
}
export function aurielOf(dim, siteId) {
  try {
    return dim.getEntities({ type: AURIEL, tags: [UTAG(siteId)] })[0];
  } catch {
    return undefined;
  }
}
/** Remove Auriel e as sentinelas que ele chamou (reinício da luta). */
export function despawnAuriel(dim, siteId) {
  try {
    for (const e of dim.getEntities({ tags: [UTAG(siteId)] })) {
      states.delete(e.id);
      e.remove();
    }
  } catch { /* */ }
}
export function aurielState(boss) {
  return st(boss);
}

export function startAuriel() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId !== AURIEL) return;
    const s = st(e);
    if (s.dying || s.invuln > tick()) {
      ev.cancel = true;
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
    let list = [];
    try { list = world.getDimension("minecraft:overworld").getEntities({ type: AURIEL }); } catch { return; }
    for (const boss of list) {
      try { think(boss); } catch (err) { console.warn(`[Valdoria] Auriel: ${err}`); }
    }
  }, 5);
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === AURIEL) updateName(ev.entity, st(ev.entity));
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== AURIEL) return;
    system.runTimeout(() => ok(e) && !st(e).intro && intro(e), 2);
  });
}
