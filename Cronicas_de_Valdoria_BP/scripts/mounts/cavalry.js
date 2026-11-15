// Cavalaria de Valdoria: o Capitão da Guarda entrega o Corcel de Guerra a quem segue a Crônica III.
import { ItemStack } from "@minecraft/server";
import { NS, giveItem } from "../core/util.js";
import { psound } from "../core/fx.js";
import { getData } from "../core/store.js";
import { chapterStep, setFlag } from "../quests/quests.js";

/** O passo atual da Crônica pede o corcel e ele ainda não foi entregue. */
export function cavalryReady(player) {
  const d = getData(player);
  return chapterStep(player).step?.obj?.flag === "corcel" && !d.flags?.corcel;
}

export function cavalryGive(player, nome) {
  if (!cavalryReady(player)) return "§7Nada a entregar no momento.";
  giveItem(player, new ItemStack(`${NS}:escritura_cavalo`, 1));
  setFlag(player, "corcel");
  psound(player, "mob.horse.idle", 0.9, 1);
  return `§e${nome}: §f"O Domínio do Fogo não se atravessa a pé. Leve esta escritura: o corcel é seu. Use-a para chamá-lo, ` +
    "e agache ao lado dele para dar ordens.\" §7(Você recebeu a §6Escritura do Corcel de Guerra§7.)";
}
