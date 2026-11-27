// Quem pode ser atingido pelas técnicas, e como aplicar dano e empurrões.
import { EntityDamageCause, GameMode } from '@minecraft/server';
import { PROJETEIS, TIPOS_IGNORADOS } from './config.js';
import { cfgMundo } from './configuracoes.js';

/**
 * @param {import('@minecraft/server').Entity | undefined} conjurador
 * @param {import('@minecraft/server').Entity} alvo
 * @param {{pvp:boolean}} [cfg]
 */
export function isAlvoValido(conjurador, alvo, cfg = cfgMundo()) {
  try {
    if (!alvo || !alvo.isValid) return false;
    if (conjurador && alvo.id === conjurador.id) return false;
    const tipo = alvo.typeId;
    if (TIPOS_IGNORADOS.has(tipo) || PROJETEIS.has(tipo)) return false;
    if (tipo === 'minecraft:player') {
      if (!cfg.pvp) return false;
      const modo = /** @type {import('@minecraft/server').Player} */ (alvo).getGameMode();
      return modo !== GameMode.Creative && modo !== GameMode.Spectator;
    }
    if (conjurador) {
      const domado = /** @type {any} */ (alvo.getComponent('minecraft:tameable'));
      if (domado && domado.isTamed && domado.tamedToPlayerId === conjurador.id) return false;
    }
    return !!alvo.getComponent('minecraft:health');
  } catch {
    return false;
  }
}

/** Dano creditado ao conjurador (para XP e drops). */
export function causarDano(alvo, qtd, conjurador, causa = EntityDamageCause.entityAttack) {
  try {
    return alvo.applyDamage(qtd, conjurador && conjurador.isValid ? { cause: causa, damagingEntity: conjurador } : { cause: causa });
  } catch {
    return false;
  }
}

/** Empurrão: impulso em mobs, knockback em jogadores. dir deve ser unitário. */
export function empurrar(alvo, dir, forcaH, forcaV) {
  try {
    if (alvo.typeId === 'minecraft:player') alvo.applyKnockback({ x: dir.x * forcaH, z: dir.z * forcaH }, forcaV);
    else alvo.applyImpulse({ x: dir.x * forcaH, y: forcaV, z: dir.z * forcaH });
  } catch {
    /* entidades sem física */
  }
}

/** Entidades atingíveis num raio. */
export function alvosEm(dim, centro, raio, conjurador, cfg = cfgMundo()) {
  let lista = [];
  try {
    lista = dim.getEntities({ location: centro, maxDistance: raio });
  } catch {
    return [];
  }
  return lista.filter((e) => isAlvoValido(conjurador, e, cfg));
}
