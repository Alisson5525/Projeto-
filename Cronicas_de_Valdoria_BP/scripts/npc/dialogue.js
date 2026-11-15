// Diálogos com os moradores: saudação, comércio, serviços do ofício, missões, pistas, rumores e história do reino.
import { world, system, EquipmentSlot } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { NS, V, ok, say, health, pick, effect } from "../core/util.js";
import { psound, particle } from "../core/fx.js";
import { markDirty, saveNow } from "../core/store.js";
import { stats, invalidate, addBuff } from "../rpg/stats.js";
import { debuff } from "../core/damage.js";
import { SPELLS, SCHOOLS, spellReq } from "../magic/spells.js";
import { ABILITIES } from "../abilities/registry.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { LORE } from "../data/lore.js";
import { nearestSite, compass, TYPES } from "../structures/registry.js";
import { markLoreRead, readLore } from "../ui/codex.js";
import { ROLES, RUMORES } from "./roles.js";
import { kingMenu, royalMenu, treasuryMenu } from "./capital.js";
import { queenMenu, askDew, memoriesMenu } from "./aelthar.js";
import { BY_ROLE, COMPANIONS, recruitMenu } from "../companions/companions.js";
import { show, npcData, coins, spendCoins, buyMenu, sellMenu, itemValue, isNight, repRank, descontoTxt } from "./economy.js";
import { residentInfo } from "./residents.js";
import { questOptions, onTalk, freePrisoner } from "./missions.js";
import { guildMenu } from "./guild.js";
import { startRaid, raidActive } from "./defense.js";
import { cavalryReady, cavalryGive } from "../mounts/cavalry.js";

const talking = new Map(); // npc -> jogador

function face(npc, player) {
  try {
    npc.teleport(npc.location, { facingLocation: V.up(player.location, 1.4) });
    npc.triggerEvent("valdoria:travar");
    npc.setProperty(`${NS}:anim`, 1);
  } catch { /* */ }
}
function release(npc) {
  talking.delete(npc.id);
  if (!ok(npc)) return;
  try {
    npc.triggerEvent("valdoria:destravar");
    npc.setProperty(`${NS}:anim`, 0);
  } catch { /* */ }
}

// ------------------------------------------------------------------ serviços
const NEGATIVE = ["poison", "wither", "weakness", "slowness", "nausea", "blindness", "hunger", "mining_fatigue", "darkness"];

function repairCost(it) {
  const dur = it?.getComponent("minecraft:durability");
  if (!dur || dur.damage <= 0) return 0;
  const frac = dur.damage / dur.maxDurability;
  const base = ITEM_DATA[it.typeId] ? itemValue(it.typeId) : 30;
  return Math.max(2, Math.ceil(frac * base * 0.25));
}
const SLOTS = [EquipmentSlot.Mainhand, EquipmentSlot.Offhand, EquipmentSlot.Head, EquipmentSlot.Chest, EquipmentSlot.Legs, EquipmentSlot.Feet];

async function repairMenu(player, back) {
  const eq = player.getComponent("minecraft:equippable");
  const items = SLOTS.map((s) => [s, eq?.getEquipment(s)]).filter(([, it]) => it && repairCost(it) > 0);
  const total = items.reduce((a, [, it]) => a + repairCost(it), 0);
  if (!items.length) {
    say(player, "§7Nada para consertar: seu equipamento está inteiro.");
    return back(player);
  }
  const lines = items.map(([, it]) => {
    const dur = it.getComponent("minecraft:durability");
    return `§f${ITEM_DATA[it.typeId]?.n || it.typeId.replace("minecraft:", "").replace(/_/g, " ")} §7(${dur.maxDurability - dur.damage}/${dur.maxDurability}) - §e${repairCost(it)}`;
  });
  const m = new MessageFormData().title("Consertar equipamento").body(`${lines.join("\n")}\n\n§fTotal: §e${total} moedas §7(você tem ${coins(player)})`)
    .button1("§lConsertar tudo").button2("Voltar");
  const k = await show(player, m);
  if (k.canceled || k.selection !== 0) return back(player);
  if (!spendCoins(player, total)) {
    say(player, `§cVocê precisa de ${total} moedas.`);
    return back(player);
  }
  for (const [slot, it] of items) {
    const dur = it.getComponent("minecraft:durability");
    dur.damage = 0;
    eq.setEquipment(slot, it);
  }
  psound(player, "random.anvil_use", 1, 1);
  say(player, `§aEquipamento consertado por ${total} moedas.`);
  saveNow(player);
  return back(player);
}

function rest(player) {
  if (!spendCoins(player, 15)) return "§cDescansar custa 15 moedas.";
  health(player)?.resetToMaxValue();
  npcData(player).energia = stats(player).energyMax;
  addBuff(player, "bem_descansado", 20 * 600, { xp: 0.1 }, "Bem descansado (+10% XP)");
  effect(player, "regeneration", 200, 0, true);
  particle(player.dimension, "cura", player.location);
  psound(player, "random.levelup", 1.6, 0.6);
  return "§aVocê descansa numa cama macia do Javali Dourado. §7(vida e energia cheias; +10% de XP por 10 minutos)";
}

function rumor(player) {
  if (!spendCoins(player, 5)) return "§cRumores custam 5 moedas.";
  const known = npcData(player).locais || [];
  const hit = nearestSite(player.location, player.dimension.id, (r) => !known.includes(r.id) && r.estado !== "construindo");
  const lore = pick(RUMORES);
  if (hit && hit.dist < 3000) {
    const T = TYPES[hit.rec.tipo];
    return `§e"Ouvi falar de ${T?.nome?.toLowerCase().startsWith("vila") ? "uma" : "um lugar:"} ${T?.nome || hit.rec.nome}, uns ${Math.round(hit.dist / 10) * 10} blocos ` +
      `${compass(player.location, hit.rec)} daqui."\n§7"${lore}"`;
  }
  return `§e"${lore}"`;
}

function heal(player) {
  if (!spendCoins(player, 8)) return "§cA cura custa 8 moedas (uma oferenda ao templo).";
  health(player)?.resetToMaxValue();
  for (const id of NEGATIVE) try { player.removeEffect(id); } catch { /* */ }
  const db = debuff(player);
  delete db.bleed;
  delete db.vuln;
  particle(player.dimension, "sagrado_explosao", V.up(player.location, 1), { radius: 1 });
  psound(player, "random.orb", 1.4, 1);
  return "§aA Luz fecha suas feridas e afasta venenos e maldições.";
}

function bless(player) {
  if (!spendCoins(player, 25)) return "§cA Bênção da Luz custa 25 moedas.";
  addBuff(player, "bencao_luz", 20 * 600, { rDark: 0.15, holy: 0.1, regen: 0.2 }, "Bênção da Luz");
  effect(player, "regeneration", 300, 0, true);
  particle(player.dimension, "sagrado_pilar", player.location);
  psound(player, "beacon.power", 1.2, 1);
  return "§eA Bênção da Luz o acompanha por 10 minutos: +15% de resistência sombria, +10% de dano sagrado e energia mais rápida.";
}

async function teachMenu(player, back) {
  const d = npcData(player);
  const s = stats(player);
  const list = Object.entries(SPELLS).filter(([id, sp]) => !sp.combo && !d.magias.includes(id))
    .sort((a, b) => a[1].nivel - b[1].nivel).slice(0, 24);
  const f = new ActionFormData().title("Aprender feitiços").body(`§7Pagando em moedas, sem gastar Essências. Exige nível e Inteligência.\n§fBolsa: §e${coins(player)}`);
  const opts = [];
  for (const [id, sp] of list) {
    const req = spellReq(id);
    const cost = 30 + sp.nivel * 6;
    const bad = d.nivel < req.nivel ? `nível ${req.nivel}` : s.attrs.int < req.int ? `Int ${req.int}` : null;
    f.button(`${SCHOOLS[sp.school]?.cor || ""}${ABILITIES[id]?.nome || id}\n${bad ? `§c${bad}` : `§e${cost} moedas`}`, SCHOOLS[sp.school]?.icone);
    opts.push([id, cost, bad]);
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= opts.length) return back(player);
  const [id, cost, bad] = opts[r.selection];
  if (bad) {
    say(player, `§cRequisito: ${bad}.`);
    return teachMenu(player, back);
  }
  if (!spendCoins(player, cost)) {
    say(player, `§cVocê precisa de ${cost} moedas.`);
    return teachMenu(player, back);
  }
  d.magias.push(id);
  markDirty(player);
  saveNow(player);
  particle(player.dimension, "arcano_explosao", V.up(player.location, 1), { radius: 1 });
  psound(player, "random.levelup", 1.4, 1);
  say(player, `§dVocê aprendeu §f${ABILITIES[id]?.nome || id}§d. Prepare-o no Grimório do Diário.`);
  return teachMenu(player, back);
}

async function respec(player, back) {
  const d = npcData(player);
  const spent = Object.values(d.attr).reduce((a, b) => a + b, 0);
  const cost = 15 * d.nivel;
  if (!spent) {
    say(player, "§7Você não tem pontos distribuídos para reorganizar.");
    return back(player);
  }
  const m = new MessageFormData().title("Redistribuir atributos")
    .body(`§fDevolve os §e${spent}§f pontos distribuídos para você escolher de novo.\n§7Custo: §e${cost} moedas §7(você tem ${coins(player)}).`)
    .button1("§lRedistribuir").button2("Voltar");
  const k = await show(player, m);
  if (k.canceled || k.selection !== 0) return back(player);
  if (!spendCoins(player, cost)) {
    say(player, `§cVocê precisa de ${cost} moedas.`);
    return back(player);
  }
  for (const a of Object.keys(d.attr)) d.attr[a] = 0;
  d.pontos += spent;
  markDirty(player);
  saveNow(player);
  invalidate(player);
  say(player, `§aPontos devolvidos: ${spent}. Distribua-os no Diário > Atributos.`);
  return back(player);
}

async function historyMenu(player, back) {
  const ids = ["reino_valdoria", "reinos_vizinhos"];
  const f = new ActionFormData().title("O Reino de Valdoria").body("§7O Ancião conhece as histórias antigas.");
  for (const id of ids) f.button(LORE[id].titulo, "textures/items/valdoria/pergaminho_antigo");
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= ids.length) return back(player);
  markLoreRead(player, ids[r.selection]);
  await readLore(player, ids[r.selection]);
  return back(player);
}

async function defenseOffer(player, npc, back) {
  const info = residentInfo(npc);
  const rec = info?.rec;
  const d = npcData(player);
  if (!rec) return back(player);
  if (raidActive(rec.id)) return say(player, "§cA vila já está sob ataque! Aos portões!");
  if (d.nivel < 5) {
    say(player, "§7\"Volte quando for mais experiente (nível 5).\"");
    return back(player);
  }
  if (rec.m.desafioDia === Math.floor(world.getAbsoluteTime() / 24000)) {
    say(player, "§7\"Já treinamos hoje. Os homens precisam descansar até amanhã.\"");
    return back(player);
  }
  const m = new MessageFormData().title("Desafio: Defesa da Vila")
    .body("§f\"Batedores avistaram um bando goblin vindo para cá. Quer liderar a defesa? Serão três ondas.\"\n\n" +
      "§6Recompensa: §fmoedas, reputação e XP. §7Os guardas lutam ao seu lado; os moradores vão se esconder.")
    .button1("§lÀs armas!").button2("Agora não");
  const k = await show(player, m);
  if (k.canceled || k.selection !== 0) return back(player);
  rec.m.desafioDia = Math.floor(world.getAbsoluteTime() / 24000);
  startRaid(rec, "desafio");
}

// ------------------------------------------------------------------ diálogo principal
export async function talk(player, npc) {
  const info = residentInfo(npc);
  if (!info) return;
  if (talking.get(npc.id) && talking.get(npc.id) !== player.id) {
    player.onScreenDisplay.setActionBar("§7Este morador está conversando com outra pessoa.");
    return;
  }
  talking.set(npc.id, player.id);
  face(npc, player);
  try {
    await dialogue(player, npc, info);
  } finally {
    release(npc);
  }
}

async function dialogue(player, npc, info) {
  const role = info.role;
  if (role === "forasteiro") {
    const opts = questOptions(player, role, npc);
    const f = new ActionFormData().title("Forasteiro encapuzado").body("§8\"...\" §7Ele puxa o capuz para baixo e não responde.");
    for (const [label] of opts) f.button(label);
    f.button("Deixar para lá");
    const r = await show(player, f);
    if (!r.canceled && r.selection !== undefined && r.selection < opts.length) await opts[r.selection][1]();
    return;
  }
  const R = ROLES[role];
  if (!R) return;
  const d = npcData(player);
  onTalk(player, role);
  const closed = isNight() && !R.aberto;
  const rr = repRank(d.rep);
  const line = d.rep < 0 ? "Não confio em você. Diga logo o que quer." : closed ? pick(R.noite) : pick(R.falas);
  const back = (p) => dialogue(p, npc, info);
  const opts = [];
  if (R.loja && !closed) {
    opts.push(["Comprar", "textures/items/valdoria/moeda_ouro", () => buyMenu(player, R.loja, back)]);
    opts.push(["Vender", "textures/items/valdoria/insignia_goblin", () => sellMenu(player, R.loja, back)]);
  }
  for (const s of R.servicos || []) {
    if (closed && s !== "historia") continue;
    if (s === "reparar") opts.push(["Consertar equipamento", "textures/items/valdoria/pedra_aprimoramento", () => repairMenu(player, back)]);
    if (s === "descansar") opts.push(["Descansar §8(15 moedas)", "textures/items/valdoria/pocao_energia", async () => { say(player, rest(player)); return back(player); }]);
    if (s === "rumores") opts.push(["Ouvir rumores §8(5 moedas)", "textures/items/valdoria/mapa_explorador", async () => { say(player, rumor(player)); return back(player); }]);
    if (s === "curar") opts.push(["Ser curado §8(8 moedas)", "textures/items/valdoria/essencia_natural", async () => { say(player, heal(player)); return back(player); }]);
    if (s === "bencao") opts.push(["Bênção da Luz §8(25 moedas)", "textures/items/valdoria/runa_luz", async () => { say(player, bless(player)); return back(player); }]);
    if (s === "aprender") opts.push(["Aprender feitiços", "textures/items/valdoria/grimorio_arquimago", () => teachMenu(player, back)]);
    if (s === "redistribuir") opts.push([`Redistribuir atributos §8(${15 * d.nivel} moedas)`, "textures/items/valdoria/elixir_renascimento", () => respec(player, back)]);
    if (s === "guilda") opts.push(["Guilda dos Aventureiros", "textures/items/valdoria/amuleto_fortuna", () => guildMenu(player, back)]);
    if (s === "defesa") opts.push(["Desafio: Defesa da Vila", "textures/items/valdoria/cavaleiro_peitoral", () => defenseOffer(player, npc, back)]);
    if (s === "cavalaria" && cavalryReady(player)) {
      opts.push(["§6Cavalaria de Valdoria: receber o Corcel", "textures/items/valdoria/escritura_cavalo", async () => {
        say(player, cavalryGive(player, info.nome));
        return back(player);
      }]);
    }
    if (s === "historia") opts.push(["História do Reino", "textures/items/valdoria/pergaminho_antigo", () => historyMenu(player, back)]);
    if (s === "audiencia") opts.push(["Falar com o Rei", "textures/items/valdoria/selo_real", () => kingMenu(player, npc, back)]);
    if (s === "missoes_reais") opts.push(["Missões Reais", "textures/items/valdoria/selo_real", () => royalMenu(player, back)]);
    if (s === "tesouro_real") opts.push(["Tesouro Real (trocar Selos)", "textures/items/valdoria/moeda_ouro", () => treasuryMenu(player, back)]);
    if (s === "conselho") opts.push(["Falar com a Rainha", "textures/items/valdoria/orvalho_lunar", () => queenMenu(player, npc, back)]);
    if (s === "orvalho") opts.push(["Pedir Orvalho Lunar", "textures/items/valdoria/orvalho_lunar", async () => { say(player, askDew(player, info)); return back(player); }]);
    if (s === "memorias") opts.push(["Memórias de Aelthar", "textures/items/valdoria/pergaminho_antigo", () => memoriesMenu(player, back)]);
  }
  for (const [label, act] of questOptions(player, role, npc)) opts.push([label, "textures/items/valdoria/diario_aventureiro", async () => { await act(); return back(player); }]);
  // companheiro de viagem apresentado por este morador (depois das missões, para não mudar a ordem dos botões antigos)
  if ((R.servicos || []).includes("companheiro") && BY_ROLE[role] && !closed) {
    const cid = BY_ROLE[role];
    opts.push([`Companheiro: ${COMPANIONS[cid].nome}`, "textures/items/valdoria/apito_companheiro", () => recruitMenu(player, cid, info.nome, back)]);
  }
  opts.push(["Conversar", undefined, async () => {
    say(player, `§e${info.nome}: §f"${pick(R.falas.concat(RUMORES.slice(0, 4)))}"`);
    return back(player);
  }]);
  const f = new ActionFormData().title(`${info.nome} - ${R.titulo}`)
    .body(`§f"${line}"\n\n§7Bolsa: §e${coins(player)} moedas §8| ${rr.cor}${rr.nome}§8${R.loja ? ` | ${descontoTxt(player)}` : ""}${closed ? "\n§8(loja fechada à noite)" : ""}`);
  for (const [label, ic] of opts) f.button(label, ic);
  f.button("Até logo");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined || r.selection >= opts.length) {
    psound(player, "mob.villager.idle", 1.1, 0.7);
    return;
  }
  return opts[r.selection][2]();
}

const npcHooks = [];
/** Outros sistemas (eventos do mundo, cativos de acampamentos) tratam NPCs marcados; o gancho devolve true se tratou. */
export function onNpcInteract(fn) {
  npcHooks.push(fn);
}

export function startDialogue() {
  world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
    const t = ev.target;
    const id = t.typeId;
    if (id !== `${NS}:aldeao` && id !== `${NS}:guarda` && id !== `${NS}:guarda_elfico` && id !== `${NS}:prisioneiro`) return;
    ev.cancel = true;
    const p = ev.player;
    system.run(() => {
      if (!ok(p) || !ok(t)) return;
      for (const fn of npcHooks) {
        try {
          if (fn(p, t)) return;
        } catch (e) {
          console.warn(`[Valdoria] interação com NPC: ${e}`);
        }
      }
      if (id === `${NS}:prisioneiro`) freePrisoner(p, t);
      else talk(p, t);
    });
  });
}
