// Guilda dos Aventureiros: inscrição, contratos diários (caçada, entrega e exploração), patentes e recompensas por patente.
import { ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { NS, isPlayer, say, countItem, takeItem, giveItem } from "../core/util.js";
import { psound, particle } from "../core/fx.js";
import { markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { onKill } from "../core/damage.js";
import { summonOwner } from "../abilities/engine.js";
import { onQuestEvent } from "../quests/quests.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { rng } from "../structures/builder.js";
import { show, npcData, addCoins, spendCoins, addRep, guildRank, today, coins, buyMenu, sellMenu } from "./economy.js";
import { GUILD_RANKS } from "./roles.js";

const I = (id) => `${NS}:${id}`;
const UNDEAD = ["minecraft:zombie", "minecraft:skeleton", "minecraft:husk", "minecraft:stray", "minecraft:drowned", "minecraft:zombie_villager",
  "minecraft:bogged"];
export const JOIN_FEE = 50;
const MAX_ACTIVE = 2;

const HUNTS = [
  ["Caça aos Goblins", [I("goblin"), I("goblin_xama"), I("chefe_goblin")], 6, 12, 5],
  ["Ossos Inquietos", UNDEAD, 8, 16, 4],
  ["Praga de Aranhas", ["minecraft:spider", "minecraft:cave_spider"], 5, 10, 5],
  ["Creepers na Estrada", ["minecraft:creeper"], 3, 6, 9],
  ["Espectros da Noite", [I("espectro")], 3, 5, 12],
  ["Bruxas e Xamãs", [I("goblin_xama"), "minecraft:witch"], 2, 4, 15],
];
const DELIVERIES = [
  ["minecraft:iron_ingot", 6, 12, 4], ["minecraft:leather", 6, 12, 3], [I("insignia_goblin"), 4, 8, 5], [I("ectoplasma"), 2, 5, 9],
  ["minecraft:wheat", 16, 32, 1], [I("mithril_bruto"), 3, 6, 9], [I("cristal_aetherita"), 2, 3, 22], ["minecraft:string", 8, 16, 2],
];
const EXPLORES = [
  ["Batedor", "descobrir", "*", "Descubra um local que você ainda não conhece", 60],
  ["Pacificar Acampamento", "limpar", "acampamento", "Liberte um Acampamento Goblin", 90],
  ["Exorcismo", "limpar", "torre", "Liberte uma Torre do Mago em Ruínas", 110],
  ["Juramento Quebrado", "limpar", "kardum", "Liberte as Ruínas de Kar'Dum (derrote o Rei Durgan)", 260],
];

function itemName(id) {
  return ITEM_DATA[id]?.n || id.replace("minecraft:", "").replace(/_/g, " ");
}

/** Três ofertas do dia, iguais para o mesmo jogador durante o dia inteiro. */
function offers(player) {
  const d = npcData(player);
  const g = d.npc.guilda;
  if (g.dia === today() && g.ofertas.length) return g.ofertas;
  const seed = today() * 7919 + [...player.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = rng(seed);
  const lvl = d.nivel;
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const out = [];
  const [hn, alvos, a, b, w] = pick(HUNTS);
  const nh = a + Math.floor(r() * (b - a + 1));
  out.push({ id: `c${today()}a`, tipo: "abate", nome: hn, alvos, n: nh, desc: `Derrote ${nh} criaturas`,
    moedas: Math.round(nh * w * (1 + lvl / 30)), pontos: 10 + Math.round(nh * w / 6), xp: 60 + nh * 10 });
  const [item, da, db, dw] = pick(DELIVERIES);
  const nd = da + Math.floor(r() * (db - da + 1));
  out.push({ id: `c${today()}b`, tipo: "entregar", nome: `Encomenda: ${itemName(item)}`, item, n: nd, desc: `Entregue ${nd}× ${itemName(item)}`,
    moedas: Math.round(nd * dw * 1.4), pontos: 8 + Math.round(nd * dw / 8), xp: 40 + nd * 5 });
  const [en, ev, alvo, desc, ew] = pick(EXPLORES);
  out.push({ id: `c${today()}c`, tipo: "evento", nome: en, ev, alvo, n: 1, desc, moedas: Math.round(ew * (1 + lvl / 30)), pontos: 25, xp: 200 });
  g.dia = today();
  g.ofertas = out;
  markDirty(player);
  return out;
}

function contractProgress(player, c) {
  if (c.tipo === "entregar") return Math.min(countItem(player, c.item), c.n);
  return Math.min(c.p || 0, c.n);
}

export function guildLines(player) {
  const g = npcData(player).npc.guilda;
  return g.ativas.map((c) => `§b${c.nome} §8(Guilda)\n§7${c.desc} §f(${contractProgress(player, c)}/${c.n})`);
}

async function rankUp(player, before) {
  const g = npcData(player).npc.guilda;
  const now = guildRank(g.pontos);
  if (now.idx <= before) return;
  /** @type {any[]} */
  const rewards = [[], [[I("pedra_aprimoramento"), 2]], [[I("cristal_aetherita"), 2]], [[I("lingote_mithril"), 4]], [[I("amuleto_fortuna"), 1]]][now.idx];
  for (const [id, n] of rewards) giveItem(player, new ItemStack(id, n));
  player.onScreenDisplay.setTitle(`${now.cor}Patente ${now.nome}`, { subtitle: "§7Guilda dos Aventureiros", fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15 });
  psound(player, "random.levelup", 1, 1);
  say(player, `§6[Guilda] §fVocê agora é ${now.cor}${now.nome}§f.${rewards.length ? " Presente da guilda entregue." : ""}`);
}

async function contractMenu(player, back) {
  const d = npcData(player);
  const g = d.npc.guilda;
  const list = offers(player);
  const f = new ActionFormData().title("Contratos da Guilda").body(`§7Ativos: ${g.ativas.length}/${MAX_ACTIVE}. Novas ofertas a cada amanhecer.`);
  const acts = [];
  for (const c of g.ativas) {
    const p = contractProgress(player, c);
    f.button(`${p >= c.n ? "§a§lEntregar: " : "§e"}${c.nome}§r\n§7${c.desc} (${p}/${c.n})`);
    acts.push(() => turnIn(player, c, back));
  }
  for (const c of list) {
    if (g.ativas.some((a) => a.id === c.id) || (g.feitosHoje || []).includes(c.id)) continue;
    f.button(`§2${c.nome}\n§7${c.moedas} moedas · ${c.pontos} pontos`);
    acts.push(() => offerContract(player, c, back));
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= acts.length) return guildMenu(player, back);
  return acts[r.selection]();
}

async function offerContract(player, c, back) {
  const g = npcData(player).npc.guilda;
  const m = new MessageFormData().title(c.nome).body(`§f${c.desc}.\n\n§6Recompensa: §f${c.moedas} moedas, ${c.pontos} pontos de guilda, ${c.xp} XP`)
    .button1("§lAceitar").button2("Voltar");
  const k = await show(player, m);
  if (!k.canceled && k.selection === 0) {
    if (g.ativas.length >= MAX_ACTIVE) say(player, `§cMáximo de ${MAX_ACTIVE} contratos da guilda ao mesmo tempo.`);
    else {
      g.ativas.push({ ...c, p: 0 });
      markDirty(player);
      say(player, `§b[Guilda] §fContrato aceito: ${c.nome}`);
    }
  }
  return contractMenu(player, back);
}

async function turnIn(player, c, back) {
  const g = npcData(player).npc.guilda;
  if (contractProgress(player, c) < c.n) {
    const m = new MessageFormData().title(c.nome).body(`§7${c.desc}.\n§fProgresso: ${contractProgress(player, c)}/${c.n}`).button1("Voltar").button2("§cDesistir");
    const k = await show(player, m);
    if (!k.canceled && k.selection === 1) {
      g.ativas = g.ativas.filter((a) => a.id !== c.id);
      markDirty(player);
    }
    return contractMenu(player, back);
  }
  if (c.tipo === "entregar" && !takeItem(player, c.item, c.n)) return contractMenu(player, back);
  const before = guildRank(g.pontos).idx;
  g.ativas = g.ativas.filter((a) => a.id !== c.id);
  g.feitosHoje = (g.dia === today() ? g.feitosHoje || [] : []).concat([c.id]);
  g.pontos += c.pontos;
  g.feitos = (g.feitos || 0) + 1;
  markDirty(player);
  addCoins(player, c.moedas, "contrato");
  addXP(player, c.xp, "guilda");
  addRep(player, 5);
  particle(player.dimension, "nivel_anel", player.location);
  say(player, `§b[Guilda] §fContrato concluído: ${c.nome}. §7+${c.pontos} pontos (${g.pontos}).`);
  await rankUp(player, before);
  saveNow(player);
  return contractMenu(player, back);
}

export async function guildMenu(player, back) {
  const d = npcData(player);
  const g = d.npc.guilda;
  if (!g.membro) {
    const m = new MessageFormData().title("Guilda dos Aventureiros")
      .body(`§fA Guilda oferece contratos diários, patentes e um arsenal exclusivo para membros.\n\n§7Taxa de inscrição: §e${JOIN_FEE} moedas §7(você tem ${coins(player)}).`)
      .button1("§lInscrever-se").button2("Voltar");
    const k = await show(player, m);
    if (k.canceled || k.selection !== 0) return back && back(player);
    if (!spendCoins(player, JOIN_FEE)) {
      say(player, `§cVocê precisa de ${JOIN_FEE} moedas.`);
      return back && back(player);
    }
    g.membro = true;
    markDirty(player);
    say(player, "§b[Guilda] §fBem-vindo à Guilda dos Aventureiros! Patente: §6Cobre§f.");
    psound(player, "random.levelup", 1.2, 1);
    saveNow(player);
  }
  const rk = guildRank(g.pontos);
  const next = rk.prox ? `${rk.prox[0]} em ${rk.prox[1] - g.pontos} pontos` : "patente máxima";
  const f = new ActionFormData().title("Guilda dos Aventureiros")
    .body(`§fPatente: ${rk.cor}${rk.nome} §7(${g.pontos} pontos; próxima: ${next})\n§7Contratos concluídos: ${g.feitos || 0}`)
    .button("Contratos do dia", "textures/items/valdoria/insignia_goblin")
    .button("Arsenal da Guilda (comprar)", "textures/items/valdoria/pedra_aprimoramento")
    .button("Vender troféus", "textures/items/valdoria/fragmento_tita")
    .button("Patentes e recompensas", "textures/items/valdoria/amuleto_fortuna")
    .button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  const again = (p) => guildMenu(p, back);
  if (r.selection === 0) return contractMenu(player, back);
  if (r.selection === 1) return buyMenu(player, "guilda", again);
  if (r.selection === 2) return sellMenu(player, "guilda", again);
  if (r.selection === 3) {
    const lines = GUILD_RANKS.map(([n, min, cor], i) => `${cor}${n}§7: ${min} pontos${["", " · 2 Pedras de Aprimoramento", " · 2 Cristais de Aetherita",
      " · 4 Lingotes de Mithril", " · Amuleto da Fortuna"][i]}`);
    await show(player, new MessageFormData().title("Patentes").body(lines.join("\n") + "\n\n§7Patentes mais altas liberam itens no Arsenal.").button1("OK").button2("Voltar"));
    return again(player);
  }
  return back && back(player);
}

export function startGuild() {
  onKill((ev) => {
    let killer = ev.damageSource.damagingEntity;
    if (killer && !isPlayer(killer)) killer = summonOwner(killer);
    if (!isPlayer(killer)) return;
    let tid;
    try { tid = ev.deadEntity.typeId; } catch { return; }
    const g = npcData(killer).npc.guilda;
    for (const c of g.ativas) {
      if (c.tipo !== "abate" || !c.alvos.includes(tid) || c.p >= c.n) continue;
      c.p++;
      markDirty(killer);
      killer.onScreenDisplay.setActionBar(`§bGuilda - ${c.nome}: §f${c.p}/${c.n}`);
    }
  });
  onQuestEvent((player, ev, alvo) => {
    const g = npcData(player).npc.guilda;
    for (const c of g.ativas) {
      if (c.tipo !== "evento" || c.ev !== ev || (c.alvo !== "*" && c.alvo !== alvo) || c.p >= c.n) continue;
      c.p++;
      markDirty(player);
      player.onScreenDisplay.setActionBar(`§bGuilda - ${c.nome}: §f${c.p}/${c.n}`);
    }
  });
}

