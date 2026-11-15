// Aurendel em tempo de execução: construção dos setores conforme os chunks carregam, moradores por setor, a Audiência e a
// Sagração com o Rei Aldemar III, as Missões Reais da Chancelaria (pagas em Selos Reais) e o Tesouro Real.
import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { NS, V, ok, isPlayer, say, countItem, takeItem, giveItem } from "../core/util.js";
import { psound, particle, sound } from "../core/fx.js";
import { getData, markDirty, saveNow } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { onKill } from "../core/damage.js";
import { summonOwner } from "../abilities/engine.js";
import { setFlag, onQuestEvent } from "../quests/quests.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { markLoreRead } from "../ui/codex.js";
import { build, chunksLoaded, rng } from "../structures/builder.js";
import { allSites, getSite, saveSite, center, fillChests, registerType, isBuilding } from "../structures/registry.js";
import { CAPITAL, CENTER_SECTION, cityPlan, splitSections, prepareSection, sectionAt, sectionBounds } from "../structures/capital.js";
import { residentsFromPlan, spawnResident } from "./residents.js";
import { show, npcData, addCoins, addRep, today } from "./economy.js";

const I = (id) => `${NS}:${id}`;
export const SELO = I("selo_real");
const MAX_ACTIVE = 2;
export const PROVAS = 3; // Missões Reais exigidas para a Sagração

// ------------------------------------------------------------------ planta e setores
const layouts = new Map();
export function cityLayout(rec) {
  let L = layouts.get(rec.id);
  if (!L) {
    const full = cityPlan({ x: rec.x, y: rec.y, z: rec.z }, rec.rot, rng(rec.seed));
    L = { full, secs: splitSections(full) };
    layouts.set(rec.id, L);
  }
  return L;
}

CAPITAL.afterBuild = (rec, plan) => {
  const L = cityLayout(rec);
  const moradores = residentsFromPlan(rec, plan);
  for (const m of moradores) m.secao = sectionAt(L.full, m.pos);
  const secoes = Array(9).fill(0);
  secoes[CENTER_SECTION] = 2;
  rec.m = { moradores, secoes, ataque: [], ultimoAtaque: -99 };
  const dim = world.getDimension(rec.dim);
  for (const m of moradores) if (m.secao === CENTER_SECTION) spawnResident(dim, rec, m);
};
registerType(CAPITAL);

let busy = false;
const building = new Set(); // setores em construção nesta sessão
/** Constrói um setor (terreno, blocos, baús, moradores e cavalos). */
export async function buildSection(dim, rec, i) {
  if (rec.m.secoes[i] !== 0) return rec.m.secoes[i] === 2; // já construído ou em construção
  const L = cityLayout(rec);
  busy = true;
  building.add(`${rec.id}:${i}`);
  rec.m.secoes[i] = 1;
  saveSite(rec);
  try {
    const prep = await prepareSection(dim, L.full, i);
    await build(dim, prep, 400);
    await build(dim, L.secs[i], 400);
    fillChests(dim, L.secs[i].chests);
    for (const m of rec.m.moradores) if (m.secao === i) spawnResident(dim, rec, m);
    for (const pos of L.secs[i].marks.cavalo || []) {
      try { dim.spawnEntity("minecraft:horse", { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 }, { initialPersistence: true }); } catch { /* */ }
    }
    rec.m.secoes[i] = 2;
    saveSite(rec);
    return true;
  } catch (e) {
    console.warn(`[Valdoria] Aurendel, setor ${i}: ${e}`);
    rec.m.secoes[i] = 0;
    saveSite(rec);
    return false;
  } finally {
    busy = false;
    building.delete(`${rec.id}:${i}`);
  }
}
/** Constrói todos os setores carregados agora (Modo de Teste). */
export async function buildAllLoaded(rec) {
  const dim = world.getDimension(rec.dim);
  const L = cityLayout(rec);
  for (let i = 0; i < 9; i++) {
    if (rec.m.secoes[i] !== 0) continue;
    const [x1, z1, x2, z2] = sectionBounds(i);
    if (chunksLoaded(dim, L.full, x1, z1, x2, z2, 0)) await buildSection(dim, rec, i);
  }
  return rec.m.secoes.filter((v) => v === 2).length;
}
function sectionLoop() {
  if (busy || isBuilding()) return;
  for (const rec of allSites()) {
    if (rec.tipo !== "capital" || rec.estado === "construindo" || !rec.m?.secoes) continue;
    let dim;
    try { dim = world.getDimension(rec.dim); } catch { continue; }
    if (!dim.getPlayers({ location: center(rec), maxDistance: 170 }).length) continue;
    const L = cityLayout(rec);
    for (let i = 0; i < 9; i++) {
      if (rec.m.secoes[i] === 2) continue;
      if (rec.m.secoes[i] === 1 && !building.has(`${rec.id}:${i}`)) rec.m.secoes[i] = 0; // interrompido (o mundo fechou no meio)
      const [x1, z1, x2, z2] = sectionBounds(i);
      if (!chunksLoaded(dim, L.full, x1, z1, x2, z2, 0)) continue;
      buildSection(dim, rec, i);
      return;
    }
  }
}

// ------------------------------------------------------------------ Missões Reais
const HUNTS = [
  ["Sentinelas Desgarradas", [I("sentinela_runica")], 3, 5, 3],
  ["Almas de Kar'Dum", [I("fantasma_anao")], 4, 7, 2],
  ["Espiões do Véu", [I("espiao_veu")], 2, 4, 3],
  ["Noite dos Espectros", [I("espectro")], 5, 8, 2],
  ["Cabeças Goblins", [I("chefe_goblin")], 1, 2, 4],
  ["Ossos de Guerreiro", [I("guerreiro_esqueletico")], 4, 7, 2],
];
const DELIVERIES = [
  [I("engrenagem_runica"), 3, 5, 3], [I("lingote_mithril"), 4, 8, 3], [I("cristal_aetherita"), 4, 6, 3], [I("pena_grifo"), 3, 5, 2],
  [I("escama_dragao"), 1, 2, 4], [I("veu_sombrio"), 1, 2, 4], [I("insignia_goblin"), 10, 16, 2],
];
const CAMPAIGNS = [
  ["Bandeira do Rei", "limpar", "acampamento", "Liberte um Acampamento Goblin em nome da Coroa", 1],
  ["Torre Esquecida", "limpar", "torre", "Liberte uma Torre do Mago em Ruínas", 1],
  ["Paz aos Mortos", "limpar", "cripta", "Liberte uma Cripta Ancestral", 2],
  ["O Juramento de Durgan", "limpar", "kardum", "Liberte as Ruínas de Kar'Dum", 3],
];
function itemName(id) {
  return ITEM_DATA[id]?.n?.replace(/§./g, "") || id.replace("minecraft:", "").replace(/_/g, " ");
}
export function royal(player) {
  const d = npcData(player);
  d.npc.real = d.npc.real || { dia: -1, ofertas: [], ativas: [], feitos: 0, feitosHoje: [] };
  return d.npc.real;
}
function offers(player) {
  const g = royal(player);
  if (g.dia === today() && g.ofertas.length) return g.ofertas;
  const r = rng(today() * 104729 + [...player.id].reduce((a, c) => a + c.charCodeAt(0), 7));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const out = [];
  const [hn, alvos, a, b, s] = pick(HUNTS);
  const nh = a + Math.floor(r() * (b - a + 1));
  out.push({ id: `r${today()}a`, tipo: "abate", nome: hn, alvos, n: nh, desc: `Derrote ${nh} ${hn.includes("Cabeças") ? "chefes goblins" : "inimigos do reino"}`,
    selos: s >= 3 ? 2 : 1, moedas: 40 + nh * 12, xp: 150 + nh * 25 });
  const [item, da, db, dw] = pick(DELIVERIES);
  const nd = da + Math.floor(r() * (db - da + 1));
  out.push({ id: `r${today()}b`, tipo: "entregar", nome: `Requisição Real: ${itemName(item)}`, item, n: nd, desc: `Entregue ${nd}× ${itemName(item)}`,
    selos: dw >= 4 ? 2 : 1, moedas: 30 + nd * dw * 6, xp: 120 + nd * 15 });
  const [cn, ev, alvo, desc, cs] = pick(CAMPAIGNS);
  out.push({ id: `r${today()}c`, tipo: "evento", nome: cn, ev, alvo, n: 1, desc, selos: cs, moedas: 120 * cs, xp: 400 * cs });
  g.dia = today();
  g.ofertas = out;
  g.feitosHoje = [];
  markDirty(player);
  return out;
}
const progress = (player, c) => (c.tipo === "entregar" ? Math.min(countItem(player, c.item), c.n) : Math.min(c.p || 0, c.n));
export function royalLines(player) {
  return royal(player).ativas.map((c) => `§6${c.nome} §8(Coroa)\n§7${c.desc} §f(${progress(player, c)}/${c.n})`);
}

export async function royalMenu(player, back) {
  const g = royal(player);
  const list = offers(player);
  const f = new ActionFormData().title("Missões Reais")
    .body(`§7A Chancelaria registra os serviços prestados à Coroa.\n§fMissões concluídas: §e${g.feitos}§7 · Selos Reais: §6${countItem(player, SELO)}\n` +
      `§7Ativas: ${g.ativas.length}/${MAX_ACTIVE}. Novas missões a cada amanhecer.`);
  const acts = [];
  for (const c of g.ativas) {
    const p = progress(player, c);
    f.button(`${p >= c.n ? "§a§lEntregar: " : "§e"}${c.nome}§r\n§7${c.desc} (${p}/${c.n})`, "textures/items/valdoria/selo_real");
    acts.push(() => turnIn(player, c, back));
  }
  for (const c of list) {
    if (g.ativas.some((a) => a.id === c.id) || (g.feitosHoje || []).includes(c.id)) continue;
    f.button(`§2${c.nome}\n§7${c.selos} Selo${c.selos > 1 ? "s" : ""} Real${c.selos > 1 ? "is" : ""} · ${c.moedas} moedas`);
    acts.push(() => offer(player, c, back));
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= acts.length) return back && back(player);
  return acts[r.selection]();
}
async function offer(player, c, back) {
  const g = royal(player);
  const m = new MessageFormData().title(c.nome)
    .body(`§f${c.desc}.\n\n§6Recompensa: §f${c.selos} Selo(s) Real(is), ${c.moedas} moedas, ${c.xp} XP e reputação`).button1("§lAceitar").button2("Voltar");
  const k = await show(player, m);
  if (!k.canceled && k.selection === 0) {
    if (g.ativas.length >= MAX_ACTIVE) say(player, `§cA Chancelaria só confia ${MAX_ACTIVE} missões por vez.`);
    else {
      g.ativas.push({ ...c, p: 0 });
      markDirty(player);
      say(player, `§6[Coroa] §fMissão aceita: ${c.nome}`);
    }
  }
  return royalMenu(player, back);
}
async function turnIn(player, c, back) {
  const g = royal(player);
  if (progress(player, c) < c.n) {
    const m = new MessageFormData().title(c.nome).body(`§7${c.desc}.\n§fProgresso: ${progress(player, c)}/${c.n}`).button1("Voltar").button2("§cDesistir");
    const k = await show(player, m);
    if (!k.canceled && k.selection === 1) {
      g.ativas = g.ativas.filter((a) => a.id !== c.id);
      markDirty(player);
    }
    return royalMenu(player, back);
  }
  if (c.tipo === "entregar" && !takeItem(player, c.item, c.n)) return royalMenu(player, back);
  completeRoyal(player, c);
  return royalMenu(player, back);
}
/** Conclui uma Missão Real (recompensas e progresso da Crônica IV). */
export function completeRoyal(player, c) {
  const g = royal(player);
  g.ativas = g.ativas.filter((a) => a.id !== c.id);
  g.feitosHoje = (g.feitosHoje || []).concat([c.id]);
  g.feitos++;
  markDirty(player);
  giveItem(player, new ItemStack(SELO, c.selos));
  addCoins(player, c.moedas, "missão real");
  addXP(player, c.xp, "Coroa");
  addRep(player, 10);
  particle(player.dimension, "nivel_anel", player.location);
  psound(player, "random.levelup", 1, 1.2);
  say(player, `§6[Coroa] §fMissão concluída: ${c.nome}. §7+${c.selos} Selo(s) Real(is). (${g.feitos} serviços à Coroa)`);
  if (g.feitos >= PROVAS && !getData(player).flags?.provas_reais) {
    setFlag(player, "provas_reais");
    say(player, "§6[Coroa] §fO Chanceler anota seu nome no Livro de Honra: o Rei quer vê-lo no Salão do Trono.");
  }
  saveNow(player);
}

// ------------------------------------------------------------------ Tesouro Real (troca de Selos)
/** @type {[string, number, number][]} */
const TREASURY = [
  [I("pedra_aprimoramento"), 3, 2], [I("lingote_mithril"), 6, 2], [I("cristal_aetherita"), 4, 2], [I("pocao_energia"), 4, 1],
  [I("escritura_cavalo"), 1, 4], [I("elixir_renascimento"), 1, 5], [I("amuleto_fortuna"), 1, 6], [I("grimorio_arquimago"), 1, 9],
];
export async function treasuryMenu(player, back) {
  const have = countItem(player, SELO);
  const f = new ActionFormData().title("Tesouro Real").body(`§7Troque Selos Reais por favores da Coroa.\n§fVocê tem §6${have}§f Selo(s).`);
  for (const [id, n, cost] of TREASURY) f.button(`${n > 1 ? `${n}× ` : ""}${itemName(id)}\n${have >= cost ? "§6" : "§c"}${cost} Selo(s)`, `textures/items/valdoria/${id.split(":")[1]}`);
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= TREASURY.length) return back && back(player);
  const [id, n, cost] = TREASURY[r.selection];
  if (countItem(player, SELO) < cost || !takeItem(player, SELO, cost)) {
    say(player, `§cVocê precisa de ${cost} Selo(s) Real(is).`);
    psound(player, "mob.villager.no", 1, 0.8);
  } else {
    giveItem(player, new ItemStack(id, n));
    say(player, `§6[Tesouro Real] §f${n}× ${itemName(id)} §7(-${cost} Selos)`);
    psound(player, "random.orb", 1, 1);
  }
  return treasuryMenu(player, back);
}

// ------------------------------------------------------------------ o Rei: Audiência e Sagração
const AUDIENCE = [
  "§6Rei Aldemar III: §f\"Então você é o portador do Sigilo. Os relatos chegaram antes de você: o Titã, Malachar, Ignaroth... e Vaelith.\"",
  "§6Rei Aldemar III: §f\"Os fragmentos do Coração de Aetherita voltaram a pulsar. Meus magos sentem o eco nos quatro cantos do reino.\"",
  "§6Rei Aldemar III: §f\"Os elfos de Aelthar fecharam suas fronteiras, e algo se move no Reino Sombrio. Valdoria precisa de um campeão.\"",
  "§6Rei Aldemar III: §f\"Prove seu valor à Coroa. Procure o Chanceler: ele tem missões que meus cavaleiros não conseguem cumprir.\"",
];
export function audience(player) {
  const d = getData(player);
  for (const [i, l] of AUDIENCE.entries()) system.runTimeout(() => ok(player) && say(player, l), i * 50);
  markLoreRead(player, "aurendel", true);
  if (!d.flags?.audiencia) {
    setFlag(player, "audiencia");
    addRep(player, 20, "audiência com o Rei");
  }
}
export function canKnight(player) {
  const f = getData(player).flags || {};
  return !!f.provas_reais && !f.cavaleiro;
}
export function knight(player, npc) {
  if (!canKnight(player)) return false;
  setFlag(player, "cavaleiro");
  addRep(player, 100, "Sagração");
  for (const piece of ["capacete", "peitoral", "calcas", "botas"]) giveItem(player, new ItemStack(I(`real_${piece}`), 1));
  giveItem(player, new ItemStack(SELO, 2));
  addXP(player, 1500, "Sagração");
  const dim = player.dimension;
  if (npc && ok(npc)) {
    try {
      npc.setProperty(`${NS}:anim`, 1);
      system.runTimeout(() => { try { if (ok(npc)) npc.setProperty(`${NS}:anim`, 0); } catch { /* */ } }, 60);
    } catch { /* */ }
  }
  particle(dim, "nivel_anel", player.location);
  particle(dim, "sagrado_pilar", player.location, {});
  particle(dim, "sagrado_explosao", V.up(player.location, 1), { radius: 2 });
  sound(dim, "random.levelup", player.location, 1, 0.8);
  sound(dim, "block.bell.hit", player.location, 1, 1);
  player.onScreenDisplay.setTitle("§6Cavaleiro de Valdoria", { subtitle: "§7\"Levante-se, Sir... levante-se, campeão do reino.\"",
    fadeInDuration: 10, stayDuration: 70, fadeOutDuration: 20 });
  world.sendMessage(`§6[Valdoria] §f${player.name} foi sagrado Cavaleiro de Valdoria pelo Rei Aldemar III!`);
  saveNow(player);
  return true;
}
export async function kingMenu(player, npc, back) {
  const f = getData(player).flags || {};
  const opts = [];
  opts.push(["Pedir audiência", () => {
    audience(player);
  }]);
  if (canKnight(player)) opts.push(["§6Ajoelhar-se para a Sagração", () => knight(player, npc)]);
  const g = royal(player);
  const body = f.cavaleiro ? "§6Você é Cavaleiro de Valdoria. §7A Coroa conta com você." :
    f.provas_reais ? "§fO Chanceler falou bem de você. Ajoelhe-se, e eu o farei cavaleiro." :
      f.audiencia ? `§7Serviços prestados à Coroa: §f${g.feitos}/${PROVAS}§7. Fale com o Chanceler.` : "§7O Rei o observa em silêncio.";
  const form = new ActionFormData().title("Rei Aldemar III").body(body);
  for (const [l] of opts) form.button(l);
  form.button("Voltar");
  const r = await show(player, form);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= opts.length) return back && back(player);
  await opts[r.selection][1]();
  return back && back(player);
}

// ------------------------------------------------------------------ início
export function startCapital() {
  system.runInterval(() => {
    try { sectionLoop(); } catch (e) { console.warn(`[Valdoria] Aurendel: ${e}`); }
  }, 40);
  onKill((ev) => {
    let killer = ev.damageSource.damagingEntity;
    if (killer && !isPlayer(killer)) killer = summonOwner(killer);
    if (!isPlayer(killer)) return;
    let tid;
    try { tid = ev.deadEntity.typeId; } catch { return; }
    const g = royal(killer);
    for (const c of g.ativas) {
      if (c.tipo !== "abate" || !c.alvos.includes(tid) || c.p >= c.n) continue;
      c.p++;
      markDirty(killer);
      killer.onScreenDisplay.setActionBar(`§6Coroa - ${c.nome}: §f${c.p}/${c.n}`);
    }
  });
  onQuestEvent((player, ev, alvo) => {
    const g = royal(player);
    for (const c of g.ativas) {
      if (c.tipo !== "evento" || c.ev !== ev || c.alvo !== alvo || c.p >= c.n) continue;
      c.p++;
      markDirty(player);
      player.onScreenDisplay.setActionBar(`§6Coroa - ${c.nome}: §f${c.p}/${c.n}`);
    }
  });
}
