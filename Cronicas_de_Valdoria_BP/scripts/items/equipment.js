// Equipamentos: descrição (lore) com raridade e atributos, descobertas, aprimoramentos, runas, desmontagem,
// acessórios, poção de energia e drops dos minérios do add-on.
import { world, system, ItemStack, EquipmentSlot } from "@minecraft/server";
import { V, ok, NS, inventory, countItem, takeItem, giveItem, chance, randInt, say, heldItem } from "../core/util.js";
import { particle, sound, psound } from "../core/fx.js";
import { getData, markDirty } from "../core/store.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { LORE } from "../data/lore.js";
import { SETS } from "../data/sets.js";
import { addXP } from "../rpg/progression.js";
import { addEnergy, invalidate, stats } from "../rpg/stats.js";
import { RUNE_ELEMENT, HEAVY, STYLE } from "../combat/weapons.js";
import { ABILITIES } from "../abilities/registry.js";
import { RANGED_STYLE } from "../combat/archery.js";
import { ELEMENT_NAMES } from "../rpg/stats.js";

export const RARITY = {
  comum: ["§f", "Comum", 1], incomum: ["§a", "Incomum", 2], raro: ["§9", "Raro", 3], epico: ["§d", "Épico", 4],
  lendario: ["§6", "Lendário", 5], mitico: ["§c", "Mítico", 6], divino: ["§e", "Divino", 7],
};
const LORE_V = 6;
const MAX_UPGRADE = { comum: 3, incomum: 4, raro: 5, epico: 5, lendario: 6, mitico: 7, divino: 7 };
const MOD_NAMES = {
  str: "Força", vit: "Vitalidade", agi: "Agilidade", int: "Inteligência", spi: "Espírito", def: "Defesa", pre: "Precisão",
  luk: "Sorte", energyMax: "Energia máx.", heal: "Cura", lifesteal: "Roubo de vida", ranged: "Dano à distância", xp: "Experiência",
  fire: "Dano de fogo", ice: "Dano de gelo", lightning: "Dano de raio", arcane: "Dano arcano", holy: "Dano sagrado",
  dark: "Dano sombrio", nature: "Dano natural", wind: "Dano de vento", blood: "Dano de sangue", summon: "Invocações",
  rFire: "Resist. fogo", rIce: "Resist. gelo", rDark: "Resist. sombra", rPhys: "Resist. física", kbImmune: "Imune a repulsão",
  rEarth: "Resist. terra", rLightning: "Resist. raio", rHoly: "Resist. sagrada", rNature: "Resist. natureza",
  crit: "Chance de crítico", critDmg: "Dano crítico", dodge: "Esquiva", cdr: "Redução de recarga", regen: "Regeneração de energia",
  lootLuck: "Sorte nos saques", spellCost: "Custo dos feitiços", vsUndead: "Dano contra mortos-vivos", melee: "Dano corpo a corpo",
  dr: "Redução de dano", hp: "Corações extras",
};
const LOWER_IS_BETTER = new Set(["spellCost", "dmgTaken"]);

function fmtMod(k, v) {
  const name = MOD_NAMES[k] || k;
  if (k === "kbImmune") return `§a${name}`;
  const pctKey = !["str", "vit", "agi", "int", "spi", "def", "pre", "luk", "energyMax"].includes(k);
  const val = pctKey ? `${v > 0 ? "+" : ""}${Math.round(v * 100)}%` : `${v > 0 ? "+" : ""}${v}`;
  const good = LOWER_IS_BETTER.has(k) ? v < 0 : v > 0;
  return `${good ? "§a" : "§c"}${val} §7${name}`;
}

export function getUpgrade(item) {
  try { return Number(item.getDynamicProperty(`${NS}:nivel`) || 0); } catch { return 0; }
}
export function getRune(item) {
  try {
    const r = item.getDynamicProperty(`${NS}:runa`);
    return typeof r === "string" ? r : undefined;
  } catch { return undefined; }
}

export function buildLore(item) {
  const d = ITEM_DATA[item.typeId];
  if (!d) return [];
  const [color, rname] = RARITY[d.r] || RARITY.comum;
  const up = getUpgrade(item);
  const lines = [`${color}${rname}${up ? ` §f+${up}` : ""}`];
  if (d.k === "scroll") {
    let lid;
    try { lid = item.getDynamicProperty(`${NS}:lore`); } catch { /* */ }
    if (typeof lid === "string" && LORE[lid]) lines.push(`§f${LORE[lid].titulo}`);
  }
  if (d.k === "weapon") {
    const tname = { adaga: "Adaga", espada_curta: "Espada curta", espada_longa: "Espada longa", espada_grande: "Espada grande (duas mãos)",
      katana: "Katana", lanca: "Lança", machado_guerra: "Machado de guerra", martelo_guerra: "Martelo de guerra", maca: "Maça",
      alabarda: "Alabarda", foice: "Foice" }[d.type];
    lines.push(`§7${tname} · Dano §f${d.dmg}${up ? ` §a(+${up * 6}%)` : ""}`);
    lines.push(`§7Velocidade: §f${(20 / d.spd).toFixed(1)} golpes/s`);
    if (STYLE[d.type]) lines.push(`§bEstilo: §f${STYLE[d.type].nome} §7- ${STYLE[d.type].desc}`);
    lines.push(`§eUsar: §f${HEAVY[d.type]?.nome || "Ataque carregado"}`);
    if (d.skill) {
      const sid = { julgamento: "julgamento_aurora", passo_sombrio: "passo_umbral", sopro_dragao: "sopro_garra" }[d.skill] || d.skill;
      lines.push(`§dAgachar + usar: §f${ABILITIES[sid]?.nome || d.skill}`);
    }
    const rune = d.el || getRune(item);
    if (rune && rune !== "physical") lines.push(`§6Elemento: §f${ELEMENT_NAMES[rune] || rune}`);
  } else if (d.k === "ranged") {
    lines.push(`§7${d.type === "besta" ? "Besta" : "Arco"} · Dano §f${d.dmg} §7(puxado até o fim)`);
    lines.push(`§7${d.type === "besta" ? "Engatilhar" : "Puxar"}: §f${d.tempo.toFixed(1)} s §7· Munição: flechas`);
    if (d.el && d.el !== "physical") lines.push(`§6Elemento: §f${ELEMENT_NAMES[d.el] || d.el}`);
    lines.push("§7Bônus: Dano à distância (Precisão) e classe Arqueiro");
    lines.push(`§bEstilo: §f${RANGED_STYLE[d.type === "besta" ? "besta" : "arco"]}`);
  } else if (d.k === "caster") {
    lines.push(`§7Poder mágico §f×${d.power} §7· Custo §f×${d.cost}`);
    for (const el of Object.keys(ELEMENT_NAMES)) if (d[el]) lines.push(`§a+${Math.round(d[el] * 100)}% §7${ELEMENT_NAMES[el]}`);
    if (d.heal) lines.push(`§a+${Math.round(d.heal * 100)}% §7Cura`);
    if (d.combo) lines.push("§dPermite feitiços combinados");
    lines.push("§eUsar: §ffeitiço selecionado §7· §eAgachar+usar: §ftrocar");
  } else if (d.k === "armor") {
    lines.push(`§7Proteção §f${d.prot}${up ? ` §a(+${up} Defesa)` : ""}`);
    const set = SETS[d.set];
    if (set) lines.push(`§6Conjunto ${set.nome}`, `§7${set.texto}`);
  } else if (d.k === "accessory") {
    lines.push(`§7Acessório (${{ anel: "Anel", amuleto: "Amuleto", reliquia: "Relíquia" }[d.slot]}) - equipe pelo Diário`);
    for (const [k, v] of Object.entries(d.mods)) lines.push(fmtMod(k, v));
    if (d.exclusivo) lines.push("§6Relíquia de exploração §7(não fabricável)");
  }
  if (d.origem) lines.push(`§8Onde obter: ${d.origem}`);
  if (d.d) lines.push(`§o§8${d.d}`);
  return wrapLore(lines);
}

/** Quebra linhas em até 50 caracteres (limite da API), mantendo a cor na continuação; máximo de 20 linhas. */
export function wrapLore(lines, max = 50) {
  const out = [];
  for (const line of lines) {
    if (line.length <= max) {
      out.push(line);
      continue;
    }
    const codes = line.match(/^(§.)+/);
    const prefix = codes ? codes[0] : "";
    let cur = "";
    for (const word of line.split(" ")) {
      const candidate = cur ? `${cur} ${word}` : word;
      if (candidate.length > max && cur) {
        out.push(cur);
        const last = (cur.match(/§[0-9a-fk-or]/g) || []).filter((c) => c !== "§o" && c !== "§l").pop() || prefix.slice(-2);
        cur = `${prefix.includes("§o") ? "§o" : ""}${last}${word}`;
      } else cur = candidate;
      while (cur.length > max) {
        out.push(cur.slice(0, max));
        cur = cur.slice(max);
      }
    }
    if (cur) out.push(cur);
  }
  return out.slice(0, 20);
}

export function refreshLore(item) {
  const d = ITEM_DATA[item.typeId];
  if (!d || item.maxAmount > 1) return false;
  try {
    const v = item.getDynamicProperty(`${NS}:lore_v`);
    if (v === LORE_V) return false;
    item.setLore(buildLore(item));
    item.setDynamicProperty(`${NS}:lore_v`, LORE_V);
    return true;
  } catch {
    return false;
  }
}

/** Lore padrão do item com linhas extras no fim (a varredura do inventário não a sobrescreve). */
export function loreWith(item, extra) {
  try {
    item.setLore(buildLore(item).concat(extra).slice(0, 20));
    item.setDynamicProperty(`${NS}:lore_v`, LORE_V);
  } catch { /* */ }
}

function forceLore(item) {
  try {
    item.setLore(buildLore(item));
    item.setDynamicProperty(`${NS}:lore_v`, LORE_V);
  } catch { /* */ }
}

// ------------------------------------------------------------------ varredura do inventário: lore + descobertas
function scanInventory(player) {
  const inv = inventory(player);
  if (!inv) return;
  const d = getData(player);
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    if (!it || !it.typeId.startsWith(`${NS}:`)) continue;
    if (refreshLore(it)) inv.setItem(i, it);
    if (!d.desc.itens.includes(it.typeId) && ITEM_DATA[it.typeId]) {
      d.desc.itens.push(it.typeId);
      markDirty(player);
      const info = ITEM_DATA[it.typeId];
      const [color, , tier] = RARITY[info.r] || RARITY.comum;
      say(player, `§7Novo item descoberto: ${color}${info.n}`);
      addXP(player, 10 * tier * tier, "descoberta");
    }
  }
}

// ------------------------------------------------------------------ Mesa Rúnica: aprimorar, runas, desmontar
export function upgradeCost(item) {
  const lvl = getUpgrade(item);
  return { pedra: lvl + 1, mithril: lvl >= 2 ? lvl - 1 : 0, cristal: lvl >= 4 ? 1 : 0, chance: lvl < 3 ? 1 : lvl < 5 ? 0.75 : 0.5 };
}

export function maxUpgrade(item) {
  const d = ITEM_DATA[item.typeId];
  return d ? MAX_UPGRADE[d.r] ?? 3 : 0;
}

/** Aprimora o item em mãos. Retorna mensagem. */
export function upgradeHeld(player) {
  const inv = inventory(player);
  const slot = player.selectedSlotIndex;
  const item = inv?.getItem(slot);
  const d = item && ITEM_DATA[item.typeId];
  if (!d || !["weapon", "armor", "caster"].includes(d.k)) return "§cSegure uma arma, armadura ou conjurador do add-on.";
  const lvl = getUpgrade(item);
  if (lvl >= maxUpgrade(item)) return `§eEste item já está no aprimoramento máximo (+${lvl}).`;
  const c = upgradeCost(item);
  if (countItem(player, `${NS}:pedra_aprimoramento`) < c.pedra || countItem(player, `${NS}:lingote_mithril`) < c.mithril ||
    countItem(player, `${NS}:cristal_aetherita`) < c.cristal) {
    return `§cMateriais insuficientes: ${c.pedra} Pedra de Aprimoramento${c.mithril ? `, ${c.mithril} Lingote de Mithril` : ""}${c.cristal ? ", 1 Cristal de Aetherita" : ""}.`;
  }
  takeItem(player, `${NS}:pedra_aprimoramento`, c.pedra);
  if (c.mithril) takeItem(player, `${NS}:lingote_mithril`, c.mithril);
  if (c.cristal) takeItem(player, `${NS}:cristal_aetherita`, c.cristal);
  const fresh = inv.getItem(slot);
  if (!fresh || fresh.typeId !== item.typeId) return "§cO item saiu da sua mão.";
  if (Math.random() > c.chance) {
    sound(player.dimension, "random.anvil_break", player.location, 1, 0.8);
    return `§cO aprimoramento falhou! Os materiais foram consumidos, mas o item está intacto (+${lvl}).`;
  }
  fresh.setDynamicProperty(`${NS}:nivel`, lvl + 1);
  forceLore(fresh);
  inv.setItem(slot, fresh);
  invalidate(player);
  particle(player.dimension, "nivel_anel", V.up(player.location, 0.2));
  sound(player.dimension, "random.anvil_use", player.location, 1.2, 1);
  addXP(player, 30 * (lvl + 1), "aprimoramento");
  return `§aSucesso! ${ITEM_DATA[item.typeId].n} agora é §f+${lvl + 1}§a.`;
}

export function applyRune(player, runeId) {
  const inv = inventory(player);
  const slot = player.selectedSlotIndex;
  const item = inv?.getItem(slot);
  const d = item && ITEM_DATA[item.typeId];
  if (!d || d.k !== "weapon") return "§cSegure uma arma corpo a corpo do add-on.";
  if (d.el) return "§cArmas especiais já possuem um elemento próprio.";
  if (!takeItem(player, runeId, 1)) return "§cVocê não possui essa runa.";
  const fresh = inv.getItem(slot);
  fresh.setDynamicProperty(`${NS}:runa`, RUNE_ELEMENT[runeId]);
  forceLore(fresh);
  inv.setItem(slot, fresh);
  particle(player.dimension, "cor_circulo_magico", player.location, { color: RUNE_ELEMENT[runeId], radius: 1.2 });
  sound(player.dimension, "block.enchanting_table.use", player.location, 1, 1);
  return `§aRuna aplicada: elemento ${ELEMENT_NAMES[RUNE_ELEMENT[runeId]]}.`;
}

export function disassembleHeld(player) {
  const inv = inventory(player);
  const slot = player.selectedSlotIndex;
  const item = inv?.getItem(slot);
  const d = item && ITEM_DATA[item.typeId];
  if (!d || !["weapon", "armor", "caster"].includes(d.k)) return "§cSegure um equipamento do add-on.";
  const lvl = getUpgrade(item);
  const mat = item.typeId.includes("mithril") || ["epico", "lendario", "mitico"].includes(d.r) ? `${NS}:lingote_mithril` : `${NS}:lingote_aco`;
  inv.setItem(slot, undefined);
  giveItem(player, new ItemStack(mat, randInt(1, 2)));
  if (lvl > 0) giveItem(player, new ItemStack(`${NS}:pedra_aprimoramento`, lvl));
  if (["epico", "lendario", "mitico"].includes(d.r)) giveItem(player, new ItemStack(`${NS}:cristal_aetherita`, 1));
  sound(player.dimension, "random.break", player.location, 0.8, 1);
  return "§eEquipamento desmontado em materiais.";
}

// ------------------------------------------------------------------ acessórios
export const ACC_SLOTS = { anel1: "anel", anel2: "anel", amuleto: "amuleto", reliquia: "reliquia" };
export const ACC_SLOT_NAMES = { anel1: "Anel I", anel2: "Anel II", amuleto: "Amuleto", reliquia: "Relíquia" };

export function equipAccessory(player, slot, typeId) {
  const d = getData(player);
  const info = ITEM_DATA[typeId];
  if (!info || info.k !== "accessory" || ACC_SLOTS[slot] !== info.slot) return "§cEste acessório não cabe nesse espaço.";
  if (!takeItem(player, typeId, 1)) return "§cItem não encontrado no inventário.";
  if (d.acess[slot]) giveItem(player, new ItemStack(d.acess[slot], 1));
  d.acess[slot] = typeId;
  markDirty(player);
  invalidate(player);
  psound(player, "armor.equip_gold", 1, 1);
  return `§aEquipado: ${info.n}`;
}

export function unequipAccessory(player, slot) {
  const d = getData(player);
  const id = d.acess[slot];
  if (!id) return "§7Espaço vazio.";
  d.acess[slot] = null;
  giveItem(player, new ItemStack(id, 1));
  markDirty(player);
  invalidate(player);
  return `§eRemovido: ${ITEM_DATA[id]?.n || id}`;
}

// ------------------------------------------------------------------ minérios
const ORE_DROPS = {
  [`${NS}:minerio_mithril`]: { item: `${NS}:mithril_bruto`, min: 1, max: 1, xp: 14, orbs: 3 },
  [`${NS}:minerio_aetherita`]: { item: `${NS}:cristal_aetherita`, min: 1, max: 2, xp: 20, orbs: 5 },
};
const VANILLA_ORES = {
  coal: ["minecraft:coal", 3], iron: ["minecraft:raw_iron", 5], copper: ["minecraft:raw_copper", 3], gold: ["minecraft:raw_gold", 7],
  diamond: ["minecraft:diamond", 16], emerald: ["minecraft:emerald", 16], lapis: ["minecraft:lapis_lazuli", 6],
  redstone: ["minecraft:redstone", 4], quartz: ["minecraft:quartz", 4], ancient_debris: ["minecraft:ancient_debris", 30],
};

function onBreak(ev) {
  const p = ev.player;
  const id = ev.brokenBlockPermutation.type.id;
  const tool = ev.itemStackBeforeBreak;
  const isPick = !!tool && tool.hasTag("minecraft:is_pickaxe");
  const loc = V.add(ev.block.location, { x: 0.5, y: 0.3, z: 0.5 });
  const custom = ORE_DROPS[id];
  const dwarf = getData(p).raca === "anao";
  if (custom) {
    if (!isPick) return;
    let silk = false;
    let fortune = 0;
    try {
      const en = tool.getComponent("minecraft:enchantable");
      silk = !!en?.getEnchantment("silk_touch");
      fortune = en?.getEnchantment("fortune")?.level || 0;
    } catch { /* */ }
    if (silk) {
      p.dimension.spawnItem(new ItemStack(id, 1), loc);
      return;
    }
    let n = randInt(custom.min, custom.max) + (fortune ? randInt(0, fortune) : 0);
    if (dwarf && chance(0.25)) n++;
    p.dimension.spawnItem(new ItemStack(custom.item, n), loc);
    for (let i = 0; i < custom.orbs; i++) p.dimension.spawnEntity("minecraft:xp_orb", loc);
    addXP(p, custom.xp, "mineração");
    return;
  }
  if (!id.includes("_ore") && id !== "minecraft:ancient_debris") return;
  const key = Object.keys(VANILLA_ORES).find((k) => id.includes(k));
  if (!key || !isPick) return;
  const [drop, xp] = VANILLA_ORES[key];
  addXP(p, xp, "mineração");
  if (dwarf && chance(0.25) && key !== "ancient_debris") {
    p.dimension.spawnItem(new ItemStack(drop, 1), loc);
    particle(p.dimension, "cor_ponto", loc, { color: "gold" });
  }
}

export function startEquipment() {
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      try { scanInventory(p); } catch (e) { console.warn(`[Valdoria] inventário: ${e}`); }
    }
  }, 40);
  world.afterEvents.playerBreakBlock.subscribe((ev) => {
    try { onBreak(ev); } catch (e) { console.warn(`[Valdoria] mineração: ${e}`); }
  });
  world.afterEvents.itemCompleteUse.subscribe((ev) => {
    if (ev.itemStack?.typeId === `${NS}:pocao_energia`) {
      addEnergy(ev.source, 60);
      particle(ev.source.dimension, "cor_explosao", V.up(ev.source.location, 1), { color: "ice", radius: 0.6 });
      psound(ev.source, "random.orb", 1.4, 0.6);
    }
  });
}

export { EquipmentSlot, heldItem, stats, ok };
