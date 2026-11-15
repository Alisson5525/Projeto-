// Chefe do Santuário: Vaelith, a Rainha das Trevas (a Dama de Véu Negro). Três formas: Dama de Véu Negro (dardos, lâminas,
// correntes, teleporte), Rainha Sombria (asas, ilusões e acólitos) e Forma Abissal (Eclipse com círculos de luz, lanças).
// Todo golpe de área é marcado antes de cair; o Eclipse sempre oferece círculos de luz alcançáveis.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, hpPct, effect } from "../core/util.js";
import { particle, sound, shake, line } from "../core/fx.js";
import { dealDamage, onBeforeHurt, canHit } from "../core/damage.js";
import { launch, ground, knockFrom } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

export const QUEEN = `${NS}:rainha_trevas`;
export const ILLUSION = `${NS}:ilusao_rainha`;
const NAME = "Vaelith, a Rainha das Trevas";
const A = { none: 0, dardos: 1, laminas: 2, correntes: 3, teleporte: 4, espelhos: 5, invocar: 6, eclipse: 7, lancas: 8,
  transformar: 9, intro: 10, morte: 11 };
export const QTAG = (siteId) => `vq_${siteId}`;
const states = new Map();
const illusions = new Map(); // id -> {until, next}
const defeatHooks = [];
/** @type {(siteId: string) => any} */
let resolver = () => undefined;

export function setQueenArenaResolver(fn) {
  resolver = fn;
}
export function onQueenDefeated(fn) {
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
    if (!siteId) {
      siteId = `e${boss.id}`;
      try {
        boss.setDynamicProperty(`${NS}:local`, siteId);
        boss.addTag(QTAG(siteId));
      } catch { /* */ }
    }
    const info = resolver(siteId);
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), dying: false, siteId, arena: info?.arena,
      home: info?.center || { ...boss.location }, close: 0 };
    try {
      s.phase = Number(boss.getProperty(`${NS}:phase`)) || 1;
    } catch { /* */ }
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
function setAnim(e, a) {
  try { e.setProperty(`${NS}:anim`, a); } catch { /* */ }
}
function lock(boss, on) {
  try { boss.triggerEvent(on ? "valdoria:travar" : "valdoria:destravar"); } catch { /* */ }
}
function inArena(s, loc, m = 0) {
  if (!s.arena) return true;
  const [a, b] = s.arena;
  return loc.x >= a.x - m && loc.x <= b.x + 1 + m && loc.z >= a.z - m && loc.z <= b.z + 1 + m && loc.y >= a.y - 2 && loc.y <= b.y + 2;
}
function fighters(boss, s, r = 36) {
  try {
    return boss.dimension.getPlayers({ location: boss.location, maxDistance: r }).filter((p) => isActivePlayer(p) && inArena(s, p.location, 0.5));
  } catch {
    return [];
  }
}
const FORMS = ["A Dama de Véu Negro", "Rainha Sombria", "Forma Abissal"];
function updateName(boss, s) {
  boss.nameTag = `§5${NAME} §7- ${FORMS[s.phase - 1]}`;
}
function facing(e, target) {
  try {
    e.teleport(e.location, { facingLocation: V.up(target.location, 1), keepVelocity: false });
  } catch { /* */ }
}
const ready = (s, key) => (s.cds[key] || 0) <= tick();
function cd(s, key, sec) {
  s.cds[key] = tick() + Math.round(sec * 20 * (s.phase === 3 ? 0.75 : 1));
}
function finish(boss, s, after) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.none);
    lock(boss, false);
  }, after);
  s.busy = tick() + after + 6;
}
function hitList(src, c, r) {
  try {
    return src.dimension.getEntities({ location: c, maxDistance: r + 0.5 }).filter((e) => canHit(src, e, false));
  } catch {
    return [];
  }
}
/** Dois blocos de ar e chão firme: ponto válido para teleporte, ilusões e círculos de luz. */
function free(dim, loc) {
  try {
    const b = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
    const below = dim.getBlock({ x: b.x, y: b.y - 1, z: b.z });
    return !!below && !below.isAir && [0, 1, 2].every((dy) => dim.getBlock({ x: b.x, y: b.y + dy, z: b.z })?.isAir);
  } catch {
    return false;
  }
}
function arenaSpot(boss, s, avoid, minAway = 0) {
  let best = { ...s.home };
  let bestD = -1;
  for (let i = 0; i < 14; i++) {
    const c = ground(boss.dimension, V.add(s.home, { x: rand(-6, 6), y: 2, z: rand(-11, 11) }));
    if (!inArena(s, c, -1) || !free(boss.dimension, c)) continue;
    const d = avoid.length ? Math.min(...avoid.map((p) => V.dist2d(p.location, c))) : 99;
    if (d > bestD) {
      bestD = d;
      best = c;
    }
    if (minAway && d >= minAway && chance(0.5)) return c;
  }
  return best;
}
const chest = (e) => V.up(e.location, 2.2);

// ------------------------------------------------------------------ magias
function dardos(caster, s, target, n, dmg) {
  facing(caster, target);
  setAnim(caster, A.dardos);
  particle(caster.dimension, "cor_carga", chest(caster), { color: "dark" });
  sound(caster.dimension, "mob.evocation_illager.prepare_attack", caster.location, 0.9, 1.2);
  for (let i = 0; i < n; i++) {
    system.runTimeout(() => {
      if (!ok(caster) || !ok(target)) return;
      const from = chest(caster);
      launch(caster, { from, dir: V.sub(V.up(target.location, 1), from), speed: 0.8, radius: 0.5, element: "dark", damage: dmg,
        trail: "sombra_rastro", impact: "sombra_explosao", range: 40, homing: 0.1, area: false });
      sound(caster.dimension, "mob.vex.charge", from, 1.1, 0.8);
    }, 8 + i * 5);
  }
}
function laminas(boss, s, target) {
  lock(boss, true);
  facing(boss, target);
  setAnim(boss, A.laminas);
  const n = s.phase === 3 ? 7 : 5;
  const base = V.flat(V.sub(target.location, boss.location));
  const dirs = [];
  for (let i = 0; i < n; i++) dirs.push(V.rotY(base, (i - (n - 1) / 2) * 14));
  for (const d of dirs) {
    for (let k = 2; k <= 10; k += 2) particle(boss.dimension, "alerta_area", ground(boss.dimension, V.add(boss.location, V.mul(d, k))), { radius: 0.6 });
  }
  sound(boss.dimension, "mob.evocation_illager.cast_spell", boss.location, 1.2, 1);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    for (const d of dirs) {
      launch(boss, { from: V.up(boss.location, 1.4), dir: d, speed: 0.75, radius: 0.6, element: "dark", damage: 8 * diff(),
        trail: "sombra_rastro", impact: "sombra_explosao", range: 22, area: false });
    }
    sound(boss.dimension, "mob.breeze.shoot", boss.location, 0.7, 1);
  }, 14);
  cd(s, "laminas", 7);
  finish(boss, s, 26);
}
function correntes(boss, s, target) {
  lock(boss, true);
  facing(boss, target);
  setAnim(boss, A.correntes);
  target.onScreenDisplay?.setActionBar("§5Corrente Sombria! §fVocê será puxado: afaste-se do círculo depois.");
  let t = 0;
  const h = system.runInterval(() => {
    t++;
    if (!ok(boss) || !ok(target) || s.dying || t > 20) {
      system.clearRun(h);
      return;
    }
    if (t % 2 === 0) line(boss.dimension, chest(boss), V.up(target.location, 1), "sombra_rastro", {}, 0.8);
  }, 1);
  system.runTimeout(() => {
    if (!ok(boss) || !ok(target) || s.dying) return;
    const d = V.dist2d(target.location, boss.location);
    const pull = Math.min(2.6, Math.max(0.8, (d - 2.5) * 0.28));
    try { target.applyKnockback(V.mul(V.flat(V.sub(boss.location, target.location)), pull), 0.35); } catch { /* */ }
    effect(target, "slowness", 20, 0);
    sound(boss.dimension, "mob.warden.attack", target.location, 1.3, 0.6);
    particle(boss.dimension, "alerta_anel", boss.location, { radius: 4.5 });
    particle(boss.dimension, "alerta_area", boss.location, { radius: 4.5 });
  }, 20);
  system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", boss.location, { radius: 4.5 }), 32);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "sombra_explosao", V.up(boss.location, 1), { radius: 4 });
    sound(boss.dimension, "mob.wither.shoot", boss.location, 0.7, 1);
    for (const e of hitList(boss, boss.location, 4.5)) {
      dealDamage(boss, e, 9 * diff(), "dark");
      knockFrom(e, boss.location, 1.3, 0.35);
    }
  }, 46);
  cd(s, "correntes", 12);
  finish(boss, s, 50);
}
function teleporte(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.teleporte);
  particle(boss.dimension, "sombra_explosao", V.up(boss.location, 1.5), { radius: 1.5 });
  sound(boss.dimension, "mob.endermen.portal", boss.location, 0.7, 1.2);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const to = arenaSpot(boss, s, players, 8);
    try { boss.teleport(to, { facingLocation: players[0]?.location }); } catch { /* */ }
    particle(boss.dimension, "sombra_explosao", V.up(to, 1.5), { radius: 1.5 });
  }, 9);
  s.close = 0;
  cd(s, "teleporte", 8);
  finish(boss, s, 20);
}

// ------------------------------------------------------------------ servos e ilusões
function minions(boss) {
  const s = st(boss);
  try {
    return boss.dimension.getEntities({ tags: [QTAG(s.siteId)], location: boss.location, maxDistance: 48 })
      .filter((e) => e.typeId !== QUEEN && e.typeId !== ILLUSION);
  } catch {
    return [];
  }
}
function illusionsOf(boss, s) {
  try {
    return boss.dimension.getEntities({ type: ILLUSION, tags: [QTAG(s.siteId)], location: boss.location, maxDistance: 60 });
  } catch {
    return [];
  }
}
function espelhos(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.espelhos);
  sound(boss.dimension, "mob.evocation_illager.prepare_wololo", boss.location, 0.8, 1.5);
  particle(boss.dimension, "sombra_zona", boss.location, { radius: 2 });
  for (const p of players) p.onScreenDisplay.setActionBar("§5Espelhos do Véu! §fAs cópias são translúcidas; a verdadeira, não.");
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const pts = [];
    for (let i = 0; i < 3; i++) pts.push(arenaSpot(boss, s, players, 5));
    const real = Math.floor(Math.random() * 3);
    for (let i = 0; i < 3; i++) {
      const pos = pts[i];
      particle(boss.dimension, "sombra_explosao", V.up(pos, 1.5), { radius: 1.3 });
      if (i === real) {
        try { boss.teleport(pos, { facingLocation: players[0]?.location }); } catch { /* */ }
        continue;
      }
      try {
        const il = boss.dimension.spawnEntity(ILLUSION, pos);
        il.addTag(QTAG(s.siteId));
        il.setProperty(`${NS}:phase`, s.phase);
        il.nameTag = boss.nameTag;
        illusions.set(il.id, { until: tick() + 220, next: tick() + 20 + i * 8, queen: boss.id });
      } catch { /* */ }
    }
  }, 22);
  cd(s, "espelhos", 18);
  finish(boss, s, 34);
}
function invocar(boss, s) {
  lock(boss, true);
  setAnim(boss, A.invocar);
  sound(boss.dimension, "mob.evocation_illager.prepare_summon", boss.location, 0.7, 1.6);
  const kinds = s.phase === 3 ? [`${NS}:espiao_veu`, `${NS}:espiao_veu`, `${NS}:espectro`] : [`${NS}:espiao_veu`, `${NS}:espiao_veu`];
  const pts = [];
  for (let i = 0; i < kinds.length * 4 && pts.length < kinds.length; i++) {
    const pt = ground(boss.dimension, V.add(boss.location, V.rotY({ x: 3.5, y: 1, z: 0 }, rand(0, 360))));
    if (free(boss.dimension, pt) && inArena(s, pt, -1)) pts.push(pt);
  }
  for (const pt of pts) particle(boss.dimension, "cor_circulo_magico", pt, { color: "dark", radius: 1 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    pts.forEach((pt, i) => {
      try {
        const e = boss.dimension.spawnEntity(kinds[i], pt, { initialPersistence: true });
        e.addTag(QTAG(s.siteId));
        if (kinds[i].endsWith("espiao_veu")) e.nameTag = "§5Acólito do Véu";
        particle(boss.dimension, "sombra_explosao", V.up(pt, 0.5), { radius: 1 });
      } catch { /* */ }
    });
  }, 26);
  cd(s, "invocar", 20);
  finish(boss, s, 40);
}

// ------------------------------------------------------------------ Forma Abissal
function lancas(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.lancas);
  sound(boss.dimension, "mob.evocation_illager.cast_spell", boss.location, 0.6, 1.4);
  const pts = [];
  for (const p of players.slice(0, 5)) {
    const base = ground(boss.dimension, p.location);
    pts.push(base);
    for (let k = 0; k < 2; k++) pts.push(ground(boss.dimension, V.add(base, { x: rand(-2.5, 2.5), y: 1, z: rand(-2.5, 2.5) })));
  }
  for (const pt of pts) particle(boss.dimension, "alerta_area", pt, { radius: 1.3 });
  system.runTimeout(() => ok(boss) && pts.forEach((pt) => particle(boss.dimension, "alerta_anel", pt, { radius: 1.3 })), 14);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    sound(boss.dimension, "mob.evocation_fangs.attack", boss.location, 0.7, 1.4);
    for (const pt of pts) {
      particle(boss.dimension, "sombra_explosao", V.up(pt, 0.8), { radius: 1 });
      particle(boss.dimension, "espinhos_osso", pt, { radius: 0.9 });
      for (const e of hitList(boss, pt, 1.4)) {
        dealDamage(boss, e, 10 * diff(), "dark");
        try { e.applyKnockback({ x: 0, z: 0 }, 0.6); } catch { /* */ }
      }
    }
  }, 28);
  cd(s, "lancas", 9);
  finish(boss, s, 36);
}
function eclipse(boss, s, players) {
  lock(boss, true);
  s.invuln = 0;
  const c = arenaSpot(boss, s, [], 0);
  try { boss.teleport(V.lerp(c, s.home, 0.7), { facingLocation: players[0]?.location }); } catch { /* */ }
  setAnim(boss, A.eclipse);
  sound(boss.dimension, "mob.warden.emerge", boss.location, 0.6, 2);
  // um círculo de luz perto de cada jogador (4 a 6 blocos) e mais um aleatório
  const circles = [];
  for (const p of players) {
    for (let i = 0; i < 8; i++) {
      const pt = ground(boss.dimension, V.add(p.location, V.rotY({ x: rand(4, 6), y: 1, z: 0 }, rand(0, 360))));
      if (inArena(s, pt, -1) && free(boss.dimension, pt)) {
        circles.push(pt);
        break;
      }
    }
  }
  circles.push(arenaSpot(boss, s, [], 0));
  for (const p of players) {
    effect(p, "darkness", 180, 0);
    p.onScreenDisplay.setTitle("§5§lECLIPSE", { subtitle: "§fFique dentro de um círculo de luz!", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
    shake(p, 0.2, 1.5);
  }
  let t = 0;
  const h = system.runInterval(() => {
    t++;
    if (!ok(boss) || s.dying || t > 130) {
      system.clearRun(h);
      return;
    }
    if (t % 10 === 0) {
      for (const pt of circles) {
        particle(boss.dimension, "cor_anel", V.up(pt, 0.1), { color: "holy", radius: 2.5 });
        particle(boss.dimension, "sagrado_pilar", pt, {});
      }
      particle(boss.dimension, "sombra_zona", s.home, { radius: 8 });
    }
    if (t >= 64 && (t - 64) % 15 === 0) {
      sound(boss.dimension, "mob.warden.sonic_boom", boss.location, 0.5, 0.6);
      for (const p of fighters(boss, s)) {
        if (circles.some((pt) => V.dist2d(pt, p.location) <= 2.6)) continue;
        dealDamage(boss, p, 7 * diff(), "dark");
        particle(boss.dimension, "sombra_explosao", V.up(p.location, 1), { radius: 0.8 });
      }
    }
  }, 1);
  cd(s, "eclipse", 32);
  finish(boss, s, 128);
}

// ------------------------------------------------------------------ fases, introdução e morte
function phaseChange(boss, s, phase) {
  s.phase = phase;
  s.invuln = tick() + 54;
  lock(boss, true);
  setAnim(boss, A.transformar);
  sound(boss.dimension, "mob.evocation_illager.prepare_wololo", boss.location, 0.5, 2);
  particle(boss.dimension, "sombra_zona", boss.location, { radius: 3 });
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    try {
      boss.setProperty(`${NS}:phase`, phase);
      boss.triggerEvent(phase === 2 ? "valdoria:fase2" : "valdoria:fase3");
    } catch { /* */ }
    particle(boss.dimension, "sombra_explosao", V.up(boss.location, 2), { radius: 3.5 });
    sound(boss.dimension, "mob.wither.spawn", boss.location, 0.8, 1.2);
    for (const p of fighters(boss, s, 40)) {
      shake(p, 0.4, 1);
      knockFrom(p, boss.location, 0.9, 0.2);
      p.onScreenDisplay.setTitle(" ", {
        subtitle: phase === 2 ? "§5Vaelith revela suas asas: §fa Rainha Sombria!" : "§cForma Abissal! §fA escuridão vai engolir o santuário.",
        fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
    }
    updateName(boss, s);
  }, 30);
  s.cds.espelhos = tick() + (phase === 2 ? 70 : 200);
  s.cds.invocar = tick() + 160;
  s.cds.eclipse = tick() + (phase === 3 ? 60 : 9999);
  s.cds.lancas = tick() + 120;
  finish(boss, s, 54);
}
function intro(boss) {
  const s = st(boss);
  s.intro = true;
  s.invuln = tick() + 64;
  updateName(boss, s);
  lock(boss, true);
  setAnim(boss, A.intro);
  particle(boss.dimension, "sombra_zona", boss.location, { radius: 3 });
  sound(boss.dimension, "mob.evocation_illager.prepare_summon", boss.location, 0.5, 2);
  for (const p of fighters(boss, s, 48)) {
    shake(p, 0.2, 2.5);
    p.onScreenDisplay.setTitle("§5§lVAELITH", { subtitle: "§7A Rainha das Trevas se ergue do trono", fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
  }
  s.cds = { laminas: tick() + 90, correntes: tick() + 160, teleporte: tick() + 120 };
  finish(boss, s, 60);
}
function startDeath(boss, s) {
  if (s.dying) return;
  s.dying = true;
  lock(boss, true);
  setAnim(boss, A.morte);
  const h = health(boss);
  if (h) h.setCurrentValue(1);
  sound(boss.dimension, "mob.evocation_illager.death", boss.location, 0.5, 2);
  for (const e of minions(boss).concat(illusionsOf(boss, s))) {
    try { e.kill(); } catch { /* */ }
  }
  for (const p of fighters(boss, s, 40)) {
    try { p.removeEffect("darkness"); } catch { /* */ }
  }
  for (let i = 0; i < 7; i++) system.runTimeout(() => ok(boss) && particle(boss.dimension, "sombra_explosao", V.up(boss.location, rand(1, 4)), { radius: 1.2 }), i * 9);
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "sagrado_pilar", loc, {});
    particle(dim, "sombra_explosao", V.up(loc, 2), { radius: 3 });
    const players = rewards(s, loc, dim);
    states.delete(boss.id);
    boss.remove();
    for (const fn of defeatHooks) {
      try { fn(s.siteId, players, dim); } catch (e) { console.warn(`[Valdoria] vitória do santuário: ${e}`); }
    }
  }, 70);
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
    addXP(p, Math.round(3000 * share), "Rainha das Trevas");
    const d = getData(p);
    d.chefes++;
    d.abates[QUEEN] = (d.abates[QUEEN] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§5§lVITÓRIA", { subtitle: "§7O Véu Negro se rasga", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:veu_sombrio`, randInt(4, 8));
  drop(`${NS}:moeda_ouro`, randInt(150, 260));
  drop(`${NS}:lingote_mithril`, randInt(4, 6));
  drop(`${NS}:pedra_aprimoramento`, randInt(3, 5));
  drop(`${NS}:essencia_arcana`, randInt(3, 5));
  if (chance(0.3 + maxLuck)) drop(`${NS}:coroa_veu`, 1);
  if (chance(0.2 + maxLuck)) drop(`${NS}:cetro_vaelith`, 1);
  for (let i = 0; i < 30; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-1, 1), y: 1, z: rand(-1, 1) }));
  world.sendMessage(`§5[Valdoria] §f${NAME}§f foi derrotada por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
  return players.map(([p]) => p);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying || s.busy > tick()) return;
  const players = fighters(boss, s);
  if (!players.length) return;
  if (!inArena(s, boss.location) || V.dist(boss.location, s.home) > 20) {
    particle(boss.dimension, "sombra_explosao", V.up(boss.location, 1), { radius: 1 });
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  const hp = hpPct(boss);
  if (s.phase === 1 && hp <= 0.66) return phaseChange(boss, s, 2);
  if (s.phase === 2 && hp <= 0.33) return phaseChange(boss, s, 3);
  const byDist = players.slice().sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location));
  const target = byDist[0];
  const far = byDist[byDist.length - 1];
  const close = players.filter((p) => V.dist(p.location, boss.location) < 3.5).length;
  s.close = close ? s.close + 1 : 0;
  if (s.phase === 3 && ready(s, "eclipse")) return eclipse(boss, s, players);
  if (s.phase >= 2 && ready(s, "espelhos") && !illusionsOf(boss, s).length) return espelhos(boss, s, players);
  if (s.phase >= 2 && ready(s, "invocar") && minions(boss).length < 4) return invocar(boss, s);
  if (s.close >= 6 && ready(s, "teleporte")) return teleporte(boss, s, players);
  if (s.phase === 3 && ready(s, "lancas")) return lancas(boss, s, players);
  if (ready(s, "correntes") && V.dist2d(far.location, boss.location) > 7) return correntes(boss, s, far);
  if (ready(s, "laminas") && chance(0.5)) return laminas(boss, s, target);
  if (ready(s, "dardos")) {
    lock(boss, true);
    dardos(boss, s, target, s.phase === 3 ? 5 : 3, 7 * diff());
    cd(s, "dardos", 4);
    return finish(boss, s, 12 + (s.phase === 3 ? 25 : 15));
  }
}
function thinkIllusion(il) {
  const m = illusions.get(il.id);
  if (!m || m.until < tick()) {
    particle(il.dimension, "sombra_explosao", V.up(il.location, 1.5), { radius: 1 });
    illusions.delete(il.id);
    try { il.remove(); } catch { /* */ }
    return;
  }
  if (m.next > tick()) return;
  const queen = world.getEntity(m.queen);
  const s = ok(queen) ? st(queen) : undefined;
  if (!s) return;
  const players = fighters(il, s, 30);
  if (!players.length) return;
  m.next = tick() + 50;
  dardos(il, s, players[Math.floor(Math.random() * players.length)], 2, 4 * diff());
  system.runTimeout(() => ok(il) && setAnim(il, A.none), 24);
}

// ------------------------------------------------------------------ API para o Santuário
export function spawnQueen(dim, pos, siteId) {
  const boss = dim.spawnEntity(QUEEN, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
  boss.setDynamicProperty(`${NS}:local`, siteId);
  boss.addTag(QTAG(siteId));
  states.delete(boss.id);
  intro(boss);
  return boss;
}
export function queenOf(dim, siteId) {
  try {
    return dim.getEntities({ type: QUEEN, tags: [QTAG(siteId)] })[0];
  } catch {
    return undefined;
  }
}
export function despawnQueen(dim, siteId) {
  try {
    for (const e of dim.getEntities({ tags: [QTAG(siteId)] })) {
      states.delete(e.id);
      illusions.delete(e.id);
      e.remove();
    }
  } catch { /* */ }
}

export function startQueen() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId === ILLUSION) {
      // qualquer golpe desfaz a ilusão em fumaça (vida 1)
      const src = ev.src;
      system.run(() => {
        if (!ok(e)) return;
        particle(e.dimension, "sombra_explosao", V.up(e.location, 1.5), { radius: 1.2 });
        sound(e.dimension, "random.glass", e.location, 1.2, 1);
        if (ok(src) && isPlayer(src)) src.onScreenDisplay.setActionBar("§7Era só uma ilusão!");
      });
      return;
    }
    if (e.typeId !== QUEEN) return;
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
    const dim = world.getDimension("minecraft:overworld");
    for (const boss of dim.getEntities({ type: QUEEN })) {
      try { think(boss); } catch (err) { console.warn(`[Valdoria] Rainha das Trevas: ${err}`); }
    }
    for (const il of dim.getEntities({ type: ILLUSION })) {
      try { thinkIllusion(il); } catch (err) { console.warn(`[Valdoria] ilusão: ${err}`); }
    }
  }, 5);
  world.afterEvents.entityLoad.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e)) return;
    if (e.typeId === QUEEN) updateName(e, st(e));
    else if (e.typeId === ILLUSION && !illusions.has(e.id)) {
      try { e.remove(); } catch { /* */ }
    }
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== QUEEN) return;
    system.runTimeout(() => ok(e) && !st(e).intro && intro(e), 2);
  });
}
