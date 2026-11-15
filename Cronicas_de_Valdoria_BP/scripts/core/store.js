// Persistência dos dados do personagem em propriedades dinâmicas (um JSON por jogador), com cache e gravação periódica.
import { system, world } from "@minecraft/server";
import { NS, TEST } from "./util.js";

const KEY = `${NS}:personagem`;
const VERSION = 1;
const cache = new Map();
const dirty = new Set();

export const ATTRS = ["str", "vit", "agi", "int", "spi", "def", "pre", "luk"];
export const ATTR_NAMES = {
  str: "Força", vit: "Vitalidade", agi: "Agilidade", int: "Inteligência",
  spi: "Espírito", def: "Defesa", pre: "Precisão", luk: "Sorte",
};
export const ATTR_DESC = {
  str: "Dano físico corpo a corpo.",
  vit: "Vida máxima (corações extras).",
  agi: "Esquiva, velocidade e mobilidade.",
  int: "Poder dos feitiços.",
  spi: "Energia máxima e regeneração.",
  def: "Redução de dano recebido.",
  pre: "Dano à distância e chance de crítico.",
  luk: "Saques raros e dano crítico.",
};

export function defaults() {
  return {
    v: VERSION,
    raca: null, classe: null, espec: null,
    nivel: 1, xp: 0, pontos: 0,
    attr: { str: 0, vit: 0, agi: 0, int: 0, spi: 0, def: 0, pre: 0, luk: 0 },
    energia: 60,
    magias: [], grimorio: [null, null, null, null], magiaSel: 0,
    habSel: 0,
    acess: { anel1: null, anel2: null, amuleto: null, reliquia: null },
    missoes: { ativas: {}, feitas: [] },
    historia: 0,
    desc: { biomas: [], itens: [] },
    abates: {},
    chefes: 0, mortes: 0,
    cfg: { hud: true },
    kit: false,
    flags: {},
    locais: [],
    lidos: [],
  };
}

function migrate(d) {
  const base = defaults();
  for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
  for (const a of ATTRS) if (d.attr[a] === undefined) d.attr[a] = 0;
  d.v = VERSION;
  return d;
}

/** @param {any} player */
export function getData(player) {
  let d = cache.get(player.id);
  if (!d) {
    try {
      const raw = player.getDynamicProperty(KEY);
      d = typeof raw === "string" ? migrate(JSON.parse(raw)) : defaults();
    } catch {
      d = defaults();
    }
    cache.set(player.id, d);
  }
  return d;
}

export function markDirty(player) {
  dirty.add(player.id);
}

export function saveNow(player) {
  const d = cache.get(player.id);
  if (!d) return;
  try {
    player.setDynamicProperty(KEY, JSON.stringify(d));
    dirty.delete(player.id);
  } catch (e) {
    console.warn(`[Valdoria] falha ao salvar ${player.name}: ${e}`);
  }
}

export function resetData(player, keepKit = true) {
  const old = getData(player);
  const d = defaults();
  d.kit = keepKit ? old.kit : false;
  d.missoes = old.missoes;
  d.historia = old.historia;
  d.desc = old.desc;
  d.abates = old.abates;
  d.chefes = old.chefes;
  cache.set(player.id, d);
  saveNow(player);
  return d;
}

export function forget(playerId) {
  cache.delete(playerId);
  dirty.delete(playerId);
}

export function startStore() {
  system.runInterval(() => {
    if (!dirty.size) return;
    for (const p of world.getAllPlayers()) if (dirty.has(p.id)) saveNow(p);
  }, 100);
  world.afterEvents.playerLeave.subscribe((ev) => forget(ev.playerId));
}

// ------------------------------------------------------------- configuração do mundo (operadores)
const WKEY = `${NS}:config_mundo`;
let worldCfg = null;
export function getWorldCfg() {
  if (!worldCfg) {
    try {
      const raw = world.getDynamicProperty(WKEY);
      worldCfg = typeof raw === "string" ? JSON.parse(raw) : null;
    } catch {
      worldCfg = null;
    }
    worldCfg = Object.assign({ xpMult: 1, pvp: false, spawnBoss: true, alvoCriativo: false }, worldCfg || {});
    TEST.creativeTarget = !!worldCfg.alvoCriativo;
  }
  return worldCfg;
}
export function setWorldCfg(cfg) {
  worldCfg = cfg;
  TEST.creativeTarget = !!cfg.alvoCriativo;
  world.setDynamicProperty(WKEY, JSON.stringify(cfg));
}
