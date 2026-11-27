// Roteia o uso dos itens do Zênite: Astrolábio, Sigilos, Códice, Coração e outros.
import { EquipmentSlot, system, world } from '@minecraft/server';
import { COR, ITENS, PARTICULAS, SIGILOS, SONS, XP_CORACAO_REPETIDO } from '../core/config.js';
import { obterEstado, salvarEstado } from '../core/estado.js';
import { anel, esfera, flash, som, titulo } from '../core/fx.js';
import { tentarLancar } from '../core/lancar.js';
import { tr } from '../core/texto.js';
import { abrirCodice } from '../ui/codice.js';
import { abrirRoda } from '../ui/roda.js';
import { ganharXp } from './maestria.js';

/** @type {Record<string, string>} */
const TEC_DO_SIGILO = Object.fromEntries(Object.entries(SIGILOS).map(([tec, item]) => [item, tec]));
/** @type {Map<string, (player: import('@minecraft/server').Player, item: import('@minecraft/server').ItemStack) => void>} */
const usos = new Map();

/** Permite que outros módulos (ex.: o chefe) tratem o uso de um item. */
export function registrarUso(typeId, fn) {
  usos.set(typeId, fn);
}

/** Gasta uma unidade do item na mão principal. */
export function consumirNaMao(player, typeId) {
  const eq = player.getComponent('minecraft:equippable');
  const item = eq?.getEquipment(EquipmentSlot.Mainhand);
  if (!eq || !item || item.typeId !== typeId) return false;
  if (item.amount > 1) {
    item.amount -= 1;
    eq.setEquipment(EquipmentSlot.Mainhand, item);
  } else eq.setEquipment(EquipmentSlot.Mainhand, undefined);
  return true;
}

/** @param {import('@minecraft/server').Player} player */
function usarCoracao(player) {
  if (!consumirNaMao(player, ITENS.coracao)) return;
  const e = obterEstado(player);
  const l = player.location;
  const dim = player.dimension;
  som(dim, SONS.abobada, l, 1, 1.2);
  flash(player, { red: 0.45, green: 0.2, blue: 0.85 }, 0.1, 0.2, 1.2);
  esfera(dim, { x: l.x, y: l.y + 1, z: l.z }, 2.2, 60, PARTICULAS.estrela, COR.violeta, 0.35);
  for (let i = 0; i < 4; i++) anel(dim, { x: l.x, y: l.y + 0.1 + i * 0.6, z: l.z }, 1.6 - i * 0.3, 18, PARTICULAS.brilho, COR.ciano, 0.4, i);
  if (!e.abobada) {
    e.abobada = true;
    salvarEstado(player);
    titulo(player, tr('zenite.titulo.coracao'), tr('zenite.tec.abobada.nome'), 10, 60, 20);
    player.sendMessage(tr('zenite.msg.abobada_liberada'));
  } else {
    ganharXp(player, XP_CORACAO_REPETIDO);
    player.sendMessage(tr('zenite.msg.coracao_repetido'));
  }
}

/** @param {import('@minecraft/server').Player} player @param {import('@minecraft/server').ItemStack | undefined} item */
function rotear(player, item) {
  if (!item || !item.typeId.startsWith('zenite:')) return;
  const e = obterEstado(player);
  const agora = system.currentTick;
  if (agora - e.ultimoUso < 4) return;
  e.ultimoUso = agora;
  const id = item.typeId;
  if (id === ITENS.astrolabio) {
    if (player.isSneaking) void abrirRoda(player);
    else tentarLancar(player, e.selecionada, 'astrolabio');
    return;
  }
  const tec = TEC_DO_SIGILO[id];
  if (tec) {
    tentarLancar(player, tec, 'sigilo');
    return;
  }
  if (id === ITENS.codice) void abrirCodice(player);
  else if (id === ITENS.coracao) usarCoracao(player);
  else usos.get(id)?.(player, item);
}

export function iniciarItens() {
  world.afterEvents.itemUse.subscribe((ev) => {
    try {
      rotear(ev.source, ev.itemStack);
    } catch (err) {
      console.warn(`[Zênite] itemUse: ${err}`);
    }
  });
  world.afterEvents.playerInteractWithBlock.subscribe((ev) => {
    if (!ev.isFirstEvent) return;
    try {
      rotear(ev.player, ev.itemStack);
    } catch (err) {
      console.warn(`[Zênite] interação: ${err}`);
    }
  });
}
