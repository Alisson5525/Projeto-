// Ciclo dos feiticeiros: regeneração de Éter, HUD na barra de ação e salvamento.
import { EquipmentSlot, system, world } from '@minecraft/server';
import { ITENS, SIGILOS } from '../core/config.js';
import { cfgJogador } from '../core/configuracoes.js';
import { ehCriativo, maxEter, obterEstado, salvarEstado } from '../core/estado.js';
import { montarHud } from '../core/hud.js';
import { clampEter, regenEter } from '../core/progression.js';

const PERIODO = 4;
/** @type {Record<string, string>} */
const TEC_DO_SIGILO = Object.fromEntries(Object.entries(SIGILOS).map(([tec, item]) => [item, tec]));

/** @param {import('@minecraft/server').Player} p */
function itemNaMao(p) {
  try {
    return p.getComponent('minecraft:equippable')?.getEquipment(EquipmentSlot.Mainhand)?.typeId;
  } catch {
    return undefined;
  }
}

/** @param {import('@minecraft/server').Player} p */
function cicloJogador(p, agora) {
  const e = obterEstado(p);
  const criativo = ehCriativo(p);
  const max = maxEter(e);
  if (criativo) e.eter = max;
  else if (!e.veu) e.eter = clampEter(e.eter + regenEter(e.nivel, e.conjunto) * (PERIODO / 20), max);
  else e.eter = clampEter(e.eter, max);

  if (e.aviso && e.aviso.ate > agora) {
    p.onScreenDisplay.setActionBar(e.aviso.raw);
    return;
  }
  e.aviso = undefined;
  if (!cfgJogador(p).hud) return;
  const mao = itemNaMao(p);
  const sigilo = mao ? TEC_DO_SIGILO[mao] : undefined;
  const segurando = mao === ITENS.astrolabio || !!sigilo;
  if (!segurando && !e.veu && !e.canalizando && !e.dentroAbobada) return;
  const tecnica = sigilo ?? e.selecionada;
  p.onScreenDisplay.setActionBar(
    montarHud({
      eter: e.eter,
      max,
      tecnica,
      prontaEm: Math.max(0, (e.recargas[tecnica] ?? 0) - agora),
      veu: e.veu,
      dentroAbobada: !!e.dentroAbobada,
      canalizando: e.canalizando,
      glifos: cfgJogador(p).glifos,
      infinito: criativo,
    }),
  );
}

export function iniciarCiclo() {
  system.runInterval(() => {
    const agora = system.currentTick;
    for (const p of world.getAllPlayers()) {
      try {
        cicloJogador(p, agora);
      } catch {
        /* jogador saindo */
      }
    }
  }, PERIODO);
  system.runInterval(() => {
    for (const p of world.getAllPlayers()) {
      try {
        if (obterEstado(p).sujo) salvarEstado(p);
      } catch {
        /* ignora */
      }
    }
  }, 100);
}
