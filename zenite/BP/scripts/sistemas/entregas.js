// Entrega de itens: inventário primeiro; se estiver cheio, o item cai aos pés.
import { ItemStack } from '@minecraft/server';
import { ITENS, SIGILOS } from '../core/config.js';
import { tr } from '../core/texto.js';

/** @param {import('@minecraft/server').Player} player @returns {boolean} coube no inventário */
export function darItem(player, typeId, qtd = 1) {
  const item = new ItemStack(typeId, qtd);
  const inv = player.getComponent('minecraft:inventory')?.container;
  const sobra = inv ? inv.addItem(item) : item;
  if (!sobra) return true;
  player.dimension.spawnItem(sobra, player.location);
  return false;
}

function entregar(player, lista, chaveOk) {
  let tudo = true;
  for (const [id, qtd] of lista) tudo = darItem(player, id, qtd) && tudo;
  player.sendMessage(tudo ? tr(chaveOk) : tr('zenite.msg.inventario_cheio'));
}

/** @param {import('@minecraft/server').Player} player */
export function darKit(player) {
  entregar(player, [
    [ITENS.astrolabio, 1], [ITENS.codice, 1], [ITENS.diadema, 1], [ITENS.manto, 1],
    [ITENS.perneiras, 1], [ITENS.botas, 1], [ITENS.selo, 1], [ITENS.poeira, 16],
  ], 'zenite.msg.kit');
}

/** @param {import('@minecraft/server').Player} player */
export function darSigilos(player) {
  entregar(player, Object.values(SIGILOS).map((id) => [id, 1]), 'zenite.msg.sigilos');
}
