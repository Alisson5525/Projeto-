// Itens de exploração: fragmentos que se juntam no Mapa dos Reis, o próprio mapa (revela o Cofre dos Reis Esquecidos),
// o Tomo Perdido (ensina um feitiço) e os pergaminhos de pista.
import { ItemStack } from "@minecraft/server";
import { NS, V, countItem, takeItem, giveItem, say } from "../core/util.js";
import { particle, psound } from "../core/fx.js";
import { getData, markDirty } from "../core/store.js";
import { SPELLS } from "../magic/spells.js";
import { ABILITIES } from "../abilities/registry.js";
import { allSites, center, compass, dist2d } from "../structures/registry.js";
import { tryGenerate, lastGenerationInfo } from "../structures/generation.js";
import { addRumor } from "./rumors.js";

export const FRAGMENTO = `${NS}:fragmento_mapa`;
export const MAPA_REIS = `${NS}:mapa_reis`;
export const TOMO = `${NS}:tomo_perdido`;
const busy = new Set();

function useFragment(player) {
  const n = countItem(player, FRAGMENTO);
  if (n < 3) {
    player.onScreenDisplay.setActionBar(`§6Fragmentos do Mapa Antigo: §f${n}/3 §7· os pedaços ainda não formam um caminho`);
    psound(player, "item.book.page_turn", 0.7, 0.8);
    return;
  }
  takeItem(player, FRAGMENTO, 3);
  giveItem(player, new ItemStack(MAPA_REIS, 1));
  particle(player.dimension, "sagrado_explosao", V.up(player.location, 1), { radius: 1 });
  psound(player, "ui.cartography_table.take_result", 1, 1);
  player.onScreenDisplay.setTitle("§6Mapa dos Reis Esquecidos", { subtitle: "§7Os três fragmentos se encaixam. Use o mapa para segui-lo.",
    fadeInDuration: 8, stayDuration: 60, fadeOutDuration: 15 });
}

async function useKingsMap(player) {
  if (busy.has(player.id)) return;
  const existing = allSites().find((r) => r.tipo === "cofre_reis" && r.dim === player.dimension.id && r.estado !== "construindo");
  if (existing) {
    addRumor(player, existing, "o Mapa dos Reis");
    player.onScreenDisplay.setActionBar(`§6Cofre dos Reis: §f~${Math.round(dist2d(existing, player.location))} blocos ${compass(player.location, existing)}`);
    const dir = V.flat(V.sub(center(existing), player.location));
    for (let i = 1; i <= 8; i++) particle(player.dimension, "cor_ponto", V.add(V.up(player.location, 1.2), V.mul(dir, i * 0.8)), { color: "gold" });
    return;
  }
  if (player.dimension.id !== "minecraft:overworld") {
    player.onScreenDisplay.setActionBar("§7O mapa só faz sentido sob o céu de Valdoria.");
    return;
  }
  busy.add(player.id);
  player.onScreenDisplay.setActionBar("§6O mapa brilha... procurando terreno firme para o Cofre.");
  try {
    const rec = await tryGenerate(player, { tipo: "cofre_reis" });
    if (!rec) {
      player.onScreenDisplay.setActionBar(`§7O mapa não encontra terreno firme aqui. §8(${lastGenerationInfo() || "tente em campo aberto"})`);
      return;
    }
    takeItem(player, MAPA_REIS, 1);
    addRumor(player, rec, "o Mapa dos Reis");
    say(player, "§6O Mapa dos Reis se desfaz em pó dourado: o caminho está gravado na sua memória (Diário > Exploração > Rumores).");
  } finally {
    busy.delete(player.id);
  }
}

function useTome(player) {
  const d = getData(player);
  const options = Object.values(SPELLS).filter((sp) => !sp.combo && sp.nivel <= d.nivel && !d.magias.includes(sp.id));
  if (!options.length) {
    player.onScreenDisplay.setActionBar("§7As páginas não têm nada a ensinar que você já não saiba. §8(suba de nível)");
    return;
  }
  // prefere feitiços de nível mais alto (o conhecimento perdido costuma ser avançado)
  options.sort((a, b) => b.nivel - a.nivel);
  const sp = options[Math.floor(Math.random() * Math.min(3, options.length))];
  if (!takeItem(player, TOMO, 1)) return;
  d.magias.push(sp.id);
  markDirty(player);
  particle(player.dimension, "arcano_runas", V.up(player.location, 1), {});
  psound(player, "mob.evocation_illager.cast_spell", 1.2, 0.8);
  player.onScreenDisplay.setTitle("§dTomo Perdido", { subtitle: `§7Você aprendeu §f${ABILITIES[sp.id].nome}`, fadeInDuration: 8, stayDuration: 50, fadeOutDuration: 15 });
  say(player, `§dO tomo se desfaz em cinzas arcanas. Novo feitiço: §f${ABILITIES[sp.id].nome}§d (prepare-o no Grimório).`);
}

/** Retorna true se o item foi tratado aqui. */
export function handleExploreItem(player, item) {
  const id = item?.typeId;
  if (id === FRAGMENTO) {
    useFragment(player);
    return true;
  }
  if (id === MAPA_REIS) {
    useKingsMap(player).catch((e) => console.warn(`[Valdoria] mapa dos reis: ${e}`));
    return true;
  }
  if (id === TOMO) {
    useTome(player);
    return true;
  }
  return false;
}
