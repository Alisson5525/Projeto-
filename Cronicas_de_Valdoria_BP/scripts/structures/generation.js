// Geração dinâmica de estruturas: escolhe locais atrás do jogador (fora da visão), em terreno plano e natural,
// respeitando distâncias mínimas entre locais, regras de bioma e nível do jogador.
import { world, system } from "@minecraft/server";
import { V, isActivePlayer } from "../core/util.js";
import { getData, getWorldCfg } from "../core/store.js";
import { survey, groundAt, rotXZ } from "./builder.js";
import { TYPES, allSites, createSite, isBuilding, dist2d } from "./registry.js";
import { chapterStep } from "../quests/quests.js";

/** Distância mínima entre locais do mesmo tipo e entre quaisquer locais. */
const SPACING = { acampamento: 320, torre: 480, cripta: 640, vila: 900, ninho: 1200, santuario: 1200, ninho_grifo: 500, kardum: 900 };
const SPACING_ANY = 160;
const MIN_LEVEL = { acampamento: 1, torre: 3, cripta: 6, vila: 1, ninho: 14, santuario: 16, ninho_grifo: 12, kardum: 12 };
const WEIGHT = { acampamento: 5, torre: 3, cripta: 2, vila: 2, ninho: 1, santuario: 1, ninho_grifo: 2, kardum: 2 };
const spacingOf = (t) => SPACING[t] ?? TYPES[t]?.espaco ?? 400;
const minLevelOf = (t) => MIN_LEVEL[t] ?? TYPES[t]?.nivel ?? 1;
const weightOf = (t) => WEIGHT[t] ?? TYPES[t]?.peso ?? 0;
/** Distância (2D) até o local mais próximo na mesma dimensão. */
function nearestSiteDist(loc, dimId, sites) {
  let best = Infinity;
  for (const s of sites) if (s.dim === dimId) best = Math.min(best, dist2d(s, loc));
  return best;
}
let chronicleFails = 0; // tentativas frustradas de gerar o covil pedido pela Crônica (depois de várias, o bioma é relevado)

/** Covil exigido pelo passo atual da Crônica e ainda inexistente no mundo. */
function chronicleNeed(player, sites) {
  const flag = chapterStep(player).step?.obj?.flag || "";
  for (const t of ["ninho", "santuario", "capital", "aelthar", "nyxhal", "celeste"]) {
    if (flag === `descoberto_${t}` && TYPES[t] && !sites.some((s) => s.tipo === t)) return t;
  }
  return undefined;
}
const SPAWN_CLEAR = 96;

let rr = 0;
let lastFail = "";
export function lastGenerationInfo() {
  return lastFail;
}

function biomeOk(T, dim, loc) {
  if (!T.biomas || T.biomas.includes("")) return true;
  try {
    const b = dim.getBiome(loc)?.id || "";
    return T.biomas.some((k) => b.includes(k));
  } catch {
    return false;
  }
}

/** Rotação para que a entrada (sul local, +z) aponte para `toward`. */
export function faceRotation(site, toward) {
  const dx = toward.x - site.x;
  const dz = toward.z - site.z;
  let best = 0;
  let bd = -Infinity;
  for (let r = 0; r < 4; r++) {
    const [x, z] = rotXZ(0, 1, r);
    const d = x * dx + z * dz;
    if (d > bd) {
      bd = d;
      best = r;
    }
  }
  return best;
}

function areaLoaded(dim, x, z, r) {
  try {
    for (const [dx, dz] of [[0, 0], [r, r], [r, -r], [-r, r], [-r, -r]]) if (!dim.isChunkLoaded({ x: x + dx, y: 64, z: z + dz })) return false;
    return true;
  } catch {
    return false;
  }
}

function spacingOk(tipo, loc, sites) {
  for (const s of sites) {
    const d = dist2d(s, loc);
    if (d < Math.max(SPACING_ANY, (TYPES[tipo]?.raio || 10) + (TYPES[s.tipo]?.raio || 10) + 60)) return false;
    if (s.tipo === tipo && d < spacingOf(tipo)) return false;
  }
  try {
    const sp = world.getDefaultSpawnLocation();
    if (Math.hypot(sp.x - loc.x, sp.z - loc.z) < SPAWN_CLEAR) return false;
  } catch { /* */ }
  return true;
}

function chooseType(player, sites, forced) {
  if (forced) return forced;
  const lvl = getData(player).nivel;
  const need = chronicleNeed(player, sites);
  if (need) return need;
  if (TYPES.vila && !sites.some((s) => s.tipo === "vila") && lvl >= 2) return "vila"; // a primeira vila é garantida cedo (comércio e serviços)
  const hasCamp = sites.some((s) => s.tipo === "acampamento");
  if (!hasCamp && lvl >= 3) return "acampamento"; // o primeiro acampamento é garantido para a Crônica
  // variedade: tipos já presentes por perto pesam menos (evita repetição na mesma região)
  const near = sites.filter((s) => s.dim === player.dimension.id && dist2d(s, player.location) < 700);
  const opts = Object.keys(TYPES).filter((t) => weightOf(t) > 0 && lvl >= minLevelOf(t));
  const w = (t) => weightOf(t) / (1 + near.filter((s) => s.tipo === t).length);
  const total = opts.reduce((a, t) => a + w(t), 0);
  let r = Math.random() * total;
  for (const t of opts) if ((r -= w(t)) <= 0) return t;
  return opts[0];
}

/** Maior raio (em blocos) em volta do jogador em que os chunks estão carregados (8 direções). */
export function loadedRadius(dim, loc) {
  let best = 0;
  for (const r of [16, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 128]) {
    let all = true;
    for (let k = 0; k < 8 && all; k++) {
      const a = (k / 8) * Math.PI * 2;
      try {
        all = dim.isChunkLoaded({ x: loc.x + Math.cos(a) * r, y: 64, z: loc.z + Math.sin(a) * r });
      } catch {
        all = false;
      }
    }
    if (!all) break;
    best = r;
  }
  return best;
}

/**
 * Procura um local para o tipo perto do jogador (sem construir).
 * O local fica atrás do jogador, longe o bastante para ele não estar dentro da obra. Quando os chunks carregados não alcançam a
 * distância de sempre (distância de simulação curta), o local é trazido para mais perto; se nem assim couber, o primeiro ponto
 * descarregado volta em `far`, para ser carregado com uma área de ticking.
 * @returns {{loc?: any, rot?: number, reasons: Record<string, number>, far?: {x: number, z: number}}}
 */
export function findSpot(player, tipo, o = {}, sites = allSites()) {
  const dim = player.dimension;
  const T = TYPES[tipo];
  const reach = (T.alcance ?? T.raio) + 2;
  const view = V.flat(player.getViewDirection());
  const base = Math.atan2(view.z, view.x) + (o.front ? 0 : Math.PI);
  const tries = o.at ? [0] : o.front ? [0, 0.35, -0.35, 0.7, -0.7] : [0, 0.6, -0.6, 1.0, -1.0, 1.5, -1.5];
  const reasons = {};
  const loadR = o.at || o.front ? 0 : loadedRadius(dim, player.location);
  const minDist = (T.alcance ?? T.raio) + 10;
  /** @type {{x: number, z: number} | undefined} */
  let far;
  for (const off of tries) {
    let x, z;
    if (o.at) {
      x = o.at.x;
      z = o.at.z;
    } else {
      let dist = o.dist ?? (o.front ? T.raio + 8 : (T.distGen ?? 34 + T.raio) + Math.random() * 8);
      const ang = base + off;
      // os cantos da obra ficam a reach × 1,42 do centro
      if (!o.front && o.dist === undefined && dist + reach * 1.42 > loadR) {
        far = far || { x: Math.floor(player.location.x + Math.cos(ang) * dist), z: Math.floor(player.location.z + Math.sin(ang) * dist) };
        dist = Math.max(minDist, loadR - reach * 1.42 - 2);
      }
      x = Math.floor(player.location.x + Math.cos(ang) * dist);
      z = Math.floor(player.location.z + Math.sin(ang) * dist);
    }
    const loc = { x, y: player.location.y, z };
    if (!o.ignoreRules && !spacingOk(tipo, loc, sites)) {
      reasons.distancia = (reasons.distancia || 0) + 1;
      continue;
    }
    if (!areaLoaded(dim, x, z, reach)) {
      reasons.descarregado = (reasons.descarregado || 0) + 1;
      continue;
    }
    let sv = survey(dim, x, z, T.raio, T.alturaMax ?? 4);
    if (!sv.ok && o.ignoreRules) {
      const g = groundAt(dim, x, z);
      sv = g.err ? { ok: false, reason: g.err } : { ok: true, y: g.y };
    }
    if (!sv.ok) {
      reasons[sv.reason] = (reasons[sv.reason] || 0) + 1;
      continue;
    }
    loc.y = sv.y;
    const relax = chronicleFails > 6 && chronicleNeed(player, sites) === tipo;
    if (!o.ignoreRules && !relax && !biomeOk(T, dim, loc)) {
      reasons.bioma = (reasons.bioma || 0) + 1;
      continue;
    }
    if (T.minY !== undefined && loc.y < T.minY && !(o.ignoreRules && T.minYSoft)) {
      reasons.profundidade = (reasons.profundidade || 0) + 1;
      continue;
    }
    return { loc, rot: faceRotation(loc, player.location), reasons };
  }
  return { reasons, far };
}

// ------------------------------------------------------------------ área de ticking (mantém a obra carregada)
const TA = "valdoria_obra";
const wait = (t) => new Promise((res) => system.runTimeout(() => res(undefined), t));
/** Carrega (e mantém carregado) o círculo em volta de (x, z) com uma área de ticking temporária. */
export async function holdArea(dim, x, y, z, reach) {
  releaseArea(dim);
  const chunks = Math.max(1, Math.min(4, Math.ceil((reach * 1.42 + 4) / 16)));
  try {
    const r = dim.runCommand(`tickingarea add circle ${x} ${Math.floor(y)} ${z} ${chunks} ${TA} true`);
    if (!r || !r.successCount) return false;
  } catch {
    return false;
  }
  for (let i = 0; i < 30; i++) {
    if (areaLoaded(dim, x, z, reach)) return true;
    await wait(10);
  }
  if (areaLoaded(dim, x, z, reach)) return true;
  releaseArea(dim);
  return false;
}
export function releaseArea(dim) {
  try { dim.runCommand(`tickingarea remove ${TA}`); } catch { /* não havia área */ }
}

/** Procura o local; se a distância normal estiver descarregada, carrega-a com a área de ticking e procura lá. */
export async function locate(player, tipo, o = {}, sites = allSites()) {
  const spot = findSpot(player, tipo, o, sites);
  if (spot.loc && !o.front && !o.at) {
    // mantém a obra carregada mesmo se o jogador se afastar durante a construção
    const T = TYPES[tipo];
    const held = await holdArea(player.dimension, spot.loc.x, spot.loc.y, spot.loc.z, (T.alcance ?? T.raio) + 2);
    return { ...spot, held };
  }
  if (spot.loc || !spot.far || o.front || o.at) return { ...spot, held: false };
  const T = TYPES[tipo];
  const dim = player.dimension;
  const reach = (T.alcance ?? T.raio) + 2;
  if (!(await holdArea(dim, spot.far.x, player.location.y, spot.far.z, reach))) {
    releaseArea(dim);
    spot.reasons.area_ticking = 1;
    return { ...spot, held: false };
  }
  const again = findSpot(player, tipo, { ...o, at: spot.far }, sites);
  if (!again.loc) releaseArea(dim);
  for (const [k, n] of Object.entries(spot.reasons)) again.reasons[k] = (again.reasons[k] || 0) + n;
  return { ...again, held: !!again.loc };
}

/**
 * Procura um terreno e gera uma estrutura perto do jogador.
 * @param {any} player
 * @param {{tipo?:string, front?:boolean, ignoreRules?:boolean, dist?:number}} o
 */
export async function tryGenerate(player, o = {}) {
  if (isBuilding()) {
    lastFail = "outra estrutura está sendo construída";
    return undefined;
  }
  const dim = player.dimension;
  if (dim.id !== "minecraft:overworld") {
    lastFail = "apenas no mundo da superfície";
    return undefined;
  }
  const sites = allSites();
  const tipo = chooseType(player, sites, o.tipo);
  if (!TYPES[tipo]) return undefined;
  const spot = await locate(player, tipo, o, sites);
  if (spot.loc && !isBuilding()) {
    let rec;
    try {
      rec = await createSite(dim, tipo, spot.loc, spot.rot);
    } finally {
      if (spot.held) releaseArea(dim);
    }
    if (rec) {
      lastFail = "";
      if (chronicleNeed(player, sites) === tipo) chronicleFails = 0;
      if (!o.front) announce(player, rec);
      return rec;
    }
    spot.reasons.construcao = 1;
  } else if (spot.held) {
    releaseArea(dim);
  }
  if (chronicleNeed(player, sites) === tipo) chronicleFails++;
  lastFail = `${TYPES[tipo].nome}: ` + (Object.entries(spot.reasons).map(([k, n]) => `${k} (${n})`).join(", ") || "sem terreno adequado");
  return undefined;
}

/** Um aviso discreto: o jogador sabe que algo surgiu e para que lado. */
function announce(player, rec) {
  try {
    if (!player.isValid) return;
    const dx = rec.x - player.location.x;
    const dz = rec.z - player.location.z;
    const dirs = ["a leste", "a sudeste", "ao sul", "a sudoeste", "a oeste", "a noroeste", "ao norte", "a nordeste"];
    const a = Math.round(((Math.atan2(dz, dx) * 180) / Math.PI + 360) % 360 / 45) % 8;
    const d = Math.round(Math.hypot(dx, dz));
    player.sendMessage(`§7Ao longe, ${dirs[a]} (~${d} blocos), algo chama sua atenção: §f${rec.nome}§7.`);
  } catch { /* */ }
}

export function startGeneration() {
  system.runInterval(() => {
    const cfg = getWorldCfg();
    const freq = cfg.estruturas ?? 1;
    if (freq <= 0 || isBuilding()) return;
    const players = world.getDimension("minecraft:overworld").getPlayers().filter(isActivePlayer);
    if (!players.length) return;
    const p = players[rr++ % players.length];
    const loc = p.location;
    if (loc.y < 45 || loc.y > 230) return;
    try {
      const top = p.dimension.getTopmostBlock({ x: Math.floor(loc.x), z: Math.floor(loc.z) });
      // no subterrâneo (copas de árvore por cima não contam)
      if (!top || (top.location.y - loc.y > 6 && !/leaves|_log|vine/.test(top.typeId))) return;
    } catch {
      return;
    }
    const sites = allSites();
    const lvl = getData(p).nivel;
    const first = (!sites.some((s) => s.tipo === "acampamento") && lvl >= 3) || (!sites.some((s) => s.tipo === "vila") && lvl >= 2) ||
      !!chronicleNeed(p, sites);
    // longe de qualquer local, o mundo "oferece" algo mais depressa; perto de vários, mais devagar
    const nd = nearestSiteDist(loc, p.dimension.id, sites);
    const base = nd > 320 ? 0.25 : nd > 180 ? 0.12 : 0.06;
    if (!first && Math.random() > base * freq) return;
    tryGenerate(p).catch((e) => console.warn(`[Valdoria] geração: ${e}`));
  }, 200);
}
