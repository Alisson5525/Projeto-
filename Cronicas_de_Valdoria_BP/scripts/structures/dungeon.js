// Masmorra da Cripta Ancestral em tempo de execução: construção sob demanda, ondas do ossuário, sala secreta,
// armadilhas (espinhos e chamas), portão selado, luta contra o Senhor dos Mortos, tesouro e reativação.
import { world, system, GameMode } from "@minecraft/server";
import { NS, V, ok, isActivePlayer, takeItem, heldItem, effect } from "../core/util.js";
import { particle, sound, psound, shake } from "../core/fx.js";
import { dealDamage } from "../core/damage.js";
import { getData, markDirty } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { Plan, B, build, rng, chunksLoaded } from "./builder.js";
import { allSites, getSite, saveSite, inBox, TAG, spawnGuard, fillChests, center, registerType } from "./registry.js";
import { stageA, stageB, CRYPT, F } from "./crypt.js";
import { markLoreRead } from "../ui/codex.js";
import { setFlag, questEvent } from "../quests/quests.js";
import { spawnLich, despawnLich, lichOf, setArenaResolver, onLichDefeated } from "../bosses/senhor_mortos.js";

registerType(CRYPT);

const REARM_MIN = 60; // minutos reais até a cripta despertar de novo após a vitória
const WAVES = [
  [["minecraft:skeleton", 3], ["minecraft:zombie", 2]],
  [["minecraft:skeleton", 3], ["minecraft:husk", 1], [`${NS}:espectro`, 1]],
  [["minecraft:stray", 2], ["minecraft:skeleton", 2], [`${NS}:espectro`, 2]],
];
const WTAG = (id) => `vo_${id}`;
const EXT = { a: [-26, -38, 20, 3], b: [-12, -80, 12, -36] };

const layouts = new Map();
const busy = new Set();
const mem = new Map(); // id -> estado temporário (ondas, arena)

function memOf(id) {
  let m = mem.get(id);
  if (!m) {
    m = { waveEmpty: 0, waveAt: 0, waveSeen: false, idleOss: 0, arenaEmpty: 0, lichMissing: 0 };
    mem.set(id, m);
  }
  return m;
}

/** Planos (determinísticos) das duas etapas e suas marcações em coordenadas do mundo. */
export function layout(rec) {
  let L = layouts.get(rec.id);
  if (!L) {
    const o = { x: rec.x, y: rec.y, z: rec.z };
    const A = stageA(o, rec.rot, rng(rec.seed + 1));
    const Bp = stageB(o, rec.rot, rng(rec.seed + 2));
    L = { A, B: Bp, marks: { ...A.marks, ...Bp.marks } };
    L.spikes = { a: new Set(L.marks.espinho_a.map(key)), b: new Set(L.marks.espinho_b.map(key)) };
    layouts.set(rec.id, L);
  }
  return L;
}
const key = (p) => `${p.x},${p.y},${p.z}`;
const top = (p) => ({ x: p.x + 0.5, y: p.y + 1, z: p.z + 0.5 });
const boxCenter = (b) => ({ x: (b[0].x + b[1].x + 1) / 2, y: b[0].y, z: (b[0].z + b[1].z + 1) / 2 });

/** Aplica blocos em coordenadas locais da cripta (respeita a rotação do local). */
function localSet(dim, rec, fn) {
  const p = new Plan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed + 9));
  fn(p);
  return build(dim, p, 200).then(() => p);
}

// ------------------------------------------------------------------ construção sob demanda
async function buildStage(dim, rec, st) {
  const L = layout(rec);
  const plan = st === "a" ? L.A : L.B;
  const [x1, z1, x2, z2] = EXT[st];
  if (!chunksLoaded(dim, plan, x1, z1, x2, z2, F)) return false;
  busy.add(rec.id);
  rec.m[st] = 1;
  saveSite(rec);
  try {
    await build(dim, plan, 400);
    fillChests(dim, plan.chests);
    const guards = st === "a" ? [["esqueleto", "minecraft:skeleton"], ["espectro", `${NS}:espectro`]] : [["espectro_b", `${NS}:espectro`]];
    for (const [k, id] of guards) for (const pos of plan.marks[k] || []) spawnGuard(dim, id, pos, rec.id);
    rec.m[st] = 2;
    saveSite(rec);
    return true;
  } catch (e) {
    console.warn(`[Valdoria] cripta etapa ${st}: ${e}`);
    rec.m[st] = 0;
    saveSite(rec);
    return false;
  } finally {
    busy.delete(rec.id);
  }
}
function revealA(dim, rec) {
  const c = center(rec);
  particle(dim, "poeira", c, { radius: 2 });
  sound(dim, "mob.warden.dig", c, 0.8, 1.5);
  for (const p of dim.getPlayers({ location: c, maxDistance: 24 })) {
    shake(p, 0.25, 1.2);
    p.onScreenDisplay.setTitle(" ", { subtitle: "§8A lápide do mausoléu cede e revela uma escadaria...", fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  }
}

/** Constrói as duas etapas imediatamente (Modo de Teste). */
export async function buildNow(rec) {
  const dim = world.getDimension(rec.dim);
  if (rec.m.a !== 2) await buildStage(dim, rec, "a");
  if (rec.m.b !== 2) await buildStage(dim, rec, "b");
  return rec.m.a === 2 && rec.m.b === 2;
}

// ------------------------------------------------------------------ ossuário: ondas de mortos-vivos
function spawnWave(dim, rec, n) {
  const L = layout(rec);
  const pts = L.marks.onda;
  let i = 0;
  for (const [id, count] of WAVES[n - 1]) {
    for (let k = 0; k < Number(count); k++) {
      const pos = pts[i++ % pts.length];
      try {
        const e = dim.spawnEntity(String(id), top({ x: pos.x, y: pos.y - 1, z: pos.z }), { initialPersistence: true });
        e.addTag(WTAG(rec.id));
        particle(dim, "sombra_explosao", top(pos), { radius: 0.8 });
      } catch { /* */ }
    }
  }
  sound(dim, "mob.evocation_illager.prepare_summon", boxCenter(L.marks.sala_ossuario), 0.6, 2);
  const m = memOf(rec.id);
  m.waveAt = system.currentTick;
  m.waveEmpty = 0;
  m.waveSeen = false;
}
function ossuary(dim, rec, players) {
  const L = layout(rec);
  const box = L.marks.sala_ossuario;
  const inside = players.filter((p) => isActivePlayer(p) && inBox(box, p.location, 0.3));
  const m = memOf(rec.id);
  const s = rec.m;
  if (s.ondas === 0) {
    if (!inside.length) return;
    s.ondas = 1;
    saveSite(rec);
    for (const p of inside) p.onScreenDisplay.setTitle("§cOs ossos se levantam!", { subtitle: "§7Onda 1/3", fadeInDuration: 5, stayDuration: 30, fadeOutDuration: 10 });
    spawnWave(dim, rec, 1);
    return;
  }
  if (s.ondas > 3) return;
  const near = players.filter((p) => inBox(box, p.location, 12));
  m.idleOss = near.length ? 0 : m.idleOss + 1;
  if (m.idleOss > 120) { // ninguém por perto há ~30 s: as ondas reiniciam
    for (const e of dim.getEntities({ tags: [WTAG(rec.id)] })) e.remove();
    s.ondas = 0;
    saveSite(rec);
    return;
  }
  if (system.currentTick - m.waveAt < 40) return;
  const alive = dim.getEntities({ tags: [WTAG(rec.id)], location: boxCenter(box), maxDistance: 40 }).length;
  if (alive > 0) {
    m.waveSeen = true;
    m.waveEmpty = 0;
    return;
  }
  if (!near.length || ++m.waveEmpty < (m.waveSeen ? 2 : 6)) return;
  s.ondas++;
  saveSite(rec);
  if (s.ondas <= 3) {
    for (const p of near) p.onScreenDisplay.setTitle(" ", { subtitle: `§cOnda ${s.ondas}/3`, fadeInDuration: 5, stayDuration: 25, fadeOutDuration: 10 });
    system.runTimeout(() => spawnWave(dim, rec, s.ondas), 40);
    m.waveAt = system.currentTick + 40;
    return;
  }
  const pos = L.marks.bau_ossuario[0];
  localSet(dim, rec, (p) => p.chest(-13, F + 1, -21, "south", "cripta")).then((p) => fillChests(dim, p.chests));
  particle(dim, "nivel_anel", top(pos), {});
  for (const p of near) {
    p.onScreenDisplay.setTitle("§aO Ossuário silencia", { subtitle: "§7Um baú surge diante do altar", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
    addXP(p, 120, "Ossuário");
    psound(p, "random.levelup", 1, 0.8);
  }
}

// ------------------------------------------------------------------ armadilhas
function spikesTrap(dim, rec, unit) {
  const L = layout(rec);
  const phase = unit % 8;
  const g = phase === 6 || phase === 0 ? "a" : phase === 2 || phase === 4 ? "b" : null;
  if (!g) return;
  const list = L.marks[`espinho_${g}`];
  if (phase === 6 || phase === 2) {
    for (const p of list) particle(dim, "alerta_area", top(p), { radius: 0.5 });
    sound(dim, "random.click", top(list[0]), 0.6, 0.6);
    return;
  }
  for (const p of list) particle(dim, "espinhos_osso", top(p), { radius: 0.5 });
  sound(dim, "hit.bone_block", top(list[Math.floor(list.length / 2)]), 0.8, 1);
  const c = boxCenter(L.marks.sala_espinhos);
  for (const e of dim.getEntities({ location: c, maxDistance: 10, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
    const k = `${Math.floor(e.location.x)},${Math.floor(e.location.y - 0.05)},${Math.floor(e.location.z)}`;
    if (!L.spikes[g].has(k)) continue;
    dealDamage(undefined, e, 6, "physical", { kind: "weapon" });
    effect(e, "slowness", 30, 1);
  }
}
function flameTrap(dim, rec, t) {
  const L = layout(rec);
  const phase = t % 90;
  for (let g = 0; g < 3; g++) {
    const local = (phase - (15 + 30 * g) + 180) % 90;
    const list = L.marks[`chama_${g}`];
    if (local >= 75) {
      for (const p of list) particle(dim, "fumaca", top(p), {});
      continue;
    }
    if (local >= 30) continue;
    if (local < 5) sound(dim, "mob.blaze.shoot", top(list[1]), 0.8, 1);
    for (const p of list) {
      particle(dim, "chama_jato", top(p), {});
      if (local % 10 !== 0) continue;
      for (const e of dim.getEntities({ location: top(p), maxDistance: 3.2, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
        const l = e.location;
        if (Math.hypot(l.x - p.x - 0.5, l.z - p.z - 0.5) > 1.3 || l.y < p.y + 0.5 || l.y > p.y + 3.5) continue;
        dealDamage(undefined, e, 4, "fire");
        try { e.setOnFire(3, true); } catch { /* */ }
      }
    }
  }
}

// ------------------------------------------------------------------ portão selado
function findGate(pos) {
  const k = key(pos);
  for (const rec of allSites()) {
    if (rec.tipo !== "cripta" || rec.m?.b !== 2) continue;
    if (layout(rec).marks.portao.some((p) => key(p) === k)) return rec;
  }
  return undefined;
}
function tryGate(player, pos) {
  const rec = findGate(pos);
  if (!rec) return;
  const it = heldItem(player);
  if (!it || it.typeId !== `${NS}:chave_cripta`) {
    player.onScreenDisplay.setActionBar("§5O selo de Aetherita exige a §dChave da Cripta§5. §7(Procure na biblioteca.)");
    psound(player, "vault.insert_item_fail", 1, 0.8);
    return;
  }
  if (player.getGameMode() !== GameMode.Creative && !takeItem(player, `${NS}:chave_cripta`, 1)) return;
  openGate(player.dimension, rec, player);
}
export function openGate(dim, rec, player) {
  const L = layout(rec);
  rec.m.portao = true;
  saveSite(rec);
  const gate = [...L.marks.portao].sort((a, b) => a.y - b.y);
  sound(dim, "vault.open_shutter", top(gate[4]), 0.8, 1);
  gate.forEach((p, i) => {
    system.runTimeout(() => {
      try { dim.setBlockType(p, "minecraft:air"); } catch { /* */ }
      particle(dim, "arcano_explosao", { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 }, { radius: 0.6 });
    }, 4 + Math.floor(i / 3) * 8);
  });
  for (const p of dim.getPlayers({ location: top(gate[4]), maxDistance: 24 })) {
    p.onScreenDisplay.setTitle("§dO selo se rompe", { subtitle: "§7A Câmara do Trono aguarda...", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
    shake(p, 0.2, 1);
  }
  if (player) setFlag(player, "portao_cripta");
}

// ------------------------------------------------------------------ arena
function closeDoor(dim, rec, closed) {
  return localSet(dim, rec, (p) => {
    for (let x = -1; x <= 1; x++) for (let y = F + 1; y <= F + 3; y++) p.set(x, y, -50, closed ? B.bars(false, true) : "minecraft:air");
  });
}
function startFight(dim, rec, players) {
  const L = layout(rec);
  rec.m.chefe = "luta";
  saveSite(rec);
  const m = memOf(rec.id);
  m.arenaEmpty = 0;
  m.lichMissing = 0;
  closeDoor(dim, rec, true);
  sound(dim, "close.iron_door", top(L.marks.porta_arena[1]), 0.6, 1);
  for (const p of players) p.onScreenDisplay.setActionBar("§8As grades se fecham atrás de você...");
  system.runTimeout(() => {
    try {
      spawnLich(dim, L.marks.chefe[0], rec.id);
    } catch (e) {
      console.warn(`[Valdoria] Senhor dos Mortos: ${e}`);
      resetFight(dim, rec);
    }
  }, 30);
}
function resetFight(dim, rec) {
  despawnLich(dim, rec.id);
  closeDoor(dim, rec, false);
  rec.m.chefe = "pronto";
  saveSite(rec);
  for (const p of dim.getPlayers({ location: center(rec), maxDistance: 110 })) {
    p.onScreenDisplay.setActionBar("§7Malachar retorna ao seu trono... a luta foi reiniciada.");
  }
}
function arena(dim, rec, players) {
  const L = layout(rec);
  const box = L.marks.sala_arena;
  const inside = players.filter((p) => isActivePlayer(p) && inBox(box, p.location, 0.2));
  const s = rec.m;
  const m = memOf(rec.id);
  if (s.chefe === "pronto") {
    if (inside.length) startFight(dim, rec, inside);
    return;
  }
  if (s.chefe !== "luta") return;
  m.arenaEmpty = inside.length ? 0 : m.arenaEmpty + 1;
  m.lichMissing = lichOf(dim, rec.id) ? 0 : m.lichMissing + 1;
  if (m.arenaEmpty > 50 || m.lichMissing > 20) resetFight(dim, rec);
}

function onDefeat(siteId, players, dim) {
  const rec = getSite(siteId);
  if (!rec) return;
  const L = layout(rec);
  const first = !rec.m.vitorias;
  rec.m.chefe = "derrotado";
  rec.m.derrotadoEm = Date.now();
  rec.m.vitorias = (rec.m.vitorias || 0) + 1;
  rec.m.tesouro = true;
  rec.estado = "limpo";
  rec.limpoEm = Date.now();
  saveSite(rec);
  closeDoor(dim, rec, false);
  const crumble = [...L.marks.trono, ...L.marks.selo].sort((a, b) => b.y - a.y);
  sound(dim, "mob.warden.dig", top(L.marks.selo[1]), 0.7, 1.5);
  crumble.forEach((p, i) => {
    system.runTimeout(() => {
      try { dim.setBlockType(p, "minecraft:air"); } catch { /* */ }
      particle(dim, "detritos", { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 }, {});
    }, 20 + i * 3);
  });
  system.runTimeout(() => {
    const chests = L.marks.bau_tesouro.map((pos, i) => ({ pos, tier: i === 2 ? "cripta_tesouro" : "cripta_segredo", extra: {} }));
    if (first || Math.random() < 0.3) chests[2].extra.item = `${NS}:cajado_mortos`;
    if (first) chests[0].extra.lore = "testamento_malachar";
    fillChests(dim, chests);
    for (const p of dim.getPlayers({ location: center(rec), maxDistance: 110 })) {
      p.onScreenDisplay.setActionBar("§6O trono desmorona e revela a Câmara do Tesouro!");
    }
  }, 20 + crumble.length * 3 + 10);
  for (const p of players) {
    if (!ok(p)) continue;
    setFlag(p, "malachar");
    questEvent(p, "limpar", "cripta");
  }
}

/** Reativa a cripta: trono e selo de volta, ondas e chefe prontos, guardiões renascem. */
export function rearm(dim, rec) {
  despawnLich(dim, rec.id);
  for (const e of dim.getEntities({ tags: [TAG(rec.id)] }).concat(dim.getEntities({ tags: [WTAG(rec.id)] }))) e.remove();
  const L = layout(rec);
  if (rec.m.b === 2) {
    localSet(dim, rec, (p) => {
      p.set(0, F + 1, -70, B.stairs("minecraft:polished_blackstone_brick_stairs", "north"));
      for (const [x, y] of [[-1, F + 1], [1, F + 1], [-1, F + 2], [1, F + 2], [0, F + 2], [0, F + 3], [0, F + 4], [0, F + 1]]) {
        p.set(x, y, -71, "minecraft:polished_blackstone_bricks");
      }
      p.set(-1, F + 3, -71, B.skull()).set(1, F + 3, -71, B.skull());
      for (let x = -1; x <= 1; x++) for (let y = F + 1; y <= F + 3; y++) p.set(x, y, -72, "minecraft:reinforced_deepslate");
    });
    for (const pos of L.marks.espectro_b || []) spawnGuard(dim, `${NS}:espectro`, pos, rec.id);
  }
  if (rec.m.a === 2) {
    for (const pos of L.marks.esqueleto || []) spawnGuard(dim, "minecraft:skeleton", pos, rec.id);
    for (const pos of L.marks.espectro || []) spawnGuard(dim, `${NS}:espectro`, pos, rec.id);
  }
  Object.assign(rec.m, { chefe: "pronto", ondas: 0, tesouro: false });
  rec.estado = "ativo";
  saveSite(rec);
  mem.delete(rec.id);
}

// ------------------------------------------------------------------ laço principal
let unit = 0;
function loop() {
  unit++;
  const t = system.currentTick;
  for (const rec of allSites()) {
    if (rec.tipo !== "cripta" || rec.estado === "construindo" || busy.has(rec.id)) continue;
    let dim;
    try {
      dim = world.getDimension(rec.dim);
    } catch {
      continue;
    }
    rec.m = rec.m || { a: 0, b: 0, portao: false, chefe: "pronto", ondas: 0, tesouro: false, derrotadoEm: 0 };
    const c = center(rec);
    const players = dim.getPlayers({ location: c, maxDistance: 110 });
    if (rec.m.chefe === "derrotado" && Date.now() - rec.m.derrotadoEm > REARM_MIN * 60000 && !players.some((p) => V.dist(p.location, c) < 90)) {
      try {
        if (dim.isChunkLoaded(c)) rearm(dim, rec);
      } catch { /* */ }
      continue;
    }
    if (!players.length) continue;
    if (rec.m.a === 0) {
      if (players.some((p) => V.dist2d(p.location, c) < 14 && Math.abs(p.location.y - c.y) < 10)) {
        buildStage(dim, rec, "a").then((done) => done && revealA(dim, rec));
      }
      continue;
    }
    if (rec.m.a !== 2) continue;
    const L = layout(rec);
    const mk = L.marks;
    const inRoom = (p, k) => inBox(mk[`sala_${k}`], p.location, 0.5);
    if (rec.m.b === 0 && players.some((p) => ["hall", "ossuario", "biblioteca", "espinhos", "segredo"].some((k) => inRoom(p, k)))) {
      buildStage(dim, rec, "b");
    }
    for (const p of players) {
      if (!ok(p)) continue;
      if (inRoom(p, "hall")) markLoreRead(p, "inscricao_cripta", true);
      if (inRoom(p, "segredo")) {
        const d = getData(p);
        const f = `segredo_${rec.id}`;
        if (!d.flags[f]) {
          d.flags[f] = true;
          markDirty(p);
          p.onScreenDisplay.setTitle("§dSala secreta!", { subtitle: "§7O esconderijo do coveiro", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
          addXP(p, 80, "segredo");
          questEvent(p, "segredo", "cripta");
        }
      }
    }
    ossuary(dim, rec, players);
    if (players.some((p) => inBox(mk.sala_espinhos, p.location, 4))) spikesTrap(dim, rec, unit);
    if (rec.m.b === 2) {
      if (players.some((p) => inBox(mk.sala_chamas, p.location, 3))) flameTrap(dim, rec, t);
      arena(dim, rec, players);
    }
  }
}

export function startDungeon() {
  setArenaResolver((siteId) => {
    const rec = getSite(siteId);
    if (!rec) return undefined;
    const L = layout(rec);
    const pos = L.marks.chefe[0];
    return { arena: L.marks.sala_arena, center: { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, pedestals: L.marks.filacterio };
  });
  onLichDefeated(onDefeat);
  system.runInterval(() => {
    try { loop(); } catch (e) { console.warn(`[Valdoria] masmorra: ${e}`); }
  }, 5);
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    if (ev.block.typeId !== `${NS}:portao_selado`) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const p = ev.player;
    const pos = { ...ev.block.location };
    system.run(() => ok(p) && tryGate(p, pos));
  });
}
