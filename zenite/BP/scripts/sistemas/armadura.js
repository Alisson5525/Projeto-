// Traje do Zênite: Visão Noturna pelo Diadema e bônus do conjunto completo.
import { EquipmentSlot, system, world } from '@minecraft/server';
import { ITENS } from '../core/config.js';
import { obterEstado } from '../core/estado.js';

const VISAO = 'minecraft:night_vision';

/** @param {import('@minecraft/server').Player} p */
function verificar(p) {
  const eq = p.getComponent('minecraft:equippable');
  if (!eq) return;
  const tipo = (slot) => eq.getEquipment(slot)?.typeId;
  const cabeca = tipo(EquipmentSlot.Head);
  const e = obterEstado(p);
  e.conjunto = cabeca === ITENS.diadema && tipo(EquipmentSlot.Chest) === ITENS.manto && tipo(EquipmentSlot.Legs) === ITENS.perneiras && tipo(EquipmentSlot.Feet) === ITENS.botas;
  if (cabeca === ITENS.diadema) {
    p.addEffect(VISAO, 400, { amplifier: 0, showParticles: false });
  } else {
    const v = p.getEffect(VISAO);
    if (v && v.duration <= 400) p.removeEffect(VISAO);
  }
  if (e.conjunto) p.addEffect('minecraft:speed', 60, { amplifier: 0, showParticles: false });
}

export function iniciarArmadura() {
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      try {
        verificar(p);
      } catch {
        /* ignora */
      }
    }
  }, 20);
}
