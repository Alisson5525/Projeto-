// Registro de locais (estruturas geradas): persistência no mundo, construção, guardiões, descoberta, limpeza e repovoamento.
import { world, system, ItemStack } from "@minecraft/server";
import { NS, ok, V, isActivePlayer } from "../core/util.js";
import { particle, psound } from "../core/fx.js";
import { getData, markDirty } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { build, rng } from "./builder.js";
import { fillChest } from "./loot.js";
import { scrollItem } from "./scrolls.js";
import { rarityOf } from "../exploration/rarity.js";

const IDX = `${NS}:locais`;
const KEY = (id) => `${NS}:local_${id}`;
export const TAG = (id) => `vl_${id}`;

/** Tipos de estrutura registrados: { id, nome, raio, guards, plan(), xp, repovoar (min), limpeza, nomes[] } */
export const TYPES = {};
export function registerType(def) {
  TYPES[def.id] = def;
}

let index = null; // { n: contador, ids: [] }
const cache = new Map();
const listeners = { limpo: [], descoberto: [], criado: [] };
export function onSite(evt, fn) {
  listeners[evt].push(fn);
}

function loadIndex() {
  if (index) return index;
  try {
    const raw = world.getDynamicProperty(IDX);
    index = typeof raw === "string" ? JSON.parse(raw) : null;
  } catch {
    index = null;
  }
  if (!index || !Array.isArray(index.ids)) index = { n: 0, ids: [] };
  return index;
}
function saveIndex() {
  world.setDynamicProperty(IDX, JSON.stringify(index));
}

export function getSite(id) {
  let r = cache.get(id);
  if (!r) {
    try {
      const raw = world.getDynamicProperty(KEY(id));
      r = typeof raw === "string" ? JSON.parse(raw) : null;
    } catch {
      r = null;
    }
    if (r) cache.set(id, r);
  }
  return r;
}
export function saveSite(rec) {
  cache.set(rec.id, rec);
  world.setDynamicProperty(KEY(rec.id), JSON.stringify(rec));
}
export function allSites() {
  return loadIndex().ids.map(getSite).filter(Boolean);
}
export function removeSite(id) {
  loadIndex();
  index.ids = index.ids.filter((x) => x !== id);
  saveIndex();
  cache.delete(id);
  world.setDynamicProperty(KEY(id), undefined);
}

export function center(rec) {
  return { x: rec.x + 0.5, y: rec.y + 1, z: rec.z + 0.5 };
}
export function dist2d(rec, loc) {
  return Math.hypot(rec.x + 0.5 - loc.x, rec.z + 0.5 - loc.z);
}
export function inBox(box, loc, pad = 0) {
  if (!box) return false;
  const [a, b] = box;
  return loc.x >= a.x - pad && loc.x < b.x + 1 + pad && loc.y >= a.y - pad && loc.y < b.y + 1 + pad &&
    loc.z >= a.z - pad && loc.z < b.z + 1 + pad;
}

const DIR8 = ["ao norte", "a nordeste", "a leste", "a sudeste", "ao sul", "a sudoeste", "a oeste", "a noroeste"];
/** Direção aproximada (bússola) de `from` até o local (norte = -Z). */
export function compass(from, rec) {
  const dx = rec.x + 0.5 - from.x;
  const dz = rec.z + 0.5 - from.z;
  const ang = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
  return DIR8[Math.round(ang / 45) % 8];
}

/**
 * Local mais próximo (opcionalmente de um tipo e/ou não descoberto pelo jogador).
 * @param {{x:number,z:number}} loc @param {string} dimId @param {(r:any)=>boolean} [filter]
 */
export function nearestSite(loc, dimId, filter = (r) => !!r) {
  let best = null;
  let bd = Infinity;
  for (const r of allSites()) {
    if (r.dim !== dimId || !filter(r)) continue;
    const d = dist2d(r, loc);
    if (d < bd) {
      bd = d;
      best = r;
    }
  }
  return best ? { rec: best, dist: bd } : null;
}

// ------------------------------------------------------------------ itens extras nos baús
function extrasOf(extra = {}) {
  const out = [];
  if (extra.lore) out.push(scrollItem(extra.lore));
  if (extra.item) out.push(new ItemStack(extra.item, extra.n || 1));
  return out;
}
export function fillChests(dim, chests, luck = 0, onlyEmpty = false) {
  for (const c of chests) {
    if (onlyEmpty) {
      try {
        const inv = dim.getBlock(c.pos)?.getComponent("minecraft:inventory")?.container;
        if (!inv || inv.emptySlotsCount < inv.size) continue;
      } catch {
        continue;
      }
    }
    fillChest(dim, c.pos, c.tier, onlyEmpty ? [] : extrasOf(c.extra), luck);
  }
}

// ------------------------------------------------------------------ guardiões
export function spawnGuard(dim, typeId, pos, siteId) {
  try {
    const e = dim.spawnEntity(typeId, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true });
    e.addTag(TAG(siteId));
    return e;
  } catch (err) {
    console.warn(`[Valdoria] guardião ${typeId}: ${err}`);
    return undefined;
  }
}
function spawnGuards(dim, rec) {
  for (const [typeId, x, y, z] of rec.guards || []) spawnGuard(dim, typeId, { x, y, z }, rec.id);
}
export function guardsAlive(dim, rec, extra = 48) {
  try {
    return dim.getEntities({ tags: [TAG(rec.id)], location: center(rec), maxDistance: (TYPES[rec.tipo]?.raio || 16) + extra }).length;
  } catch {
    return -1;
  }
}

// ------------------------------------------------------------------ criação
let building = false;
export function isBuilding() {
  return building;
}

/**
 * Cria e constrói um local. `origin` é o piso (y do chão), `rot` 0..3.
 * Retorna a Promise do registro pronto (ou undefined em caso de falha).
 */
export async function createSite(dim, tipo, origin, rot, opts = {}) {
  const T = TYPES[tipo];
  if (!T || building) return undefined;
  building = true;
  loadIndex();
  const id = (++index.n).toString(36);
  const seed = (Math.floor(origin.x) * 73856093) ^ (Math.floor(origin.z) * 19349663) ^ index.n;
  const nome = opts.nome || (T.nomes ? T.nomes[Math.abs(seed) % T.nomes.length] : T.nome);
  const rec = { id, tipo, nome, dim: dim.id, x: Math.floor(origin.x), y: Math.floor(origin.y), z: Math.floor(origin.z), rot,
    seed, estado: "construindo", criadoEm: Date.now(), limpoEm: 0, vezes: 0, guards: [], baus: [], m: {} };
  index.ids.push(id);
  saveIndex();
  saveSite(rec);
  try {
    const { plans, plan } = await T.plan(dim, origin, rot, rng(seed), seed);
    let errors = 0;
    for (const p of plans) errors += await build(dim, p);
    fillChests(dim, plan.chests);
    rec.baus = plan.chests.map((c) => ({ pos: c.pos, tier: c.tier }));
    rec.area = plan.marks.area;
    for (const [key, typeId] of T.guards || []) for (const pos of plan.marks[key] || []) rec.guards.push([typeId, pos.x, pos.y, pos.z]);
    spawnGuards(dim, rec);
    rec.estado = "ativo";
    if (T.mecanismos) {
      // marcações (posições e salas) usadas pelos mecanismos persistem com o local
      const skip = new Set(["area", ...(T.guards || []).map(([k]) => k)]);
      rec.mk = {};
      for (const [k, v] of Object.entries(plan.marks)) if (!skip.has(k)) rec.mk[k] = v.map((q) => ({ x: q.x, y: q.y, z: q.z }));
      rec.m.mec = {};
    }
    if (T.afterBuild) T.afterBuild(rec, plan);
    saveSite(rec);
    for (const fn of listeners.criado) fn(rec, dim);
    if (errors) console.warn(`[Valdoria] ${rec.nome}: ${errors} blocos não puderam ser colocados.`);
    console.info(`[Valdoria] Estrutura gerada: ${rec.nome} em ${rec.x} ${rec.y} ${rec.z}`);
    return rec;
  } catch (e) {
    console.warn(`[Valdoria] falha ao gerar ${tipo}: ${e}`);
    removeSite(id);
    return undefined;
  } finally {
    building = false;
  }
}

// ------------------------------------------------------------------ descoberta
function discover(player, rec) {
  const d = getData(player);
  d.locais = d.locais || [];
  if (d.locais.includes(rec.id)) return;
  d.locais.push(rec.id);
  markDirty(player);
  const T = TYPES[rec.tipo];
  const R = rarityOf(T);
  const xp = Math.round((T?.xp || 40) * (T?.raridade ? R.xp : 1));
  player.onScreenDisplay.setTitle(`${R.cor}${rec.nome}`, { subtitle: `§7Local ${R.cor}${R.nome.toLowerCase()}§7 descoberto §8· §e+${xp} XP`,
    fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
  psound(player, R.ordem >= 2 ? "ui.toast.challenge_complete" : "random.toast", 0.8, 1);
  addXP(player, xp, "exploração");
  if (d.rumores?.includes(rec.id)) d.rumores = d.rumores.filter((x) => x !== rec.id);
  for (const fn of listeners.descoberto) fn(player, rec);
}

// ------------------------------------------------------------------ limpeza e repovoamento
const emptyChecks = new Map(); // id -> verificações seguidas sem guardiões
const seenAlive = new Set();
const deathSeen = new Set();

function cleared(dim, rec) {
  rec.estado = "limpo";
  rec.limpoEm = Date.now();
  rec.vezes = (rec.vezes || 0) + 1;
  saveSite(rec);
  emptyChecks.delete(rec.id);
  seenAlive.delete(rec.id);
  deathSeen.delete(rec.id);
  const T = TYPES[rec.tipo];
  const near = dim.getPlayers({ location: center(rec), maxDistance: (T?.raio || 16) + 40 });
  for (const p of near) {
    p.onScreenDisplay.setTitle("§a§lLocal libertado", { subtitle: `§f${rec.nome}`, fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
    psound(p, "random.levelup", 0.9, 0.8);
    addXP(p, T?.xpLimpo || 120, "local libertado");
    for (const fn of listeners.limpo) fn(p, rec);
  }
  particle(dim, "nivel_anel", center(rec));
}

function checkCleared(dim, rec, playersClose) {
  const T = TYPES[rec.tipo];
  if (rec.estado !== "ativo" || T?.limpeza === false || !rec.guards.length) return;
  const n = guardsAlive(dim, rec);
  if (n < 0) return;
  if (n > 0) {
    seenAlive.add(rec.id);
    emptyChecks.set(rec.id, 0);
    return;
  }
  if (!playersClose) return;
  const k = (emptyChecks.get(rec.id) || 0) + 1;
  emptyChecks.set(rec.id, k);
  // evita falso "limpo" logo que o chunk carrega (entidades podem carregar depois dos blocos)
  if (k >= ((seenAlive.has(rec.id) || deathSeen.has(rec.id)) ? 2 : 6)) cleared(dim, rec);
}

/** Repovoa um local: guardiões de volta e baús vazios reabastecidos. */
export function repopulate(dim, rec, force = false) {
  if (!force) {
    const T = TYPES[rec.tipo];
    const min = T?.repovoar ?? 0;
    if (!min || rec.estado !== "limpo" || Date.now() - rec.limpoEm < min * 60000) return false;
    const c = center(rec);
    try {
      if (!dim.isChunkLoaded(c)) return false;
    } catch {
      return false;
    }
    if (dim.getPlayers({ location: c, maxDistance: (T?.raio || 16) + 14 }).length) return false;
  }
  for (const e of dim.getEntities({ tags: [TAG(rec.id)] })) {
    try { e.remove(); } catch { /* */ }
  }
  spawnGuards(dim, rec);
  fillChests(dim, rec.baus || [], 0, true);
  rec.estado = "ativo";
  saveSite(rec);
  emptyChecks.delete(rec.id);
  return true;
}

export function startRegistry() {
  system.runInterval(() => {
    const sites = allSites();
    if (!sites.length) return;
    for (const p of world.getAllPlayers()) {
      if (!ok(p)) continue;
      const loc = p.location;
      for (const r of sites) {
        if (r.dim !== p.dimension.id || r.estado === "construindo") continue;
        const T = TYPES[r.tipo];
        if (dist2d(r, loc) <= (T?.raio || 12) + 8 && Math.abs(loc.y - r.y) < 40) discover(p, r);
      }
    }
  }, 20);

  system.runInterval(() => {
    const sites = allSites();
    for (const r of sites) {
      if (r.estado === "construindo") continue;
      let dim;
      try {
        dim = world.getDimension(r.dim);
      } catch {
        continue;
      }
      const T = TYPES[r.tipo];
      const c = center(r);
      const near = dim.getPlayers({ location: c, maxDistance: (T?.raio || 16) + 48 });
      if (!near.length) {
        if (r.estado === "limpo") repopulate(dim, r);
        continue;
      }
      const close = near.some((p) => isActivePlayer(p) && V.dist(p.location, c) <= (T?.raio || 16) + 12);
      checkCleared(dim, r, close);
      if (r.estado === "limpo") repopulate(dim, r);
    }
  }, 40);

  world.afterEvents.entityDie.subscribe((ev) => {
    let tags = [];
    try {
      tags = ev.deadEntity.getTags();
    } catch {
      return;
    }
    const t = tags.find((x) => x.startsWith("vl_"));
    if (t) deathSeen.add(t.slice(3));
  });
}
