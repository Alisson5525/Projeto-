// Diário > Exploração: locais descobertos (raridade, estado, objetivos), rumores, pistas anotadas, eventos próximos e fragmentos.
import { system } from "@minecraft/server";
import { ActionFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { NS, countItem } from "../core/util.js";
import { getData } from "../core/store.js";
import { getSite, TYPES, compass, dist2d } from "../structures/registry.js";
import { rarityOf, RARIDADE } from "./rarity.js";
import { explorationStatus } from "./mechanisms.js";
import { eventLines } from "./events.js";

const ICON = (id) => `textures/items/valdoria/${id}`;
const TYPE_ICON = { acampamento: "insignia_goblin", torre: "grimorio_arquimago", cripta: "chave_cripta", vila: "moeda_ouro", celeste: "pena_celeste",
  nyxhal: "coracao_abismo", ruina_vigia: "anel_vigia", salteadores: "moeda_ouro", santuario_estrada: "reliquia_sagrada", cemiterio: "ectoplasma",
  mina: "mithril_bruto", biblioteca: "tomo_perdido", posto: "mapa_explorador", campo_batalha: "estandarte_comandante", templo_runico: "sino_runico",
  bosque: "lanterna_fadas", altar_corrompido: "medalhao_purificado", cofre_reis: "coroa_reis_esquecidos", kardum: "engrenagem_runica",
  ninho: "escama_dragao", santuario: "veu_sombrio", ninho_grifo: "pena_grifo", capital: "selo_real", aelthar: "seiva_ancestral" };
const STATE = { ativo: "§cocupado", limpo: "§alibertado", construindo: "§8surgindo" };
const HABITADO = new Set(["vila", "capital", "aelthar"]);

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
function distTxt(player, s) {
  return s.dim === player.dimension.id ? `${Math.round(dist2d(s, player.location))} blocos ${compass(player.location, s)}` : "outra dimensão";
}

export async function explorationMenu(player, back) {
  const d = getData(player);
  const sites = (d.locais || []).map(getSite).filter(Boolean);
  const byR = {};
  let completos = 0;
  for (const s of sites) {
    const R = rarityOf(TYPES[s.tipo]);
    byR[R.nome] = (byR[R.nome] || 0) + 1;
    if (d.expl?.[s.id]?.c) completos++;
  }
  const frag = countItem(player, `${NS}:fragmento_mapa`);
  const ev = eventLines(player);
  const body = [
    `§fLocais descobertos: §e${sites.length}§f · explorados por completo: §6${completos}`,
    Object.values(RARIDADE).map((R) => `${R.cor}${R.nome}: §f${byR[R.nome] || 0}`).join("§7 · "),
    `§fFragmentos do Mapa Antigo: §6${frag}/3${frag >= 3 ? " §a(use um para montar o Mapa dos Reis)" : ""}`,
    "",
    "§7Cada local tem objetivos próprios: enigmas, passagens secretas, guardiões e desafios. Completar todos rende uma recompensa especial.",
  ].join("\n");
  const f = new ActionFormData().title("§lExploração").body(body);
  const opts = [];
  const add = (label, icon, fn) => { f.button(label, icon); opts.push(fn); };
  add(`Locais descobertos §8(${sites.length})`, ICON("mapa_explorador"), (p) => sitesMenu(p, explorationMenu));
  add(`Rumores §8(${(d.rumores || []).length})`, ICON("fragmento_mapa"), (p) => rumorsMenu(p));
  add(`Pistas anotadas §8(${Object.keys(d.pistas || {}).length})`, ICON("pergaminho_antigo"), (p) => cluesMenu(p));
  add(`Eventos por perto §8(${ev.length})`, ICON("insignia_goblin"), (p) => eventsMenu(p));
  add("Como explorar", ICON("diario_aventureiro"), (p) => guide(p));
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= opts.length) return back && back(player);
  return opts[r.selection](player);
}

export async function sitesMenu(player, back) {
  const d = getData(player);
  const sites = (d.locais || []).map(getSite).filter(Boolean)
    .sort((a, b) => (a.dim === player.dimension.id ? dist2d(a, player.location) : 1e9) - (b.dim === player.dimension.id ? dist2d(b, player.location) : 1e9));
  const f = new ActionFormData().title("Locais Descobertos")
    .body(sites.length ? "§7Toque em um local para ver os objetivos. §6★§7 = exploração completa." : "§7Nenhum local descoberto ainda.\nExplore Valdoria ou use o §fMapa do Explorador§7.");
  for (const s of sites) {
    const T = TYPES[s.tipo];
    const R = rarityOf(T);
    const st = explorationStatus(player, s);
    const prog = st.total ? (st.completo ? " §6★" : ` §7${st.done}/${st.total}`) : "";
    f.button(`${R.cor}§l${s.nome}§r${prog}\n${HABITADO.has(s.tipo) ? "§ahabitada" : STATE[s.estado] || ""}§8 · ${distTxt(player, s)}`, ICON(TYPE_ICON[s.tipo] || "diario_aventureiro"));
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= sites.length) return back && back(player);
  return siteDetail(player, sites[r.selection], back);
}

async function siteDetail(player, s, back) {
  const T = TYPES[s.tipo];
  const R = rarityOf(T);
  const st = explorationStatus(player, s);
  const objs = st.objs.map((o) => (st.pr.o[o.id] ? `§a✔ §f${o.nome}` : o.secreto ? "§8✖ ??? (um segredo)" : `§8✖ §7${o.nome}`));
  const extra = s.tipo === "cripta" && s.m ? [
    `§7Portão selado: ${s.m.portao ? "§aaberto" : "§cfechado"}`,
    `§7Senhor dos Mortos: ${s.m.chefe === "derrotado" ? "§aderrotado" : s.m.chefe === "luta" ? "§6em combate" : "§cadormecido"}`,
  ] : [];
  const body = [
    `${R.cor}${R.nome} §8· §f${T?.nome || s.tipo}`,
    `§7Coordenadas: §f${s.x} ${s.y} ${s.z} §8(${distTxt(player, s)})`,
    `§7Situação: ${HABITADO.has(s.tipo) ? "§ahabitada" : STATE[s.estado] || s.estado}${s.vezes ? ` §8· libertado ${s.vezes}×` : ""}`,
    ...extra,
    objs.length ? `\n§6Objetivos (${st.done}/${st.total})${st.completo ? " §6★ completo" : ""}:\n${objs.join("\n")}` : "",
    "", `§8${T?.descricao || ""}`,
  ].filter((x) => x !== "").join("\n");
  const m = new MessageFormData().title(s.nome).body(body).button1("OK").button2("Voltar");
  const k = await show(player, m);
  if (!k.canceled && k.selection === 1) return sitesMenu(player, back);
}

async function rumorsMenu(player) {
  const d = getData(player);
  const list = (d.rumores || []).map(getSite).filter(Boolean);
  const body = list.length ? list.map((s) => `${rarityOf(TYPES[s.tipo]).cor}${TYPES[s.tipo]?.nome || s.nome}§7 · ${distTxt(player, s)}`).join("\n") :
    "§7Nenhum rumor anotado. Liberte cativos, converse com aventureiros, use a luneta de um Posto de Observação ou o Mapa dos Reis.";
  const m = new MessageFormData().title("Rumores").body(`${body}\n\n§8Rumores somem da lista quando você descobre o local.`).button1("OK").button2("Voltar");
  const r = await show(player, m);
  if (!r.canceled && r.selection === 1) return explorationMenu(player);
}

async function cluesMenu(player) {
  const d = getData(player);
  const keys = Object.keys(d.pistas || {});
  const f = new ActionFormData().title("Pistas anotadas").body(keys.length ? "§7Textos de enigmas e inscrições que você leu." : "§7Leia atris, inscrições e pergaminhos nos locais para anotar pistas aqui.");
  for (const k of keys) f.button(`§l${d.pistas[k].titulo}§r\n§8${d.pistas[k].local}`, ICON("pergaminho_antigo"));
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= keys.length) return explorationMenu(player);
  const c = d.pistas[keys[r.selection]];
  const m = new MessageFormData().title(c.titulo).body(`§8${c.local}\n\n§f${c.texto}`).button1("OK").button2("Voltar");
  const k = await show(player, m);
  if (!k.canceled && k.selection === 1) return cluesMenu(player);
}

async function eventsMenu(player) {
  const lines = eventLines(player);
  const m = new MessageFormData().title("Eventos por perto")
    .body(lines.length ? `${lines.join("\n")}\n\n§8Eventos são temporários: caravanas, mercadores, caçadas, fendas, estrelas cadentes...` :
      "§7Nada acontecendo agora. O mundo de Valdoria muda com o bioma, a hora do dia e o seu nível: continue viajando.")
    .button1("OK").button2("Voltar");
  const r = await show(player, m);
  if (!r.canceled && r.selection === 1) return explorationMenu(player);
}

async function guide(player) {
  const m = new MessageFormData().title("Como explorar").body([
    "§6Raridade dos locais",
    "§fComum §7- pequenos e frequentes (ruínas, santuários, cemitérios).",
    "§aIncomum §7- minas, bibliotecas, atalaias, campos de batalha.",
    "§9Raro §7- templos subterrâneos, bosques encantados, altares corrompidos.",
    "§6Lendário §7- o Cofre dos Reis Esquecidos (monte o Mapa dos Reis com 3 fragmentos).",
    "",
    "§6Enigmas §7- leia o atril ou a inscrição do local: os versos dizem a ordem; cada alavanca, sino ou pedra fica sobre a cor do verso.",
    "§6Segredos §7- pedras lisas entre pedras velhas, velas apagadas, terra fofa e desabamentos escondem passagens. As pistas sempre avisam.",
    "§6Armadilhas §7- placas de pressão no chão são visíveis: quem pisa ouve um clique e tem um instante para sair.",
    "§6Guardiões §7- despertam quando você entra na sala; alguns carregam a §dChave Antiga§7.",
    "§6Exploração completa §7- cumpra todos os objetivos do local (Diário > Exploração) para uma recompensa extra.",
    "§6Eventos §7- patrulhas, caravanas, mercadores, caçadas, fendas e estrelas cadentes surgem perto de você.",
  ].join("\n")).button1("OK").button2("Voltar");
  const r = await show(player, m);
  if (!r.canceled && r.selection === 1) return explorationMenu(player);
}
