// Pergaminho Antigo: item não empilhável que guarda o id do texto de história em uma propriedade dinâmica.
import { ItemStack } from "@minecraft/server";
import { NS } from "../core/util.js";
import { LORE } from "../data/lore.js";

export const SCROLL_ID = `${NS}:pergaminho_antigo`;
export const SCROLL_PROP = `${NS}:lore`;

export function scrollItem(loreId) {
  const it = new ItemStack(SCROLL_ID, 1);
  try {
    it.setDynamicProperty(SCROLL_PROP, loreId);
    it.setLore([`§7${LORE[loreId]?.titulo || "Texto antigo"}`, "§8Use para ler."]);
  } catch { /* */ }
  return it;
}

export function scrollLoreId(item) {
  try {
    const v = item?.getDynamicProperty(SCROLL_PROP);
    return typeof v === "string" ? v : undefined;
  } catch {
    return undefined;
  }
}
