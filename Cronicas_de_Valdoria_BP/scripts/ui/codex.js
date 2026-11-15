// Códex: locais descobertos (com coordenadas e direção) e Biblioteca de textos de história encontrados.
import { system } from "@minecraft/server";
import { ActionFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { say } from "../core/util.js";
import { psound } from "../core/fx.js";
import { getData, markDirty } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { LORE } from "../data/lore.js";
import { questEvent } from "../quests/quests.js";
import { getSite, TYPES, compass, dist2d } from "../structures/registry.js";

const ICON = (id) => `textures/items/valdoria/${id}`;
const TYPE_ICON = { acampamento: "insignia_goblin", torre: "grimorio_arquimago", cripta: "chave_cripta", vila: "moeda_ouro", celeste: "pena_celeste",
  nyxhal: "coracao_abismo" };
const STATE = { ativo: "§cocupado", limpo: "§alibertado", construindo: "§8surgindo" };

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

/** Registra um texto como lido (Biblioteca do Códex). `announce` mostra o texto no chat. */
export function markLoreRead(player, id, announce = false) {
  const L = LORE[id];
  if (!L) return false;
  const d = getData(player);
  d.lidos = d.lidos || [];
  if (d.lidos.includes(id)) return false;
  d.lidos.push(id);
  markDirty(player);
  addXP(player, 25, "conhecimento");
  if (announce) {
    say(player, `§6§l${L.titulo}§r\n§7${L.texto}`);
    player.onScreenDisplay.setActionBar(`§6Novo texto no Códex: §f${L.titulo}`);
  }
  psound(player, "item.book.page_turn", 1, 1);
  questEvent(player, "lore", id);
  return true;
}

/** Abre o texto de um pergaminho. */
export async function readLore(player, id, back) {
  const L = LORE[id];
  if (!L) return;
  markLoreRead(player, id, false);
  const f = new MessageFormData().title(L.titulo).body(`§8${L.local}\n\n§f${L.texto}`).button1("Fechar").button2("Biblioteca");
  const r = await show(player, f);
  if (!r.canceled && r.selection === 1) return libraryMenu(player, back);
}

export async function libraryMenu(player, back) {
  const d = getData(player);
  const ids = Object.keys(LORE);
  const lidos = d.lidos || [];
  const f = new ActionFormData().title("Biblioteca").body(`§7Textos encontrados: §f${lidos.filter((x) => LORE[x]).length}/${ids.length}\n` +
    "§8Pergaminhos e inscrições aparecem nas estruturas de Valdoria.");
  for (const id of ids) f.button(lidos.includes(id) ? `§l${LORE[id].titulo}§r\n§8${LORE[id].local}` : "§8???\n§8Ainda não encontrado", ICON("pergaminho_antigo"));
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= ids.length) return back && back(player);
  const id = ids[r.selection];
  if (!lidos.includes(id)) return libraryMenu(player, back);
  return readLore(player, id, back);
}

export async function placesMenu(player, back) {
  const d = getData(player);
  const sites = (d.locais || []).map(getSite).filter(Boolean)
    .sort((a, b) => (a.dim === player.dimension.id ? dist2d(a, player.location) : 1e9) - (b.dim === player.dimension.id ? dist2d(b, player.location) : 1e9));
  const f = new ActionFormData().title("Locais Descobertos")
    .body(sites.length ? "§7Toque em um local para ver detalhes." : "§7Nenhum local descoberto ainda.\nExplore Valdoria ou use o §fMapa do Explorador§7.");
  for (const s of sites) {
    const same = s.dim === player.dimension.id;
    f.button(`§l${s.nome}§r\n${["vila", "capital", "aelthar"].includes(s.tipo) ? "§ahabitada" : STATE[s.estado] || ""}§8 · ${same ? `${Math.round(dist2d(s, player.location))} blocos ${compass(player.location, s)}` : "outra dimensão"}`,
      ICON(TYPE_ICON[s.tipo] || "diario_aventureiro"));
  }
  f.button("Voltar");
  const r = await show(player, f);
  if (r.canceled || r.selection === undefined) return;
  if (r.selection >= sites.length) return back && back(player);
  const s = sites[r.selection];
  const T = TYPES[s.tipo];
  const extra = s.tipo === "cripta" && s.m ? [
    `§7Portão selado: ${s.m.portao ? "§aaberto" : "§cfechado"}`,
    `§7Senhor dos Mortos: ${s.m.chefe === "derrotado" ? "§aderrotado" : s.m.chefe === "luta" ? "§6em combate" : "§cadormecido"}`,
  ] : [];
  const body = [`§f${T?.nome || s.tipo}`, `§7Coordenadas: §f${s.x} ${s.y} ${s.z}`, `§7Situação: ${["vila", "capital", "aelthar"].includes(s.tipo) ? "§ahabitada" : STATE[s.estado] || s.estado}`,
    s.vezes ? `§7Libertado ${s.vezes}×` : "", ...extra, "", `§8${T?.descricao || ""}`].filter((x) => x !== "").join("\n");
  const m = new MessageFormData().title(s.nome).body(body).button1("OK").button2("Voltar");
  const k = await show(player, m);
  if (!k.canceled && k.selection === 1) return placesMenu(player, back);
}
