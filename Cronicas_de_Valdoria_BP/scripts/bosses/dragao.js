// Chefe do Ninho: Ignaroth, o Dragão Ancestral. Fase I em terra (mordida, cauda, sopro de fogo), fase II no ar (bolas de fogo,
// rasantes, tempestade de raios, pousos com janela de exaustão) e fase III, Fúria Ancestral (meteoros, anel de chamas).
// O voo é conduzido por script (impulsos por tick, sem gravidade); todos os golpes de área são marcados no chão antes de cair.
import { world, system, ItemStack } from "@minecraft/server";
import { V, ok, tick, rand, randInt, chance, NS, isPlayer, isActivePlayer, health, hpPct, effect } from "../core/util.js";
import { particle, sound, shake } from "../core/fx.js";
import { dealDamage, onBeforeHurt, addVulnerable, canHit } from "../core/damage.js";
import { launch, ground, knockFrom } from "../abilities/engine.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { stats } from "../rpg/stats.js";

export const DRAGON = `${NS}:dragao_ancestral`;
const NAME = "Ignaroth, o Dragão Ancestral";
const A = { none: 0, mordida: 1, cauda: 2, sopro: 3, rugido: 4, decolar: 5, voo: 6, pousar: 7, rasante: 8, exausto: 9,
  meteoros: 10, morte: 11, intro: 12, voo_fogo: 13, anel: 14 };
const SCALE = 1.7;
const ALT = 13; // altitude do voo em círculos
const RADIUS = 13;
export const DTAG = (siteId) => `vg_${siteId}`;
const states = new Map();
const defeatHooks = [];
/** @type {(siteId: string) => any} */
let resolver = () => undefined;

export function setDragonArenaResolver(fn) {
  resolver = fn;
}
export function onDragonDefeated(fn) {
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
        boss.addTag(DTAG(siteId));
      } catch { /* */ }
    }
    const info = resolver(siteId);
    s = { phase: 1, busy: 0, invuln: 0, cds: {}, contrib: new Map(), dying: false, siteId, arena: info?.arena,
      home: info?.center || { ...boss.location }, mode: "solo", fly: null, ang: 0, airUntil: 0, groundUntil: 0, airN: 0, pend3: false };
    try {
      s.phase = Number(boss.getProperty(`${NS}:phase`)) || 1;
    } catch { /* */ }
    states.set(boss.id, s);
    // mundo recarregado: volta ao estado de terra (com gravidade)
    try { boss.triggerEvent("valdoria:pousar"); } catch { /* */ }
    if (s.phase >= 2) s.groundUntil = tick() + 200;
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
const dmgMul = (s) => diff() * (s.phase === 3 ? 1.15 : 1);
function setAnim(boss, a) {
  try { boss.setProperty(`${NS}:anim`, a); } catch { /* */ }
}
function lock(boss, on) {
  try { boss.triggerEvent(on ? "valdoria:travar" : "valdoria:destravar"); } catch { /* */ }
}
function inArena(s, loc, m = 0) {
  if (!s.arena) return true;
  const [a, b] = s.arena;
  return loc.x >= a.x - m && loc.x <= b.x + 1 + m && loc.z >= a.z - m && loc.z <= b.z + 1 + m && loc.y >= a.y - 3 && loc.y <= b.y + 3;
}
function fighters(s, dim, r = 42) {
  try {
    return dim.getPlayers({ location: s.home, maxDistance: r }).filter((p) => isActivePlayer(p) && inArena(s, p.location, 1));
  } catch {
    return [];
  }
}
function updateName(boss, s) {
  boss.nameTag = `§c${NAME} §7- ${["Fase I", "Fase II: Céus em Chamas", "Fase III: Fúria Ancestral"][s.phase - 1]}`;
}
const yawOf = (d) => (Math.atan2(-d.x, d.z) * 180) / Math.PI;
function setYaw(boss, yaw) {
  try { boss.setRotation({ x: 0, y: yaw }); } catch { /* */ }
}
function fwd(boss) {
  try {
    const y = (boss.getRotation().y * Math.PI) / 180;
    return { x: -Math.sin(y), y: 0, z: Math.cos(y) };
  } catch {
    return V.flat(boss.getViewDirection());
  }
}
function face(boss, target) {
  setYaw(boss, yawOf(V.sub(target.location, boss.location)));
}
/** Gira no máximo `maxDeg` graus em direção ao alvo (permite fugir do sopro correndo de lado). */
function turnToward(boss, target, maxDeg) {
  try {
    const cur = boss.getRotation().y;
    const want = yawOf(V.sub(target.location, boss.location));
    let d = ((want - cur + 540) % 360) - 180;
    d = Math.max(-maxDeg, Math.min(maxDeg, d));
    setYaw(boss, cur + d);
  } catch { /* */ }
}
const mouth = (boss) => V.add(V.up(boss.location, 2.6), V.mul(fwd(boss), 6.4));
const ready = (s, key) => (s.cds[key] || 0) <= tick();
function cd(s, key, sec) {
  s.cds[key] = tick() + Math.round(sec * 20 * (s.phase === 3 ? 0.75 : 1));
}
function finish(boss, s, after, next = A.none) {
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, s.mode === "voo" ? A.voo : next);
    if (s.mode === "solo") lock(boss, false);
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
function arenaPoint(s, maxR) {
  for (let i = 0; i < 8; i++) {
    const p = V.add(s.home, { x: rand(-maxR, maxR), y: 0, z: rand(-maxR, maxR) });
    if (V.dist2d(p, s.home) <= maxR && inArena(s, p, -1)) return p;
  }
  return { ...s.home };
}

// ------------------------------------------------------------------ voo por script
function flyTo(boss, s, dest, speed, onArrive, faceMove = true) {
  const d = V.dist(dest, boss.location);
  s.fly = { dest, speed, onArrive, t: 0, maxT: Math.ceil(d / speed * 1.6) + 30, faceMove };
}
function moveStep(boss, s) {
  const f = s.fly;
  if (!f) return;
  const loc = boss.location;
  const d = V.sub(f.dest, loc);
  const dist = V.len(d);
  f.t++;
  if (dist <= Math.max(0.5, f.speed) || f.t > f.maxT) {
    try {
      boss.clearVelocity();
      if (dist > 1.5) boss.teleport(f.dest, { keepVelocity: false });
    } catch { /* */ }
    s.fly = null;
    if (f.onArrive) f.onArrive();
    return;
  }
  const dir = V.mul(d, 1 / dist);
  try {
    boss.clearVelocity();
    boss.applyImpulse(V.mul(dir, f.speed));
  } catch {
    try { boss.teleport(V.add(loc, V.mul(dir, f.speed)), { keepVelocity: false }); } catch { /* */ }
  }
  if (f.faceMove && Math.hypot(d.x, d.z) > 0.4) setYaw(boss, yawOf(d));
  if (f.each) f.each(f.t);
}
function circleNext(boss, s) {
  s.ang = (s.ang + 35) % 360;
  const r = (s.ang * Math.PI) / 180;
  const dest = V.add(s.home, { x: Math.cos(r) * RADIUS, y: ALT + Math.sin(r * 2) * 1.5, z: Math.sin(r) * RADIUS });
  flyTo(boss, s, dest, 0.42, () => ok(boss) && s.mode === "voo" && !s.dying && circleNext(boss, s));
}

function takeoff(boss, s) {
  lock(boss, true);
  setAnim(boss, A.decolar);
  s.mode = "voo";
  s.busy = tick() + 60;
  try { boss.triggerEvent("valdoria:voar"); } catch { /* */ }
  sound(boss.dimension, "mob.enderdragon.flap", boss.location, 0.7, 2);
  particle(boss.dimension, "onda_choque", boss.location, { radius: 3 });
  particle(boss.dimension, "poeira", boss.location, { radius: 4 });
  for (const p of fighters(s, boss.dimension)) p.onScreenDisplay.setActionBar("§6Ignaroth alça voo! §fProtéjam-se das bolas de fogo e dos rasantes.");
  flyTo(boss, s, V.up(boss.location, ALT - 4), 0.3, () => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.voo);
    s.airUntil = tick() + 340;
    s.airN = 0;
    s.busy = tick() + 10;
    circleNext(boss, s);
  });
}

function land(boss, s) {
  const spot = ground(boss.dimension, V.add(s.home, { x: rand(-3, 3), y: 4, z: rand(-3, 3) }));
  s.busy = tick() + 400;
  setAnim(boss, A.voo);
  flyTo(boss, s, V.up(spot, 5), 0.5, () => {
    if (!ok(boss) || s.dying) return;
    for (let i = 0; i < 3; i++) {
      system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", spot, { radius: 6 }), i * 8);
    }
    particle(boss.dimension, "alerta_area", spot, { radius: 6 });
    setAnim(boss, A.pousar);
    flyTo(boss, s, spot, 0.22, () => touchdown(boss, s, spot), false);
  });
}

function touchdown(boss, s, spot) {
  if (!ok(boss)) return;
  try { boss.triggerEvent("valdoria:pousar"); } catch { /* */ }
  s.mode = "solo";
  lock(boss, true);
  particle(boss.dimension, "onda_choque", spot, { radius: 3.5 });
  particle(boss.dimension, "poeira", spot, { radius: 5 });
  sound(boss.dimension, "mob.ravager.stun", spot, 0.6, 2);
  for (const e of hitList(boss, spot, 6)) {
    dealDamage(boss, e, 8 * dmgMul(s), "physical", { kind: "weapon" });
    knockFrom(e, spot, 1.4, 0.45);
  }
  for (const p of fighters(s, boss.dimension)) shake(p, 0.3, 0.8);
  if (s.dying) return;
  if (s.pend3) {
    s.pend3 = false;
    return phaseChange(boss, s, 3);
  }
  // exaustão: janela de dano aumentado
  setAnim(boss, A.exausto);
  addVulnerable(boss, 0.25, 5);
  for (const p of fighters(s, boss.dimension)) p.onScreenDisplay.setActionBar("§eIgnaroth está exausto! §f(+25% de dano por 5 s)");
  s.groundUntil = tick() + 100 + 300;
  finish(boss, s, 100);
}

// ------------------------------------------------------------------ golpes em terra
function mordida(boss, s, target) {
  face(boss, target);
  lock(boss, true);
  setAnim(boss, A.mordida);
  const c = V.add(boss.location, V.mul(fwd(boss), 6.2));
  particle(boss.dimension, "alerta_area", ground(boss.dimension, c), { radius: 2.8 });
  sound(boss.dimension, "mob.enderdragon.growl", boss.location, 1.4, 0.7);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const cc = V.add(V.up(boss.location, 1), V.mul(fwd(boss), 6.2));
    for (const e of hitList(boss, cc, 3.2)) {
      dealDamage(boss, e, 13 * dmgMul(s), "physical", { kind: "weapon" });
      knockFrom(e, boss.location, 0.8, 0.3);
    }
    sound(boss.dimension, "mob.ravager.bite", cc, 0.7, 1.2);
  }, 12);
  cd(s, "mordida", 3.5);
  finish(boss, s, 18);
}

function cauda(boss, s) {
  lock(boss, true);
  setAnim(boss, A.cauda);
  particle(boss.dimension, "alerta_anel", boss.location, { radius: 7.5 });
  system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", boss.location, { radius: 7.5 }), 8);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    const f = fwd(boss);
    sound(boss.dimension, "mob.enderdragon.flap", boss.location, 0.6, 1.5);
    particle(boss.dimension, "onda_choque", boss.location, { radius: 3.5 });
    for (const e of hitList(boss, boss.location, 8)) {
      if (V.dot(f, V.flat(V.sub(e.location, boss.location))) > 0.55) continue; // a frente (cabeça) fica fora da varredura
      dealDamage(boss, e, 11 * dmgMul(s), "physical", { kind: "weapon" });
      knockFrom(e, boss.location, 1.8, 0.5);
    }
  }, 16);
  cd(s, "cauda", 6);
  finish(boss, s, 26);
}

function sopro(boss, s, target) {
  lock(boss, true);
  setAnim(boss, A.sopro);
  face(boss, target);
  sound(boss.dimension, "mob.enderdragon.growl", boss.location, 0.9, 1.4);
  const f0 = fwd(boss);
  const m0 = mouth(boss);
  for (let d = 2; d <= 12; d += 2.5) {
    for (const k of [-1, 0, 1]) {
      const dir = V.rotY(f0, k * 20);
      particle(boss.dimension, "alerta_area", ground(boss.dimension, V.add(m0, V.mul(dir, d))), { radius: 1.1 + d * 0.08 });
    }
  }
  for (const p of fighters(s, boss.dimension)) p.onScreenDisplay.setActionBar("§cSopro de fogo! §fCorra para os lados.");
  let t = 0;
  const hit = new Map();
  const h = system.runInterval(() => {
    t++;
    if (!ok(boss) || s.dying || t > 58) {
      system.clearRun(h);
      return;
    }
    if (ok(target) && t > 6) turnToward(boss, target, 1.2);
    if (t < 16) return;
    const m = mouth(boss);
    const f = fwd(boss);
    if (t === 16) sound(boss.dimension, "mob.ghast.fireball", m, 0.6, 2);
    if (t % 2 === 0) {
      for (let d = 1.5; d <= 12; d += 2.1) {
        const sp = V.rotY(f, rand(-26, 26));
        particle(boss.dimension, "fogo_explosao", V.add(m, V.add(V.mul(sp, d), { x: 0, y: -d * 0.12, z: 0 })), { radius: 0.5 + d * 0.06 });
      }
    }
    if (t % 6 === 0) sound(boss.dimension, "fire.fire", m, 0.8, 1.5);
    for (const e of hitList(boss, V.add(m, V.mul(f, 6)), 7.5)) {
      const to = V.sub(V.up(e.location, 0.8), m);
      const dist = V.len(to);
      if (dist > 13 || V.dot(V.flat(to), f) < Math.cos((32 * Math.PI) / 180) * Math.hypot(to.x, to.z)) continue;
      if ((hit.get(e.id) || 0) > t) continue;
      hit.set(e.id, t + 5);
      dealDamage(boss, e, 3.5 * dmgMul(s), "fire");
      try { e.setOnFire(4, true); } catch { /* */ }
    }
  }, 1);
  cd(s, "sopro", 10);
  finish(boss, s, 62);
}

function rugido(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.rugido);
  sound(boss.dimension, "mob.enderdragon.growl", boss.location, 0.7, 2.5);
  system.runTimeout(() => {
    if (!ok(boss) || s.dying) return;
    particle(boss.dimension, "onda_choque", boss.location, { radius: 4 });
    for (const p of players) {
      if (!ok(p) || V.dist(p.location, boss.location) > 11) continue;
      knockFrom(p, boss.location, 1.1, 0.25);
      effect(p, "slowness", 40, 0);
      shake(p, 0.35, 0.8);
    }
  }, 10);
  cd(s, "rugido", 18);
  finish(boss, s, 40);
}

function meteoros(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.meteoros);
  sound(boss.dimension, "mob.enderdragon.growl", boss.location, 0.6, 2.5);
  for (const p of players) p.onScreenDisplay.setActionBar("§6Chuva de Meteoros! §fSaia dos círculos marcados.");
  const pts = players.slice(0, 5).map((p) => ground(boss.dimension, p.location));
  while (pts.length < 9) pts.push(ground(boss.dimension, V.up(arenaPoint(s, 15), 3)));
  pts.forEach((pt, i) => {
    const d0 = 10 + i * 4;
    system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_area", pt, { radius: 2.6 }), d0);
    system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", pt, { radius: 2.6 }), d0 + 14);
    for (let k = 0; k < 8; k++) {
      system.runTimeout(() => ok(boss) && particle(boss.dimension, "meteoro", V.up(pt, 14 - k * 1.8), {}), d0 + 24 + k);
    }
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      particle(boss.dimension, "fogo_explosao", V.up(pt, 0.5), { radius: 2.4 });
      particle(boss.dimension, "detritos", pt, {});
      sound(boss.dimension, "random.explode", pt, 0.9, 0.7);
      for (const e of hitList(boss, pt, 2.8)) {
        dealDamage(boss, e, 10 * dmgMul(s), "fire");
        try { e.setOnFire(3, true); } catch { /* */ }
      }
    }, d0 + 32);
  });
  cd(s, "meteoros", 16);
  finish(boss, s, 10 + pts.length * 4 + 40);
}

function anel(boss, s, players) {
  lock(boss, true);
  setAnim(boss, A.anel);
  for (const p of players) p.onScreenDisplay.setActionBar("§6Anel de Chamas! §fPule por cima da onda de fogo.");
  const c = { ...boss.location };
  for (const t of [0, 7]) system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", c, { radius: 3 }), t);
  const hit = new Set();
  let t = 0;
  const h = system.runInterval(() => {
    t++;
    if (!ok(boss) || s.dying || t > 54) {
      system.clearRun(h);
      return;
    }
    if (t < 14) return;
    const r = 2.5 + (t - 14) * 0.4;
    if (t === 14) {
      sound(boss.dimension, "mob.ravager.stun", c, 0.6, 2);
      particle(boss.dimension, "onda_choque", c, { radius: 3 });
    }
    if (t % 2 === 0) particle(boss.dimension, "cor_anel", V.up(c, 0.2), { color: "fire", radius: r });
    for (const e of hitList(boss, c, r + 1.2)) {
      if (hit.has(e.id)) continue;
      if (Math.abs(V.dist2d(e.location, c) - r) > 0.9) continue;
      if (e.location.y - c.y > 0.8) continue; // pulou por cima
      hit.add(e.id);
      dealDamage(boss, e, 8 * dmgMul(s), "fire");
      try { e.setOnFire(3, true); } catch { /* */ }
    }
  }, 1);
  cd(s, "anel", 14);
  finish(boss, s, 58);
}

// ------------------------------------------------------------------ ataques aéreos
function bolas(boss, s, players) {
  setAnim(boss, A.voo_fogo);
  const n = s.phase >= 2 ? 3 : 2;
  for (let i = 0; i < n; i++) {
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      const tgt = players[i % players.length];
      if (!ok(tgt)) return;
      const from = mouth(boss);
      launch(boss, { from, dir: V.sub(V.up(tgt.location, 0.5), from), speed: 0.75, radius: 0.8, element: "fire", damage: 9 * dmgMul(s),
        aoe: 2.5, trail: "fogo_rastro", impact: "fogo_explosao", range: 60, homing: 0.03, area: false });
      sound(boss.dimension, "mob.ghast.fireball", from, 0.8, 1.5);
    }, 6 + i * 7);
  }
  s.airN++;
  cd(s, "bolas", 4.5);
  s.busy = tick() + 6 + n * 7 + 6;
  system.runTimeout(() => ok(boss) && s.mode === "voo" && !s.dying && setAnim(boss, A.voo), 6 + n * 7 + 4);
}

function rasante(boss, s, target) {
  s.busy = tick() + 400;
  const dir = V.flat(V.sub(target.location, s.home));
  const d = Math.hypot(dir.x, dir.z) > 0.1 ? dir : V.rotY({ x: 1, y: 0, z: 0 }, rand(0, 360));
  const side = V.rotY(d, rand(-25, 25));
  const pA = V.add(s.home, V.add(V.mul(side, -17), { x: 0, y: 7, z: 0 }));
  const pB = V.add(s.home, V.add(V.mul(side, 17), { x: 0, y: 6, z: 0 }));
  flyTo(boss, s, pA, 0.55, () => {
    if (!ok(boss) || s.dying) return;
    const line = [];
    for (let k = 0; k <= 17; k++) line.push(ground(boss.dimension, V.lerp(pA, pB, k / 17)));
    for (const t of [0, 12, 24]) system.runTimeout(() => ok(boss) && line.forEach((pt) => particle(boss.dimension, "alerta_area", pt, { radius: 1.6 })), t);
    for (const p of fighters(s, boss.dimension)) p.onScreenDisplay.setActionBar("§cRasante! §fSaia da trilha marcada.");
    setYaw(boss, yawOf(V.sub(pB, pA)));
    system.runTimeout(() => {
      if (!ok(boss) || s.dying) return;
      setAnim(boss, A.rasante);
      sound(boss.dimension, "mob.enderdragon.growl", boss.location, 0.9, 2);
      const hit = new Map();
      flyTo(boss, s, pB, 0.7, () => {
        if (!ok(boss) || s.dying) return;
        setAnim(boss, A.voo);
        s.airN++;
        s.busy = tick() + 10;
        circleNext(boss, s);
      });
      s.fly.each = (t) => {
        if (t % 2) return;
        const gp = ground(boss.dimension, V.add(boss.location, V.mul(fwd(boss), 4)));
        particle(boss.dimension, "fogo_explosao", V.up(gp, 0.4), { radius: 1.3 });
        for (const e of hitList(boss, gp, 2.6)) {
          if (Math.abs(e.location.y - gp.y) > 3 || (hit.get(e.id) || 0) > t) continue;
          hit.set(e.id, t + 10);
          dealDamage(boss, e, 7 * dmgMul(s), "fire");
          try { e.setOnFire(3, true); } catch { /* */ }
        }
      };
    }, 30);
  });
  cd(s, "rasante", 9);
}

function tempestade(boss, s, players) {
  s.busy = tick() + 400;
  flyTo(boss, s, V.up(s.home, ALT - 2), 0.45, () => {
    if (!ok(boss) || s.dying) return;
    setAnim(boss, A.voo_fogo);
    sound(boss.dimension, "ambient.weather.thunder", s.home, 0.8, 1.5);
    for (const p of players) {
      if (!ok(p)) continue;
      p.onScreenDisplay.setActionBar("§eTempestade Ancestral! §fFuja das marcas antes do raio.");
      shake(p, 0.15, 1.5);
    }
    const pts = players.filter(ok).map((p) => ground(boss.dimension, p.location));
    while (pts.length < 6) pts.push(ground(boss.dimension, V.up(arenaPoint(s, 15), 3)));
    pts.forEach((pt, i) => {
      const d0 = 6 + i * 3;
      system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_area", pt, { radius: 2.2 }), d0);
      system.runTimeout(() => ok(boss) && particle(boss.dimension, "alerta_anel", pt, { radius: 2.2 }), d0 + 14);
      system.runTimeout(() => {
        if (!ok(boss) || s.dying) return;
        particle(boss.dimension, "raio_queda", pt, {});
        particle(boss.dimension, "raio_explosao", V.up(pt, 0.5), { radius: 1.5 });
        sound(boss.dimension, "ambient.weather.lightning.impact", pt, 1, 0.8);
        for (const e of hitList(boss, pt, 2.4)) dealDamage(boss, e, 9 * dmgMul(s), "lightning");
      }, d0 + 28);
    });
    system.runTimeout(() => {
      if (!ok(boss) || s.dying || s.mode !== "voo") return;
      setAnim(boss, A.voo);
      s.airN++;
      s.busy = tick() + 10;
      circleNext(boss, s);
    }, 6 + pts.length * 3 + 34);
  });
  cd(s, "tempestade", 13);
}

// ------------------------------------------------------------------ fases, introdução e morte
function phaseChange(boss, s, phase) {
  s.phase = phase;
  s.invuln = tick() + 50;
  lock(boss, true);
  setAnim(boss, A.rugido);
  try {
    boss.setProperty(`${NS}:phase`, phase);
    boss.triggerEvent(phase === 2 ? "valdoria:fase2" : "valdoria:fase3");
  } catch { /* */ }
  sound(boss.dimension, "mob.enderdragon.growl", boss.location, 0.6, 3);
  particle(boss.dimension, "fogo_explosao", V.up(boss.location, 2), { radius: 4 });
  for (const p of fighters(s, boss.dimension)) {
    shake(p, 0.4, 1.2);
    p.onScreenDisplay.setTitle(" ", {
      subtitle: phase === 2 ? "§6Ignaroth abre as asas: os céus vão arder!" : "§cFúria Ancestral! §fMeteoros e anéis de chamas.",
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
  }
  updateName(boss, s);
  s.cds.meteoros = tick() + 140;
  s.cds.anel = tick() + 220;
  s.cds.bolas = tick() + 60;
  s.cds.rasante = tick() + 120;
  s.cds.tempestade = tick() + 200;
  if (phase === 2) {
    s.busy = tick() + 400;
    system.runTimeout(() => ok(boss) && !s.dying && takeoff(boss, s), 42);
  } else {
    finish(boss, s, 44);
  }
}

function intro(boss, descend) {
  const s = st(boss);
  s.intro = true;
  updateName(boss, s);
  s.invuln = tick() + 140;
  s.busy = tick() + 140;
  sound(boss.dimension, "mob.enderdragon.growl", s.home, 0.6, 3);
  for (const p of fighters(s, boss.dimension, 60)) {
    shake(p, 0.25, 3);
    p.onScreenDisplay.setTitle("§c§lIGNAROTH", { subtitle: "§6O Dragão Ancestral desce dos céus", fadeInDuration: 10, stayDuration: 60, fadeOutDuration: 15 });
  }
  const roar = () => {
    if (!ok(boss)) return;
    try { boss.triggerEvent("valdoria:pousar"); } catch { /* */ }
    s.mode = "solo";
    lock(boss, true);
    setAnim(boss, A.rugido);
    particle(boss.dimension, "onda_choque", boss.location, { radius: 4 });
    particle(boss.dimension, "fogo_explosao", V.up(boss.location, 3), { radius: 3 });
    sound(boss.dimension, "mob.enderdragon.growl", boss.location, 0.7, 3);
    s.invuln = tick() + 40;
    finish(boss, s, 40);
    s.cds = { sopro: tick() + 80, mordida: tick() + 40, cauda: tick() + 60, rugido: tick() + 300 };
  };
  if (descend) {
    s.mode = "intro";
    try { boss.triggerEvent("valdoria:voar"); } catch { /* */ }
    setAnim(boss, A.voo);
    flyTo(boss, s, s.home, 0.42, roar);
  } else {
    lock(boss, true);
    setAnim(boss, A.intro);
    system.runTimeout(roar, 50);
  }
}

function startDeath(boss, s) {
  if (s.dying) return;
  s.dying = true;
  s.fly = null;
  if (s.mode !== "solo") {
    try {
      boss.triggerEvent("valdoria:pousar");
      boss.teleport(ground(boss.dimension, boss.location), { keepVelocity: false });
    } catch { /* */ }
    s.mode = "solo";
  }
  lock(boss, true);
  setAnim(boss, A.morte);
  const h = health(boss);
  if (h) h.setCurrentValue(1);
  sound(boss.dimension, "mob.enderdragon.death", boss.location, 1, 1.5);
  for (let i = 0; i < 8; i++) {
    system.runTimeout(() => ok(boss) && particle(boss.dimension, "fogo_explosao", V.add(boss.location, { x: rand(-3, 3), y: rand(1, 4), z: rand(-3, 3) }), { radius: 1.5 }), i * 10);
  }
  system.runTimeout(() => {
    if (!ok(boss)) return;
    const loc = boss.location;
    const dim = boss.dimension;
    particle(dim, "fogo_explosao", V.up(loc, 2), { radius: 4 });
    particle(dim, "nivel_anel", loc, {});
    const players = rewards(s, loc, dim);
    states.delete(boss.id);
    boss.remove();
    for (const fn of defeatHooks) {
      try { fn(s.siteId, players, dim); } catch (e) { console.warn(`[Valdoria] vitória do ninho: ${e}`); }
    }
  }, 84);
}

function rewards(s, loc, dim) {
  let maxLuck = 0;
  const players = [];
  for (const [pid, done] of s.contrib) {
    const p = world.getEntity(pid);
    if (!ok(p) || V.dist(p.location, loc) > 90) continue;
    players.push([p, done]);
  }
  for (const p of dim.getPlayers({ location: loc, maxDistance: 32 })) if (!players.some(([q]) => q.id === p.id)) players.push([p, 0]);
  const total = players.reduce((a, [, d]) => a + d, 0) || 1;
  for (const [p, done] of players) {
    const share = Math.max(0.4, done / total);
    addXP(p, Math.round(2600 * share), "Dragão Ancestral");
    const d = getData(p);
    d.chefes++;
    d.abates[DRAGON] = (d.abates[DRAGON] || 0) + 1;
    markDirty(p);
    saveNow(p);
    maxLuck = Math.max(maxLuck, stats(p).luck);
    p.onScreenDisplay.setTitle("§6§lVITÓRIA", { subtitle: "§7Ignaroth tomba sobre as próprias cinzas", fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 20 });
  }
  const drop = (id, n) => n > 0 && dim.spawnItem(new ItemStack(id, n), V.up(loc, 1));
  drop(`${NS}:escama_dragao`, randInt(4, 8));
  drop(`${NS}:moeda_ouro`, randInt(120, 220));
  drop(`${NS}:lingote_mithril`, randInt(4, 8));
  drop(`${NS}:pedra_aprimoramento`, randInt(3, 5));
  drop(`${NS}:cristal_aetherita`, randInt(3, 5));
  if (chance(0.3 + maxLuck)) drop(`${NS}:coracao_dragao`, 1);
  if (chance(0.2 + maxLuck)) drop(`${NS}:garra_draconica`, 1);
  for (let i = 0; i < 35; i++) dim.spawnEntity("minecraft:xp_orb", V.add(loc, { x: rand(-2, 2), y: 1, z: rand(-2, 2) }));
  world.sendMessage(`§6[Valdoria] §f${NAME}§f foi derrotado por §e${players.map(([p]) => p.name).join(", ") || "aventureiros desconhecidos"}§f!`);
  return players.map(([p]) => p);
}

// ------------------------------------------------------------------ cérebro
function think(boss) {
  const s = st(boss);
  if (s.dying || s.mode === "intro" || s.busy > tick()) return;
  const players = fighters(s, boss.dimension);
  if (!players.length) {
    if (s.mode === "voo" && !s.fly) circleNext(boss, s);
    return;
  }
  const hp = hpPct(boss);
  if (s.phase === 1 && hp <= 0.66) return phaseChange(boss, s, 2);
  if (s.phase === 2 && hp <= 0.33) {
    if (s.mode === "voo") {
      s.pend3 = true;
      return land(boss, s);
    }
    return phaseChange(boss, s, 3);
  }
  if (s.mode === "voo") {
    if (tick() > s.airUntil) return land(boss, s);
    if (!s.fly) circleNext(boss, s);
    const target = players[Math.floor(Math.random() * players.length)];
    if (s.airN >= 1 && ready(s, "tempestade")) return tempestade(boss, s, players);
    if (s.airN >= 1 && ready(s, "rasante")) return rasante(boss, s, target);
    if (ready(s, "bolas")) return bolas(boss, s, players);
    return;
  }
  if (!inArena(s, boss.location) || V.dist2d(boss.location, s.home) > 17) {
    particle(boss.dimension, "fumaca", V.up(boss.location, 2), {});
    try { boss.teleport(s.home); } catch { /* */ }
    return;
  }
  if (s.phase === 2 && tick() > s.groundUntil) return takeoff(boss, s);
  const f = fwd(boss);
  const rel = (p) => V.flat(V.sub(p.location, boss.location));
  const near = players.filter((p) => V.dist2d(p.location, boss.location) < 9.5);
  const front = near.filter((p) => V.dot(f, rel(p)) > 0.5);
  const behind = players.filter((p) => V.dist2d(p.location, boss.location) < 8 && V.dot(f, rel(p)) < 0.3);
  const target = players.sort((a, b) => V.dist(a.location, boss.location) - V.dist(b.location, boss.location))[0];
  if (s.phase === 3 && ready(s, "anel") && players.some((p) => V.dist2d(p.location, boss.location) < 13)) return anel(boss, s, players);
  if (s.phase === 3 && ready(s, "meteoros")) return meteoros(boss, s, players);
  if (behind.length && ready(s, "cauda")) return cauda(boss, s);
  if (front.length && ready(s, "mordida")) return mordida(boss, s, front[0]);
  if (ready(s, "sopro") && V.dist(target.location, boss.location) < 22) return sopro(boss, s, target);
  if (ready(s, "rugido") && near.length >= 2) return rugido(boss, s, players);
}

// ------------------------------------------------------------------ API para o Ninho
export function spawnDragon(dim, pos, siteId) {
  const center = { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 };
  const boss = dim.spawnEntity(DRAGON, V.up(center, 26), { initialPersistence: true });
  boss.setDynamicProperty(`${NS}:local`, siteId);
  boss.addTag(DTAG(siteId));
  states.delete(boss.id);
  const s = st(boss);
  if (!s.arena) s.home = center; // sem covil registrado (Modo de Teste): pousa no ponto indicado
  intro(boss, true);
  return boss;
}
export function dragonOf(dim, siteId) {
  try {
    return dim.getEntities({ type: DRAGON, tags: [DTAG(siteId)] })[0];
  } catch {
    return undefined;
  }
}
export function despawnDragon(dim, siteId) {
  try {
    for (const e of dim.getEntities({ tags: [DTAG(siteId)] })) {
      states.delete(e.id);
      e.remove();
    }
  } catch { /* */ }
}

export function startDragon() {
  onBeforeHurt((ev) => {
    const e = ev.hurtEntity;
    if (e.typeId !== DRAGON) return;
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
    for (const [id, s] of states) {
      if (!s.fly) continue;
      const boss = world.getEntity(id);
      if (!ok(boss)) {
        states.delete(id);
        continue;
      }
      try { moveStep(boss, s); } catch (err) { console.warn(`[Valdoria] voo do dragão: ${err}`); }
    }
  }, 1);
  system.runInterval(() => {
    for (const boss of world.getDimension("minecraft:overworld").getEntities({ type: DRAGON })) {
      try { think(boss); } catch (err) { console.warn(`[Valdoria] Dragão Ancestral: ${err}`); }
    }
  }, 5);
  world.afterEvents.entityLoad.subscribe((ev) => {
    if (ok(ev.entity) && ev.entity.typeId === DRAGON) updateName(ev.entity, st(ev.entity));
  });
  world.afterEvents.entitySpawn.subscribe((ev) => {
    const e = ev.entity;
    if (!ok(e) || e.typeId !== DRAGON) return;
    system.runTimeout(() => ok(e) && !st(e).intro && intro(e, false), 2);
  });
}
