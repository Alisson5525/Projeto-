// Cálculo de atributos finais e estatísticas derivadas (com limites e retornos decrescentes), bônus temporários.
import { EquipmentSlot } from "@minecraft/server";
import { ATTRS, getData } from "../core/store.js";
import { clamp, equipment, heldItem, tick, NS } from "../core/util.js";
import { RACAS } from "../data/races.js";
import { CLASSES, SPECS } from "../data/classes.js";
import { SETS } from "../data/sets.js";
import { ITEM_DATA } from "../data/items_gen.js";

export const ELEMENTS = ["fire", "ice", "lightning", "arcane", "holy", "dark", "nature", "wind", "blood", "summon", "earth", "physical"];
export const ELEMENT_NAMES = {
  fire: "Fogo", ice: "Gelo", lightning: "Raio", arcane: "Arcano", holy: "Sagrado", dark: "Sombrio",
  nature: "Natureza", wind: "Vento", blood: "Sangue", summon: "Invocação", earth: "Terra", physical: "Físico",
};
const RES_KEYS = { fire: "rFire", ice: "rIce", lightning: "rLightning", arcane: "rArcane", holy: "rHoly", dark: "rDark",
  nature: "rNature", wind: "rWind", blood: "rBlood", earth: "rEarth", physical: "rPhys", summon: "rSummon" };

/** Retorno decrescente acima de 40 pontos. */
export const eff = (x) => (x <= 40 ? x : 40 + (x - 40) * 0.5);

const buffs = new Map(); // entityId -> Map(id -> {until, mods, name})
const cache = new Map(); // playerId -> {t, s}

export function addBuff(entity, id, ticks, mods = {}, name = "") {
  let m = buffs.get(entity.id);
  if (!m) buffs.set(entity.id, (m = new Map()));
  m.set(id, { until: tick() + ticks, mods, name });
  cache.delete(entity.id);
}
export function hasBuff(entity, id) {
  const b = buffs.get(entity.id)?.get(id);
  return !!b && b.until > tick();
}
export function removeBuff(entity, id) {
  buffs.get(entity.id)?.delete(id);
  cache.delete(entity.id);
}
export function activeBuffs(entity) {
  const m = buffs.get(entity.id);
  if (!m) return [];
  const now = tick();
  const out = [];
  for (const [id, b] of m) {
    if (b.until <= now) m.delete(id);
    else out.push({ id, ...b, left: b.until - now });
  }
  return out;
}
export function invalidate(entity) {
  cache.delete(entity.id);
}

export function itemData(item) {
  return item ? ITEM_DATA[item.typeId] : undefined;
}

function armorPieces(player) {
  const counts = {};
  let upgrades = 0;
  for (const slot of [EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet]) {
    const it = equipment(player, slot);
    const d = itemData(it);
    if (d && d.set) counts[d.set] = (counts[d.set] || 0) + 1;
    if (d) {
      try { upgrades += Number(it.getDynamicProperty(`${NS}:nivel`) || 0); } catch { /* */ }
    }
  }
  return { counts, upgrades };
}

/** @param {any} player */
export function computeStats(player) {
  const d = getData(player);
  const mods = {};
  const weap = {};
  const add = (m) => {
    if (!m) return;
    for (const k in m) mods[k] = (mods[k] || 0) + m[k];
  };
  const addW = (m) => {
    if (!m) return;
    for (const k in m) weap[k] = (weap[k] || 0) + m[k];
  };
  const race = d.raca ? RACAS[d.raca] : undefined;
  const cls = d.classe ? CLASSES[d.classe] : undefined;
  const spec = d.espec ? SPECS[d.espec] : undefined;
  add(race?.mods); add(cls?.mods); add(spec?.mods);
  addW(race?.armas); addW(cls?.armas); addW(spec?.armas);

  for (const slot of Object.keys(d.acess)) {
    const id = d.acess[slot];
    if (id && ITEM_DATA[id]) add(ITEM_DATA[id].mods);
  }
  const armor = armorPieces(player);
  const sets = armor.counts;
  if (armor.upgrades) mods.def = (mods.def || 0) + armor.upgrades;
  const setInfo = [];
  for (const k in sets) {
    const def = SETS[k];
    if (!def) continue;
    if (sets[k] >= 2) add(def.b2);
    if (sets[k] >= 4) add(def.b4);
    setInfo.push(`${def.nome} (${sets[k]}/4)`);
  }
  const held = heldItem(player);
  const hd = itemData(held);
  let caster;
  if (hd && hd.k === "caster") {
    caster = hd;
    for (const el of ELEMENTS) if (hd[el]) mods[el] = (mods[el] || 0) + hd[el];
    if (hd.heal) mods.heal = (mods.heal || 0) + hd.heal;
  }
  // bônus de aprimoramento do item em mãos (Mesa Rúnica)
  let upgrade = 0;
  try {
    upgrade = held ? Number(held.getDynamicProperty(`${NS}:nivel`) || 0) : 0;
  } catch {
    upgrade = 0;
  }
  for (const b of activeBuffs(player)) add(b.mods);

  const a = {};
  for (const k of ATTRS) {
    a[k] = Math.max(1, 5 + (race?.base?.[k] || 0) + (cls?.base?.[k] || 0) + d.attr[k] + (mods[k] || 0));
  }
  const E = (k) => eff(a[k]);
  const D = E("def") + (mods.defFlat || 0);
  const s = {
    attrs: a, mods, weap, sets: setInfo, caster, upgrade,
    melee: Math.max(0.3, 1 + 0.012 * E("str") + (mods.melee || 0)),
    ranged: Math.max(0.3, 1 + 0.012 * E("pre") + (mods.ranged || 0)),
    spell: Math.max(0.3, 1 + 0.015 * E("int") + (mods.spell || 0)) * (caster ? caster.power : 1),
    heal: Math.max(0.3, 1 + 0.01 * E("spi") + 0.004 * E("int") + (mods.heal || 0)),
    energyMax: Math.round(50 + 4 * E("spi") + E("int") + (mods.energyMax || 0)),
    energyRegen: (1.2 + 0.1 * E("spi")) * (1 + (mods.regen || 0)),
    crit: clamp(0.03 + 0.003 * E("pre") + 0.0015 * E("luk") + (mods.crit || 0), 0, 0.45),
    critDmg: 1.5 + 0.005 * E("luk") + (mods.critDmg || 0),
    dodge: clamp(0.0035 * E("agi") + (mods.dodge || 0), 0, 0.3),
    dr: clamp(0.55 * (D / (D + 60)) + (mods.dr || 0), -0.3, 0.65),
    hpLevels: clamp(Math.floor(E("vit") / 7) + (mods.hp || 0), 0, 12),
    lifesteal: clamp(mods.lifesteal || 0, 0, 0.35),
    xp: 1 + (mods.xp || 0) + 0.002 * E("luk"),
    luck: 0.004 * E("luk") + (mods.lootLuck || 0),
    spellCost: Math.max(0.4, 1 + (mods.spellCost || 0)) * (caster ? caster.cost : 1),
    castSpeed: caster ? caster.cast : 1,
    cdr: clamp(0.0025 * E("spi") + 0.0015 * E("agi") + (mods.cdr || 0), 0, 0.35),
    atkSpeed: clamp(0.004 * E("agi"), 0, 0.3),
    vsUndead: mods.vsUndead || 0,
    kbImmune: (mods.kbImmune || 0) > 0,
    fury: race?.nome === "Orc" ? 0.3 : 0,
    noSpells: (mods.noSpells || 0) > 0,
    dmgTaken: mods.dmgTaken || 0,
    elem: {}, res: {},
  };
  s.fury += mods.fury || 0;
  s.mdr = clamp(s.dr * 0.5 + (mods.mdr || 0), -0.3, 0.5);
  for (const el of ELEMENTS) {
    s.elem[el] = Math.max(0.2, 1 + (mods[el] || 0));
    s.res[el] = clamp(mods[RES_KEYS[el]] || 0, -1, 0.85);
  }
  return s;
}

/** Estatísticas em cache (recalculadas no máximo a cada 10 ticks ou após invalidação). */
/** @param {any} player */
export function stats(player) {
  const c = cache.get(player.id);
  const now = tick();
  if (c && now - c.t < 10) return c.s;
  const s = computeStats(player);
  cache.set(player.id, { t: now, s });
  return s;
}

export function energy(player) {
  return getData(player).energia;
}

/** Há energia suficiente? (sempre sim com "energia infinita" do Modo de Teste) */
export function hasEnergy(player, amount) {
  const d = getData(player);
  return !!d.cfg.energiaInfinita || d.energia >= amount;
}

export function spendEnergy(player, amount) {
  const d = getData(player);
  if (d.cfg.energiaInfinita) return true;
  if (d.energia < amount) return false;
  d.energia -= amount;
  return true;
}

export function addEnergy(player, amount) {
  const d = getData(player);
  d.energia = clamp(d.energia + amount, 0, stats(player).energyMax);
}
