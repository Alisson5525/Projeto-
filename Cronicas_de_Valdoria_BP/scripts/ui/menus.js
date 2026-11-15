// Interfaces (formulários) do Diário do Aventureiro e da Mesa Rúnica.
import { companionMenu } from "../companions/companions.js";
import { system, world, PlayerPermissionLevel } from "@minecraft/server";
import { ActionFormData, ModalFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { stableMenu } from "../mounts/mounts.js";
import { NS, say, countItem, takeItem, fmt, pct, bar, inventory } from "../core/util.js";
import { psound, particle } from "../core/fx.js";
import { getData, markDirty, saveNow, ATTRS, ATTR_NAMES, ATTR_DESC, resetData, getWorldCfg, setWorldCfg } from "../core/store.js";
import { stats, invalidate, ELEMENT_NAMES, activeBuffs } from "../rpg/stats.js";
import { xpToNext, MAX_LEVEL, biomeName } from "../rpg/progression.js";
import { RACAS, RACE_ORDER } from "../data/races.js";
import { CLASSES, SPECS, CLASS_LEVEL, SPEC_LEVEL } from "../data/classes.js";
import { ABILITIES, cooldownLeft } from "../abilities/registry.js";
import { SPELLS, SCHOOLS, spellReq } from "../magic/spells.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { ACC_SLOTS, ACC_SLOT_NAMES, equipAccessory, unequipAccessory, upgradeHeld, applyRune, disassembleHeld, upgradeCost, getUpgrade, maxUpgrade } from "../items/equipment.js";
import { RUNE_ELEMENT } from "../combat/weapons.js";
import { CHAPTER, CONTRACTS, LORE_INTRO, chapterProgress, completeChapterStep, contractState, acceptContract, abandonContract, turnInContract, setFlag, MAX_ACTIVE } from "../quests/quests.js";
import { unlockedAbilities, racialUnlockLevel } from "../abilities/selection.js";
import { testMenu, canTest } from "./teste.js";
import { placesMenu, libraryMenu } from "./codex.js";
import { npcData, repRank, guildRank, transferMenu } from "../npc/economy.js";
import { questLines } from "../npc/missions.js";
import { guildLines } from "../npc/guild.js";
import { royalLines } from "../npc/capital.js";
import { LORE } from "../data/lore.js";
import { explorationMenu } from "../exploration/menu.js";

const ICON = (id) => `textures/items/valdoria/${id}`;

/** Exibe um formulário tentando novamente se o jogador estiver ocupado (ex.: com o chat aberto). */
async function show(player, form, tries = 0) {
  try {
    const r = await form.show(player);
    if (r.canceled && r.cancelationReason === FormCancelationReason.UserBusy && tries < 20) {
      await new Promise((res) => system.runTimeout(() => res(undefined), 10));
      return show(player, form, tries + 1);
    }
    return r;
  } catch (e) {
    console.warn(`[Valdoria] formulário: ${e}`);
    return { canceled: true };
  }
}

async function notice(player, title, body, back) {
  const f = new MessageFormData().title(title).body(body).button1("§lOK").button2("Voltar");
  const r = await show(player, f);
  if (!r.canceled && r.selection === 1 && back) back(player);
}

// ====================================================================== MENU PRINCIPAL
export async function openMainMenu(player) {
  const d = getData(player);
  const s = stats(player);
  const race = d.raca ? RACAS[d.raca] : null;
  const cls = d.classe ? CLASSES[d.classe] : null;
  const pr = chapterProgress(player);
  const body = [
    `${race ? `${race.cor}${race.nome}` : "§7Sem raça"}${cls ? ` §f· §b${cls.nome}` : ""}${d.espec ? ` §d(${SPECS[d.espec].nome})` : ""}`,
    `§6Nível ${d.nivel}${d.nivel >= MAX_LEVEL ? " (máx.)" : ""}  §7XP ${d.xp}/${xpToNext(d.nivel)}`,
    `${bar(d.xp / xpToNext(d.nivel), 20, "§e", "§8")}`,
    `§9Energia ${Math.floor(d.energia)}/${s.energyMax}   §aPontos livres: ${d.pontos}`,
    pr.done ? "§6» Objetivo da Crônica concluído - veja Missões!" : "",
  ].filter(Boolean).join("\n");
  const f = new ActionFormData().title("§lDiário do Aventureiro").body(body);
  const opts = [];
  const add = (label, icon, fn) => { f.button(label, icon); opts.push(fn); };
  if (!d.raca) add("§l§6Escolher Raça", ICON("sigilo_aventureiro"), raceMenu);
  add("Ficha do Personagem", ICON("diario_aventureiro"), sheetMenu);
  add(`Atributos${d.pontos ? ` §a(+${d.pontos})` : ""}`, ICON("pedra_aprimoramento"), attributesMenu);
  if (d.raca) add("Raça", RACAS[d.raca].icone, raceInfo);
  add(d.classe ? "Classe" : `Classe ${d.nivel >= CLASS_LEVEL ? "§a(disponível)" : `§7(nível ${CLASS_LEVEL})`}`, ICON("espada_longa_aco"), classMenu);
  add("Grimório de Feitiços", ICON("grimorio_arquimago"), grimoireMenu);
  add("Habilidades do Sigilo", ICON("sigilo_aventureiro"), abilitiesMenu);
  add("Acessórios", ICON("amuleto_arcano"), accessoriesMenu);
  add(`Missões e Contratos${pr.done ? " §6(!)" : ""}`, ICON("insignia_goblin"), questsMenu);
  add("Exploração e Rumores", ICON("fragmento_mapa"), (p) => explorationMenu(p, openMainMenu));
  add(`Bolsa e Reputação §8(${npcData(player).moedas} moedas)`, ICON("moeda_ouro"), purseMenu);
  add("Estábulo (montarias)", ICON("escritura_cavalo"), (p) => stableMenu(p, openMainMenu));
  add("Companheiros", ICON("apito_companheiro"), (p) => companionMenu(p, openMainMenu));
  add("Códex", ICON("cristal_aetherita"), codexMenu);
  add("Guia do Aventureiro", ICON("pocao_energia"), guideMenu);
  add("Configurações", ICON("runa_luz"), settingsMenu);
  if (canTest(player)) add("§6§lModo de Teste", ICON("idolo_tita"), testMenu);
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  await opts[r.selection](player);
}

// ====================================================================== FICHA
async function sheetMenu(player) {
  const d = getData(player);
  invalidate(player);
  const s = stats(player);
  const lines = [];
  lines.push("§l§6Atributos§r");
  for (const a of ATTRS) lines.push(`§f${ATTR_NAMES[a]}: §e${s.attrs[a]} §7(investidos: ${d.attr[a]})`);
  lines.push("", "§l§6Combate§r");
  lines.push(`§7Dano corpo a corpo: §f×${fmt(s.melee, 2)}   §7À distância: §f×${fmt(s.ranged, 2)}`);
  lines.push(`§7Poder mágico: §f×${fmt(s.spell, 2)}   §7Cura: §f×${fmt(s.heal, 2)}`);
  lines.push(`§7Crítico: §f${pct(s.crit)} §7(×${fmt(s.critDmg, 2)})   §7Esquiva: §f${pct(s.dodge)}`);
  lines.push(`§7Redução física: §f${pct(s.dr)}   §7mágica: §f${pct(s.mdr)}`);
  lines.push(`§7Vida extra: §f+${s.hpLevels * 4} pontos   §7Recarga reduzida: §f${pct(s.cdr)}`);
  lines.push(`§7Energia: §f${s.energyMax} §7(+${fmt(s.energyRegen, 1)}/s)   §7Roubo de vida: §f${pct(s.lifesteal)}`);
  const el = Object.keys(ELEMENT_NAMES).filter((k) => Math.abs(s.elem[k] - 1) > 0.001 || Math.abs(s.res[k]) > 0.001)
    .map((k) => `§7${ELEMENT_NAMES[k]}: §f${s.elem[k] !== 1 ? `${s.elem[k] > 1 ? "+" : ""}${Math.round((s.elem[k] - 1) * 100)}% dano ` : ""}${s.res[k] ? `§${s.res[k] > 0 ? "a" : "c"}${Math.round(s.res[k] * 100)}% resist.` : ""}`);
  if (el.length) lines.push("", "§l§6Elementos§r", ...el);
  if (s.sets.length) lines.push("", "§l§6Conjuntos§r", ...s.sets.map((x) => `§f${x}`));
  const b = activeBuffs(player).filter((x) => x.name);
  if (b.length) lines.push("", "§l§6Efeitos ativos§r", ...b.map((x) => `§f${x.name} §7(${Math.ceil(x.left / 20)}s)`));
  lines.push("", `§7Chefes derrotados: §f${d.chefes}   §7Regiões: §f${d.desc.biomas.length}`);
  await notice(player, "Ficha do Personagem", lines.join("\n"), openMainMenu);
}

// ====================================================================== ATRIBUTOS
async function attributesMenu(player) {
  const d = getData(player);
  const s = stats(player);
  if (d.pontos <= 0) {
    return notice(player, "Atributos", "§7Você não tem pontos livres.\nGanhe §e3 pontos§7 a cada nível.\n\n" +
      ATTRS.map((a) => `§f${ATTR_NAMES[a]} §e${s.attrs[a]} §7- ${ATTR_DESC[a]}`).join("\n"), openMainMenu);
  }
  const f = new ModalFormData().title(`Distribuir ${d.pontos} pontos`);
  for (const a of ATTRS) {
    f.slider(`§f${ATTR_NAMES[a]} §e(${s.attrs[a]})§7 - ${ATTR_DESC[a]}`, 0, Math.min(d.pontos, 100 - d.attr[a]), { valueStep: 1, defaultValue: 0 });
  }
  f.submitButton("Confirmar");
  const r = await show(player, f);
  if (r.canceled || !r.formValues) return openMainMenu(player);
  const vals = r.formValues.filter((v) => typeof v === "number");
  const total = vals.reduce((a, b) => a + b, 0);
  if (total === 0) return openMainMenu(player);
  if (total > d.pontos) {
    say(player, `§cVocê distribuiu ${total} pontos, mas só tem ${d.pontos}.`);
    return attributesMenu(player);
  }
  ATTRS.forEach((a, i) => { d.attr[a] += vals[i] || 0; });
  d.pontos -= total;
  markDirty(player);
  saveNow(player);
  invalidate(player);
  psound(player, "random.orb", 1.2, 1);
  say(player, `§a${total} pontos distribuídos.`);
  return openMainMenu(player);
}

// ====================================================================== RAÇAS
export async function raceMenu(player) {
  const d = getData(player);
  if (d.raca) return raceInfo(player);
  const f = new ActionFormData().title("§lEscolha sua Raça").body(`${LORE_INTRO}\n\n§fCada raça muda seus atributos, passivas, habilidades e afinidades regionais. §cA escolha é permanente §7(exceto com o Elixir do Renascimento).`);
  for (const id of RACE_ORDER) f.button(`${RACAS[id].cor}§l${RACAS[id].nome}§r\n§8${RACAS[id].regiao}`, RACAS[id].icone);
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  const id = RACE_ORDER[r.selection];
  const R = RACAS[id];
  const ab = R.habilidades.map((h, i) => `§e${ABILITIES[h]?.nome} §7(nível ${racialUnlockLevel(i)}): ${ABILITIES[h]?.desc}`).join("\n");
  const base = Object.entries(R.base).map(([k, v]) => `${v > 0 ? "§a+" : "§c"}${v} ${ATTR_NAMES[k]}`).join("§7, ");
  const m = new MessageFormData().title(`${R.cor}${R.nome}`).body(`§7${R.desc}\n\n§6Atributos: ${base}\n\n§aVantagens:\n§f- ${R.vantagens.join("\n- ")}\n\n§cDesvantagens:\n§f- ${R.desvantagens.join("\n- ")}\n\n§6Região natal: §f${R.regiao}\n\n§6Habilidades:\n${ab}`)
    .button1(`§lEscolher ${R.nome}`).button2("Voltar");
  const c = await show(player, m);
  if (c.canceled || c.selection !== 0) return raceMenu(player);
  d.raca = id;
  markDirty(player);
  saveNow(player);
  invalidate(player);
  particle(player.dimension, "nivel_anel", player.location);
  particle(player.dimension, "nivel", player.location);
  psound(player, "random.totem", 1, 0.6);
  player.onScreenDisplay.setTitle(`${R.cor}§l${R.nome}`, { subtitle: "§7Sua jornada em Valdoria começa", fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 15 });
  say(player, `§aVocê agora é um(a) ${R.cor}${R.nome}§a! Use o §bSigilo do Aventureiro§a para suas habilidades.`);
}

async function raceInfo(player) {
  const d = getData(player);
  const R = RACAS[d.raca];
  const ab = R.habilidades.map((h, i) => `${d.nivel >= racialUnlockLevel(i) ? "§a" : "§8"}${ABILITIES[h]?.nome} §7(nv ${racialUnlockLevel(i)}): ${ABILITIES[h]?.desc}`).join("\n");
  await notice(player, `${R.cor}${R.nome}`, `§7${R.desc}\n\n§aVantagens:\n§f- ${R.vantagens.join("\n- ")}\n\n§cDesvantagens:\n§f- ${R.desvantagens.join("\n- ")}\n\n§6Região natal: §f${R.regiao}\n\n§6Habilidades:\n${ab}`, openMainMenu);
}

// ====================================================================== CLASSES
async function classMenu(player) {
  const d = getData(player);
  if (d.classe) {
    if (!d.espec && d.nivel >= SPEC_LEVEL && d.chefes > 0) return specMenu(player);
    const C = CLASSES[d.classe];
    const ab = C.habilidades.map(([h, lv]) => `${d.nivel >= lv ? "§a" : "§8"}${ABILITIES[h].nome} §7(nv ${lv}): ${ABILITIES[h].desc}`).join("\n");
    const sp = d.espec ? `\n\n§dEspecialização: ${SPECS[d.espec].nome}\n§7${SPECS[d.espec].desc}` :
      `\n\n§7Especializações no nível ${SPEC_LEVEL} após derrotar um chefe: ${C.specs.map((x) => SPECS[x].nome).join(", ")}`;
    return notice(player, `§b${C.nome}`, `§7${C.desc}\n\n§aVantagens: §f${C.vantagens.join("; ")}\n§cLimitações: §f${C.limites.join("; ")}\n§6Equipamento ideal: §f${C.equip}\n\n§6Habilidades:\n${ab}${sp}`, openMainMenu);
  }
  const ids = Object.keys(CLASSES);
  const f = new ActionFormData().title("§lClasses").body(d.nivel >= CLASS_LEVEL ? "§fEscolha um estilo de jogo. Você ganha habilidades nos níveis 5, 10 e 20." :
    `§7Você poderá escolher uma classe no §enível ${CLASS_LEVEL}§7. Conheça as opções:`);
  for (const id of ids) f.button(`§l${CLASSES[id].nome}§r\n§8${CLASSES[id].recomendado.map((a) => ATTR_NAMES[a]).join(", ")}`, CLASSES[id].icone);
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return openMainMenu(player);
  const id = ids[r.selection];
  const C = CLASSES[id];
  const ab = C.habilidades.map(([h, lv]) => `§e${ABILITIES[h].nome} §7(nv ${lv}): ${ABILITIES[h].desc}`).join("\n");
  const m = new MessageFormData().title(`§b${C.nome}`).body(`§7${C.desc}\n\n§6Atributos recomendados: §f${C.recomendado.map((a) => ATTR_NAMES[a]).join(", ")}\n§aVantagens: §f${C.vantagens.join("; ")}\n§cLimitações: §f${C.limites.join("; ")}\n§6Equipamento ideal: §f${C.equip}\n\n§6Habilidades:\n${ab}\n\n§6Especializações: §f${C.specs.map((x) => SPECS[x].nome).join(" ou ")}`)
    .button1(d.nivel >= CLASS_LEVEL ? `§lTornar-se ${C.nome}` : "OK").button2("Voltar");
  const c = await show(player, m);
  if (c.canceled || c.selection !== 0 || d.nivel < CLASS_LEVEL) return classMenu(player);
  d.classe = id;
  markDirty(player);
  saveNow(player);
  invalidate(player);
  particle(player.dimension, "nivel_anel", player.location);
  psound(player, "random.levelup", 1.2, 0.8);
  say(player, `§aVocê agora é um(a) §b${C.nome}§a! Novas habilidades no Sigilo.`);
}

async function specMenu(player) {
  const d = getData(player);
  const C = CLASSES[d.classe];
  const f = new ActionFormData().title("§lEspecialização").body("§fSua experiência permite aprofundar seu caminho. Escolha com cuidado - é permanente.");
  for (const id of C.specs) f.button(`§l${SPECS[id].nome}§r\n§8${SPECS[id].desc}`);
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return openMainMenu(player);
  d.espec = C.specs[r.selection];
  markDirty(player);
  saveNow(player);
  invalidate(player);
  psound(player, "random.totem", 1.2, 0.6);
  say(player, `§dEspecialização adquirida: ${SPECS[d.espec].nome}`);
}

// ====================================================================== GRIMÓRIO
async function grimoireMenu(player) {
  const d = getData(player);
  const slots = d.grimorio.map((id, i) => `§7${i + 1}. §f${id ? ABILITIES[id].nome : "§8(vazio)"}`).join("\n");
  const f = new ActionFormData().title("§lGrimório").body(`§fFeitiços aprendidos: §e${d.magias.length}\n\n§6Feitiços preparados:\n${slots}\n\n§7Segure um cajado/varinha: §fusar§7 lança o feitiço selecionado, §fagachar + usar§7 troca.`)
    .button("Aprender feitiços", ICON("essencia_arcana"))
    .button("Preparar feitiços (4 espaços)", ICON("grimorio_arquimago"))
    .button("Voltar");
  const r = await show(player, f);
  if (r.canceled) return;
  if (r.selection === 0) return schoolsMenu(player);
  if (r.selection === 1) return prepareMenu(player);
  return openMainMenu(player);
}

async function schoolsMenu(player) {
  const ids = Object.keys(SCHOOLS);
  const d = getData(player);
  const f = new ActionFormData().title("Escolas Mágicas").body("§7Requisitos: nível, Inteligência e Essências Arcanas. Feitiços combinados exigem o §dGrimório do Arquimago§7.");
  for (const id of ids) {
    const total = Object.values(SPELLS).filter((s) => s.school === id).length;
    const known = d.magias.filter((m) => SPELLS[m]?.school === id).length;
    f.button(`${SCHOOLS[id].cor}§l${SCHOOLS[id].nome}§r §8(${known}/${total})`, SCHOOLS[id].icone);
  }
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return grimoireMenu(player);
  return spellListMenu(player, ids[r.selection]);
}

function canLearn(player, id) {
  const d = getData(player);
  const s = stats(player);
  const req = spellReq(id);
  const sp = SPELLS[id];
  const problems = [];
  if (d.nivel < req.nivel) problems.push(`nível ${req.nivel}`);
  if (s.attrs.int < req.int) problems.push(`Inteligência ${req.int}`);
  if (countItem(player, `${NS}:essencia_arcana`) < req.essencia) problems.push(`${req.essencia} Essência Arcana`);
  if (req.cristal && countItem(player, `${NS}:cristal_aetherita`) < req.cristal) problems.push("1 Cristal de Aetherita");
  if (sp.combo) {
    for (const sc of sp.combo) if (!d.magias.some((m) => SPELLS[m]?.school === sc && !SPELLS[m].combo)) problems.push(`conhecer um feitiço ${SCHOOLS[sc].nome}`);
  }
  return problems;
}

async function spellListMenu(player, school) {
  const d = getData(player);
  const list = Object.values(SPELLS).filter((s) => s.school === school).sort((a, b) => a.nivel - b.nivel);
  const f = new ActionFormData().title(`${SCHOOLS[school].cor}Escola ${SCHOOLS[school].nome}`);
  for (const sp of list) {
    const known = d.magias.includes(sp.id);
    const prob = known ? [] : canLearn(player, sp.id);
    f.button(`${known ? "§2" : prob.length ? "§8" : "§6"}${ABILITIES[sp.id].nome}${sp.combo ? " §d(combo)" : ""}\n§8Nv ${sp.nivel} · ${known ? "aprendido" : prob.length ? "bloqueado" : "pode aprender"}`);
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined || r.selection >= list.length) return schoolsMenu(player);
  const sp = list[r.selection];
  const ab = ABILITIES[sp.id];
  const req = spellReq(sp.id);
  const known = d.magias.includes(sp.id);
  const prob = known ? [] : canLearn(player, sp.id);
  const body = `§7${ab.desc}\n\n§fCusto: §b${ab.hpCost ? `${Math.round(ab.hpCost * 100)}% da vida` : `${ab.cost} energia`}§f · Recarga: §e${ab.cd}s§f · Alcance: §a${ab.alcance ?? "-"}\n` +
    `§fPreparação: §e${((ab.prep || 0) / 20).toFixed(1)}s\n\n§6Requisitos: §fnível ${req.nivel}, Inteligência ${req.int}, ${req.essencia} Essência Arcana${req.cristal ? ", 1 Cristal de Aetherita" : ""}` +
    `${sp.combo ? `\n§dCombinação: ${sp.combo.map((c) => SCHOOLS[c].nome).join(" + ")} (lançada com o Grimório do Arquimago)` : ""}` +
    (known ? "\n\n§2Você já conhece este feitiço." : prob.length ? `\n\n§cFalta: ${prob.join(", ")}` : "\n\n§aVocê pode aprender agora!");
  const m = new MessageFormData().title(ab.nome).body(body).button1(!known && !prob.length ? "§lAprender" : "OK").button2("Voltar");
  const c = await show(player, m);
  if (!c.canceled && c.selection === 0 && !known && !prob.length) {
    takeItem(player, `${NS}:essencia_arcana`, req.essencia);
    if (req.cristal) takeItem(player, `${NS}:cristal_aetherita`, req.cristal);
    d.magias.push(sp.id);
    const empty = d.grimorio.indexOf(null);
    if (empty >= 0) d.grimorio[empty] = sp.id;
    markDirty(player);
    saveNow(player);
    particle(player.dimension, "cor_circulo_magico", player.location, { color: sp.school, radius: 1.5 });
    psound(player, "block.enchanting_table.use", 1, 1);
    say(player, `§aFeitiço aprendido: §f${ab.nome}${empty >= 0 ? ` §7(preparado no espaço ${empty + 1})` : ""}`);
  }
  return spellListMenu(player, school);
}

async function prepareMenu(player) {
  const d = getData(player);
  if (!d.magias.length) return notice(player, "Grimório", "§7Você ainda não aprendeu feitiços.", grimoireMenu);
  const opts = ["(vazio)"].concat(d.magias.map((m) => ABILITIES[m].nome));
  const f = new ModalFormData().title("Preparar feitiços");
  for (let i = 0; i < 4; i++) {
    const cur = d.grimorio[i] ? d.magias.indexOf(d.grimorio[i]) + 1 : 0;
    f.dropdown(`Espaço ${i + 1}`, opts, { defaultValueIndex: Math.max(0, cur) });
  }
  const r = await show(player, f);
  if (r.canceled || !r.formValues) return grimoireMenu(player);
  const vals = r.formValues.filter((v) => typeof v === "number");
  d.grimorio = vals.slice(0, 4).map((v) => (v > 0 ? d.magias[v - 1] : null));
  d.magiaSel = 0;
  markDirty(player);
  say(player, "§aGrimório atualizado.");
  return grimoireMenu(player);
}

// ====================================================================== HABILIDADES
async function abilitiesMenu(player) {
  const d = getData(player);
  const list = unlockedAbilities(player);
  if (!list.length) return notice(player, "Habilidades", "§7Escolha uma raça para desbloquear suas primeiras habilidades.", openMainMenu);
  const f = new ActionFormData().title("Habilidades do Sigilo").body("§7Escolha a habilidade ativa do §bSigilo do Aventureiro§7. Agachar + usar o Sigilo também alterna.");
  list.forEach((id, i) => {
    const ab = ABILITIES[id];
    const cd = cooldownLeft(player, id);
    f.button(`${i === d.habSel ? "§2» " : ""}§l${ab.nome}§r\n§8${ab.tipo === "raca" ? "Racial" : "Classe"} · ${ab.cost} energia · ${ab.cd}s${cd ? ` · ${Math.ceil(cd / 20)}s` : ""}`);
  });
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return openMainMenu(player);
  const id = list[r.selection];
  const ab = ABILITIES[id];
  d.habSel = r.selection;
  markDirty(player);
  await notice(player, ab.nome, `§7${ab.desc}\n\n§fCusto: §b${ab.cost} energia §f· Recarga: §e${ab.cd}s\n\n§aSelecionada para o Sigilo.`, abilitiesMenu);
}

// ====================================================================== ACESSÓRIOS
async function accessoriesMenu(player) {
  const d = getData(player);
  const keys = Object.keys(ACC_SLOTS);
  const f = new ActionFormData().title("Acessórios").body("§7Acessórios equipados concedem bônus permanentes enquanto estiverem nestes espaços.");
  for (const k of keys) {
    const id = d.acess[k];
    f.button(`§l${ACC_SLOT_NAMES[k]}§r\n§8${id ? ITEM_DATA[id]?.n : "vazio"}`, id ? `textures/items/valdoria/${id.split(":")[1]}` : undefined);
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined || r.selection >= keys.length) return openMainMenu(player);
  const slot = keys[r.selection];
  const inv = inventory(player);
  const options = [];
  for (let i = 0; i < inv.size; i++) {
    const it = inv.getItem(i);
    const info = it && ITEM_DATA[it.typeId];
    if (info && info.k === "accessory" && info.slot === ACC_SLOTS[slot] && !options.includes(it.typeId)) options.push(it.typeId);
  }
  const g = new ActionFormData().title(ACC_SLOT_NAMES[slot]).body(options.length ? "§7Escolha um acessório do inventário:" : "§7Nenhum acessório compatível no inventário.");
  for (const id of options) g.button(ITEM_DATA[id].n, `textures/items/valdoria/${id.split(":")[1]}`);
  if (d.acess[slot]) g.button("§cRemover atual");
  g.button("Voltar");
  const c = await show(player, g);
  if (c.canceled || c.selection === undefined) return accessoriesMenu(player);
  if (c.selection < options.length) say(player, equipAccessory(player, slot, options[c.selection]));
  else if (d.acess[slot] && c.selection === options.length) say(player, unequipAccessory(player, slot));
  return accessoriesMenu(player);
}

// ====================================================================== MISSÕES
async function questsMenu(player) {
  const d = getData(player);
  const step = CHAPTER[Math.min(d.historia, CHAPTER.length - 1)];
  const pr = chapterProgress(player);
  const f = new ActionFormData().title("Missões e Contratos")
    .body(`§6§l${{ II: "Crônica II - O Senhor dos Mortos", III: "Crônica III - O Reino Sombrio", IV: "Crônica IV - A Coroa de Valdoria", V: "Crônica V - A Floresta que Esquece", VI: "Crônica VI - O Trono Sombrio", VII: "Crônica VII - O Guardião Celestial" }[step.cap] ||
      "Crônica I - O Despertar da Pedra"}§r\n§e${step.titulo}\n§7${step.texto}\n§fObjetivo: §a${step.alvo} ${step.obj.tipo !== "fim" ? `§f(${pr.p}/${pr.n})` : ""}`);
  const opts = [];
  if (pr.done) { f.button("§l§6Receber recompensa"); opts.push(async () => { completeChapterStep(player); return questsMenu(player); }); }
  f.button(`Contratos §8(${Object.keys(d.missoes.ativas).length}/${MAX_ACTIVE} ativos)`);
  opts.push(contractsMenu);
  const npcLines = questLines(player).concat(guildLines(player), royalLines(player));
  f.button(`Missões dos moradores e da Guilda §8(${npcLines.length})`);
  opts.push((p) => notice(p, "Missões dos moradores", npcLines.length ? npcLines.join("\n\n") :
    "§7Nenhuma missão de morador ativa.\nConverse com os moradores das vilas de Valdoria e com o Mestre da Guilda.", questsMenu));
  f.button("Voltar");
  opts.push(openMainMenu);
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  return opts[r.selection](player);
}

async function contractsMenu(player) {
  const ids = Object.keys(CONTRACTS);
  const f = new ActionFormData().title("Quadro de Contratos").body("§7Aceite até 3 contratos. Muitos podem ser repetidos após um tempo.");
  for (const id of ids) {
    const st = contractState(player, id);
    const label = { ativo: `§e${st.p}/${st.n}`, pronto: "§a§lPRONTO", disponivel: "§7disponível", espera: `§8em ${st.min} min`, concluido: "§2concluído" }[st.estado];
    f.button(`§l${CONTRACTS[id].nome}§r\n${label}`);
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined || r.selection >= ids.length) return questsMenu(player);
  const id = ids[r.selection];
  const c = CONTRACTS[id];
  const st = contractState(player, id);
  const reward = `${c.recompensa.xp} XP${c.recompensa.itens.length ? ", " + c.recompensa.itens.map(([it, n]) => `${n}× ${ITEM_DATA[it]?.n || it.replace("minecraft:", "")}`).join(", ") : ""}`;
  const body = `§7${c.desc}\n\n§6Recompensa: §f${reward}\n§7${c.cd < 0 ? "Contrato único." : `Repetível a cada ${c.cd} minutos.`}`;
  const m = new MessageFormData().title(c.nome).body(body + (st.estado === "ativo" ? `\n\n§eProgresso: ${st.p}/${st.n}` : ""));
  if (st.estado === "disponivel") m.button1("§lAceitar").button2("Voltar");
  else if (st.estado === "pronto") m.button1("§lEntregar").button2("Voltar");
  else if (st.estado === "ativo") m.button1("§cAbandonar").button2("Voltar");
  else m.button1("OK").button2("Voltar");
  const k = await show(player, m);
  if (!k.canceled && k.selection === 0) {
    if (st.estado === "disponivel") say(player, acceptContract(player, id));
    else if (st.estado === "pronto") say(player, turnInContract(player, id));
    else if (st.estado === "ativo") say(player, abandonContract(player, id));
  }
  return contractsMenu(player);
}

// ====================================================================== BOLSA E REPUTAÇÃO
async function purseMenu(player) {
  const d = npcData(player);
  const rr = repRank(d.rep);
  const g = d.npc.guilda;
  const gr = guildRank(g.pontos);
  const body = [
    `§6§lBolsa: §e${d.moedas} moedas§r`,
    "§7Moedas encontradas em baús e deixadas por criaturas vão direto para a bolsa.",
    "", `§6§lReino de Valdoria: ${rr.cor}${rr.nome} §7(${d.rep} pontos)`,
    rr.desconto > 0 ? `§aDesconto de ${Math.round(rr.desconto * 100)}% nas lojas.` : rr.desconto < 0 ? "§cPreços mais altos e guardas desconfiados." : "§7Sem desconto ainda.",
    "§7Ganhe reputação com missões, contratos da Guilda e defendendo vilas. Atacar moradores tira reputação.",
    "", `§6§lGuilda dos Aventureiros: ${g.membro ? `${gr.cor}${gr.nome} §7(${g.pontos} pontos)` : "§7não inscrito"}`,
  ].join("\n");
  const f = new ActionFormData().title("Bolsa e Reputação").body(body).button("Transferir moedas a um jogador próximo").button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection === 0) return transferMenu(player, purseMenu);
  return openMainMenu(player);
}

// ====================================================================== CÓDEX
async function codexMenu(player) {
  const d = getData(player);
  const f = new ActionFormData().title("Códex")
    .body(`§7Locais descobertos: §f${(d.locais || []).length}   §7Textos: §f${(d.lidos || []).length}/${Object.keys(LORE).length}`)
    .button("Bestiário e regiões", ICON("insignia_goblin"))
    .button("Locais descobertos", ICON("mapa_explorador"))
    .button("Biblioteca", ICON("pergaminho_antigo"))
    .button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection === 0) return bestiaryMenu(player);
  if (r.selection === 1) return placesMenu(player, codexMenu);
  if (r.selection === 2) return libraryMenu(player, codexMenu);
  return openMainMenu(player);
}

async function bestiaryMenu(player) {
  const d = getData(player);
  const names = {
    [`${NS}:goblin`]: "Goblin", [`${NS}:goblin_xama`]: "Goblin Xamã", [`${NS}:espectro`]: "Espectro", [`${NS}:cervo_magico`]: "Cervo Mágico",
    [`${NS}:fragmento_pedra`]: "Fragmento de Pedra", [`${NS}:tita_pedra`]: "Titã de Pedra", [`${NS}:chefe_goblin`]: "Chefe Goblin",
    [`${NS}:senhor_mortos`]: "Senhor dos Mortos", [`${NS}:filacterio`]: "Filactério", [`${NS}:espiao_veu`]: "Espião do Véu Negro",
    [`${NS}:dragao_ancestral`]: "Dragão Ancestral", [`${NS}:rainha_trevas`]: "Rainha das Trevas", [`${NS}:ilusao_rainha`]: "Ilusão da Rainha",
    [`${NS}:lobo_gigante`]: "Lobo Gigante", [`${NS}:alce`]: "Alce do Norte", [`${NS}:urso_guerra`]: "Urso Pardo",
    [`${NS}:unicornio`]: "Unicórnio", [`${NS}:grifo`]: "Grifo", [`${NS}:dragao_jovem`]: "Dragão Jovem",
    [`${NS}:fantasma_anao`]: "Fantasma Anão", [`${NS}:sentinela_runica`]: "Sentinela Rúnica", [`${NS}:rei_durgan`]: "Durgan, o Rei Sob a Montanha",
  };
  const best = Object.entries(d.abates).sort((a, b) => b[1] - a[1]).slice(0, 14)
    .map(([id, n]) => `§f${names[id] || id.replace("minecraft:", "").replace(/_/g, " ")}: §e${n}`);
  const totalItems = Object.keys(ITEM_DATA).length;
  const body = [
    "§6§lBestiário§r", best.length ? best.join("\n") : "§7Nenhuma criatura derrotada ainda.",
    "", `§6§lRegiões descobertas (${d.desc.biomas.length})§r`, d.desc.biomas.map(biomeName).join(", ") || "§7Nenhuma.",
    "", `§6§lItens descobertos: §f${d.desc.itens.length}/${totalItems}`,
    "", "§6§lCriaturas de Valdoria§r",
    "§fGoblins§7 - bandos nas florestas e planícies ao entardecer; fogem quando feridos.",
    "§fGoblin Xamã§7 - conjura bolas de fogo e cura seus aliados.",
    "§fChefe Goblin§7 - lidera os acampamentos; grita para fortalecer o bando e salta sobre os inimigos.",
    "§fEspectro§7 - surge à noite, drena vida e se teleporta; fraco contra o sagrado.",
    "§fCervo Mágico§7 - pacífico; ofereça uma cenoura dourada para receber sua bênção.",
    "§fTitã de Pedra§7 - guardião ancestral despertado pelo Ídolo do Titã.",
    "§fSenhor dos Mortos§7 - Malachar, o rei que recusou a morte; protegido por três filactérios.",
    "§fEspião do Véu Negro§7 - agente da Dama de Véu Negro; some em fumaça e reaparece às suas costas.",
    "§fLobo Gigante§7 - neutro, das florestas frias; ataca em bando se provocado. Domável com o Osso do Alfa (nível 12+).",
    "§fAlce do Norte§7 - pacífico, das taigas e bosques nevados; foge se ferido. Domável com Frutas Doces (nível 6+).",
    "§fUrso Pardo§7 - neutro, das florestas; revida com força. Domável com Garrafa de Mel (nível 10+); vira Urso de Guerra.",
    "§fUnicórnio§7 - raro, das florestas floridas e planícies; foge de quem não chega agachado. Maçã Dourada (nível 14+, reputação Conhecido).",
    "§fGrifo§7 - guarda ninhos nos picos; revida se provocado. Domável com a Rédea Celeste (nível 18+). Voa com o cavaleiro.",
    "§fIgnaroth, o Dragão Ancestral§7 - guarda o Ninho do Dragão; voa, cospe fogo, invoca raios e meteoros.",
    "§fVaelith, a Rainha das Trevas§7 - a Dama de Véu Negro; cria ilusões, invoca acólitos e traz o Eclipse.",
    "§fDragão Jovem§7 - nasce do Ovo de Ignaroth chocado no calor; o filhote cresce comendo carne e o adulto voa com você.",
    "§fFantasma Anão§7 - espírito dos guerreiros de Kar'Dum; fraco contra o sagrado.",
    "§fSentinela Rúnica§7 - constructo de pedra das ruínas anãs; resiste a golpes e fogo, mas o raio racha suas runas.",
    "§fDurgan, o Rei Sob a Montanha§7 - o último rei de Kar'Dum, preso ao próprio juramento; chama os Juramentados.",
  ].join("\n");
  await notice(player, "Bestiário", body, codexMenu);
}

// ====================================================================== GUIA
async function guideMenu(player) {
  const body = [
    "§6§lControles§r",
    "§fDiário: §7usar (toque longo no celular).",
    "§fSigilo do Aventureiro: §7usar = habilidade selecionada; agachar + usar = trocar.",
    "§fCajados/varinhas/grimório: §7usar = lançar feitiço preparado; agachar + usar = trocar.",
    "§fArmas do add-on: §7golpe normal = ataque leve; usar = ataque carregado; agachar + usar (armas especiais) = habilidade da arma.",
    "§fDefesa: §7fique agachado com uma arma - bloqueia parte do dano frontal (custa energia).",
    "§fEsquiva: §7agachar + pular - avança na direção do movimento com invulnerabilidade breve.",
    "§fMesa Rúnica: §7interaja para aprimorar (+1 a +7), aplicar runas e desmontar.",
    "§fComando: §7/valdoria:diario abre este diário.",
    "", "§6§lProgressão§r",
    "§7Ganhe XP derrotando criaturas, explorando regiões, minerando, descobrindo itens, aprimorando e concluindo missões. " +
    "Cada nível dá 3 pontos de atributo. Classe no nível 5, especialização no nível 25 após vencer um chefe.",
    "", "§6§lMagia§r",
    "§7Aprenda feitiços no Grimório gastando Essências Arcanas (dropadas por xamãs e espectros, ou fabricadas). " +
    "Cristais de Aetherita surgem nas profundezas (camada de ardósia); Mithril, em altitudes medianas.",
    "", "§6§lExploração§r",
    "§7Acampamentos goblins, torres de magos e criptas surgem pelo mundo enquanto você explora (sempre fora da sua vista). " +
    "Expulse os defensores para libertar um local. O §fMapa do Explorador§7 aponta o local mais próximo ainda não descoberto. " +
    "Pergaminhos encontrados em baús vão para a Biblioteca do Códex.",
    "§7Nas §fVilas de Valdoria§7: converse com os moradores (usar/tocar), compre e venda, conserte equipamento, " +
    "descanse na taverna, cure-se no templo, aprenda feitiços com o Instrutor e entre na Guilda dos Aventureiros para contratos diários.",
    "§7Na §fCripta Ancestral§7: o ossuário desperta ondas de mortos, há uma passagem atrás de pedras rachadas, a chave do " +
    "portão fica na biblioteca, e o Senhor dos Mortos só pode ser ferido depois que seus 3 filactérios forem destruídos.",
    "§7No §fNinho do Dragão§7 (nível 14+): Ignaroth desce quando você entra na cratera. Corra de lado do sopro, saia das marcas " +
    "vermelhas, pule o anel de chamas. Quando ele pousa, fica exausto e recebe mais dano.",
    "§7No §fSantuário do Véu Negro§7 (nível 16+): Vaelith desperta ao entrar na nave. As cópias dela são translúcidas; depois " +
    "da corrente, saia do círculo; no Eclipse, fique dentro de um círculo de luz. Os chefes voltam ao covil após 90 minutos.",
    "§7Nas §fRuínas de Kar'Dum§7 (nível 12+, montanhas): leia a inscrição no púlpito do Salão dos Reis e desperte as quatro " +
    "runas na ordem dela para abrir o Portão Rúnico (errar acorda sentinelas). Na Ponte Partida, pise só nas lajes inteiras; " +
    "na Galeria dos Pilões, passe entre as batidas. Durgan fica imune enquanto os Juramentados estiverem de pé.",
    "", "§6§lMontarias§r",
    "§7§fCorcel de Guerra§7: dado pelo Capitão da Guarda (Crônica III) ou comprado no Estábulo da Guarda. As outras são " +
    "domadas: interaja com a criatura selvagem segurando o item certo (Lobo Gigante: Osso do Alfa; Alce: Frutas Doces; " +
    "Urso: Garrafa de Mel; Unicórnio: Maçã Dourada; Grifo: Rédea Celeste). Cada tentativa tem uma chance e gasta o item.",
    "§7Use o item de vínculo para chamar; montado, ele ativa a habilidade da montaria. Agache e interaja para dar ordens. " +
    "§fGrifo§7: voa com você. Olhe para onde quer ir e ande para a frente; segure pular para subir. Se desmontar no ar, " +
    "você desce planando.",
    "§fDragão Jovem§7: Ignaroth deixa um ovo na primeira vitória. Coloque-o no chão a até 3 blocos de fogo, lava, magma ou " +
    "fogueira acesa (agache e bata nele para recolher). Aquecido, choca em cerca de 5 minutos com você por perto. Dê carne ao " +
    "filhote (assada vale mais) até ele crescer; o adulto voa como o grifo, protege você do fogo e cospe fogo (Talismã montado).",
  ].join("\n");
  await notice(player, "Guia do Aventureiro", body, openMainMenu);
}

// ====================================================================== CONFIGURAÇÕES
export const FREQS = [0, 0.5, 1, 2];
export const FREQ_NAMES = ["Desligada", "Rara", "Normal", "Frequente"];
async function settingsMenu(player) {
  const d = getData(player);
  const op = player.playerPermissionLevel === PlayerPermissionLevel.Operator;
  const cfg = getWorldCfg();
  const mults = [0.5, 1, 1.5, 2, 3];
  const f = new ModalFormData().title("Configurações")
    .toggle("Mostrar HUD (nível, XP, energia)", { defaultValue: d.cfg.hud });
  if (op) {
    f.dropdown("§6[Mundo] Multiplicador de experiência", mults.map((m) => `${m}×`), { defaultValueIndex: Math.max(0, mults.indexOf(cfg.xpMult)) });
    f.toggle("§6[Mundo] Habilidades atingem outros jogadores (PvP)", { defaultValue: cfg.pvp });
    f.dropdown("§6[Mundo] Frequência de estruturas", FREQ_NAMES, { defaultValueIndex: Math.max(0, FREQS.indexOf(cfg.estruturas ?? 1)) });
  }
  const r = await show(player, f);
  if (r.canceled || !r.formValues) return openMainMenu(player);
  const v = r.formValues.filter((x) => x !== undefined);
  d.cfg.hud = !!v[0];
  markDirty(player);
  if (op) {
    cfg.xpMult = mults[Number(v[1])] ?? 1;
    cfg.pvp = !!v[2];
    cfg.estruturas = FREQS[Number(v[3])] ?? 1;
    setWorldCfg(cfg);
  }
  say(player, "§aConfigurações salvas.");
  return openMainMenu(player);
}

// ====================================================================== ELIXIR DO RENASCIMENTO
export async function rebirthMenu(player) {
  const m = new MessageFormData().title("§eElixir do Renascimento")
    .body("§fBeber o elixir redefine §craça, classe, especialização, atributos e feitiços§f, devolvendo todos os pontos para nível 1.\n\n§7Seu progresso de missões, descobertas e itens é mantido.\n\nDeseja continuar?")
    .button1("§lBeber").button2("Cancelar");
  const r = await show(player, m);
  if (r.canceled || r.selection !== 0) return;
  if (!takeItem(player, `${NS}:elixir_renascimento`, 1)) return;
  const old = getData(player);
  const lvl = old.nivel;
  const d = resetData(player, true);
  d.nivel = lvl;
  d.pontos = (lvl - 1) * 3;
  markDirty(player);
  saveNow(player);
  invalidate(player);
  particle(player.dimension, "sagrado_explosao", player.location, { radius: 2 });
  say(player, "§eVocê renasceu. Escolha novamente sua raça no Diário.");
  system.runTimeout(() => raceMenu(player), 20);
}

// ====================================================================== MESA RÚNICA
export async function runeTableMenu(player) {
  setFlag(player, "mesa");
  const inv = inventory(player);
  const held = inv?.getItem(player.selectedSlotIndex);
  const info = held && ITEM_DATA[held.typeId];
  let heldLine = "§7Segure um equipamento do add-on para aprimorá-lo.";
  if (info && ["weapon", "armor", "caster"].includes(info.k)) {
    const lvl = getUpgrade(held);
    const c = upgradeCost(held);
    heldLine = `§fEm mãos: §e${info.n} +${lvl} §7(máx. +${maxUpgrade(held)})\n§7Próximo nível: ${c.pedra} Pedra de Aprimoramento${c.mithril ? `, ${c.mithril} Lingote de Mithril` : ""}${c.cristal ? ", 1 Cristal" : ""} · chance ${Math.round(c.chance * 100)}%`;
  }
  const f = new ActionFormData().title("§lMesa Rúnica").body(heldLine)
    .button("Aprimorar item em mãos", ICON("pedra_aprimoramento"))
    .button("Aplicar runa na arma", ICON("runa_fogo"))
    .button("Desmontar item em mãos", ICON("lingote_aco"))
    .button("Fechar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection === 0) {
    say(player, upgradeHeld(player));
    return runeTableMenu(player);
  }
  if (r.selection === 1) {
    const runes = Object.keys(RUNE_ELEMENT).filter((id) => countItem(player, id) > 0);
    if (!runes.length) {
      say(player, "§cVocê não possui runas. Fabrique-as com pedra, Cristal de Aetherita e um catalisador elemental.");
      return runeTableMenu(player);
    }
    const g = new ActionFormData().title("Aplicar runa").body("§7A runa substitui o elemento atual da arma.");
    for (const id of runes) g.button(`${ITEM_DATA[id].n} §8(${ELEMENT_NAMES[RUNE_ELEMENT[id]]})`, `textures/items/valdoria/${id.split(":")[1]}`);
    const c = await show(player, g);
    if (!c.canceled && c.selection !== undefined) say(player, applyRune(player, runes[c.selection]));
    return runeTableMenu(player);
  }
  if (r.selection === 2) {
    const m = new MessageFormData().title("Desmontar").body("§cO item em mãos será destruído§f e convertido em materiais. Continuar?").button1("Desmontar").button2("Cancelar");
    const c = await show(player, m);
    if (!c.canceled && c.selection === 0) say(player, disassembleHeld(player));
    return runeTableMenu(player);
  }
}

export { world };
