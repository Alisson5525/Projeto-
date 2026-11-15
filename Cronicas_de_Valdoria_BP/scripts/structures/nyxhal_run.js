// Nyxhal em tempo de execução: os guardiões de cada Selo de Sombra, quebrar os selos, a Barreira Sombria, a luta contra
// Azrakar no Salão do Trono, a vitória (baú do trono) e a reativação do chefe.
import { world, system } from "@minecraft/server";
import { NS, V, ok, isActivePlayer, say } from "../core/util.js";
import { particle, sound, psound } from "../core/fx.js";
import { addXP } from "../rpg/progression.js";
import { setFlag, questEvent } from "../quests/quests.js";
import { readLore } from "../ui/codex.js";
import { Plan, build, rng } from "./builder.js";
import { allSites, getSite, saveSite, center, fillChests, registerType, inBox, spawnGuard } from "./registry.js";
import { NYXHAL, nyxhalPlan, SEALS, sealObelisk } from "./nyxhal.js";
import { spawnAzrakar, despawnAzrakar, azrakarOf, setAzrakarArenaResolver, onAzrakarDefeated } from "../bosses/azrakar.js";

const KNIGHT = `${NS}:cavaleiro_corrompido`;
const STAG = (siteId, i) => `vs_${siteId}_${i}`; // cavaleiros que guardam o selo i
const REARM_MIN = 90;
const layouts = new Map();
const mem = new Map();
const key = (p) => `${p.x},${p.y},${p.z}`;

function memOf(id) {
  let m = mem.get(id);
  if (!m) {
    m = { arenaEmpty: 0, bossMissing: 0 };
    mem.set(id, m);
  }
  return m;
}
export function layout(rec) {
  let L = layouts.get(rec.id);
  if (!L) {
    const p = nyxhalPlan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed));
    L = { marks: p.marks };
    L.sealAt = new Map(L.marks.selo.map((pos, i) => [key(pos), i]));
    layouts.set(rec.id, L);
  }
  return L;
}
function localSet(dim, rec, fn) {
  const p = new Plan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed + 11));
  fn(p);
  return build(dim, p, 300).then(() => p);
}
function state(rec) {
  rec.m = rec.m || {};
  const m = rec.m;
  if (!Array.isArray(m.selos)) m.selos = [0, 0, 0];
  if (m.barreira === undefined) m.barreira = false;
  if (!m.chefe) m.chefe = "pronto";
  return m;
}
const broken = (rec) => state(rec).selos.filter(Boolean).length;

function spawnSealGuards(dim, rec) {
  const L = layout(rec);
  SEALS.forEach((_, i) => {
    if (state(rec).selos[i]) return;
    for (const pos of L.marks[`cav_${i}`] || []) {
      const e = spawnGuard(dim, KNIGHT, pos, rec.id);
      if (e) e.addTag(STAG(rec.id, i));
    }
  });
}
export function sealGuardsAlive(dim, rec, i) {
  try {
    return dim.getEntities({ type: KNIGHT, tags: [STAG(rec.id, i)] }).length;
  } catch {
    return 0;
  }
}

NYXHAL.afterBuild = (rec) => {
  rec.m = { selos: [0, 0, 0], barreira: false, chefe: "pronto", vitorias: 0, derrotadoEm: 0 };
  spawnSealGuards(world.getDimension(rec.dim), rec);
};
registerType(NYXHAL);

export function nyxhalAt(dimId, loc) {
  for (const r of allSites()) {
    if (r.tipo !== "nyxhal" || r.dim !== dimId || r.estado === "construindo") continue;
    if (r.area && inBox(r.area, loc, 4)) return r;
  }
  return undefined;
}

// ------------------------------------------------------------------ selos e barreira
/** Tenta quebrar o Selo de Sombra i. Retorna a mensagem para o jogador. */
export function breakSeal(player, rec, i) {
  const m = state(rec);
  if (m.selos[i]) return "§7Este selo já foi quebrado.";
  const dim = player.dimension;
  const alive = sealGuardsAlive(dim, rec, i);
  if (alive > 0) return `§5O selo pulsa, protegido. §fOs Cavaleiros Corrompidos que o guardam ainda estão de pé §7(${alive}).`;
  m.selos[i] = 1;
  saveSite(rec);
  const [sx, sz] = SEALS[i];
  localSet(dim, rec, (p) => sealObelisk(p, sx, sz, true));
  const pos = layout(rec).marks.selo[i];
  const c = { x: pos.x + 0.5, y: pos.y + 0.5, z: pos.z + 0.5 };
  particle(dim, "sombra_explosao", c, { radius: 2.5 });
  particle(dim, "sagrado_explosao", c, { radius: 1.5 });
  sound(dim, "random.glass", c, 0.6, 1);
  const n = broken(rec);
  for (const p of dim.getPlayers({ location: c, maxDistance: 48 })) {
    if (!isActivePlayer(p)) continue;
    addXP(p, 180, "Selo de Sombra");
    questEvent(p, "selo", "nyxhal");
    p.onScreenDisplay.setTitle("§dSelo de Sombra quebrado", { subtitle: `§7${n}/3 selos caíram`, fadeInDuration: 5, stayDuration: 45, fadeOutDuration: 10 });
    if (n >= 3) setFlag(p, "selos_nyxhal");
  }
  if (n >= 3) openBarrier(dim, rec);
  return `§dO selo se parte em mil cacos de sombra! §7(${n}/3)`;
}
export function openBarrier(dim, rec) {
  const m = state(rec);
  if (m.barreira) return;
  m.barreira = true;
  saveSite(rec);
  const L = layout(rec);
  for (const pos of L.marks.barreira) {
    try { dim.setBlockType(pos, "minecraft:air"); } catch { /* */ }
  }
  const c = L.marks.barreira[Math.floor(L.marks.barreira.length / 2)];
  particle(dim, "sombra_explosao", c, { radius: 3 });
  sound(dim, "mob.wither.break_block", c, 0.6, 1);
  for (const p of dim.getPlayers({ location: c, maxDistance: 80 })) {
    p.onScreenDisplay.setTitle("§5A Barreira Sombria cai", { subtitle: "§7O Salão do Trono está aberto. Azrakar espera.", fadeInDuration: 10,
      stayDuration: 60, fadeOutDuration: 15 });
  }
}

// ------------------------------------------------------------------ o Salão do Trono
function startFight(dim, rec, players) {
  const L = layout(rec);
  state(rec).chefe = "luta";
  saveSite(rec);
  const mm = memOf(rec.id);
  mm.arenaEmpty = 0;
  mm.bossMissing = 0;
  for (const p of players) p.onScreenDisplay.setActionBar("§4O trono estremece...");
  system.runTimeout(() => {
    try {
      spawnAzrakar(dim, L.marks.chefe[0], rec.id);
    } catch (e) {
      console.warn(`[Valdoria] Azrakar: ${e}`);
      resetFight(dim, rec);
    }
  }, 30);
}
function resetFight(dim, rec) {
  despawnAzrakar(dim, rec.id);
  state(rec).chefe = "pronto";
  saveSite(rec);
  for (const p of dim.getPlayers({ location: center(rec), maxDistance: 90 })) {
    p.onScreenDisplay.setActionBar("§7Azrakar volta às sombras do trono... a luta foi reiniciada.");
  }
}
function arena(dim, rec, players) {
  const L = layout(rec);
  const inside = players.filter((p) => isActivePlayer(p) && inBox(L.marks.arena, p.location, 0.2));
  const m = state(rec);
  const mm = memOf(rec.id);
  if (m.chefe === "pronto") {
    if (inside.length) startFight(dim, rec, inside);
    return;
  }
  if (m.chefe !== "luta") return;
  mm.arenaEmpty = inside.length ? 0 : mm.arenaEmpty + 1;
  mm.bossMissing = azrakarOf(dim, rec.id) ? 0 : mm.bossMissing + 1;
  if (mm.arenaEmpty > 50 || mm.bossMissing > 20) resetFight(dim, rec);
}
function onDefeat(siteId, players, dim) {
  const rec = getSite(siteId);
  if (!rec || rec.tipo !== "nyxhal") return;
  const L = layout(rec);
  const m = state(rec);
  const first = !m.vitorias;
  m.chefe = "derrotado";
  m.derrotadoEm = Date.now();
  m.vitorias = (m.vitorias || 0) + 1;
  saveSite(rec);
  const bau = L.marks.bau_trono[0];
  try { dim.setBlockType(bau, "minecraft:chest"); } catch { /* */ }
  const extra = {};
  if (first || Math.random() < 0.3) extra.item = `${NS}:lamina_azrakar`;
  if (first) extra.lore = "azrakar_ultimas";
  system.runTimeout(() => {
    fillChests(dim, [{ pos: bau, tier: "nyxhal_tesouro", extra }]);
    particle(dim, "sombra_explosao", { x: bau.x + 0.5, y: bau.y + 0.5, z: bau.z + 0.5 }, { radius: 1.5 });
  }, 10);
  for (const p of players) {
    if (!ok(p)) continue;
    setFlag(p, "azrakar");
    questEvent(p, "limpar", "nyxhal");
  }
}
/** Reativa o trono: Azrakar pode ser enfrentado de novo (os selos continuam quebrados). */
export function rearm(dim, rec) {
  despawnAzrakar(dim, rec.id);
  try { dim.setBlockType(layout(rec).marks.bau_trono[0], "minecraft:air"); } catch { /* */ }
  state(rec).chefe = "pronto";
  saveSite(rec);
  mem.delete(rec.id);
}

/** Modo de Teste: derruba os guardiões e quebra os selos que faltam. */
export function breakAllForTest(player, rec) {
  const dim = world.getDimension(rec.dim);
  for (let i = 0; i < 3; i++) {
    for (const e of dim.getEntities({ tags: [STAG(rec.id, i)] })) e.remove();
    if (!state(rec).selos[i]) breakSeal(player, rec, i);
  }
  openBarrier(dim, rec);
}
/** Modo de Teste: abre o salão e desperta Azrakar. */
export function wakeAzrakarForTest(rec) {
  const dim = world.getDimension(rec.dim);
  openBarrier(dim, rec);
  if (azrakarOf(dim, rec.id)) return false;
  state(rec).chefe = "luta";
  saveSite(rec);
  const mm = memOf(rec.id);
  mm.arenaEmpty = 0;
  mm.bossMissing = 0;
  spawnAzrakar(dim, layout(rec).marks.chefe[0], rec.id);
  return true;
}

function loop() {
  for (const rec of allSites()) {
    if (rec.tipo !== "nyxhal" || rec.estado === "construindo") continue;
    let dim;
    try { dim = world.getDimension(rec.dim); } catch { continue; }
    const m = state(rec);
    const c = center(rec);
    const players = dim.getPlayers({ location: c, maxDistance: 110 });
    if (m.chefe === "derrotado" && Date.now() - (m.derrotadoEm || 0) > REARM_MIN * 60000 && !players.some((p) => V.dist(p.location, c) < 90)) {
      try { if (dim.isChunkLoaded(c)) rearm(dim, rec); } catch { /* */ }
      continue;
    }
    if (!players.length) continue;
    if (broken(rec) >= 3) {
      if (!m.barreira) openBarrier(dim, rec);
      for (const p of players) if (isActivePlayer(p) && inBox(rec.area, p.location, 2)) setFlag(p, "selos_nyxhal");
    }
    if (m.barreira) arena(dim, rec, players);
  }
}

export function startNyxhal() {
  setAzrakarArenaResolver((siteId) => {
    const rec = getSite(siteId);
    if (!rec) return undefined;
    const L = layout(rec);
    const pos = L.marks.chefe[0];
    const t = L.marks.trono[0];
    return { arena: L.marks.arena, center: { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, throne: { x: t.x + 0.5, y: t.y, z: t.z + 0.5 },
      lights: L.marks.luz };
  });
  onAzrakarDefeated(onDefeat);
  system.runInterval(() => {
    try { loop(); } catch (e) { console.warn(`[Valdoria] Nyxhal: ${e}`); }
  }, 10);
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    const id = ev.block.typeId;
    const isSeal = id === `${NS}:selo_sombra`;
    const isBarrier = id === `${NS}:barreira_sombria`;
    const isLectern = id === "minecraft:lectern";
    if (!isSeal && !isBarrier && !isLectern) return;
    const pos = { ...ev.block.location };
    const rec = nyxhalAt(ev.block.dimension.id, pos);
    if (!rec) return;
    const L = layout(rec);
    if (isLectern && !(L.marks.inscricao || []).some((q) => key(q) === key(pos))) return;
    ev.cancel = true;
    if (!ev.isFirstEvent) return;
    const p = ev.player;
    system.run(() => {
      if (!ok(p)) return;
      if (isSeal) {
        const i = L.sealAt.get(key(pos));
        if (i !== undefined) say(p, breakSeal(p, rec, i));
      } else if (isBarrier) {
        say(p, `§5Uma parede de sombra viva. §fEla só cai quando os três Selos de Sombra do pátio forem quebrados §7(${broken(rec)}/3).`);
        psound(p, "mob.wither.ambient", 1.6, 0.5);
      } else {
        readLore(p, "inscricao_nyxhal").catch(() => { /* */ });
      }
    });
  });
}
