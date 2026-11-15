// Códex: locais descobertos (com coordenadas e direção) e Biblioteca de textos de história encontrados.
import { system } from "@minecraft/server";
import { ActionFormData, MessageFormData, FormCancelationReason } from "@minecraft/server-ui";
import { say } from "../core/util.js";
import { psound } from "../core/fx.js";
import { getData, markDirty } from "../core/store.js";
import { addXP } from "../rpg/progression.js";
import { LORE } from "../data/lore.js";
import { questEvent } from "../quests/quests.js";
import { sitesMenu } from "../exploration/menu.js";

const ICON = (id) => `textures/items/valdoria/${id}`;

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
  return sitesMenu(player, back);
}
