// Modo de Teste: atalhos para testar todo o conteúdo no criativo (níveis, itens, feitiços, criaturas, missões, mundo).
// Disponível para jogadores no modo criativo ou operadores, pelo Diário ou pelo comando /valdoria:teste.
import { world, system, ItemStack, GameMode, PlayerPermissionLevel } from "@minecraft/server";
import { ActionFormData, ModalFormData, FormCancelationReason } from "@minecraft/server-ui";
import { NS, V, say, giveItem, inventory, health } from "../core/util.js";
import { particle, psound } from "../core/fx.js";
import { getData, markDirty, saveNow, resetData, getWorldCfg, setWorldCfg } from "../core/store.js";
import { invalidate, stats } from "../rpg/stats.js";
import { addXP, xpToNext, MAX_LEVEL, POINTS_PER_LEVEL } from "../rpg/progression.js";
import { SPELLS } from "../magic/spells.js";
import { ITEM_DATA } from "../data/items_gen.js";
import { maxUpgrade, refreshLore } from "../items/equipment.js";
import { RUNE_ELEMENT } from "../combat/weapons.js";
import { summon } from "../abilities/engine.js";
import { forceChapterStep, completeContractsForTest, CHAPTER } from "../quests/quests.js";
import { LORE } from "../data/lore.js";
import { scrollItem } from "../structures/scrolls.js";
import { spawnLich } from "../bosses/senhor_mortos.js";
import { structuresMenu } from "./teste_estruturas.js";
import { villageMenu } from "./teste_vila.js";
import { bossesMenu } from "./teste_chefes.js";
import { openMainMenu } from "./menus.js";

const ICON = (id) => `textures/items/valdoria/${id}`;

export function canTest(player) {
  try {
    return player.getGameMode() === GameMode.Creative || player.playerPermissionLevel === PlayerPermissionLevel.Operator;
  } catch {
    return false;
  }
}

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

/** Menu de ações: [rótulo, ícone, função] - a função pode devolver uma mensagem. */
export async function actions(player, title, body, list, back) {
  const f = new ActionFormData().title(title).body(body);
  for (const [label, icon] of list) f.button(label, icon);
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= list.length) return back(player);
  const msg = await list[r.selection][2](player);
  if (typeof msg === "string") say(player, msg);
  return actions(player, title, body, list, back);
}

// ====================================================================== MENU PRINCIPAL DE TESTE
export async function testMenu(player) {
  if (!canTest(player)) {
    say(player, "§cO Modo de Teste exige o modo criativo ou permissão de operador.");
    return;
  }
  const d = getData(player);
  const cfg = getWorldCfg();
  const flags = [d.cfg.semRecarga ? "§aSem recarga" : "§8Recarga normal", d.cfg.energiaInfinita ? "§aEnergia infinita" : "§8Energia normal",
    cfg.alvoCriativo ? "§aCriaturas te atacam no criativo" : "§8Criaturas ignoram o criativo"].join("§7 · ");
  const f = new ActionFormData().title("§6§lModo de Teste")
    .body(`§7Atalhos para testar tudo no criativo.\n§fNível ${d.nivel} · ${d.pontos} pontos livres · ${d.magias.length} feitiços\n${flags}`)
    .button("Níveis e atributos", ICON("pedra_aprimoramento"))
    .button("Feitiços e habilidades", ICON("grimorio_arquimago"))
    .button("Itens e equipamentos", ICON("espada_longa_mithril"))
    .button("Criaturas e chefe", ICON("idolo_tita"))
    .button("Missões", ICON("insignia_goblin"))
    .button("Estruturas e masmorra", ICON("chave_cripta"))
    .button("Vila e moradores", ICON("moeda_ouro"))
    .button("Chefes e montarias", ICON("escritura_cavalo"))
    .button("Mundo (dia, noite, lua cheia)", ICON("runa_luz"))
    .button("§cRedefinir personagem", ICON("elixir_renascimento"))
    .button("Voltar ao Diário");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  const menus = [levelsMenu, magicMenu, itemsMenu, creaturesMenu, questsTestMenu, structuresMenu, villageMenu, bossesMenu, worldMenu, resetMenu, openMainMenu];
  return menus[r.selection](player);
}

// ====================================================================== NÍVEIS
function addLevels(player, n) {
  const d = getData(player);
  let needed = 0;
  for (let l = d.nivel; l < Math.min(MAX_LEVEL, d.nivel + n); l++) needed += xpToNext(l);
  needed -= d.xp;
  const saved = getWorldCfg().xpMult;
  const mult = stats(player).xp;
  // XP exato, independente de bônus de raça/sorte/multiplicador do mundo
  addXP(player, Math.ceil(needed / (mult * saved)) + 1, "teste");
  return `§6[Teste] Nível atual: ${getData(player).nivel}`;
}

async function setLevel(player) {
  const d = getData(player);
  const f = new ModalFormData().title("Definir nível")
    .slider("Nível do personagem", 1, MAX_LEVEL, { valueStep: 1, defaultValue: d.nivel })
    .toggle("Recalcular pontos de atributo (devolve todos os pontos)", { defaultValue: true });
  const r = await show(player, f);
  if (r.canceled || !r.formValues) return;
  const lvl = Number(r.formValues[0]);
  const reset = !!r.formValues[1];
  d.nivel = Math.max(1, Math.min(MAX_LEVEL, lvl));
  d.xp = 0;
  if (reset) {
    for (const k of Object.keys(d.attr)) d.attr[k] = 0;
    let pts = (d.nivel - 1) * POINTS_PER_LEVEL;
    if (d.raca === "humano") pts += Math.floor(d.nivel / 5);
    d.pontos = pts;
  }
  markDirty(player);
  saveNow(player);
  invalidate(player);
  particle(player.dimension, "nivel", V.up(player.location, 1));
  return `§6[Teste] Nível definido para ${d.nivel}${reset ? ` com ${d.pontos} pontos livres` : ""}.`;
}

async function levelsMenu(player) {
  return actions(player, "Níveis e atributos", "§7Subir de nível dispara o efeito normal (título, partículas, pontos).", [
    ["+1 nível", ICON("pedra_aprimoramento"), (p) => addLevels(p, 1)],
    ["+5 níveis", ICON("pedra_aprimoramento"), (p) => addLevels(p, 5)],
    ["+10 níveis", ICON("pedra_aprimoramento"), (p) => addLevels(p, 10)],
    ["Nível máximo (60)", ICON("nucleo_tita"), (p) => addLevels(p, MAX_LEVEL)],
    ["Definir nível exato", ICON("diario_aventureiro"), setLevel],
    ["+20 pontos de atributo", ICON("anel_vigor"), (p) => {
      const d = getData(p);
      d.pontos += 20;
      markDirty(p);
      return "§6[Teste] +20 pontos de atributo (Diário > Atributos).";
    }],
    ["+1.000 XP", ICON("insignia_goblin"), (p) => { addXP(p, 1000, "teste"); return undefined; }],
    ["Liberar especializações (marca 1 chefe derrotado)", ICON("coracao_pedra"), (p) => {
      const d = getData(p);
      d.chefes = Math.max(1, d.chefes);
      markDirty(p);
      return "§6[Teste] Especializações liberadas a partir do nível 25.";
    }],
  ], testMenu);
}

// ====================================================================== MAGIA E HABILIDADES
async function magicMenu(player) {
  const d = getData(player);
  return actions(player, "Feitiços e habilidades", "§7Feitiços combinados exigem o Grimório do Arquimago em mãos.", [
    ["Aprender todos os feitiços", ICON("grimorio_arquimago"), (p) => {
      const dd = getData(p);
      dd.magias = Object.keys(SPELLS);
      if (!dd.grimorio.some(Boolean)) dd.grimorio = ["bola_fogo", "corrente_eletrica", "nevasca", "projeteis_arcanos"];
      markDirty(p);
      return `§6[Teste] ${dd.magias.length} feitiços aprendidos. Prepare-os no Diário > Grimório.`;
    }],
    [`${d.cfg.semRecarga ? "§aLigado" : "§8Desligado"}§r: sem tempo de recarga`, ICON("runa_trovao"), (p) => {
      const dd = getData(p);
      dd.cfg.semRecarga = !dd.cfg.semRecarga;
      markDirty(p);
      return `§6[Teste] Sem recarga: ${dd.cfg.semRecarga ? "ligado" : "desligado"}.`;
    }],
    [`${d.cfg.energiaInfinita ? "§aLigado" : "§8Desligado"}§r: energia infinita`, ICON("pocao_energia"), (p) => {
      const dd = getData(p);
      dd.cfg.energiaInfinita = !dd.cfg.energiaInfinita;
      dd.energia = stats(p).energyMax;
      markDirty(p);
      return `§6[Teste] Energia infinita: ${dd.cfg.energiaInfinita ? "ligada" : "desligada"}.`;
    }],
    ["Restaurar energia e vida", ICON("essencia_natural"), (p) => {
      getData(p).energia = stats(p).energyMax;
      health(p)?.resetToMaxValue();
      return "§6[Teste] Energia e vida restauradas.";
    }],
  ], testMenu);
}

// ====================================================================== ITENS
function giveKind(player, filter, amount = 1) {
  let n = 0;
  for (const [id, info] of Object.entries(ITEM_DATA)) {
    if (!filter(info, id)) continue;
    const it = new ItemStack(id, info.k === "material" ? amount : 1);
    refreshLore(it);
    giveItem(player, it);
    n++;
  }
  psound(player, "random.pop", 1, 1);
  return `§6[Teste] ${n} itens entregues${n > 20 ? " (o que não coube no inventário caiu no chão)" : ""}.`;
}

function maxHeld(player) {
  const inv = inventory(player);
  const slot = player.selectedSlotIndex;
  const it = inv?.getItem(slot);
  const info = it && ITEM_DATA[it.typeId];
  if (!info || !["weapon", "armor", "caster"].includes(info.k)) return "§cSegure uma arma, armadura ou conjurador do add-on.";
  it.setDynamicProperty(`${NS}:nivel`, maxUpgrade(it));
  it.setDynamicProperty(`${NS}:lore_v`, -1);
  refreshLore(it);
  inv.setItem(slot, it);
  invalidate(player);
  particle(player.dimension, "nivel_anel", player.location);
  return `§6[Teste] ${info.n} aprimorado ao máximo (+${maxUpgrade(it)}).`;
}

async function runeHeld(player) {
  const runes = Object.keys(RUNE_ELEMENT);
  const f = new ActionFormData().title("Aplicar runa (grátis)").body("§7Aplica o elemento na arma em mãos sem gastar a runa.");
  for (const id of runes) f.button(ITEM_DATA[id].n, ICON(id.split(":")[1]));
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  const inv = inventory(player);
  const it = inv?.getItem(player.selectedSlotIndex);
  const info = it && ITEM_DATA[it.typeId];
  if (!info || info.k !== "weapon" || info.el) return "§cSegure uma arma comum do add-on (armas especiais já têm elemento).";
  it.setDynamicProperty(`${NS}:runa`, RUNE_ELEMENT[runes[r.selection]]);
  it.setDynamicProperty(`${NS}:lore_v`, -1);
  refreshLore(it);
  inv.setItem(player.selectedSlotIndex, it);
  return "§6[Teste] Runa aplicada.";
}

const countKind = (f) => Object.values(ITEM_DATA).filter(f).length;

async function itemsMenu(player) {
  return actions(player, "Itens e equipamentos", "§7Os itens também estão no inventário criativo (abas Equipamento e Itens).", [
    [`Armas de aço e mithril (${countKind((i) => i.k === "weapon" && !i.el)})`, ICON("espada_longa_aco"), (p) => giveKind(p, (i) => i.k === "weapon" && !i.el)],
    [`Armas especiais (${countKind((i) => i.k === "weapon" && !!i.el)})`, ICON("lamina_ignis"), (p) => giveKind(p, (i) => i.k === "weapon" && !!i.el)],
    [`Cajados, varinhas e grimório (${countKind((i) => i.k === "caster")})`, ICON("cajado_arcano"), (p) => giveKind(p, (i) => i.k === "caster")],
    ["Armaduras (4 conjuntos)", ICON("cavaleiro_peitoral"), (p) => giveKind(p, (i) => i.k === "armor")],
    [`Acessórios (${countKind((i) => i.k === "accessory")})`, ICON("amuleto_arcano"), (p) => giveKind(p, (i) => i.k === "accessory")],
    ["Materiais e runas (32 de cada)", ICON("cristal_aetherita"), (p) => giveKind(p, (i) => i.k === "material", 32)],
    ["Poções, elixir, ídolo e Mesa Rúnica", ICON("idolo_tita"), (p) => {
      const msg = giveKind(p, (i) => ["potion", "reset", "summon"].includes(i.k));
      giveItem(p, new ItemStack(`${NS}:mesa_runica`, 1));
      giveItem(p, new ItemStack(`${NS}:pocao_energia`, 15));
      return msg;
    }],
    ["Exploração: chave, mapa e todos os pergaminhos", ICON("chave_cripta"), (p) => {
      giveItem(p, new ItemStack(`${NS}:chave_cripta`, 2));
      giveItem(p, new ItemStack(`${NS}:mapa_explorador`, 1));
      for (const id of Object.keys(LORE)) giveItem(p, scrollItem(id));
      return `§6[Teste] Chave da Cripta, Mapa do Explorador e ${Object.keys(LORE).length} pergaminhos entregues.`;
    }],
    ["Aprimorar item em mãos ao máximo", ICON("pedra_aprimoramento"), maxHeld],
    ["Aplicar runa no item em mãos", ICON("runa_fogo"), runeHeld],
  ], testMenu);
}

// ====================================================================== CRIATURAS
function spawnFront(player, type, dist = 6) {
  const dir = V.flat(player.getViewDirection());
  const loc = V.add(player.location, V.mul(dir, dist));
  try {
    player.dimension.spawnEntity(type, loc);
    particle(player.dimension, "invocacao", loc, {});
    return undefined;
  } catch (e) {
    return `§cNão foi possível gerar ${type}: ${e}`;
  }
}

async function creaturesMenu(player) {
  const cfg = getWorldCfg();
  return actions(player, "Criaturas e chefe", "§7Geradas 6 blocos à sua frente. Ligue a opção abaixo para que criaturas e o Titã ataquem você mesmo no criativo (você não perde vida, mas vê os ataques).", [
    [`${cfg.alvoCriativo ? "§aLigado" : "§8Desligado"}§r: criaturas atacam você no criativo`, ICON("insignia_goblin"), (p) => {
      const c = getWorldCfg();
      c.alvoCriativo = !c.alvoCriativo;
      setWorldCfg(c);
      return `§6[Teste] Alvo no criativo: ${c.alvoCriativo ? "ligado" : "desligado"}. (A IA vanilla de perseguição continua ignorando o criativo; os poderes e ataques do Titã passam a mirar você.)`;
    }],
    ["§6Titã de Pedra (chefe)", ICON("idolo_tita"), (p) => spawnFront(p, `${NS}:tita_pedra`, 10)],
    ["§5Senhor dos Mortos (chefe, sem arena)", ICON("coroa_mortos"), (p) => {
      const dir = V.flat(p.getViewDirection());
      try {
        spawnLich(p.dimension, V.add(p.location, V.mul(dir, 10)), `t${system.currentTick}`);
      } catch (e) {
        return `§cNão foi possível gerar o chefe: ${e}`;
      }
      return "§6[Teste] Senhor dos Mortos gerado. Na fase II ele invoca filactérios ao redor de si.";
    }],
    ["Chefe Goblin", ICON("insignia_goblin"), (p) => spawnFront(p, `${NS}:chefe_goblin`)],
    ["Fragmento de Pedra", ICON("fragmento_tita"), (p) => spawnFront(p, `${NS}:fragmento_pedra`)],
    ["Goblin", ICON("insignia_goblin"), (p) => spawnFront(p, `${NS}:goblin`)],
    ["Goblin Xamã", ICON("varinha_aprendiz"), (p) => spawnFront(p, `${NS}:goblin_xama`)],
    ["Espectro", ICON("ectoplasma"), (p) => spawnFront(p, `${NS}:espectro`)],
    ["Cervo Mágico", ICON("essencia_natural"), (p) => spawnFront(p, `${NS}:cervo_magico`)],
    ["Aliados: lobo, guerreiro e guardião (60s)", ICON("grimorio_arquimago"), (p) => {
      summon(p, `${NS}:lobo_espectral`, 1, 60);
      summon(p, `${NS}:guerreiro_esqueletico`, 1, 60);
      summon(p, `${NS}:guardiao_vegetal`, 1, 60);
      return "§6[Teste] Aliados invocados.";
    }],
    ["§cRemover criaturas do add-on (64 blocos)", ICON("fragmento_tita"), (p) => {
      let n = 0;
      for (const e of p.dimension.getEntities({ location: p.location, maxDistance: 64 })) {
        if (e.typeId.startsWith(`${NS}:`)) {
          e.remove();
          n++;
        }
      }
      return `§6[Teste] ${n} criaturas removidas.`;
    }],
  ], testMenu);
}

// ====================================================================== MISSÕES
async function questsTestMenu(player) {
  return actions(player, "Missões", "§7Avança a campanha sem cumprir os objetivos (recebe as recompensas).", [
    ["Concluir etapa atual da Crônica", ICON("insignia_goblin"), forceChapterStep],
    ["Reiniciar a campanha (Crônica I)", ICON("diario_aventureiro"), (p) => {
      const d = getData(p);
      d.historia = 0;
      d.missoes.cap = { p: 0 };
      markDirty(p);
      return "§6[Teste] Campanha reiniciada na Crônica I.";
    }],
    ["Ir para a Crônica II", ICON("chave_cripta"), (p) => {
      const d = getData(p);
      d.historia = CHAPTER.findIndex((c) => c.cap === "II");
      d.missoes.cap = { p: 0 };
      markDirty(p);
      return "§6[Teste] Campanha na Crônica II - O Senhor dos Mortos.";
    }],
    ["Completar contratos de abate ativos e zerar esperas", ICON("insignia_goblin"), completeContractsForTest],
    ["Ir para a Crônica V (Aelthar)", ICON("orvalho_lunar"), (p) => {
      const d = getData(p);
      d.historia = CHAPTER.findIndex((c) => c.cap === "V");
      d.missoes.cap = { p: 0 };
      markDirty(p);
      return "§6[Teste] Campanha na Crônica V - A Floresta que Esquece.";
    }],
    ["Ir para a Crônica VI (Nyxhal)", ICON("coracao_abismo"), (p) => {
      const d = getData(p);
      d.historia = CHAPTER.findIndex((c) => c.cap === "VI");
      d.missoes.cap = { p: 0 };
      markDirty(p);
      return "§6[Teste] Campanha na Crônica VI - O Trono Sombrio.";
    }],
    ["Ir para a Crônica VII (Santuário Celestial)", ICON("pluma_auriel"), (p) => {
      const d = getData(p);
      d.historia = CHAPTER.findIndex((c) => c.cap === "VII");
      d.missoes.cap = { p: 0 };
      markDirty(p);
      return "§6[Teste] Campanha na Crônica VII - O Guardião Celestial.";
    }],
  ], testMenu);
}

// ====================================================================== MUNDO
async function worldMenu(player) {
  return actions(player, "Mundo", "§7Útil para testar passivas de Vampiro, Licantropo e Celestial e o Espectro (que surge à noite).", [
    ["Dia", ICON("runa_luz"), () => { world.setTimeOfDay(1000); return "§6[Teste] Dia."; }],
    ["Noite", ICON("runa_sombra"), () => { world.setTimeOfDay(14000); return "§6[Teste] Noite."; }],
    ["Noite de lua cheia", ICON("anel_glacial"), () => {
      const day = Math.floor(world.getAbsoluteTime() / 24000);
      const next = Math.ceil(day / 8) * 8;
      world.setAbsoluteTime(next * 24000 + 18000);
      return "§6[Teste] Noite de lua cheia.";
    }],
  ], testMenu);
}

// ====================================================================== REDEFINIR
async function resetMenu(player) {
  return actions(player, "Redefinir personagem", "§cApaga raça, classe, especialização, atributos e feitiços. Mantém nível, missões e descobertas.", [
    ["§cRedefinir agora", ICON("elixir_renascimento"), (p) => {
      const lvl = getData(p).nivel;
      const d = resetData(p, true);
      d.nivel = lvl;
      d.pontos = (lvl - 1) * POINTS_PER_LEVEL;
      markDirty(p);
      saveNow(p);
      invalidate(p);
      return "§6[Teste] Personagem redefinido. Escolha a raça no Diário.";
    }],
  ], testMenu);
}
