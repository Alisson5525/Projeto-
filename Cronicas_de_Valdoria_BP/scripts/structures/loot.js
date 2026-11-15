// Saque dos baús das estruturas (por nível de tesouro), influenciado pela Sorte do jogador que abre o local.
import { ItemStack } from "@minecraft/server";
import { NS } from "../core/util.js";
import { ITEM_DATA } from "../data/items_gen.js";
import "../data/items_explore.js";
import { refreshLore } from "../items/equipment.js";

const I = (id) => (id.includes(":") ? id : `${NS}:${id}`);
/** @type {(k: string, filter?: (d: any) => boolean) => string[]} */
const byKind = (k, filter = (d) => !!d) => Object.entries(ITEM_DATA).filter(([, d]) => d.k === k && filter(d)).map(([id]) => id);

const WEAPONS_ACO = byKind("weapon", (d) => !d.el && d.r === "incomum");
const WEAPONS_MITHRIL = byKind("weapon", (d) => !d.el && d.r === "raro");
const WEAPONS_SPECIAL = byKind("weapon", (d) => !!d.el && d.r !== "mitico");
const CASTERS_GOOD = byKind("caster", (d) => ["raro", "epico"].includes(d.r));
const ACCESSORIES = byKind("accessory", (d) => d.r !== "mitico" && !d.exclusivo); // relíquias exclusivas só nas tabelas próprias
const RUNES = ["runa_fogo", "runa_gelo", "runa_trovao", "runa_luz", "runa_sombra"].map(I);
const WEAPONS_COMMON = byKind("weapon", (d) => !d.el && (d.r === "comum" || d.r === "incomum"));
const RANGED_GOOD = byKind("ranged", (d) => ["incomum", "raro"].includes(d.r));
const ARMOR_MID = byKind("armor", (d) => ["incomum", "raro"].includes(d.r));
const ARMOR_HIGH = byKind("armor", (d) => ["epico", "lendario"].includes(d.r));
const FRAG = I("fragmento_mapa");

/** Cada entrada: [id ou lista (sorteia um), mín, máx, chance] */
const TABLES = {
  goblin: [[I("moeda_ouro"), 3, 10, 0.9], ["minecraft:gold_nugget", 3, 9, 1], ["minecraft:bread", 1, 3, 0.6], ["minecraft:arrow", 4, 12, 0.5],
    [I("insignia_goblin"), 1, 3, 0.8], [I("lingote_aco"), 1, 2, 0.4], [I("pocao_energia"), 1, 1, 0.3], ["minecraft:leather", 1, 3, 0.5]],
  goblin_chefe: [[I("moeda_ouro"), 10, 25, 1], ["minecraft:gold_ingot", 2, 5, 1], [I("lingote_aco"), 2, 4, 1], [I("cristal_aetherita"), 1, 2, 0.7],
    [I("insignia_goblin"), 3, 6, 1], [RUNES, 1, 1, 0.3], [WEAPONS_ACO, 1, 1, 0.25], [WEAPONS_MITHRIL, 1, 1, 0.06],
    [I("pocao_energia"), 1, 3, 0.6], ["minecraft:emerald", 1, 3, 0.4]],
  torre: [[I("moeda_ouro"), 5, 15, 0.8], [I("essencia_arcana"), 1, 3, 1], [I("cristal_aetherita"), 1, 2, 0.6], [I("pocao_energia"), 1, 3, 0.7],
    ["minecraft:book", 1, 3, 0.6], ["minecraft:lapis_lazuli", 3, 9, 0.6], ["minecraft:experience_bottle", 2, 5, 0.5],
    [RUNES, 1, 1, 0.25], ["minecraft:amethyst_shard", 2, 6, 0.5]],
  torre_topo: [[I("moeda_ouro"), 15, 30, 1], [I("essencia_arcana"), 2, 4, 1], [I("cristal_aetherita"), 2, 4, 1], [CASTERS_GOOD, 1, 1, 0.35],
    [ACCESSORIES, 1, 1, 0.2], [RUNES, 1, 2, 0.6], [I("pedra_aprimoramento"), 1, 3, 0.6], ["minecraft:experience_bottle", 3, 8, 0.7]],
  cripta: [[I("moeda_ouro"), 5, 12, 0.8], ["minecraft:bone", 2, 6, 0.9], [I("lingote_aco"), 1, 3, 0.6], ["minecraft:gold_ingot", 1, 3, 0.5],
    [I("essencia_arcana"), 1, 2, 0.5], [I("ectoplasma"), 1, 2, 0.5], [I("pocao_energia"), 1, 2, 0.5], ["minecraft:candle", 1, 3, 0.4]],
  cripta_segredo: [[I("moeda_ouro"), 20, 40, 1], [I("lingote_mithril"), 2, 4, 1], [I("pedra_aprimoramento"), 2, 3, 1], [I("cristal_aetherita"), 2, 3, 0.8],
    [ACCESSORIES, 1, 1, 0.35], [WEAPONS_MITHRIL, 1, 1, 0.3], [WEAPONS_SPECIAL, 1, 1, 0.08], ["minecraft:diamond", 1, 2, 0.5]],
  cripta_tesouro: [[I("moeda_ouro"), 60, 120, 1], ["minecraft:diamond", 2, 4, 1], [I("lingote_mithril"), 4, 8, 1], [I("pedra_aprimoramento"), 3, 5, 1],
    [I("cristal_aetherita"), 2, 4, 1], [WEAPONS_SPECIAL, 1, 1, 0.25], [ACCESSORIES, 1, 1, 0.45], [CASTERS_GOOD, 1, 1, 0.25],
    [I("elixir_renascimento"), 1, 1, 0.08], ["minecraft:emerald", 3, 8, 0.8], ["minecraft:golden_apple", 1, 2, 0.6],
    [I("medalhao_purificado"), 1, 1, 0.08], [FRAG, 1, 1, 0.15]],
  ninho: [[I("moeda_ouro"), 10, 25, 1], ["minecraft:iron_ingot", 2, 5, 0.8], ["minecraft:gold_ingot", 2, 4, 0.7], [I("lingote_aco"), 2, 4, 0.7],
    [I("pocao_energia"), 1, 3, 0.6], ["minecraft:bone", 3, 8, 0.8], [WEAPONS_MITHRIL, 1, 1, 0.12]],
  ninho_tesouro: [[I("moeda_ouro"), 80, 160, 1], ["minecraft:gold_block", 1, 3, 0.8], ["minecraft:diamond", 2, 5, 1], [I("escama_dragao"), 2, 4, 1],
    [I("lingote_mithril"), 4, 8, 1], [I("pedra_aprimoramento"), 3, 6, 1], [I("runa_fogo"), 1, 2, 0.7], [WEAPONS_SPECIAL, 1, 1, 0.3],
    [ACCESSORIES, 1, 1, 0.45], [I("elixir_renascimento"), 1, 1, 0.1], ["minecraft:golden_apple", 1, 3, 0.7]],
  santuario: [[I("moeda_ouro"), 10, 25, 1], [I("essencia_arcana"), 1, 3, 0.8], [I("ectoplasma"), 1, 3, 0.6], ["minecraft:amethyst_shard", 2, 6, 0.6],
    [I("runa_sombra"), 1, 1, 0.4], [I("pocao_energia"), 1, 3, 0.6], [CASTERS_GOOD, 1, 1, 0.12]],
  santuario_tesouro: [[I("moeda_ouro"), 90, 170, 1], ["minecraft:diamond", 2, 5, 1], [I("veu_sombrio"), 2, 4, 1], [I("lingote_mithril"), 4, 8, 1],
    [I("pedra_aprimoramento"), 3, 6, 1], [I("cristal_aetherita"), 3, 5, 1], [I("runa_sombra"), 1, 2, 0.7], [CASTERS_GOOD, 1, 1, 0.4],
    [ACCESSORIES, 1, 1, 0.45], [I("elixir_renascimento"), 1, 1, 0.1], ["minecraft:emerald", 4, 9, 0.8]],
  ninho_grifo: [[I("pena_grifo"), 2, 5, 1], ["minecraft:feather", 3, 8, 0.9], ["minecraft:gold_nugget", 4, 12, 0.8], [I("moeda_ouro"), 6, 18, 1],
    ["minecraft:cooked_beef", 2, 5, 0.6], [I("redea_celeste"), 1, 1, 0.2], ["minecraft:emerald", 1, 3, 0.4], [I("pocao_energia"), 1, 2, 0.5]],
  kardum: [[I("moeda_ouro"), 12, 30, 1], ["minecraft:iron_ingot", 3, 7, 0.9], ["minecraft:gold_ingot", 2, 5, 0.8], [I("mithril_bruto"), 2, 5, 0.7],
    [I("engrenagem_runica"), 1, 3, 0.6], [I("pedra_aprimoramento"), 1, 2, 0.5], [I("pocao_energia"), 1, 3, 0.5], [WEAPONS_MITHRIL, 1, 1, 0.15],
    ["minecraft:cooked_beef", 2, 6, 0.5]],
  kardum_arquivo: [[I("moeda_ouro"), 20, 40, 1], [I("runa_trovao"), 1, 1, 0.6], [I("runa_fogo"), 1, 1, 0.5], [I("cristal_aetherita"), 1, 3, 0.8],
    [I("essencia_arcana"), 2, 4, 0.8], [I("engrenagem_runica"), 2, 4, 0.8], [ACCESSORIES, 1, 1, 0.3], ["minecraft:book", 2, 5, 0.7]],
  kardum_tesouro: [[I("moeda_ouro"), 70, 140, 1], ["minecraft:gold_block", 2, 4, 1], ["minecraft:diamond", 2, 5, 1], [I("lingote_mithril"), 5, 9, 1],
    [I("pedra_aprimoramento"), 3, 5, 1], [I("engrenagem_runica"), 3, 6, 1], [I("runa_trovao"), 1, 2, 0.6], [WEAPONS_SPECIAL, 1, 1, 0.3],
    [ACCESSORIES, 1, 1, 0.5], ["minecraft:netherite_scrap", 1, 2, 0.4], [I("elixir_renascimento"), 1, 1, 0.06],
    [I("amuleto_mineiro"), 1, 1, 0.15], [FRAG, 1, 1, 0.15]],
  aelthar_tesouro: [[I("moeda_ouro"), 80, 150, 1], [I("seiva_ancestral"), 2, 4, 1], ["minecraft:emerald", 4, 9, 1], [I("lingote_mithril"), 4, 8, 1],
    [I("pedra_aprimoramento"), 3, 5, 1], [I("essencia_natural"), 3, 6, 1], [I("amuleto_natureza"), 1, 1, 0.4], [WEAPONS_SPECIAL, 1, 1, 0.3],
    [ACCESSORIES, 1, 1, 0.5], ["minecraft:golden_apple", 1, 3, 0.7], [I("elixir_renascimento"), 1, 1, 0.06]],
  nyxhal_patio: [[I("moeda_ouro"), 20, 45, 1], [I("essencia_sombria"), 1, 3, 0.8], ["minecraft:iron_ingot", 2, 5, 0.8],
    [I("pocao_energia"), 1, 2, 0.6], [I("pedra_aprimoramento"), 1, 2, 0.5], ["minecraft:gold_ingot", 1, 3, 0.4], [I("lingote_mithril"), 1, 3, 0.3]],
  nyxhal_tesouro: [[I("moeda_ouro"), 120, 200, 1], [I("essencia_sombria"), 4, 8, 1], ["minecraft:netherite_scrap", 2, 4, 1],
    [I("lingote_mithril"), 5, 9, 1], [I("pedra_aprimoramento"), 4, 6, 1], [WEAPONS_SPECIAL, 1, 1, 0.4], [ACCESSORIES, 1, 1, 0.6],
    ["minecraft:enchanted_golden_apple", 1, 1, 0.3], [I("elixir_renascimento"), 1, 1, 0.1]],
  celeste_ilha: [[I("moeda_ouro"), 25, 50, 1], [I("pena_celeste"), 1, 3, 0.8], ["minecraft:golden_apple", 1, 2, 0.6], ["minecraft:quartz", 4, 10, 0.7],
    [I("pocao_energia"), 1, 2, 0.6], [I("pedra_aprimoramento"), 1, 2, 0.5], [I("runa_luz"), 1, 1, 0.4], [I("lingote_mithril"), 1, 3, 0.3]],
  celeste_tesouro: [[I("moeda_ouro"), 130, 220, 1], [I("pena_celeste"), 4, 8, 1], ["minecraft:diamond", 3, 6, 1], [I("lingote_mithril"), 5, 9, 1],
    [I("pedra_aprimoramento"), 4, 6, 1], [I("runa_luz"), 1, 3, 0.8], [WEAPONS_SPECIAL, 1, 1, 0.4], [ACCESSORIES, 1, 1, 0.6],
    ["minecraft:enchanted_golden_apple", 1, 1, 0.35], [I("elixir_renascimento"), 1, 1, 0.1]],
  // ---------------------------------------------------------------- Edição Definitiva: descobertas
  vigia: [[I("moeda_ouro"), 4, 10, 0.9], ["minecraft:arrow", 6, 16, 0.7], ["minecraft:bread", 2, 4, 0.7], ["minecraft:iron_ingot", 1, 3, 0.5],
    [I("pocao_energia"), 1, 2, 0.4], ["minecraft:torch", 4, 10, 0.6], [WEAPONS_COMMON, 1, 1, 0.12]],
  vigia_segredo: [[I("moeda_ouro"), 15, 30, 1], ["minecraft:gold_ingot", 2, 4, 0.8], [I("lingote_aco"), 1, 3, 0.7], [I("anel_vigia"), 1, 1, 0.3],
    [I("pedra_aprimoramento"), 1, 1, 0.4], ["minecraft:emerald", 1, 3, 0.5]],
  salteadores: [[I("moeda_ouro"), 6, 16, 1], ["minecraft:emerald", 1, 4, 0.6], ["minecraft:bread", 2, 5, 0.8], ["minecraft:leather", 2, 5, 0.6],
    ["minecraft:crossbow", 1, 1, 0.15], ["minecraft:arrow", 8, 20, 0.6], [I("lingote_aco"), 1, 2, 0.5], ["minecraft:saddle", 1, 1, 0.15],
    [I("pocao_energia"), 1, 2, 0.4]],
  salteadores_chefe: [[I("moeda_ouro"), 18, 35, 1], ["minecraft:gold_ingot", 2, 5, 1], ["minecraft:emerald", 2, 5, 0.8], [WEAPONS_COMMON, 1, 1, 0.35],
    [RANGED_GOOD, 1, 1, 0.15], [I("pedra_aprimoramento"), 1, 2, 0.5], [ARMOR_MID, 1, 1, 0.12]],
  cemiterio_tumulo: [[I("moeda_ouro"), 20, 40, 1], ["minecraft:gold_ingot", 2, 5, 1], [I("ectoplasma"), 1, 3, 0.8], [I("runa_luz"), 1, 1, 0.45],
    ["minecraft:golden_apple", 1, 1, 0.4], [ACCESSORIES, 1, 1, 0.1], ["minecraft:diamond", 1, 1, 0.25]],
  mina: [[I("moeda_ouro"), 6, 15, 0.8], ["minecraft:iron_ingot", 2, 6, 0.9], ["minecraft:coal", 4, 12, 0.8], [I("mithril_bruto"), 1, 3, 0.6],
    ["minecraft:iron_pickaxe", 1, 1, 0.2], ["minecraft:torch", 6, 14, 0.6], ["minecraft:rail", 4, 10, 0.4], [I("pocao_energia"), 1, 2, 0.4]],
  mina_segredo: [[I("mithril_bruto"), 4, 8, 1], [I("lingote_mithril"), 1, 3, 0.8], ["minecraft:diamond", 1, 3, 0.6], [I("amuleto_mineiro"), 1, 1, 0.35],
    [I("pedra_aprimoramento"), 1, 3, 0.8], ["minecraft:gold_ingot", 2, 6, 0.8], [FRAG, 1, 1, 0.1]],
  mina_capataz: [[I("moeda_ouro"), 25, 50, 1], [I("lingote_mithril"), 2, 4, 1], [I("engrenagem_runica"), 1, 3, 0.8], [WEAPONS_MITHRIL, 1, 1, 0.3],
    [ARMOR_MID, 1, 1, 0.2], [I("pedra_aprimoramento"), 2, 3, 0.8], ["minecraft:diamond_pickaxe", 1, 1, 0.12]],
  biblioteca: [[I("moeda_ouro"), 8, 18, 0.8], ["minecraft:book", 2, 6, 1], [I("essencia_arcana"), 1, 3, 0.9], ["minecraft:lapis_lazuli", 4, 10, 0.6],
    ["minecraft:experience_bottle", 2, 5, 0.6], [I("pocao_energia"), 1, 3, 0.5], [RUNES, 1, 1, 0.2]],
  biblioteca_arquivo: [[I("essencia_arcana"), 3, 6, 1], [I("cristal_aetherita"), 2, 4, 1], [I("anel_bibliotecario"), 1, 1, 0.4], [CASTERS_GOOD, 1, 1, 0.3],
    ["minecraft:experience_bottle", 4, 8, 1], [RUNES, 1, 2, 0.6], [FRAG, 1, 1, 0.12]],
  posto: [[I("moeda_ouro"), 6, 14, 0.9], ["minecraft:spyglass", 1, 1, 0.6], ["minecraft:arrow", 8, 20, 0.6], [I("mapa_explorador"), 1, 1, 0.25],
    [I("anel_vigia"), 1, 1, 0.15], ["minecraft:string", 3, 8, 0.6], [RANGED_GOOD, 1, 1, 0.12]],
  campo_batalha: [[I("moeda_ouro"), 12, 26, 1], ["minecraft:iron_ingot", 3, 7, 0.9], [WEAPONS_COMMON, 1, 1, 0.45], [WEAPONS_MITHRIL, 1, 1, 0.12],
    [ARMOR_MID, 1, 1, 0.25], ["minecraft:shield", 1, 1, 0.4], [I("pedra_aprimoramento"), 1, 2, 0.5], [FRAG, 1, 1, 0.08]],
  templo_segredo: [[I("tomo_perdido"), 1, 1, 0.5], [I("cristal_aetherita"), 2, 4, 1], [I("essencia_arcana"), 2, 5, 1], [CASTERS_GOOD, 1, 1, 0.3],
    [RUNES, 1, 2, 0.6], [FRAG, 1, 1, 0.25], ["minecraft:diamond", 1, 3, 0.5]],
  templo_cofre: [[I("moeda_ouro"), 60, 110, 1], [I("lingote_mithril"), 3, 6, 1], [I("pedra_aprimoramento"), 2, 4, 1], [I("engrenagem_runica"), 2, 4, 1],
    [WEAPONS_SPECIAL, 1, 1, 0.3], [ACCESSORIES, 1, 1, 0.4], [ARMOR_HIGH, 1, 1, 0.15], [FRAG, 1, 1, 0.35], ["minecraft:diamond", 2, 4, 0.8]],
  bosque: [[I("essencia_natural"), 3, 6, 1], [I("seiva_ancestral"), 1, 3, 0.8], [I("orvalho_lunar"), 1, 2, 0.6], ["minecraft:golden_apple", 1, 2, 0.6],
    [I("amuleto_natureza"), 1, 1, 0.2], [I("moeda_ouro"), 20, 40, 1], [FRAG, 1, 1, 0.2]],
  altar_purificado: [[I("moeda_ouro"), 40, 80, 1], [I("essencia_sombria"), 3, 6, 1], [I("runa_luz"), 1, 2, 0.8], [I("veu_sombrio"), 1, 2, 0.5],
    [WEAPONS_SPECIAL, 1, 1, 0.25], [ACCESSORIES, 1, 1, 0.35], [FRAG, 1, 1, 0.3], ["minecraft:diamond", 1, 3, 0.6]],
  cofre_reis: [[I("moeda_ouro"), 150, 260, 1], ["minecraft:gold_block", 3, 6, 1], ["minecraft:diamond", 4, 8, 1], [I("lingote_mithril"), 6, 10, 1],
    [I("pedra_aprimoramento"), 4, 7, 1], [WEAPONS_SPECIAL, 1, 1, 0.6], [ARMOR_HIGH, 1, 1, 0.45], [ACCESSORIES, 1, 1, 0.6],
    ["minecraft:enchanted_golden_apple", 1, 1, 0.4], [I("elixir_renascimento"), 1, 1, 0.15], ["minecraft:netherite_ingot", 1, 1, 0.25]],
  cofre_ossario: [[I("fragmento_alma"), 2, 4, 1], [I("ectoplasma"), 3, 6, 1], [I("tomo_perdido"), 1, 1, 0.6], [I("runa_sombra"), 1, 2, 0.8],
    ["minecraft:wither_skeleton_skull", 1, 1, 0.35], [I("moeda_ouro"), 40, 70, 1]],
  // recompensas de "exploração completa" (entregues direto ao jogador)
  completo_comum: [[I("moeda_ouro"), 5, 10, 1], [I("pocao_energia"), 1, 2, 0.7], [I("essencia_arcana"), 1, 1, 0.4], [I("pedra_aprimoramento"), 1, 1, 0.25]],
  completo_incomum: [[I("pedra_aprimoramento"), 1, 2, 1], [I("cristal_aetherita"), 1, 2, 0.8], [I("lingote_mithril"), 1, 2, 0.5], [ACCESSORIES, 1, 1, 0.1]],
  completo_raro: [[I("pedra_aprimoramento"), 2, 3, 1], [I("lingote_mithril"), 2, 4, 1], [I("tomo_perdido"), 1, 1, 0.35], [ACCESSORIES, 1, 1, 0.25],
    [WEAPONS_SPECIAL, 1, 1, 0.12]],
  completo_lendario: [[I("pedra_aprimoramento"), 4, 6, 1], [I("elixir_renascimento"), 1, 1, 0.5], [ARMOR_HIGH, 1, 1, 0.5], [WEAPONS_SPECIAL, 1, 1, 0.5]],
  // eventos do mundo
  enterrado: [[I("moeda_ouro"), 15, 40, 1], ["minecraft:gold_ingot", 2, 5, 0.9], ["minecraft:emerald", 2, 5, 0.7], ["minecraft:diamond", 1, 2, 0.35],
    [ACCESSORIES, 1, 1, 0.15], [FRAG, 1, 1, 0.35], [I("pedra_aprimoramento"), 1, 2, 0.5]],
  fera_rara: [[I("moeda_ouro"), 15, 30, 1], [I("pedra_aprimoramento"), 1, 2, 0.8], [I("cristal_aetherita"), 1, 2, 0.6], [FRAG, 1, 1, 0.3],
    [ACCESSORIES, 1, 1, 0.12]],
  caravana: [[I("moeda_ouro"), 20, 40, 1], ["minecraft:emerald", 2, 6, 1], [I("pocao_energia"), 1, 3, 0.8], [I("mapa_explorador"), 1, 1, 0.2],
    [I("lingote_aco"), 2, 4, 0.6]],
  fenda: [[I("essencia_sombria"), 2, 4, 1], [I("veu_sombrio"), 1, 1, 0.4], [I("moeda_ouro"), 15, 35, 1], [I("runa_sombra"), 1, 1, 0.4], [FRAG, 1, 1, 0.2]],
};
export const LOOT_TIERS = Object.keys(TABLES);

export function rollLoot(tier, luck = 0) {
  const out = [];
  for (const [id, min, max, ch] of TABLES[tier] || TABLES.goblin) {
    if (Math.random() > Math.min(1, ch * (1 + luck * 2))) continue;
    const pick = Array.isArray(id) ? id[Math.floor(Math.random() * id.length)] : id;
    if (!pick) continue;
    const n = min + Math.floor(Math.random() * (max - min + 1));
    const st = new ItemStack(pick, n);
    if (ITEM_DATA[pick]) refreshLore(st);
    out.push(st);
  }
  return out;
}

/** Preenche um baú já colocado no mundo. Itens extras (ex.: chave, pergaminho) vêm prontos. */
export function fillChest(dim, pos, tier, extras = [], luck = 0) {
  let block;
  try {
    block = dim.getBlock(pos);
  } catch {
    return false;
  }
  const inv = block?.getComponent("minecraft:inventory")?.container;
  if (!inv) return false;
  const items = rollLoot(tier, luck).concat(extras);
  const slots = [...Array(inv.size).keys()].sort(() => Math.random() - 0.5);
  items.forEach((it, i) => inv.setItem(slots[i % slots.length], it));
  return true;
}
