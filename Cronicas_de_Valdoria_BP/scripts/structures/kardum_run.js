// Ruínas de Kar'Dum em tempo de execução: construção sob demanda, inscrição e enigma das runas, Ponte Partida (lajes rachadas
// que cedem e voltam), Galeria dos Pilões, Portão Rúnico, luta contra o Rei Durgan, tesouro e reativação.
import { world, system, BlockPermutation } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { NS, V, ok, isActivePlayer, effect } from "../core/util.js";
import { particle, sound, psound, shake } from "../core/fx.js";
import { dealDamage } from "../core/damage.js";
import { getData, markDirty } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { show } from "../npc/economy.js";
import { Plan, B, build, rng, chunksLoaded } from "./builder.js";
import { allSites, getSite, saveSite, inBox, TAG, spawnGuard, fillChests, center, registerType } from "./registry.js";
import { KARDUM, stageA, stageB, F, runeOrder, inscription, RUNES, RUNE_NAMES, HAMMER_ROWS } from "./kardum.js";
import { markLoreRead } from "../ui/codex.js";
import { setFlag, questEvent } from "../quests/quests.js";
import { spawnKing, despawnKing, kingOf, setKingArenaResolver, onKingDefeated } from "../bosses/durgan.js";

registerType(KARDUM);

const REARM_MIN = 90;
const EXT = { a: [-30, -38, 42, -3], b: [-12, -75, 12, -38] };
const PTAG = (id) => `vp_${id}`; // sentinelas de punição do enigma
const RUNE_BLOCKS = new Set([`${NS}:runa_martelo`, `${NS}:runa_bigorna`, `${NS}:runa_chama`, `${NS}:runa_montanha`]);
const layouts = new Map();
const busy = new Set();
const mem = new Map(); // id -> estado temporário (ponte, arena, punição)

function memOf(id) {
  let m = mem.get(id);
  if (!m) {
    m = { arenaEmpty: 0, kingMissing: 0, fallen: new Map(), pitMsg: 0, runeCd: 0 };
    mem.set(id, m);
  }
  return m;
}
const key = (p) => `${p.x},${p.y},${p.z}`;
const top = (p) => ({ x: p.x + 0.5, y: p.y + 1, z: p.z + 0.5 });

/** Planos (determinísticos) das duas etapas e as marcações em coordenadas do mundo. */
export function layout(rec) {
  let L = layouts.get(rec.id);
  if (!L) {
    const o = { x: rec.x, y: rec.y, z: rec.z };
    const A = stageA(o, rec.rot, rng(rec.seed + 1));
    const Bp = stageB(o, rec.rot, rng(rec.seed + 2));
    L = { A, B: Bp, marks: { ...A.marks, ...Bp.marks } };
    L.weak = new Set((L.marks.laje_fraca || []).map(key));
    L.runeAt = new Map(RUNES.map((r) => [key(L.marks[`runa_${r}`][0]), r]));
    L.order = runeOrder(rec.seed);
    layouts.set(rec.id, L);
  }
  return L;
}
function localSet(dim, rec, fn) {
  const p = new Plan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed + 9));
  fn(p);
  return build(dim, p, 200).then(() => p);
}
function setAt(dim, pos, id) {
  try { dim.setBlockType(pos, id); } catch { /* */ }
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
    if (st === "a") {
      for (const k of ["fantasma", "fantasma_ponte"]) for (const pos of plan.marks[k] || []) spawnGuard(dim, `${NS}:fantasma_anao`, pos, rec.id);
      for (const k of ["sentinela", "sentinela_forja"]) for (const pos of plan.marks[k] || []) spawnGuard(dim, `${NS}:sentinela_runica`, pos, rec.id);
    }
    rec.m[st] = 2;
    saveSite(rec);
    return true;
  } catch (e) {
    console.warn(`[Valdoria] Kar'Dum etapa ${st}: ${e}`);
    rec.m[st] = 0;
    saveSite(rec);
    return false;
  } finally {
    busy.delete(rec.id);
  }
}
function revealA(dim, rec) {
  const c = center(rec);
  sound(dim, "vault.open_shutter", c, 0.6, 1.5);
  particle(dim, "poeira", c, { radius: 2.5 });
  for (const p of dim.getPlayers({ location: c, maxDistance: 24 })) {
    shake(p, 0.2, 1.2);
    p.onScreenDisplay.setTitle(" ", { subtitle: "§6O entulho do portão desaba e revela uma escadaria para dentro da montanha...",
      fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  }
}
/** Constrói as duas etapas imediatamente (Modo de Teste). */
export async function buildNow(rec) {
  const dim = world.getDimension(rec.dim);
  if (rec.m.a !== 2) await buildStage(dim, rec, "a");
  if (rec.m.b !== 2) await buildStage(dim, rec, "b");
  return rec.m.a === 2 && rec.m.b === 2;
}

// ------------------------------------------------------------------ inscrição e enigma das runas
function inscriptionText(rec) {
  return `§6«${inscription(layout(rec).order)}»`;
}
async function readInscription(player, rec) {
  markLoreRead(player, "inscricao_kardum", true);
  const f = new ActionFormData().title("Inscrição do Salão dos Reis")
    .body(`§7Runas anãs gravadas em ouro no púlpito:\n\n${inscriptionText(rec)}\n\n§7As quatro runas estão espalhadas pelos salões: ` +
      "uma diante do Portão Rúnico, duas na Forja e uma do outro lado da Ponte Partida. Desperte-as nesta ordem.")
    .button("Fechar");
  await show(player, f);
}
function findByMark(name, pos) {
  const k = key(pos);
  for (const rec of allSites()) {
    if (rec.tipo !== "kardum" || rec.m?.a !== 2) continue;
    const L = layout(rec);
    if (name === "runa" && L.runeAt.has(k)) return rec;
    if (name !== "runa" && (L.marks[name] || []).some((p) => key(p) === k)) return rec;
  }
  return undefined;
}
function lightRune(dim, rec, rune, on) {
  const pos = layout(rec).marks[`runa_${rune}`][0];
  const above = { x: pos.x, y: pos.y + 1, z: pos.z };
  if (on) {
    try { dim.setBlockPermutation(above, BlockPermutation.resolve("minecraft:lantern", { hanging: false })); } catch { /* */ }
    particle(dim, "arcano_runas", top(pos), {});
  } else setAt(dim, above, "minecraft:air");
}
export function touchRune(player, rec, rune) {
  const dim = player.dimension;
  const L = layout(rec);
  const m = memOf(rec.id);
  const s = rec.m;
  s.runas = s.runas || [];
  if (s.portao) {
    player.onScreenDisplay.setActionBar(`§7A runa d${RUNE_NAMES[rune]} brilha em silêncio. O portão já está aberto.`);
    return;
  }
  if (system.currentTick < m.runeCd) return;
  if (s.runas.includes(rune)) {
    player.onScreenDisplay.setActionBar("§7Esta runa já foi despertada.");
    return;
  }
  const expected = L.order[s.runas.length];
  if (rune === expected) {
    s.runas.push(rune);
    saveSite(rec);
    lightRune(dim, rec, rune, true);
    sound(dim, "block.bell.hit", top(L.marks[`runa_${rune}`][0]), 0.8 + s.runas.length * 0.15, 1);
    if (s.runas.length >= RUNES.length) {
      openGate(dim, rec, player);
      return;
    }
    player.onScreenDisplay.setTitle(" ", { subtitle: `§6A runa d${RUNE_NAMES[rune]} desperta §7(${s.runas.length}/4)`,
      fadeInDuration: 3, stayDuration: 35, fadeOutDuration: 10 });
    return;
  }
  // ordem errada: as runas se apagam e o salão reage
  m.runeCd = system.currentTick + 60;
  for (const r of s.runas) lightRune(dim, rec, r, false);
  s.runas = [];
  saveSite(rec);
  sound(dim, "beacon.deactivate", player.location, 0.6, 1);
  particle(dim, "detritos", top(L.marks[`runa_${rune}`][0]), {});
  player.onScreenDisplay.setTitle("§cAs runas se apagam!", { subtitle: "§7A ordem estava errada. Releia a inscrição do Salão dos Reis.",
    fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
  const punish = dim.getEntities({ tags: [PTAG(rec.id)] }).length;
  for (let i = punish; i < 2; i++) {
    try {
      const e = dim.spawnEntity(`${NS}:sentinela_runica`, V.add(player.location, V.rotY({ x: 3, y: 0, z: 0 }, i * 180 + 45)),
        { initialPersistence: true });
      e.addTag(PTAG(rec.id));
      particle(dim, "poeira", e.location, { radius: 1 });
    } catch { /* */ }
  }
}
export function openGate(dim, rec, player) {
  const L = layout(rec);
  rec.m.portao = true;
  saveSite(rec);
  const gate = [...L.marks.portao].sort((a, b) => a.y - b.y);
  sound(dim, "vault.open_shutter", top(gate[12]), 0.6, 1.5);
  sound(dim, "beacon.activate", top(gate[12]), 0.8, 1);
  gate.forEach((p, i) => {
    system.runTimeout(() => {
      setAt(dim, p, "minecraft:air");
      particle(dim, "poeira", { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 }, { radius: 0.6 });
    }, 4 + Math.floor(i / 5) * 8);
  });
  for (const p of dim.getPlayers({ location: top(gate[12]), maxDistance: 40 })) {
    p.onScreenDisplay.setTitle("§6O Portão Rúnico se abre", { subtitle: "§7Além dele, o trono de Kar'Dum...", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
    shake(p, 0.2, 1);
    addXP(p, 150, "enigma das runas");
  }
  if (player) setFlag(player, "portao_kardum");
}

// ------------------------------------------------------------------ Ponte Partida
function bridge(dim, rec, players) {
  const L = layout(rec);
  const m = memOf(rec.id);
  const now = system.currentTick;
  for (const p of players) {
    if (!inBox(L.marks.sala_ponte, p.location, 0.5) && !inBox(L.marks.fosso, p.location, 0.5)) continue;
    if (inBox(L.marks.fosso, p.location, 0.3) && now - m.pitMsg > 200) {
      m.pitMsg = now;
      p.onScreenDisplay.setActionBar("§6A escada fica no canto leste do fosso. §7(As lajes inteiras seguram; as rachadas cedem.)");
    }
    const under = { x: Math.floor(p.location.x), y: Math.floor(p.location.y - 0.05), z: Math.floor(p.location.z) };
    const k = key(under);
    if (!L.weak.has(k) || m.fallen.has(k)) continue;
    m.fallen.set(k, now + 260);
    sound(dim, "dig.stone", top(under), 0.6, 1);
    particle(dim, "poeira", top(under), { radius: 0.6 });
    system.runTimeout(() => {
      setAt(dim, under, "minecraft:air");
      particle(dim, "detritos", { x: under.x + 0.5, y: under.y + 0.5, z: under.z + 0.5 }, {});
      sound(dim, "random.break", top(under), 0.7, 0.8);
    }, 7);
  }
  // as lajes voltam depois de um tempo (se ninguém estiver no lugar)
  for (const [k, t] of m.fallen) {
    if (now < t) continue;
    const [x, y, z] = k.split(",").map(Number);
    if (dim.getPlayers({ location: { x: x + 0.5, y: y + 1, z: z + 0.5 }, maxDistance: 1.5 }).length) continue;
    setAt(dim, { x, y, z }, "minecraft:cracked_deepslate_tiles");
    m.fallen.delete(k);
  }
}
function restoreBridge(dim, rec) {
  const m = memOf(rec.id);
  for (const k of m.fallen.keys()) {
    const [x, y, z] = k.split(",").map(Number);
    setAt(dim, { x, y, z }, "minecraft:cracked_deepslate_tiles");
  }
  m.fallen.clear();
}

// ------------------------------------------------------------------ Galeria dos Pilões
function hammers(dim, rec, t) {
  const L = layout(rec);
  HAMMER_ROWS.forEach((row, g) => {
    const cells = L.marks[`pilao_${row}`];
    const local = (t - g * 20 + 600) % 60;
    if (local < 10) {
      if (local < 5) {
        for (const c of cells) particle(dim, "alerta_area", { x: c.x + 0.5, y: c.y, z: c.z + 0.5 }, { radius: 0.5 });
        sound(dim, "tile.piston.in", top(cells[1]), 0.7, 0.6);
      }
      return;
    }
    if (local < 15) {
      for (const c of cells) {
        setAt(dim, { x: c.x, y: c.y + 2, z: c.z }, "minecraft:polished_basalt");
        particle(dim, "poeira", { x: c.x + 0.5, y: c.y, z: c.z + 0.5 }, { radius: 0.7 });
      }
      sound(dim, "random.anvil_land", top(cells[1]), 0.5, 1);
      for (const e of dim.getEntities({ location: top(cells[1]), maxDistance: 3.5, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) {
        const l = e.location;
        if (!cells.some((c) => Math.abs(l.x - c.x - 0.5) < 0.9 && Math.abs(l.z - c.z - 0.5) < 0.6) || l.y < cells[0].y - 0.5 || l.y > cells[0].y + 2.5) continue;
        if (e.typeId === `${NS}:sentinela_runica`) continue; // os constructos conhecem o ritmo dos pilões
        dealDamage(undefined, e, 7, "physical", { kind: "weapon" });
        effect(e, "slowness", 40, 1);
      }
      return;
    }
    if (local >= 20 && local < 25) for (const c of cells) setAt(dim, { x: c.x, y: c.y + 2, z: c.z }, "minecraft:air");
  });
}

// ------------------------------------------------------------------ arena
function closeDoor(dim, rec, closed) {
  return localSet(dim, rec, (p) => {
    for (let x = -2; x <= 2; x++) for (let y = F + 1; y <= F + 5; y++) p.set(x, y, -41, closed ? B.bars(false, true) : "minecraft:air");
  });
}
function startFight(dim, rec, players) {
  const L = layout(rec);
  rec.m.chefe = "luta";
  saveSite(rec);
  const m = memOf(rec.id);
  m.arenaEmpty = 0;
  m.kingMissing = 0;
  closeDoor(dim, rec, true);
  sound(dim, "close.iron_door", top(L.marks.porta_arena[2]), 0.6, 1);
  for (const p of players) p.onScreenDisplay.setActionBar("§8Grades de ferro descem atrás de você...");
  system.runTimeout(() => {
    try {
      spawnKing(dim, L.marks.chefe[0], rec.id);
    } catch (e) {
      console.warn(`[Valdoria] Rei Durgan: ${e}`);
      resetFight(dim, rec);
    }
  }, 30);
}
function resetFight(dim, rec) {
  despawnKing(dim, rec.id);
  closeDoor(dim, rec, false);
  rec.m.chefe = "pronto";
  saveSite(rec);
  for (const p of dim.getPlayers({ location: center(rec), maxDistance: 110 })) {
    p.onScreenDisplay.setActionBar("§7Durgan volta a repousar no trono... a luta foi reiniciada.");
  }
}
function arena(dim, rec, players) {
  const L = layout(rec);
  const box = L.marks.sala_trono;
  const inside = players.filter((p) => isActivePlayer(p) && inBox(box, p.location, 0.2));
  const s = rec.m;
  const m = memOf(rec.id);
  if (s.chefe === "pronto") {
    if (inside.length) startFight(dim, rec, inside);
    return;
  }
  if (s.chefe !== "luta") return;
  m.arenaEmpty = inside.length ? 0 : m.arenaEmpty + 1;
  m.kingMissing = kingOf(dim, rec.id) ? 0 : m.kingMissing + 1;
  if (m.arenaEmpty > 50 || m.kingMissing > 20) resetFight(dim, rec);
}

function onDefeat(siteId, players, dim) {
  const rec = getSite(siteId);
  if (!rec || rec.tipo !== "kardum") return;
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
      setAt(dim, p, "minecraft:air");
      particle(dim, "detritos", { x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 }, {});
    }, 20 + i * 3);
  });
  system.runTimeout(() => {
    const chests = L.marks.bau_tesouro.map((pos, i) => ({ pos, tier: i === 2 ? "kardum_tesouro" : "kardum", extra: {} }));
    if (first || Math.random() < 0.3) chests[2].extra.item = `${NS}:martelo_durgan`;
    if (first) chests[0].extra.lore = "juramento_durgan";
    fillChests(dim, chests);
    for (const p of dim.getPlayers({ location: center(rec), maxDistance: 120 })) {
      p.onScreenDisplay.setActionBar("§6O trono de ouro desmorona e revela a Câmara do Tesouro!");
    }
  }, 20 + crumble.length * 3 + 10);
  for (const p of players) {
    if (!ok(p)) continue;
    setFlag(p, "durgan");
    questEvent(p, "limpar", "kardum");
  }
}

/** Reativa as ruínas: portão e runas fechados, trono e selo de volta, guardiões renascem. */
export function rearm(dim, rec) {
  despawnKing(dim, rec.id);
  for (const e of dim.getEntities({ tags: [TAG(rec.id)] }).concat(dim.getEntities({ tags: [PTAG(rec.id)] }))) e.remove();
  const L = layout(rec);
  restoreBridge(dim, rec);
  if (rec.m.b === 2) {
    localSet(dim, rec, (p) => {
      for (let x = -2; x <= 2; x++) p.set(x, F + 1, -64, "minecraft:polished_andesite");
      p.set(0, F + 2, -64, B.stairs("minecraft:polished_blackstone_brick_stairs", "north"));
      for (const [x, y] of [[-1, F + 2], [1, F + 2], [-1, F + 3], [1, F + 3], [0, F + 3], [0, F + 4], [0, F + 1]]) p.set(x, y, -65, "minecraft:gold_block");
      for (let x = -1; x <= 1; x++) for (let y = F + 1; y <= F + 3; y++) p.set(x, y, -66, "minecraft:polished_deepslate");
    });
  }
  if (rec.m.a === 2) {
    for (const pos of L.marks.portao) setAt(dim, pos, `${NS}:portao_anao`);
    for (const r of RUNES) lightRune(dim, rec, r, false);
    for (const k of ["fantasma", "fantasma_ponte"]) for (const pos of L.marks[k] || []) spawnGuard(dim, `${NS}:fantasma_anao`, pos, rec.id);
    for (const k of ["sentinela", "sentinela_forja"]) for (const pos of L.marks[k] || []) spawnGuard(dim, `${NS}:sentinela_runica`, pos, rec.id);
  }
  Object.assign(rec.m, { chefe: "pronto", tesouro: false, portao: false, runas: [] });
  rec.estado = "ativo";
  saveSite(rec);
  mem.delete(rec.id);
}

// ------------------------------------------------------------------ laço principal
function loop() {
  const t = system.currentTick;
  for (const rec of allSites()) {
    if (rec.tipo !== "kardum" || rec.estado === "construindo" || busy.has(rec.id)) continue;
    let dim;
    try {
      dim = world.getDimension(rec.dim);
    } catch {
      continue;
    }
    rec.m = rec.m || { a: 0, b: 0, portao: false, runas: [], chefe: "pronto", tesouro: false, derrotadoEm: 0 };
    const c = center(rec);
    const players = dim.getPlayers({ location: c, maxDistance: 120 });
    if (rec.m.chefe === "derrotado" && Date.now() - rec.m.derrotadoEm > REARM_MIN * 60000 && !players.some((p) => V.dist(p.location, c) < 100)) {
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
    if (rec.m.b === 0 && players.some((p) => ["salao", "ponte", "pilones", "forja"].some((k) => inRoom(p, k)))) buildStage(dim, rec, "b");
    for (const p of players) {
      if (!ok(p) || !inRoom(p, "salao")) continue;
      const d = getData(p);
      const f = `insc_${rec.id}`;
      d.flags = d.flags || {};
      if (!d.flags[f]) {
        d.flags[f] = true;
        markDirty(p);
        markLoreRead(p, "inscricao_kardum", true);
        p.sendMessage(`§6[Kar'Dum] §7No púlpito do Salão dos Reis, runas de ouro dizem: ${inscriptionText(rec)}`);
        p.onScreenDisplay.setTitle("§6Salão dos Reis", { subtitle: "§7Leia a inscrição no púlpito: ela diz a ordem das runas",
          fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
      }
    }
    bridge(dim, rec, players);
    if (players.some((p) => inBox(mk.sala_pilones, p.location, 3))) hammers(dim, rec, t);
    if (rec.m.b === 2) arena(dim, rec, players);
  }
}

export function startKarDum() {
  setKingArenaResolver((siteId) => {
    const rec = getSite(siteId);
    if (!rec) return undefined;
    const L = layout(rec);
    const pos = L.marks.chefe[0];
    return { arena: L.marks.sala_trono, center: { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, rocks: L.marks.estalactite };
  });
  onKingDefeated(onDefeat);
  system.runInterval(() => {
    try { loop(); } catch (e) { console.warn(`[Valdoria] Kar'Dum: ${e}`); }
  }, 5);
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    const id = ev.block.typeId;
    const isRune = RUNE_BLOCKS.has(id);
    const isLectern = id === "minecraft:lectern";
    if (!isRune && !isLectern) return;
    const pos = { ...ev.block.location };
    const rec = findByMark(isRune ? "runa" : "inscricao", pos);
    if (!rec) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const p = ev.player;
    const rune = isRune ? layout(rec).runeAt.get(key(pos)) : undefined;
    system.run(() => {
      if (!ok(p)) return;
      if (isRune && rune) touchRune(p, rec, rune);
      else readInscription(p, rec).catch(() => { /* */ });
    });
  });
}
