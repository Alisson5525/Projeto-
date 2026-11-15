// Moradores das vilas: criação a partir da planta, reaparecimento, rotina de dia e noite, saudações,
// alerta dos guardas quando um morador é atacado e reputação.
import { world, system } from "@minecraft/server";
import { NS, V, ok, isPlayer, rand } from "../core/util.js";
import { sound } from "../core/fx.js";
import { allSites, getSite, saveSite, center, inBox } from "../structures/registry.js";
import { ROLES, OFICIO, npcTag } from "./roles.js";
import { isNight, addRep, npcData } from "./economy.js";

export const NPC_TYPES = [`${NS}:aldeao`, `${NS}:guarda`, `${NS}:guarda_elfico`];
export const VTAG = (id) => `vn_${id}`;
/** Locais com moradores: vilas, a capital e Aelthar. */
export const HABITED = new Set(["vila", "capital", "aelthar"]);
const RESPAWN_MIN = 10;

/** Lista de moradores da vila a partir das marcações da planta. */
export function residentsFromPlan(rec, plan) {
  const list = [];
  let slot = 0;
  const seed = Math.abs(rec.seed || 1);
  for (const [mark, positions] of Object.entries(plan.marks)) {
    let role = null;
    if (mark.startsWith("npc_")) role = mark.slice(4);
    else if (mark === "guarda") role = "guarda";
    if (!role || !ROLES[role]) continue;
    positions.forEach((pos, i) => {
      const R = ROLES[role];
      const nome = R.nomes[(seed + slot * 7 + i) % R.nomes.length];
      list.push({ slot, role, tipo: R.tipo, oficio: OFICIO[role], variante: (seed + slot) % 2, nome, pos: { ...pos }, perdidoEm: 0 });
      slot++;
    });
  }
  return list;
}

export function spawnResident(dim, rec, m) {
  try {
    const e = dim.spawnEntity(`${NS}:${m.tipo}`, { x: m.pos.x + 0.5, y: m.pos.y, z: m.pos.z + 0.5 }, { initialPersistence: true });
    e.setProperty(`${NS}:oficio`, m.oficio);
    e.setProperty(`${NS}:variante`, m.variante);
    e.setDynamicProperty(`${NS}:morador`, `${rec.id}:${m.slot}`);
    e.setDynamicProperty(`${NS}:papel`, m.role);
    e.addTag(VTAG(rec.id));
    e.nameTag = npcTag(m.role, m.nome);
    if (isNight() && !ROLES[m.role]?.aberto && m.tipo === "aldeao") e.triggerEvent("valdoria:noite");
    return e;
  } catch (err) {
    console.warn(`[Valdoria] morador ${m.role}: ${err}`);
    return undefined;
  }
}

/** Papel e registro de um NPC (para diálogos e missões). */
export function residentInfo(e) {
  try {
    const role = e.getDynamicProperty(`${NS}:papel`);
    const ref = e.getDynamicProperty(`${NS}:morador`);
    if (typeof role !== "string") return undefined;
    const [siteId, slot] = typeof ref === "string" ? ref.split(":") : [undefined, undefined];
    const rec = siteId ? getSite(siteId) : undefined;
    const m = rec?.m?.moradores?.[Number(slot)];
    return { role, siteId, rec, m, nome: m?.nome || String(e.nameTag || "").split("\n")[0].replace(/§./g, "") };
  } catch {
    return undefined;
  }
}

export function villageAt(dimId, loc) {
  for (const r of allSites()) {
    if (!HABITED.has(r.tipo) || r.dim !== dimId || r.estado === "construindo") continue;
    if (r.area && inBox(r.area, loc, 4)) return r;
  }
  return undefined;
}

// ------------------------------------------------------------------ manutenção (reaparecimento, dia e noite)
const WORKERS = ["ferreiro", "alquimista", "taverneiro", "fazendeiro", "armeiro", "joalheiro"];
/** Artesãos trabalham de vez em quando (martelar, mexer o caldeirão, limpar o balcão, capinar). */
function work(e) {
  try {
    if (e.getProperty(`${NS}:anim`) !== 0 || Math.random() > 0.35) return;
    e.setProperty(`${NS}:anim`, 2);
    system.runTimeout(() => { try { if (ok(e) && e.getProperty(`${NS}:anim`) === 2) e.setProperty(`${NS}:anim`, 0); } catch { /* */ } }, 40);
  } catch { /* */ }
}

const missing = new Map(); // `${site}:${slot}` -> verificações seguidas sem o morador
const dayState = new Map(); // entidade -> "dia" | "noite"

function maintain(rec) {
  let dim;
  try {
    dim = world.getDimension(rec.dim);
  } catch {
    return;
  }
  const c = center(rec);
  try {
    if (!dim.isChunkLoaded(c)) return;
  } catch {
    return;
  }
  const players = dim.getPlayers({ location: c, maxDistance: 110 });
  if (!players.length) return;
  const present = new Set();
  const night = isNight();
  for (const e of dim.getEntities({ tags: [VTAG(rec.id)] })) {
    const info = residentInfo(e);
    if (!info?.m) continue;
    present.add(info.m.slot);
    if (WORKERS.includes(info.role) && !night) work(e);
    if (e.typeId === `${NS}:aldeao` && !ROLES[info.role]?.aberto) {
      const want = night ? "noite" : "dia";
      if (dayState.get(e.id) !== want) {
        try { e.triggerEvent(night ? "valdoria:noite" : "valdoria:dia"); } catch { /* */ }
        dayState.set(e.id, want);
      }
    }
  }
  let changed = false;
  for (const m of rec.m.moradores || []) {
    if (m.secao !== undefined && rec.m.secoes?.[m.secao] !== 2) continue; // setor da capital ainda não construído
    const k = `${rec.id}:${m.slot}`;
    if (present.has(m.slot)) {
      missing.delete(k);
      if (m.perdidoEm) {
        m.perdidoEm = 0;
        changed = true;
      }
      continue;
    }
    const n = (missing.get(k) || 0) + 1;
    missing.set(k, n);
    if (n < 6) continue;
    if (!m.perdidoEm) {
      m.perdidoEm = Date.now();
      changed = true;
      continue;
    }
    if (Date.now() - m.perdidoEm < RESPAWN_MIN * 60000) continue;
    if (players.some((p) => V.dist(p.location, m.pos) < 14)) continue;
    if (spawnResident(dim, rec, m)) {
      m.perdidoEm = 0;
      missing.delete(k);
      changed = true;
    }
  }
  if (changed) saveSite(rec);
}

/** Recria todos os moradores ausentes agora (Modo de Teste). */
export function respawnAll(dim, rec) {
  const present = new Set(dim.getEntities({ tags: [VTAG(rec.id)] }).map((e) => residentInfo(e)?.m?.slot));
  let n = 0;
  for (const m of rec.m.moradores || []) {
    if (present.has(m.slot)) continue;
    if (m.secao !== undefined && rec.m.secoes?.[m.secao] !== 2) continue;
    if (spawnResident(dim, rec, m)) n++;
    m.perdidoEm = 0;
  }
  saveSite(rec);
  return n;
}

// ------------------------------------------------------------------ saudações
const greeted = new Map(); // `${player}:${npc}` -> tick
function greet() {
  for (const p of world.getAllPlayers()) {
    if (!ok(p)) continue;
    let near;
    try {
      near = p.dimension.getEntities({ location: p.location, maxDistance: 4.5, families: ["valdoria_npc"] });
    } catch {
      continue;
    }
    for (const e of near) {
      const k = `${p.id}:${e.id}`;
      if ((greeted.get(k) || 0) > system.currentTick) continue;
      greeted.set(k, system.currentTick + 20 * 180);
      const info = residentInfo(e);
      if (!info) continue;
      const R = ROLES[info.role];
      const d = npcData(p);
      const line = d.rep < 0 ? "Hm. Ficarei de olho em você." : isNight() && !R.aberto ? "É tarde, viajante. Volte amanhã." :
        `${["Bom dia", "Olá", "Saudações"][Math.floor(rand(0, 3))]}, ${p.name}!`;
      p.onScreenDisplay.setActionBar(`§e${info.nome} §7(${R.titulo}): §f${line}`);
      try {
        e.setProperty(`${NS}:anim`, 3);
        system.runTimeout(() => { try { if (ok(e) && e.getProperty(`${NS}:anim`) === 3) e.setProperty(`${NS}:anim`, 0); } catch { /* */ } }, 30);
      } catch { /* */ }
      break;
    }
  }
}

// ------------------------------------------------------------------ guardas: alerta e reputação
const alertUntil = new Map(); // guarda -> tick
const hitCd = new Map();
export function alertGuards(dim, loc, ticks = 600) {
  const gs = dim.getEntities({ type: `${NS}:guarda`, location: loc, maxDistance: 28 })
    .concat(dim.getEntities({ type: `${NS}:guarda_elfico`, location: loc, maxDistance: 28 }));
  for (const g of gs) {
    try { g.triggerEvent("valdoria:alerta"); } catch { /* */ }
    alertUntil.set(g.id, system.currentTick + ticks);
  }
}
function calmGuards() {
  for (const [id, t] of alertUntil) {
    if (t > system.currentTick) continue;
    alertUntil.delete(id);
    const g = world.getEntity(id);
    if (ok(g)) try { g.triggerEvent("valdoria:calmo"); } catch { /* */ }
  }
}

export function startResidents() {
  system.runInterval(() => {
    for (const r of allSites()) if (HABITED.has(r.tipo) && r.estado !== "construindo" && r.m?.moradores) maintain(r);
    calmGuards();
  }, 40);
  system.runInterval(greet, 20);
  world.afterEvents.entityHurt.subscribe((ev) => {
    const e = ev.hurtEntity;
    /** @type {any} */
    const src = ev.damageSource.damagingEntity;
    if (!isPlayer(src) || !ok(e) || !NPC_TYPES.includes(e.typeId)) return;
    if ((hitCd.get(src.id) || 0) > system.currentTick) return;
    hitCd.set(src.id, system.currentTick + 20);
    addRep(src, -5, "atacou um morador");
    alertGuards(e.dimension, e.location);
    src.onScreenDisplay.setActionBar("§cOs guardas viram isso!");
    sound(e.dimension, "mob.villager.hit", e.location, 1, 1);
  });
  world.afterEvents.entityDie.subscribe((ev) => {
    const e = ev.deadEntity;
    const src = ev.damageSource.damagingEntity;
    if (!isPlayer(src)) return;
    let isNpc = false;
    try { isNpc = NPC_TYPES.includes(e.typeId); } catch { return; }
    if (isNpc) addRep(src, -30, "matou um morador");
  });
}
