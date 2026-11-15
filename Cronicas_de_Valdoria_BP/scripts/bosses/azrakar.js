// Chefe do Reino Sombrio: Azrakar, o Rei Demônio (Salão do Trono de Nyxhal).
// Fase I: Corte Sombrio (arco à frente), Lâmina Descendente (salta e cai num círculo marcado) e Orbes do Abismo (projéteis).
// Fase II (66%): Chamas do Inferno (linhas marcadas no chão que entram em erupção) e Legião (chama Cavaleiros Corrompidos).
// Fase III (33%): Fúria (abre as asas, fica mais rápido) e Eclipse: volta ao trono, escurece o salão e canaliza por 8 s; quem não
// estiver num dos quatro Círculos de Luz recebe um golpe enorme. Todo ataque de área é marcado antes de acertar.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, hpPct, effect } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { dealDamage, onBeforeHurt, canHit } from "../core/damage.js";
import { ground, knockFrom, launch } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

export const AZRAKAR = `${NS}:azrakar`;
const KNIGHT = `${NS}:cavaleiro_corrompido`;
const NAME = "Azrakar, o Rei Demônio";
const A = { none: 0, corte: 1, salto: 2, orbes: 3, chamas: 4, legiao: 5, eclipse: 6, intro: 7, morte: 8, furia: 9 };
export const ATAG = (siteId) => `va_${siteId}`;
const states = new Map();
const defeatHooks = [];
/** @type {(siteId: string) => any} */
let resolver = () => undefined;

export function setAzrakarArenaResolver(fn) {
  resolver = fn;
}
export function onAzrakarDefeated(fn) {
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
        boss.addTag(ATAG(siteId));
      } catch { /* */ }
    }
    const info = resolver(siteId);
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), dying: false, siteId, eclipse: null,
      arena: info?.arena, home: info?.center || { ...boss.location }, throne: info?.throne || { ...boss.location }, lights: info?.lights || [] };
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
  boss.nameTag = `§c${NAME} §7- Fase ${PHASE_TXT[s.phase]}${s.eclipse ? " §5[Eclipse]" : ""}`;
}
function facing(boss, target) {
  try { boss.teleport(boss.location, { facingLocation: V.up(target.location, 1.5), keepVelocity: false }); } catch { /* */ }
}
const ready = (s, key) => (s.cds[key] || 0) <= tick();
function cd(s, key, sec) {
  s.cds[key] = tick() + Math.round(sec * 20 * (s.phase === 3 ? 0.75 : s.phase === 2 ? 0.88 : 1));
}
function finish(boss, s, after) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying || s.eclipse) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, after);
  s.busy = tick() + after + 6;
}
function hitList(boss, c, r) {
  try {
    return boss.dimension.getEntities({ location: c, maxDistance: r + 0.5 }).filter((e) => canHit(boss, e, false) && e.typeId !== KNIGHT);
  } catch {
    return [];
  }
}
const fwd = (boss) => V.flat(boss.getViewDirection());
function knights(boss, s) {
  try {
    return boss.dimension.getEntities({ type: KNIGHT, tags: [ATAG(s.siteId)], location: boss.location, maxDistance: 48 });
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ ataques
function corte(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.corte);
  const dir = fwd(boss);
  particle(boss.dimension, "alerta_area", ground(boss.dimension, V.add(boss.location, V.mul(dir, 3))), { radius: 4 });
  sound(boss.dimension, "mob.wither.ambient", boss.location, 0.6, 1);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "sombra_explosao", V.add(V.up(boss.location, 1.5), V.mul(dir, 3)), { radius: 3 });
    sound(boss.dimension, "mob.irongolem.throw", boss.location, 0.5, 1.2);
    for (const e of hitList(boss, boss.location, 5.5)) {
      if (V.dot(V.norm(V.flat(V.sub(e.location, boss.location))), dir) < -0.1) continue;
      dealDamage(boss, e, 16 * diff(), "physical", { kind: "weapon" });
      knockFrom(e, boss.location, 1.3, 0.4);
    }
  }, 14);
  cd(s, "corte", 5);
  finish(boss, s, 24);
}

function salto(boss, s, target) {
  lock(boss, true);
  setAnim(boss, A.salto);
  const pt = ground(boss.dimension, target.location);
  particle(boss.dimension, "alerta_area", pt, { radius: 4 });
  sound(boss.dimension, "mob.enderdragon.flap", boss.location, 0.6, 1.2);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    try { boss.teleport(pt, { keepVelocity: false }); } catch { /* */ }
    particle(boss.dimension, "onda_choque", pt, { radius: 4 });
    particle(boss.dimension, "sombra_explosao", V.up(pt, 0.5), { radius: 3.5 });
    sound(boss.dimension, "random.explode", pt, 0.6, 1.2);
    for (const p of fighters(boss, s)) shake(p, 0.4, 0.8);
    for (const e of hitList(boss, pt, 4.2)) {
      dealDamage(boss, e, 18 * diff(), "dark");
      knockFrom(e, pt, 1.4, 0.6);
    }
  }, 22);
  cd(s, "salto", 9);
  finish(boss, s, 32);
}

function orbes(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.orbes);
  sound(boss.dimension, "mob.evocation_illager.cast_spell", boss.location, 0.7, 1);
  const n = Math.min(5, 2 + players.length);
  for (let i = 0; i < n; i++) {
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      const t = players[i % players.length];
      if (!ok(t)) return;
      const from = V.add(V.up(boss.location, 3.2), { x: rand(-1, 1), y: rand(-0.4, 0.6), z: rand(-1, 1) });
      launch(boss, { from, dir: V.norm(V.sub(V.up(t.location, 1), from)), speed: 0.9, radius: 0.8, element: "dark", damage: 9 * diff(),
        trail: "sombra_rastro", impact: "sombra_explosao", range: 30 });
    }, 10 + i * 5);
  }
  cd(s, "orbes", 7);
  finish(boss, s, 26);
}

function chamas(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.chamas);
  const origin = { ...boss.location };
  const dirs = players.slice(0, 4).map((p) => V.norm(V.flat(V.sub(p.location, origin))));
  while (dirs.length < 4) dirs.push(V.rotY({ x: 1, y: 0, z: 0 }, dirs.length * 90 + rand(-20, 20)));
  const pts = [];
  for (const d of dirs) for (let k = 2; k <= 14; k += 2) {
    const pt = ground(boss.dimension, V.add(origin, V.mul(d, k)));
    if (inArena(s, pt)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 1.2 });
  sound(boss.dimension, "mob.blaze.shoot", origin, 0.6, 1);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const hit = new Set();
    for (const pt of pts) {
      particle(boss.dimension, "fogo_explosao", V.up(pt, 0.4), { radius: 1.2 });
      particle(boss.dimension, "sombra_rastro", V.up(pt, 1), {});
      for (const e of hitList(boss, pt, 1.4)) {
        if (hit.has(e.id)) continue;
        hit.add(e.id);
        dealDamage(boss, e, 14 * diff(), "fire");
        try { e.setOnFire(3, true); } catch { /* */ }
      }
    }
    sound(boss.dimension, "mob.ghast.fireball", origin, 0.5, 1.2);
  }, 26);
  cd(s, "chamas", 12);
  finish(boss, s, 34);
}

function legiao(boss, s) {
  lock(boss, true);
  setAnim(boss, A.legiao);
  sound(boss.dimension, "mob.evocation_illager.prepare_summon", boss.location, 0.5, 2);
  const pts = [];
  for (let i = 0; i < 10 && pts.length < 2; i++) {
    const pt = ground(boss.dimension, V.add(s.home, V.rotY({ x: rand(4, 7), y: 0, z: 0 }, rand(0, 360))));
    if (inArena(s, pt)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "cor_circulo_magico", pt, { color: "dark", radius: 1.2 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const pt of pts) {
      try {
        const k = boss.dimension.spawnEntity(KNIGHT, pt, { initialPersistence: true });
        k.addTag(ATAG(s.siteId));
        particle(boss.dimension, "sombra_explosao", V.up(pt, 1), { radius: 1 });
      } catch { /* */ }
    }
  }, 30);
  cd(s, "legiao", 30);
  finish(boss, s, 40);
}

function furia(boss, s) {
  lock(boss, true);
  setAnim(boss, A.furia);
  s.invuln = tick() + 48;
  sound(boss.dimension, "mob.wither.spawn", boss.location, 0.5, 1);
  particle(boss.dimension, "sombra_explosao", V.up(boss.location, 2.5), { radius: 4 });
  for (const p of fighters(boss, s)) {
    shake(p, 0.4, 1.5);
    p.onScreenDisplay.setTitle("§4Fúria do Rei Demônio", { subtitle: "§7As asas se abrem... §fquando o salão escurecer, busque os Círculos de Luz",
      fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15 });
  }
  s.cds.eclipse = tick() + 70;
  finish(boss, s, 48);
}

function eclipse(boss, s) {
  try { boss.teleport(s.throne, { keepVelocity: false }); } catch { /* */ }
  lock(boss, true);
  setAnim(boss, A.eclipse);
  s.eclipse = { until: tick() + 160, next: tick() };
  sound(boss.dimension, "mob.warden.sonic_charge", boss.location, 0.6, 1);
  for (const p of fighters(boss, s)) {
    effect(p, "darkness", 200, 0);
    p.onScreenDisplay.setTitle("§5ECLIPSE", { subtitle: "§fEntre num Círculo de Luz antes que ele termine!", fadeInDuration: 5, stayDuration: 50,
      fadeOutDuration: 10 });
  }
  updateName(boss, s);
}
const inLight = (s, loc) => s.lights.some((c) => V.dist2d(loc, { x: c.x + 0.5, y: c.y, z: c.z + 0.5 }) <= 2.8 && Math.abs(loc.y - c.y) < 3);
function eclipseTick(boss, s) {
  const now = tick();
  if (now >= s.eclipse.next) {
    s.eclipse.next = now + 10;
    for (const c of s.lights) particle(boss.dimension, "cor_circulo_magico", { x: c.x + 0.5, y: c.y + 0.05, z: c.z + 0.5 }, { color: "holy", radius: 2.6 });
    particle(boss.dimension, "sombra_zona", V.up(boss.location, 1), { radius: 6 });
    const left = Math.ceil((s.eclipse.until - now) / 20);
    for (const p of fighters(boss, s)) p.onScreenDisplay.setActionBar(inLight(s, p.location) ? `§eVocê está na luz. §7(${left}s)` : `§5Busque a luz! §f${left}s`);
  }
  if (now < s.eclipse.until) return;
  s.eclipse = null;
  particle(boss.dimension, "sombra_explosao", V.up(boss.location, 2), { radius: 8 });
  sound(boss.dimension, "mob.warden.sonic_boom", boss.location, 0.8, 1);
  for (const p of fighters(boss, s)) {
    shake(p, 0.6, 1);
    if (inLight(s, p.location)) {
      particle(p.dimension, "sagrado_explosao", V.up(p.location, 0.5), { radius: 1.5 });
      continue;
    }
    dealDamage(boss, p, 34 * diff(), "dark");
  }
  cd(s, "eclipse", 45);
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
    sound(boss.dimension, "mob.wither.ambient", boss.location, 0.5, 2);
    for (const p of fighters(boss, s)) p.onScreenDisplay.setTitle("§cO trono arde", { subtitle: "§7\"Levantem-se, meus cavaleiros!\"",
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
    s.cds.chamas = tick() + 40;
    s.cds.legiao = tick() + 60;
    s.busy = tick() + 30;
  } else {
    furia(boss, s);
  }
}

function intro(boss) {
  const s = st(boss);
  s.intro = true;
  lock(boss, true);
  setAnim(boss, A.intro);
  s.invuln = tick() + 64;
  sound(boss.dimension, "mob.wither.spawn", boss.location, 0.6, 1.5);
  particle(boss.dimension, "sombra_explosao", V.up(boss.location, 1), { radius: 3 });
  for (const p of boss.dimension.getPlayers({ location: boss.location, maxDistance: 36 })) {
    p.onScreenDisplay.setTitle(`§c${NAME}`, { subtitle: "§7\"Ajoelhe-se diante do seu rei.\"", fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
  }
  updateName(boss, s);
  finish(boss, s, 64);
}

function startDeath(boss, s) {
  if (s.dying) return;
  s.dying = true;
  s.eclipse = null;
  lock(boss, true);
  setAnim(boss, A.morte);
  const h = health(boss);
  if (h) h.setCurrentValue(1);
  sound(boss.dimension, "mob.wither.death", boss.location, 0.5, 1.5);
  for (const k of knights(boss, s)) {
    try { k.kill(); } catch { /* */ }
  }
  for (const p of fighters(boss, s, 40)) p.onScreenDisplay.setTitle(" ", { subtitle: "§7\"Você quebrou um rei... não um reino.\"",
    fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15 });
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "sombra_explosao", V.up(loc, 2), { radius: 4 });
    particle(dim, "nivel_anel", loc, {});
    const players = rewards(s, loc, dim);
    states.delete(boss.id);
    boss.remove();
    for (const fn of defeatHooks) {
      try { fn(s.siteId, players, dim); } catch (e) { console.warn(`[Valdoria] vitória de Nyxhal: ${e}`); }
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
  for (const [p, done] of players) {
    const share = Math.max(0.4, done / total);
    addXP(p, Math.round(3000 * share), "Azrakar");
    const d = getData(p);
    d.chefes++;
    d.abates[AZRAKAR] = (d.abates[AZRAKAR] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§6§lVITÓRIA", { subtitle: "§7O Trono Sombrio está vazio", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:moeda_ouro`, randInt(120, 200));
  drop(`${NS}:coracao_abismo`, 1 + (chance(0.25 + maxLuck) ? 1 : 0));
  drop(`${NS}:essencia_sombria`, randInt(6, 10));
  drop(`${NS}:pedra_aprimoramento`, randInt(3, 5));
  if (chance(0.25 + maxLuck)) drop(`${NS}:lamina_azrakar`, 1);
  for (let i = 0; i < 40; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-1.5, 1.5), y: 1, z: rand(-1.5, 1.5) }));
  world.sendMessage(`§c[Valdoria] §f${NAME}§f foi derrotado por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
  return players.map(([p]) => p);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying) return;
  if (s.eclipse) return eclipseTick(boss, s);
  if (s.busy > tick()) return;
  const players = fighters(boss, s);
  if (!players.length) return;
  if (!inArena(s, boss.location)) {
    particle(boss.dimension, "sombra_explosao", V.up(boss.location, 1), { radius: 1 });
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  const hp = hpPct(boss);
  if (s.phase === 1 && hp <= 0.66) return phaseChange(boss, s, 2);
  if (s.phase === 2 && hp <= 0.33) return phaseChange(boss, s, 3);
  const target = players.sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location))[0];
  const dist = V.dist2d(target.location, boss.location);
  if (s.phase === 3 && ready(s, "eclipse")) return eclipse(boss, s);
  if (s.phase >= 2 && ready(s, "legiao") && knights(boss, s).length < 3) return legiao(boss, s);
  if (s.phase >= 2 && ready(s, "chamas")) return chamas(boss, s, players);
  if (dist < 5 && ready(s, "corte")) return corte(boss, s, target);
  if (dist > 6 && ready(s, "salto")) return salto(boss, s, target);
  if (ready(s, "orbes") && (dist > 5 || chance(0.3))) return orbes(boss, s, players);
}

// ------------------------------------------------------------------ API para Nyxhal
export function spawnAzrakar(dim, pos, siteId) {
  const boss = dim.spawnEntity(AZRAKAR, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
  boss.setDynamicProperty(`${NS}:local`, siteId);
  boss.addTag(ATAG(siteId));
  states.delete(boss.id);
  intro(boss);
  return boss;
}
export function azrakarOf(dim, siteId) {
  try {
    return dim.getEntities({ type: AZRAKAR, tags: [ATAG(siteId)] })[0];
  } catch {
    return undefined;
  }
}
/** Remove Azrakar e os cavaleiros que ele chamou (reinício da luta). */
export function despawnAzrakar(dim, siteId) {
  try {
    for (const e of dim.getEntities({ tags: [ATAG(siteId)] })) {
      states.delete(e.id);
      e.remove();
    }
  } catch { /* */ }
}
export function azrakarState(boss) {
  return st(boss);
}

export function startAzrakar() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId !== AZRAKAR) return;
    const s = st(e);
    if (s.dying || s.invuln > tick()) {
      ev.cancel = true;
      return;
    }
    if (s.eclipse) {
      ev.damage *= 0.1;
      if (ok(ev.src) && isPlayer(ev.src)) ev.src.onScreenDisplay.setActionBar("§5A sombra do Eclipse protege Azrakar. §fFique na luz!");
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
      try { list = world.getDimension(dimId).getEntities({ type: AZRAKAR }); } catch { continue; }
      for (const boss of list) {
        try { think(boss); } catch (err) { console.warn(`[Valdoria] Azrakar: ${err}`); }
      }
    }
  }, 5);
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === AZRAKAR) updateName(ev.entity, st(ev.entity));
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== AZRAKAR) return;
    system.runTimeout(() => ok(e) && !st(e).intro && intro(e), 2);
  });
}
