// Mecanismos dos locais de exploração (dirigidos por dados declarados em cada tipo de estrutura):
//  sequencia  - enigma de ordem (alavancas, sinos ou botões) com pista lógica legível em atril e pergaminho
//  segredo    - passagem escondida aberta por um botão discreto ou quebrando a parede rachada; sala secreta conta como descoberta
//  armadilha  - placas de pressão visíveis que disparam dardos, chamas, espinhos ou desabamento (sempre com aviso)
//  ondas      - sala de desafio com ondas de inimigos
//  guardiao   - mini-chefe que desperta quando alguém entra na sala; pode carregar a Chave Antiga
//  chave      - Portão Selado que consome uma chave
//  altar      - oferenda que concede uma bênção temporária
//  leitura    - atril ou pedra com um texto (pistas e história)
//  quebrar    - alvos que precisam ser destruídos (ex.: cristais do ritual corrompido)
// Cada mecanismo com `obj` vira um objetivo de "exploração completa" do local.
import { world, system, ItemStack, GameMode } from "@minecraft/server";
import { ActionFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { NS, V, ok, isActivePlayer, takeItem, heldItem, effect, say, giveItem } from "../core/util.js";
import { particle, sound, psound, shake, line } from "../core/fx.js";
import { dealDamage } from "../core/damage.js";
import { getData, markDirty } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { addBuff } from "../rpg/stats.js";
import { allSites, getSite, saveSite, inBox, TYPES, center, fillChests, onSite } from "../structures/registry.js";
import { rollLoot } from "../structures/loot.js";
import { questEvent, setFlag } from "../quests/quests.js";
import { addCoins } from "../npc/economy.js";
import { RARIDADE, rarityOf, rarityId } from "./rarity.js";

const top = (p) => ({ x: p.x + 0.5, y: p.y + 1, z: p.z + 0.5 });
const mid = (p) => ({ x: p.x + 0.5, y: p.y + 0.5, z: p.z + 0.5 });
const boxCenter = (b) => ({ x: (b[0].x + b[1].x + 1) / 2, y: b[0].y + 1, z: (b[0].z + b[1].z + 1) / 2 });
const k3 = (dimId, p) => `${dimId}|${Math.floor(p.x)},${Math.floor(p.y)},${Math.floor(p.z)}`;
const GTAG = (siteId, mech) => `vg_${siteId}_${mech}`;
const WTAG = (siteId, mech) => `vw_${siteId}_${mech}`;

/** Símbolos usados nos enigmas de ordem: cor do bloco sob a entrada e o verso da pista. */
export const SIMBOLOS = {
  rubi: { nome: "Rubi", bloco: "minecraft:red_concrete", lã: "minecraft:red_wool", cor: "§c", verso: "o sangue dos reis" },
  safira: { nome: "Safira", bloco: "minecraft:blue_concrete", lã: "minecraft:blue_wool", cor: "§9", verso: "o mar sem fundo" },
  esmeralda: { nome: "Esmeralda", bloco: "minecraft:lime_concrete", lã: "minecraft:lime_wool", cor: "§a", verso: "a floresta que não dorme" },
  ambar: { nome: "Âmbar", bloco: "minecraft:yellow_concrete", lã: "minecraft:yellow_wool", cor: "§e", verso: "o sol do meio-dia" },
  ametista: { nome: "Ametista", bloco: "minecraft:purple_concrete", lã: "minecraft:purple_wool", cor: "§5", verso: "a magia dos Aetherianos" },
  marfim: { nome: "Marfim", bloco: "minecraft:white_concrete", lã: "minecraft:white_wool", cor: "§f", verso: "os ossos dos antigos" },
};
export const SIMBOLO_IDS = Object.keys(SIMBOLOS);
const ORDINAIS = ["Primeiro", "Depois", "Em seguida", "Por fim"];

/** Escolhe símbolos e a ordem correta de um enigma de forma determinística (semente do local). */
export function puzzleOf(seed, n) {
  let s = (seed >>> 0) || 7;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const pool = [...SIMBOLO_IDS];
  const syms = [];
  for (let i = 0; i < n; i++) syms.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  const order = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  if (order.every((v, i) => v === i)) order.reverse(); // nunca a ordem "óbvia" da esquerda para a direita
  return { syms, order };
}

/** Símbolos (na ordem das entradas) de um enigma, para o plano colocar o bloco colorido sob cada entrada. */
export function symbolsFor(seed, M) {
  return puzzleOf(seed + M.id.length * 131, M.n).syms.map((id) => SIMBOLOS[id]);
}

/** Texto da pista: versos que indicam a ordem pelos símbolos (cada entrada fica sobre o bloco da cor do símbolo). */
export function clueText(rec, M) {
  const { syms, order } = puzzleOf(rec.seed + M.id.length * 131, M.n);
  const verbo = M.input === "bell" ? "toque o sino de" : M.input === "button" ? "pressione a pedra de" : "puxe a alavanca de";
  const lines = order.map((idx, i) => {
    const S = SIMBOLOS[syms[idx]];
    return `${ORDINAIS[Math.min(i, 3)]}, ${verbo} ${S.verso}.`;
  });
  const legenda = syms.map((id) => `${SIMBOLOS[id].cor}${SIMBOLOS[id].nome}§r§8`).join(", ");
  return `${M.prologo || "Gravado na pedra, em letras gastas:"}\n\n§f${lines.join("\n")}\n\n§8(Cada ${M.input === "bell" ? "sino" : M.input === "button" ? "pedra" : "alavanca"} ` +
    `repousa sobre uma cor: ${legenda}. O ${syms.map((id) => SIMBOLOS[id].nome.toLowerCase()).join(", o ")} correspondem aos versos.)`;
}

// ------------------------------------------------------------------ marcações persistidas
/** Guarda as marcações do plano (posições e caixas) no registro do local, para os mecanismos funcionarem após recarregar o mundo. */
export function keepMarks(rec, plan, skip = []) {
  const mk = {};
  for (const [k, v] of Object.entries(plan.marks)) {
    if (k === "area" || skip.includes(k)) continue;
    mk[k] = v.map((p) => ({ x: p.x, y: p.y, z: p.z }));
  }
  rec.mk = mk;
  rec.m = rec.m || {};
  rec.m.mec = rec.m.mec || {};
}

const ROLES = {
  sequencia: ["entradas", "porta", "leitor"], segredo: ["gatilho", "porta"], armadilha: ["placas"], chave: ["porta"],
  altar: ["bloco"], leitura: ["bloco"], quebrar: ["alvos"], interagir: ["bloco"], guardiao: [], ondas: [],
};
const index = new Map();
let indexAt = -1;
let siteCount = -1;

function mechSites() {
  return allSites().filter((r) => r.mk && TYPES[r.tipo]?.mecanismos && r.estado !== "construindo");
}
function rebuildIndex() {
  index.clear();
  for (const rec of mechSites()) {
    for (const M of TYPES[rec.tipo].mecanismos) {
      for (const role of ROLES[M.k] || []) {
        const list = rec.mk[M[role]];
        if (!Array.isArray(list)) continue;
        list.forEach((p, i) => index.set(k3(rec.dim, p), { id: rec.id, mech: M.id, role, i }));
      }
    }
  }
  indexAt = system.currentTick;
}
function lookup(dimId, pos) {
  const n = allSites().length;
  if (n !== siteCount || system.currentTick - indexAt > 1200) {
    siteCount = n;
    rebuildIndex();
  }
  const hit = index.get(k3(dimId, pos));
  if (!hit) return undefined;
  const rec = getSite(hit.id);
  const M = rec && TYPES[rec.tipo]?.mecanismos?.find((m) => m.id === hit.mech);
  return M ? { rec, M, role: hit.role, i: hit.i } : undefined;
}
export function invalidateMechIndex() {
  siteCount = -1;
}

export function mstate(rec, id) {
  rec.m = rec.m || {};
  rec.m.mec = rec.m.mec || {};
  return (rec.m.mec[id] = rec.m.mec[id] || {});
}
export function mechDone(rec, id) {
  return !!rec.m?.mec?.[id]?.feito;
}

// ------------------------------------------------------------------ formulários
async function show(player, form, tries = 0) {
  try {
    const r = await form.show(player);
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy && tries < 20) {
      await new Promise((res) => system.runTimeout(() => res(undefined), 10));
      return show(player, form, tries + 1);
    }
    return r;
  } catch {
    return { canceled: true };
  }
}

// ------------------------------------------------------------------ progresso de exploração
function progressOf(player, rec) {
  const d = getData(player);
  d.expl = d.expl || {};
  return (d.expl[rec.id] = d.expl[rec.id] || { o: {}, c: 0 });
}
/** Objetivos do local: "limpo" (se houver guardiões) + mecanismos marcados com obj. */
export function objectivesOf(rec) {
  const T = TYPES[rec.tipo];
  if (!T) return [];
  const list = [];
  if (T.limpeza !== false && T.guards?.length) list.push({ id: "limpo", nome: T.objLimpo || "Expulsar os ocupantes" });
  for (const M of T.mecanismos || []) if (M.obj) list.push({ id: M.id, nome: M.obj, secreto: M.k === "segredo" });
  return list;
}
export function explorationStatus(player, rec) {
  const objs = objectivesOf(rec);
  const pr = getData(player).expl?.[rec.id] || { o: {}, c: 0 };
  return { objs, done: objs.filter((o) => pr.o[o.id]).length, total: objs.length, completo: !!pr.c, pr };
}

/** Credita um objetivo a um jogador; verifica a exploração completa. */
export function credit(player, rec, objId, quiet = false) {
  const objs = objectivesOf(rec);
  const o = objs.find((x) => x.id === objId);
  if (!o) return;
  const pr = progressOf(player, rec);
  if (pr.o[objId]) return;
  pr.o[objId] = 1;
  markDirty(player);
  const done = objs.filter((x) => pr.o[x.id]).length;
  if (!quiet) player.onScreenDisplay.setActionBar(`§6${rec.nome}: §f${o.nome} §a✔ §8(${done}/${objs.length})`);
  if (done >= objs.length && !pr.c) completeSite(player, rec);
}

function completeSite(player, rec) {
  const pr = progressOf(player, rec);
  pr.c = 1;
  markDirty(player);
  const T = TYPES[rec.tipo];
  const rid = rarityId(T);
  const R = RARIDADE[rid];
  player.onScreenDisplay.setTitle(`${R.cor}§lExploração completa`, { subtitle: `§f${rec.nome}`, fadeInDuration: 8, stayDuration: 60, fadeOutDuration: 15 });
  psound(player, "ui.toast.challenge_complete", 1, 0.9);
  addXP(player, R.completo.xp, "exploração completa");
  addCoins(player, R.completo.moedas, "exploração completa");
  const items = rollLoot(`completo_${rid}`, 0);
  if (Math.random() < R.completo.fragmento) items.push(new ItemStack(`${NS}:fragmento_mapa`, 1));
  for (const it of items) giveItem(player, it);
  if (items.length) say(player, `§6Recompensa de exploração: §f${items.map((i) => `${i.amount}× ${i.typeId.replace(`${NS}:`, "").replace("minecraft:", "").replace(/_/g, " ")}`).join(", ")}`);
  particle(player.dimension, "nivel_anel", player.location, {});
  setFlag(player, `completo_${rec.tipo}`);
  questEvent(player, "completo", rec.tipo);
  questEvent(player, "completo", rid);
}

function playersAt(dim, rec, extra = 12) {
  const T = TYPES[rec.tipo];
  try {
    return dim.getPlayers({ location: center(rec), maxDistance: (T?.alcance ?? T?.raio ?? 16) + extra }).filter(isActivePlayer);
  } catch {
    return [];
  }
}
/** Conclui um mecanismo para todo o local e credita os jogadores próximos. */
function finish(dim, rec, M, players) {
  const st = mstate(rec, M.id);
  if (st.feito) return;
  st.feito = true;
  st.em = Date.now();
  saveSite(rec);
  for (const p of players || playersAt(dim, rec)) {
    if (M.obj) credit(p, rec, M.id);
    if (M.xp) addXP(p, M.xp, M.obj || "mecanismo");
    if (M.k === "sequencia") questEvent(p, "enigma", rec.tipo);
  }
  if (M.depois) runAfter(dim, rec, M.depois, players);
}

/** Ações comuns pós-mecanismo: abrir blocos, revelar baú, soltar item. */
function runAfter(dim, rec, a, players) {
  if (a.abrir) openBlocks(dim, rec, a.abrir, a.som);
  if (a.bau) {
    const list = rec.mk[a.bau] || [];
    for (const pos of list) {
      try {
        dim.setBlockType(pos, "minecraft:chest");
      } catch { /* */ }
    }
    fillChests(dim, list.map((pos) => ({ pos, tier: a.tier || "torre", extra: a.extra || {} })));
    for (const pos of list) particle(dim, "nivel_anel", top(pos), {});
  }
  if (a.item && rec.mk[a.ponto]) {
    const pos = rec.mk[a.ponto][0];
    try { dim.spawnItem(new ItemStack(a.item, a.n || 1), top(pos)); } catch { /* */ }
  }
  if (a.msg) for (const p of players || playersAt(dim, rec)) p.onScreenDisplay.setTitle(" ", { subtitle: a.msg, fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
  if (a.fn) a.fn(dim, rec, players);
}
export function openBlocks(dim, rec, key, som = "vault.open_shutter") {
  const list = [...(rec.mk[key] || [])].sort((a, b) => b.y - a.y);
  if (!list.length) return;
  sound(dim, som, mid(list[0]), 0.8, 1);
  list.forEach((p, i) => {
    system.runTimeout(() => {
      try { dim.setBlockType(p, "minecraft:air"); } catch { /* */ }
      particle(dim, "poeira", mid(p), {});
    }, 2 + Math.floor(i / 2) * 3);
  });
}

// ------------------------------------------------------------------ enigma de ordem
function sequenceInput(player, ctx) {
  const { rec, M, i } = ctx;
  const dim = player.dimension;
  const st = mstate(rec, M.id);
  if (st.feito) {
    player.onScreenDisplay.setActionBar("§7O mecanismo já foi resolvido.");
    return;
  }
  const { syms, order } = puzzleOf(rec.seed + M.id.length * 131, M.n);
  st.prog = st.prog || [];
  const expected = order[st.prog.length];
  const pos = rec.mk[M.entradas][i];
  const S = SIMBOLOS[syms[i]];
  if (i === expected) {
    st.prog.push(i);
    particle(dim, "cor_anel", top(pos), { color: "gold", radius: 0.8 });
    psound(player, "random.orb", 0.8 + st.prog.length * 0.2, 0.8);
    if (st.prog.length >= M.n) {
      st.prog = [];
      player.onScreenDisplay.setActionBar(`§a${M.nome || "O mecanismo"} cede com um estalo!`);
      sound(dim, "random.anvil_use", mid(pos), 0.6, 0.6);
      for (const p of playersAt(dim, rec)) shake(p, 0.15, 0.8);
      if (M.porta && rec.mk[M.porta]) openBlocks(dim, rec, M.porta);
      finish(dim, rec, M);
    } else {
      player.onScreenDisplay.setActionBar(`${S.cor}${S.nome} §7ressoa... §8(${st.prog.length}/${M.n})`);
      saveSite(rec);
    }
    return;
  }
  // erro: o mecanismo se rearma e pune quem errou (sempre com aviso sonoro e visual)
  st.prog = [];
  saveSite(rec);
  player.onScreenDisplay.setActionBar(`§c${S.nome} §7range errado... §cO mecanismo se rearma! §8(leia a pista)`);
  sound(dim, "random.anvil_land", mid(pos), 0.5, 0.7);
  if (M.input === "lever") resetLevers(dim, rec.mk[M.entradas]);
  punish(dim, rec, M, player);
}
function resetLevers(dim, list) {
  system.runTimeout(() => {
    for (const p of list) {
      try {
        const b = dim.getBlock(p);
        if (b?.typeId === "minecraft:lever") b.setPermutation(b.permutation.withState("open_bit", false));
      } catch { /* */ }
    }
  }, 10);
}
function punish(dim, rec, M, player) {
  const kind = M.falha || "choque";
  if (kind === "choque") {
    particle(dim, "raio_explosao", V.up(player.location, 1), { radius: 0.6 });
    dealDamage(undefined, player, 3, "lightning");
  } else if (kind === "dardos") {
    dartsAt(dim, player.location, 4);
  } else if (kind === "despertar" && M.guardioes) {
    const pts = rec.mk[M.guardioes] || [];
    for (const pos of pts.slice(0, 2)) spawnTagged(dim, M.mob || "minecraft:skeleton", pos, WTAG(rec.id, M.id));
    sound(dim, "mob.evocation_illager.prepare_summon", player.location, 0.8, 1);
  }
}
function dartsAt(dim, loc, dmg) {
  for (let i = 0; i < 3; i++) {
    system.runTimeout(() => {
      const from = V.add(loc, { x: (Math.random() - 0.5) * 6, y: 2.2, z: (Math.random() - 0.5) * 6 });
      line(dim, from, V.up(loc, 1), "cor_rastro", { color: "physical" }, 0.5);
      sound(dim, "random.bow", from, 1.4, 0.6);
    }, i * 3);
  }
  for (const e of dim.getEntities({ location: loc, maxDistance: 1.5, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] })) dealDamage(undefined, e, dmg, "physical", { kind: "weapon" });
}

// ------------------------------------------------------------------ armadilhas (placas de pressão)
const trapCd = new Map();
function trap(dim, ctx, source) {
  const { rec, M, i } = ctx;
  const pos = rec.mk[M.placas][i];
  const key = `${rec.id}:${M.id}:${i}`;
  if ((trapCd.get(key) || 0) > system.currentTick) return;
  trapCd.set(key, system.currentTick + (M.recarga || 30));
  if (mechDone(rec, M.id)) return; // desarmada
  const at = top(pos);
  particle(dim, "alerta_area", at, { radius: 0.9 });
  sound(dim, "random.click", at, 0.6, 0.8);
  const dmg = M.dano || 4;
  const victims = () => dim.getEntities({ location: at, maxDistance: M.raio || 1.6, excludeTypes: ["minecraft:item", "minecraft:xp_orb"] });
  // atraso curto e audível: um jogador atento ainda consegue saltar para fora
  system.runTimeout(() => {
    if (M.tipo === "dardos") {
      const origins = rec.mk[M.origem] || [];
      const o = origins.length ? mid(origins[Math.min(i, origins.length - 1)]) : V.up(at, 2);
      line(dim, o, V.up(at, 0.9), "cor_rastro", { color: "physical" }, 0.4);
      sound(dim, "random.bow", o, 1.3, 0.9);
      for (const e of victims()) {
        dealDamage(undefined, e, dmg, "physical", { kind: "weapon" });
        if (M.veneno) effect(e, "poison", 60, 0, true);
      }
    } else if (M.tipo === "chamas") {
      particle(dim, "chama_jato", at, {});
      particle(dim, "fogo_explosao", V.up(at, 1), { radius: 0.8 });
      sound(dim, "mob.blaze.shoot", at, 0.8, 0.9);
      for (const e of victims()) {
        dealDamage(undefined, e, dmg, "fire");
        try { e.setOnFire(3, true); } catch { /* */ }
      }
    } else if (M.tipo === "espinhos") {
      particle(dim, "espinhos_osso", at, { radius: 0.6 });
      sound(dim, "hit.bone_block", at, 0.8, 1);
      for (const e of victims()) {
        dealDamage(undefined, e, dmg, "physical", { kind: "weapon" });
        effect(e, "slowness", 40, 1);
      }
    } else if (M.tipo === "desabamento") {
      particle(dim, "poeira", V.up(at, 3), { radius: 1.5 });
      particle(dim, "detritos", V.up(at, 1), { radius: 1.2 });
      sound(dim, "mob.warden.dig", at, 1.1, 1);
      for (const e of victims()) {
        dealDamage(undefined, e, dmg, "physical", { kind: "weapon" });
        effect(e, "slowness", 50, 2);
        effect(e, "nausea", 60, 0);
      }
    } else if (M.tipo === "veneno") {
      particle(dim, "esporos", V.up(at, 0.5), { radius: 2 });
      sound(dim, "mob.witch.throw", at, 0.6, 0.8);
      for (const e of victims()) effect(e, "poison", 80, 1, true);
    }
  }, M.atraso ?? 8);
}

// ------------------------------------------------------------------ portas com chave, altares, leituras, alvos
function keyDoor(player, ctx) {
  const { rec, M } = ctx;
  const st = mstate(rec, M.id);
  if (st.feito) return;
  const it = heldItem(player);
  const item = M.item || `${NS}:chave_antiga`;
  if (it?.typeId !== item) {
    player.onScreenDisplay.setActionBar(`§5A fechadura exige uma §d${item === `${NS}:chave_antiga` ? "Chave Antiga" : "chave"}§5. §7${M.dica || ""}`);
    psound(player, "vault.insert_item_fail", 1, 0.8);
    return;
  }
  if (player.getGameMode() !== GameMode.Creative && !takeItem(player, item, 1)) return;
  psound(player, "vault.insert_item", 1, 1);
  finish(player.dimension, rec, M);
  openBlocks(player.dimension, rec, M.porta, "vault.open_shutter");
}

const altarCd = new Map();
function altar(player, ctx) {
  const { rec, M } = ctx;
  const pr = progressOf(player, rec);
  const day = Math.floor(world.getAbsoluteTime() / 24000);
  if (pr.altar === day) {
    player.onScreenDisplay.setActionBar("§7O altar está em silêncio. §8(uma bênção por dia de jogo)");
    return;
  }
  const k = `${player.id}:${rec.id}`;
  if ((altarCd.get(k) || 0) > system.currentTick) return;
  altarCd.set(k, system.currentTick + 20);
  if (M.item) {
    const it = heldItem(player);
    if (it?.typeId !== M.item) {
      player.onScreenDisplay.setActionBar(`§7${M.pede || "O altar aguarda uma oferenda."}`);
      return;
    }
    if (player.getGameMode() !== GameMode.Creative && !takeItem(player, M.item, M.n || 1)) return;
  }
  pr.altar = day;
  markDirty(player);
  const b = M.bencao;
  addBuff(player, `altar_${rec.tipo}`, b.seg * 20, b.mods, b.nome);
  for (const [id, amp] of b.efeitos || []) effect(player, id, b.seg * 20, amp, false);
  const pos = rec.mk[M.bloco][0];
  particle(player.dimension, M.particula || "sagrado_explosao", top(pos), { radius: 1.2 });
  particle(player.dimension, "halo", player.location, {});
  psound(player, "beacon.power", 1.2, 0.8);
  player.onScreenDisplay.setTitle(" ", { subtitle: `§e${b.nome} §7(${Math.round(b.seg / 60)} min)`, fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
  if (M.obj) credit(player, rec, M.id);
}

async function reading(player, ctx) {
  const { rec, M } = ctx;
  const text = M.texto ? M.texto(rec) : M.pista ? clueText(rec, TYPES[rec.tipo].mecanismos.find((m) => m.id === M.pista)) : "";
  rememberClue(player, rec, M, text);
  psound(player, "item.book.page_turn", 1, 1);
  const f = new MessageFormData().title(M.titulo || rec.nome).body(text).button1("Fechar").button2("Copiar para o Diário");
  await show(player, f);
  if (M.obj) credit(player, rec, M.id);
}
export function rememberClue(player, rec, M, text) {
  const d = getData(player);
  d.pistas = d.pistas || {};
  const key = `${rec.id}:${M.id}`;
  if (d.pistas[key]) return;
  d.pistas[key] = { local: rec.nome, titulo: M.titulo || "Pista", texto: text.slice(0, 900) };
  markDirty(player);
  player.onScreenDisplay.setActionBar(`§6Pista anotada no Diário §7(Exploração > Pistas)`);
}

function breakTarget(player, ctx) {
  const { rec, M, i } = ctx;
  const st = mstate(rec, M.id);
  if (st.feito) return;
  st.quebrados = st.quebrados || [];
  if (st.quebrados.includes(i)) return;
  st.quebrados.push(i);
  saveSite(rec);
  const dim = player.dimension;
  const pos = rec.mk[M.alvos][i];
  particle(dim, M.particula || "sombra_explosao", mid(pos), { radius: 1.2 });
  sound(dim, "random.glass", mid(pos), 0.6, 1);
  const n = rec.mk[M.alvos].length;
  for (const p of playersAt(dim, rec)) p.onScreenDisplay.setActionBar(`§d${M.nome || "Alvos"}: §f${st.quebrados.length}/${n}`);
  if (M.aoQuebrar) M.aoQuebrar(dim, rec, st.quebrados.length, n);
  if (st.quebrados.length >= n) finish(dim, rec, M);
}

// ------------------------------------------------------------------ ondas e guardiões (laço)
function spawnTagged(dim, typeId, pos, tag) {
  try {
    const e = dim.spawnEntity(typeId, top({ x: pos.x, y: pos.y - 1, z: pos.z }), { initialPersistence: true });
    e.addTag(tag);
    e.addTag("valdoria_mecanismo");
    particle(dim, "sombra_explosao", top(pos), { radius: 0.7 });
    return e;
  } catch {
    return undefined;
  }
}

const mem = new Map(); // id:mec -> estado volátil
function memOf(k) {
  let m = mem.get(k);
  if (!m) mem.set(k, (m = { vazio: 0, at: 0, visto: false, longe: 0, falta: 0 }));
  return m;
}

function wavesTick(dim, rec, M, players) {
  const st = mstate(rec, M.id);
  if (st.feito) return;
  if (M.noite && !isNightNow() && !st.onda) return;
  const box = rec.mk[M.sala];
  if (!box) return;
  const inside = players.filter((p) => inBox(box, p.location, 0.5));
  const m = memOf(`${rec.id}:${M.id}`);
  const tag = WTAG(rec.id, M.id);
  st.onda = st.onda || 0;
  if (st.onda === 0) {
    if (!inside.length) return;
    st.onda = 1;
    saveSite(rec);
    for (const p of inside) p.onScreenDisplay.setTitle(M.titulo || "§cEmboscada!", { subtitle: `§7Onda 1/${M.ondas.length}`, fadeInDuration: 5, stayDuration: 30, fadeOutDuration: 10 });
    spawnWave(dim, rec, M, 0);
    return;
  }
  const c = boxCenter(box);
  const near = players.filter((p) => V.dist(p.location, c) < 40);
  m.longe = near.length ? 0 : m.longe + 1;
  if (m.longe > 60) { // ninguém por perto há ~30 s: o desafio se reinicia
    for (const e of dim.getEntities({ tags: [tag] })) try { e.remove(); } catch { /* */ }
    st.onda = 0;
    saveSite(rec);
    return;
  }
  if (system.currentTick - m.at < 40) return;
  const alive = dim.getEntities({ tags: [tag], location: c, maxDistance: 48 }).length;
  if (alive > 0) {
    m.visto = true;
    m.vazio = 0;
    return;
  }
  if (!near.length || ++m.vazio < (m.visto ? 2 : 6)) return;
  st.onda++;
  saveSite(rec);
  if (st.onda <= M.ondas.length) {
    for (const p of near) p.onScreenDisplay.setTitle(" ", { subtitle: `§cOnda ${st.onda}/${M.ondas.length}`, fadeInDuration: 5, stayDuration: 25, fadeOutDuration: 10 });
    const n = st.onda - 1;
    system.runTimeout(() => spawnWave(dim, rec, M, n), 40);
    m.at = system.currentTick + 40;
    return;
  }
  for (const p of near) p.onScreenDisplay.setTitle(`§a${M.vitoria || "Desafio vencido"}`, { subtitle: " ", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
  finish(dim, rec, M, near);
}
function spawnWave(dim, rec, M, n) {
  const pts = rec.mk[M.pontos] || [];
  if (!pts.length) return;
  let i = 0;
  for (const [id, count] of M.ondas[n]) for (let k = 0; k < count; k++) spawnTagged(dim, id, pts[i++ % pts.length], WTAG(rec.id, M.id));
  sound(dim, "mob.evocation_illager.prepare_summon", top(pts[0]), 0.7, 1.5);
  const m = memOf(`${rec.id}:${M.id}`);
  m.at = system.currentTick;
  m.vazio = 0;
  m.visto = false;
}

function guardianTick(dim, rec, M, players) {
  const st = mstate(rec, M.id);
  if (st.feito) return;
  const box = rec.mk[M.sala];
  const pos = rec.mk[M.ponto]?.[0];
  if (!box || !pos) return;
  const tag = GTAG(rec.id, M.id);
  const m = memOf(`${rec.id}:${M.id}`);
  if (M.requer && !mechDone(rec, M.requer)) return; // só desperta depois de outro desafio
  if (!st.ativo) {
    if (!players.some((p) => inBox(box, p.location, 0.5))) {
      // sinal visível de que há algo a enfrentar: brasas em volta do ponto onde o guardião desperta
      if (system.currentTick % 40 === 0) particle(dim, "cor_aura", top(pos), { color: "red", radius: 0.8 });
      return;
    }
    st.ativo = true;
    saveSite(rec);
    const e = spawnTagged(dim, M.tipo, pos, tag);
    if (!e) return;
    try { e.nameTag = `§c${M.nome}`; } catch { /* */ }
    const lv = M.nivel || 1;
    effect(e, "health_boost", 20 * 60 * 30, Math.min(9, 1 + lv * 2));
    effect(e, "resistance", 20 * 60 * 30, lv >= 3 ? 1 : 0);
    effect(e, "strength", 20 * 60 * 30, Math.min(3, lv - 1));
    system.runTimeout(() => {
      try {
        const h = e.getComponent("minecraft:health");
        h?.resetToMaxValue();
      } catch { /* */ }
    }, 2);
    particle(dim, "onda_choque", top(pos), { radius: 2 });
    sound(dim, M.som || "mob.wither.spawn", top(pos), 0.8, 0.6);
    for (const p of players) {
      p.onScreenDisplay.setTitle(`§c${M.nome}`, { subtitle: `§7${M.subtitulo || "desperta!"}`, fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
      shake(p, 0.2, 0.8);
    }
    m.falta = 0;
    return;
  }
  const alive = dim.getEntities({ tags: [tag] });
  const c = boxCenter(box);
  const near = players.filter((p) => V.dist(p.location, c) < 48);
  if (!near.length) {
    if (++m.longe > 80) { // abandonou a luta: o guardião volta a dormir com a vida cheia
      for (const e of alive) try { e.remove(); } catch { /* */ }
      st.ativo = false;
      saveSite(rec);
      m.longe = 0;
    }
    return;
  }
  m.longe = 0;
  if (!alive.length) {
    // pode ser só o chunk carregando; confirma algumas vezes antes de reiniciar
    if (++m.falta > 20) {
      st.ativo = false;
      saveSite(rec);
      m.falta = 0;
    }
  } else m.falta = 0;
}
function onGuardianDeath(ev) {
  let tags;
  try { tags = ev.deadEntity.getTags(); } catch { return; }
  const t = tags.find((x) => x.startsWith("vg_"));
  if (!t) return;
  const [, siteId, ...rest] = t.split("_");
  const mechId = rest.join("_");
  const rec = getSite(siteId);
  if (!rec) return;
  const M = TYPES[rec.tipo]?.mecanismos?.find((x) => x.id === mechId);
  if (!M) return;
  const dim = ev.deadEntity.dimension;
  const loc = ev.deadEntity.location;
  if (M.solta) for (const [id, n] of M.solta) try { dim.spawnItem(new ItemStack(id, n), loc); } catch { /* */ }
  particle(dim, "alma_explosao", V.up(loc, 1), { radius: 1.5 });
  finish(dim, rec, M, playersAt(dim, rec, 40));
}

function isNightNow() {
  const t = world.getTimeOfDay();
  return t >= 13000 && t < 23000;
}

// ------------------------------------------------------------------ laço principal
function loop() {
  for (const rec of mechSites()) {
    let dim;
    try { dim = world.getDimension(rec.dim); } catch { continue; }
    const players = playersAt(dim, rec, 30);
    if (!players.length) continue;
    const T = TYPES[rec.tipo];
    for (const M of T.mecanismos) {
      try {
        if (M.k === "ondas") wavesTick(dim, rec, M, players);
        else if (M.k === "guardiao") guardianTick(dim, rec, M, players);
        else if (M.k === "segredo") secretTick(dim, rec, M, players);
        else if (M.k === "sequencia" && !mechDone(rec, M.id) && system.currentTick % 60 === 0) hintTick(dim, rec, M, players);
      } catch (e) {
        console.warn(`[Valdoria] mecanismo ${rec.tipo}/${M.id}: ${e}`);
      }
    }
    // objetivos já concluídos por outros jogadores contam para quem chega ao local
    for (const p of players) {
      if (!(getData(p).locais || []).includes(rec.id)) continue;
      for (const M of T.mecanismos) if (M.obj && M.k !== "segredo" && M.k !== "altar" && M.k !== "leitura" && mechDone(rec, M.id)) credit(p, rec, M.id, true);
      if (rec.estado === "limpo") credit(p, rec, "limpo", true);
    }
    if (T.tick) T.tick(dim, rec, players);
  }
}
function secretTick(dim, rec, M, players) {
  const box = rec.mk[M.sala];
  if (!box) return;
  for (const p of players) {
    if (!inBox(box, p.location, 0.2)) continue;
    const pr = progressOf(p, rec);
    if (pr.o[M.id]) continue;
    p.onScreenDisplay.setTitle("§dPassagem secreta!", { subtitle: `§7${M.nome || "Uma sala escondida"}`, fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10 });
    psound(p, "random.levelup", 1.4, 0.6);
    addXP(p, M.xp || 80, "segredo");
    questEvent(p, "segredo", rec.tipo);
    credit(p, rec, M.id);
  }
}
function hintTick(dim, rec, M, players) {
  // entradas de enigmas brilham levemente quando há alguém perto: o jogador sabe que pode interagir
  const list = rec.mk[M.entradas] || [];
  if (!players.some((p) => list.some((q) => V.dist(p.location, q) < 10))) return;
  for (const q of list) particle(dim, "fada_brilho", top(q), {});
}

export function startMechanisms() {
  system.runInterval(() => {
    try { loop(); } catch (e) { console.warn(`[Valdoria] mecanismos: ${e}`); }
  }, 10);

  world.afterEvents.leverAction.subscribe((ev) => {
    if (!ev.player) return;
    const ctx = lookup(ev.dimension.id, ev.block.location);
    if (!ctx) return;
    if (ctx.M.k === "sequencia" && ctx.role === "entradas" && ctx.M.input === "lever") {
      if (ev.isPowered) sequenceInput(ev.player, ctx);
    } else if (ctx.M.k === "segredo" && ctx.role === "gatilho") {
      if (ev.isPowered) openSecret(ev.dimension, ctx);
    }
  });
  world.afterEvents.buttonPush.subscribe((ev) => {
    const ctx = lookup(ev.dimension.id, ev.block.location);
    if (!ctx) return;
    const p = ev.source?.typeId === "minecraft:player" ? ev.source : undefined;
    if (ctx.M.k === "sequencia" && ctx.role === "entradas" && ctx.M.input === "button" && p) sequenceInput(p, ctx);
    else if (ctx.M.k === "segredo" && ctx.role === "gatilho") openSecret(ev.dimension, ctx);
  });
  world.afterEvents.pressurePlatePush.subscribe((ev) => {
    if (!(ev.redstonePower > 0) || ev.previousRedstonePower > 0) return;
    const ctx = lookup(ev.dimension.id, ev.block.location);
    if (ctx?.M.k === "armadilha") trap(ev.dimension, ctx, ev.source);
  });
  world.afterEvents.playerBreakBlock.subscribe((ev) => {
    const ctx = lookup(ev.dimension.id, ev.block.location);
    if (!ctx) return;
    if (ctx.M.k === "quebrar" && ctx.role === "alvos") breakTarget(ev.player, ctx);
    else if (ctx.M.k === "segredo" && ctx.role === "porta") openSecret(ev.dimension, ctx);
  });
  world.beforeEvents.playerInteractWithBlock.subscribe((ev) => {
    const ctx = lookup(ev.block.dimension.id, ev.block.location);
    if (!ctx) return;
    const { M, role } = ctx;
    const p = ev.player;
    const isBell = M.k === "sequencia" && role === "entradas" && M.input === "bell";
    const handled = isBell || (M.k === "chave" && role === "porta") || (M.k === "altar" && role === "bloco") ||
      ((M.k === "leitura" || M.k === "interagir") && role === "bloco") || (M.k === "sequencia" && role === "leitor");
    if (!handled) return;
    if (!isBell) ev.cancel = true; // o sino toca normalmente; atris e altares abrem a interface do add-on
    if (!ev.isFirstEvent) return;
    system.run(() => {
      if (!ok(p)) return;
      if (isBell) sequenceInput(p, ctx);
      else if (M.k === "chave") keyDoor(p, ctx);
      else if (M.k === "altar") altar(p, ctx);
      else if (M.k === "leitura") reading(p, ctx).catch(() => {});
      else if (M.k === "sequencia") reading(p, { ...ctx, M: { id: `${M.id}_pista`, titulo: M.tituloPista || "Inscrição", pista: M.id } }).catch(() => {});
      else if (M.k === "interagir" && M.fn) M.fn(p, ctx.rec);
    });
  });
  world.afterEvents.entityDie.subscribe(onGuardianDeath);
  onSite("limpo", (p, rec) => credit(p, rec, "limpo"));
}

function openSecret(dim, ctx) {
  const { rec, M } = ctx;
  const st = mstate(rec, M.id);
  if (st.aberto) return;
  st.aberto = true;
  saveSite(rec);
  openBlocks(dim, rec, M.porta, "block.decorated_pot.insert");
  sound(dim, "mob.warden.dig", mid(rec.mk[M.porta][0]), 1.2, 0.8);
  for (const p of playersAt(dim, rec)) p.onScreenDisplay.setActionBar("§dVocê ouve pedra deslizando contra pedra...");
}

/** Reinicia os mecanismos de um local (Modo de Teste ou repovoamento completo). */
export function resetMechanisms(rec) {
  rec.m = rec.m || {};
  rec.m.mec = {};
  saveSite(rec);
}

export { dartsAt };
