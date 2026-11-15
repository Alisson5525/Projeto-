// Chefe de Aelthar: Morthil, o Guardião Cinzento. O antigo protetor da Árvore-Mãe, tomado pela Praga Cinzenta no Coração de Ylthariel.
// Fase I: Raízes Irrompem (círculos marcados sob os jogadores), Varredura (arco à frente) e golpes corpo a corpo.
// Fase II (60%): Nuvens de Esporos (veneno em área) e Chamado da Floresta (brotos corrompidos).
// Fase III (30%): Enraizar: ele finca as raízes no centro, recebe 75% menos dano e se cura; fogo (flechas de brasas, feitiços de
// fogo, lâminas com aspecto flamejante) o arranca do chão e o deixa atordoado e vulnerável. Todo golpe de área é marcado antes.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, hpPct, effect } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { dealDamage, onBeforeHurt, canHit } from "../core/damage.js";
import { ground, knockFrom } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

export const MORTHIL = `${NS}:morthil`;
export const BROTO = `${NS}:broto_corrompido`;
const NAME = "Morthil, o Guardião Cinzento";
const A = { none: 0, raizes: 1, varredura: 2, esporos: 3, chamado: 4, enraizar: 5, atordoado: 6, intro: 7, morte: 8 };
export const MTAG = (siteId) => `vm_${siteId}`;
const FIRE_CAUSES = new Set(["fire", "fireTick", "lava", "campfire", "soulCampfire", "magma"]);
const states = new Map();
const defeatHooks = [];
/** @type {(siteId: string) => any} */
let resolver = () => undefined;

export function setMorthilArenaResolver(fn) {
  resolver = fn;
}
export function onMorthilDefeated(fn) {
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
        boss.addTag(MTAG(siteId));
      } catch { /* */ }
    }
    const info = resolver(siteId);
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), dying: false, siteId, rooted: null, stunUntil: 0, vuln: 0,
      arena: info?.arena, home: info?.center || { ...boss.location }, clouds: [] };
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
function fighters(boss, s, r = 34) {
  return boss.dimension.getPlayers({ location: boss.location, maxDistance: r }).filter((p) => isActivePlayer(p) && inArena(s, p.location));
}
const PHASE_TXT = ["", "I", "II", "III"];
function updateName(boss, s) {
  const tag = s.rooted ? " §2[Enraizado]" : s.stunUntil > tick() ? " §6[Atordoado]" : "";
  boss.nameTag = `§a${NAME} §7- Fase ${PHASE_TXT[s.phase]}${tag}`;
}
function facing(boss, target) {
  try { boss.teleport(boss.location, { facingLocation: V.up(target.location, 1.5), keepVelocity: false }); } catch { /* */ }
}
const ready = (s, key) => (s.cds[key] || 0) <= tick();
function cd(s, key, sec) {
  s.cds[key] = tick() + Math.round(sec * 20 * (s.phase >= 2 ? 0.85 : 1));
}
function finish(boss, s, after) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying || s.rooted || s.stunUntil > tick()) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, after);
  s.busy = tick() + after + 6;
}
function hitList(boss, c, r) {
  try {
    return boss.dimension.getEntities({ location: c, maxDistance: r + 0.5 }).filter((e) => canHit(boss, e, false) && e.typeId !== BROTO);
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
function brotos(boss, s) {
  try {
    return boss.dimension.getEntities({ type: BROTO, tags: [MTAG(s.siteId)], location: boss.location, maxDistance: 48 });
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ ataques
/** Raízes irrompem nos pontos marcados (círculos no chão) depois de `delay` ticks. */
function erupt(boss, s, pts, delay) {
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 1.6 });
  sound(boss.dimension, "dig.grass", boss.location, 0.6, 1.2);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const pt of pts) {
      particle(boss.dimension, "natureza_espinhos", pt, { radius: 1.5 });
      particle(boss.dimension, "detritos", V.up(pt, 0.3), {});
      sound(boss.dimension, "dig.wood", pt, 0.7, 1);
      for (const e of hitList(boss, pt, 1.7)) {
        dealDamage(boss, e, 10 * diff(), "nature");
        try { e.applyKnockback({ x: 0, z: 0 }, 0.75); } catch { /* */ }
        effect(e, "slowness", 60, 2);
      }
    }
  }, delay);
}
function raizes(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.raizes);
  const pts = players.slice(0, 4).map((p) => ground(boss.dimension, p.location));
  for (let i = 0; i < 2; i++) {
    const pt = ground(boss.dimension, V.add(s.home, V.rotY({ x: rand(3, 9), y: 0, z: 0 }, rand(0, 360))));
    if (inArena(s, pt)) pts.push(pt);
  }
  erupt(boss, s, pts, 24);
  for (const p of players) shake(p, 0.15, 0.6);
  cd(s, "raizes", 6);
  finish(boss, s, 30);
}

function varredura(boss, s, target) {
  facing(boss, target);
  lock(boss, true);
  setAnim(boss, A.varredura);
  const dir = fwd(boss);
  particle(boss.dimension, "alerta_area", ground(boss.dimension, V.add(boss.location, V.mul(dir, 2.6))), { radius: 3.4 });
  sound(boss.dimension, "mob.ravager.ambient", boss.location, 0.7, 1);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "poeira", V.add(boss.location, V.mul(dir, 2.5)), { radius: 3 });
    sound(boss.dimension, "mob.irongolem.throw", boss.location, 0.6, 1.2);
    for (const e of hitList(boss, boss.location, 5)) {
      const to = V.flat(V.sub(e.location, boss.location));
      if (V.dot(to, dir) < 0.15) continue;
      dealDamage(boss, e, 13 * diff(), "physical", { kind: "weapon" });
      knockFrom(e, boss.location, 1.4, 0.45);
    }
  }, 14);
  cd(s, "varredura", 5);
  finish(boss, s, 22);
}

function esporos(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.esporos);
  sound(boss.dimension, "mob.ravager.roar", boss.location, 1.4, 0.6);
  const pts = players.slice(0, 3).map((p) => ground(boss.dimension, p.location));
  for (const pt of pts) s.clouds.push({ pt, from: tick() + 20, until: tick() + 180 });
  for (const p of players) p.onScreenDisplay.setActionBar("§7Esporos cinzentos! §fSaia das nuvens.");
  cd(s, "esporos", 14);
  finish(boss, s, 32);
}
function cloudsTick(boss, s) {
  const now = tick();
  s.clouds = s.clouds.filter((c) => c.until > now);
  for (const c of s.clouds) {
    particle(boss.dimension, "esporos", c.pt, { radius: 2.5 });
    if (now < c.from || (now - c.from) % 20 >= 5) continue;
    for (const e of hitList(boss, c.pt, 2.6)) {
      dealDamage(boss, e, 3 * diff(), "nature");
      effect(e, "poison", 50, 0);
    }
  }
}

function chamado(boss, s) {
  lock(boss, true);
  setAnim(boss, A.chamado);
  sound(boss.dimension, "mob.evocation_illager.prepare_summon", boss.location, 0.6, 2);
  const n = 2 + Math.min(2, fighters(boss, s).length - 1);
  const pts = [];
  for (let i = 0; i < 16 && pts.length < n; i++) {
    const pt = ground(boss.dimension, V.add(s.home, V.rotY({ x: rand(4, 8), y: 0, z: 0 }, rand(0, 360))));
    if (free(boss.dimension, pt) && inArena(s, pt)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "cor_circulo_magico", pt, { color: "nature", radius: 1 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const pt of pts) {
      try {
        const e = boss.dimension.spawnEntity(BROTO, pt, { initialPersistence: true });
        e.addTag(MTAG(s.siteId));
        particle(boss.dimension, "natureza_explosao", V.up(pt, 0.5), { radius: 1 });
      } catch { /* */ }
    }
  }, 30);
  cd(s, "chamado", 25);
  finish(boss, s, 40);
}

function enraizar(boss, s) {
  try { boss.teleport(s.home); } catch { /* */ }
  lock(boss, true);
  setAnim(boss, A.enraizar);
  s.rooted = { until: tick() + 240, next: tick() + 40, heal: tick() + 20 };
  s.clouds = [];
  sound(boss.dimension, "mob.warden.dig", boss.location, 0.6, 1.5);
  particle(boss.dimension, "natureza_espinhos", boss.location, { radius: 3 });
  for (const p of fighters(boss, s)) {
    p.onScreenDisplay.setTitle("§2Morthil se enraíza!", { subtitle: "§7Ele bebe da Árvore-Mãe para se curar. §6O fogo o arranca do chão.",
      fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15 });
  }
  updateName(boss, s);
}
function rootedTick(boss, s) {
  const now = tick();
  if (now >= s.rooted.until) return unroot(boss, s, false);
  if (now >= s.rooted.heal) {
    s.rooted.heal = now + 20;
    const h = health(boss);
    if (h) h.setCurrentValue(Math.min(h.effectiveMax, h.currentValue + h.effectiveMax * 0.015));
    particle(boss.dimension, "cura", V.up(boss.location, 2), {});
    particle(boss.dimension, "natureza_rastro", V.up(boss.location, 1), {});
  }
  if (now >= s.rooted.next) {
    s.rooted.next = now + 40;
    erupt(boss, s, fighters(boss, s).slice(0, 4).map((p) => ground(boss.dimension, p.location)), 22);
  }
}
/** Sai do chão: sozinho (fim do tempo) ou arrancado pelo fogo (atordoado e vulnerável por 5 s). */
function unroot(boss, s, byFire) {
  s.rooted = null;
  cd(s, "enraizar", 30);
  if (byFire) {
    s.stunUntil = tick() + 100;
    s.vuln = tick() + 100;
    setAnim(boss, A.atordoado);
    particle(boss.dimension, "fogo_explosao", V.up(boss.location, 2), { radius: 2.5 });
    sound(boss.dimension, "mob.ravager.stun", boss.location, 0.6, 1.5);
    for (const p of fighters(boss, s)) p.onScreenDisplay.setActionBar("§6O fogo arrancou Morthil do chão! §fEle está atordoado e vulnerável.");
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      setAnim(boss, A.none);
      lock(boss, false);
      updateName(boss, s);
    }, 100);
    s.busy = tick() + 106;
  } else {
    setAnim(boss, A.none);
    lock(boss, false);
    s.busy = tick() + 10;
  }
  updateName(boss, s);
}

function phaseChange(boss, s, phase) {
  s.phase = phase;
  try {
    boss.setProperty(`${NS}:phase`, phase);
    boss.triggerEvent(phase === 2 ? "valdoria:fase2" : "valdoria:fase3");
  } catch { /* */ }
  s.invuln = tick() + 30;
  sound(boss.dimension, "mob.ravager.roar", boss.location, 0.5, 2);
  for (const p of fighters(boss, s)) {
    shake(p, 0.3, 1.2);
    if (phase === 2) {
      p.onScreenDisplay.setTitle("§aA Praga se espalha", { subtitle: "§7\"A floresta esqueceu vocês... e eu esqueci a floresta.\"",
        fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
    }
  }
  if (phase === 2) {
    s.cds.esporos = tick() + 40;
    s.cds.chamado = tick() + 80;
  } else {
    s.cds.enraizar = tick() + 20;
  }
  updateName(boss, s);
  s.busy = tick() + 30;
}

function intro(boss) {
  const s = st(boss);
  s.intro = true;
  lock(boss, true);
  setAnim(boss, A.intro);
  s.invuln = tick() + 60;
  sound(boss.dimension, "mob.warden.emerge", boss.location, 0.8, 1.5);
  particle(boss.dimension, "detritos", V.up(boss.location, 0.5), {});
  for (const p of boss.dimension.getPlayers({ location: boss.location, maxDistance: 32 })) {
    p.onScreenDisplay.setTitle(`§a${NAME}`, { subtitle: "§7\"Quem perturba o sono da Árvore-Mãe?\"", fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
  }
  updateName(boss, s);
  finish(boss, s, 60);
}

function startDeath(boss, s) {
  if (s.dying) return;
  s.dying = true;
  s.rooted = null;
  lock(boss, true);
  setAnim(boss, A.morte);
  const h = health(boss);
  if (h) h.setCurrentValue(1);
  sound(boss.dimension, "mob.ravager.death", boss.location, 0.5, 1.5);
  for (const e of brotos(boss, s)) {
    try { e.kill(); } catch { /* */ }
  }
  for (const p of fighters(boss, s, 40)) p.onScreenDisplay.setTitle(" ", { subtitle: "§7\"A seiva... volta a correr. Obrigado.\"",
    fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15 });
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "natureza_explosao", V.up(loc, 2), { radius: 3 });
    particle(dim, "nivel_anel", loc, {});
    const players = rewards(s, loc, dim);
    states.delete(boss.id);
    boss.remove();
    for (const fn of defeatHooks) {
      try { fn(s.siteId, players, dim); } catch (e) { console.warn(`[Valdoria] vitória de Aelthar: ${e}`); }
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
    addXP(p, Math.round(2200 * share), "Morthil");
    const d = getData(p);
    d.chefes++;
    d.abates[MORTHIL] = (d.abates[MORTHIL] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§a§lVITÓRIA", { subtitle: "§7A Praga Cinzenta deixa o Coração de Ylthariel", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:moeda_ouro`, randInt(90, 160));
  drop(`${NS}:seiva_ancestral`, randInt(3, 5));
  drop(`${NS}:pedra_aprimoramento`, randInt(2, 4));
  drop(`${NS}:essencia_natural`, randInt(4, 6));
  if (chance(0.25 + maxLuck)) drop(`${NS}:arco_ylthariel`, 1);
  for (let i = 0; i < 30; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-1.5, 1.5), y: 1, z: rand(-1.5, 1.5) }));
  world.sendMessage(`§a[Valdoria] §f${NAME}§f foi purificado por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
  return players.map(([p]) => p);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying) return;
  cloudsTick(boss, s);
  if (s.rooted) {
    rootedTick(boss, s);
    return;
  }
  if (s.stunUntil > tick() || s.busy > tick()) return;
  const players = fighters(boss, s);
  if (!players.length) return;
  if (!inArena(s, boss.location) || V.dist(boss.location, s.home) > 16) {
    particle(boss.dimension, "natureza_explosao", V.up(boss.location, 1), { radius: 1 });
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  const hp = hpPct(boss);
  if (s.phase === 1 && hp <= 0.6) return phaseChange(boss, s, 2);
  if (s.phase === 2 && hp <= 0.3) return phaseChange(boss, s, 3);
  const target = players.sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location))[0];
  const dist = V.dist2d(target.location, boss.location);
  if (s.phase === 3 && ready(s, "enraizar")) return enraizar(boss, s);
  if (s.phase >= 2 && ready(s, "chamado") && brotos(boss, s).length < 4) return chamado(boss, s);
  if (s.phase >= 2 && ready(s, "esporos")) return esporos(boss, s, players);
  if (dist < 4.5 && ready(s, "varredura")) return varredura(boss, s, target);
  if (ready(s, "raizes") && (dist > 5 || chance(0.4))) return raizes(boss, s, players);
}

// ------------------------------------------------------------------ API para Aelthar
export function spawnMorthil(dim, pos, siteId) {
  const boss = dim.spawnEntity(MORTHIL, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
  boss.setDynamicProperty(`${NS}:local`, siteId);
  boss.addTag(MTAG(siteId));
  states.delete(boss.id);
  intro(boss);
  return boss;
}
export function morthilOf(dim, siteId) {
  try {
    return dim.getEntities({ type: MORTHIL, tags: [MTAG(siteId)] })[0];
  } catch {
    return undefined;
  }
}
/** Remove Morthil e os brotos que ele chamou (reinício da luta). */
export function despawnMorthil(dim, siteId) {
  try {
    for (const e of dim.getEntities({ tags: [MTAG(siteId)] })) {
      states.delete(e.id);
      e.remove();
    }
  } catch { /* */ }
}
export function morthilState(boss) {
  return st(boss);
}

export function startMorthil() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId !== MORTHIL) return;
    const s = st(e);
    if (s.dying || s.invuln > tick()) {
      ev.cancel = true;
      return;
    }
    const fire = ev.element === "fire" || FIRE_CAUSES.has(String(ev.cause || ""));
    if (s.rooted) {
      if (fire) {
        system.run(() => ok(e) && s.rooted && unroot(e, s, true));
      } else {
        ev.damage *= 0.25;
        particle(e.dimension, "escudo", V.up(e.location, 1.5), {});
        if (ok(ev.src) && isPlayer(ev.src)) ev.src.onScreenDisplay.setActionBar("§2As raízes protegem Morthil! §6Use fogo para arrancá-lo do chão.");
      }
    } else if (s.vuln > tick()) {
      ev.damage *= 1.5;
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
      try { list = world.getDimension(dimId).getEntities({ type: MORTHIL }); } catch { continue; }
      for (const boss of list) {
        try { think(boss); } catch (err) { console.warn(`[Valdoria] Morthil: ${err}`); }
      }
    }
  }, 5);
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === MORTHIL) updateName(ev.entity, st(ev.entity));
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== MORTHIL) return;
    system.runTimeout(() => ok(e) && !st(e).intro && intro(e), 2);
  });
}
