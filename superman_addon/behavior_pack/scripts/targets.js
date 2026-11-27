import { EntityDamageCause } from '@minecraft/server';
import { getSettings } from './config.js';
import { V } from './vec.js';

// Entidades que nunca sao alvo dos poderes (itens, projeteis, objetos)
const NEVER = new Set([
  'minecraft:item', 'minecraft:xp_orb', 'minecraft:arrow', 'minecraft:thrown_trident', 'minecraft:painting',
  'minecraft:armor_stand', 'minecraft:leash_knot', 'minecraft:fishing_hook', 'minecraft:snowball', 'minecraft:egg',
  'minecraft:ender_pearl', 'minecraft:fireball', 'minecraft:small_fireball', 'minecraft:wind_charge_projectile',
  'minecraft:breeze_wind_charge_projectile', 'minecraft:area_effect_cloud', 'minecraft:lightning_bolt',
  'minecraft:tnt', 'minecraft:falling_block', 'minecraft:minecart', 'minecraft:boat', 'minecraft:chest_boat',
  'minecraft:chest_minecart', 'minecraft:tnt_minecart', 'minecraft:hopper_minecart', 'minecraft:command_block_minecart',
  'minecraft:agent', 'minecraft:npc', 'minecraft:ender_crystal', 'minecraft:eye_of_ender_signal', 'minecraft:splash_potion',
  'minecraft:lingering_potion', 'minecraft:xp_bottle', 'minecraft:shulker_bullet', 'minecraft:llama_spit',
  'minecraft:wither_skull', 'minecraft:wither_skull_dangerous', 'minecraft:dragon_fireball', 'minecraft:evocation_fang',
]);

// Criaturas amigaveis protegidas por padrao
const FRIENDLY = new Set([
  'minecraft:villager', 'minecraft:villager_v2', 'minecraft:wandering_trader', 'minecraft:iron_golem',
  'minecraft:snow_golem', 'minecraft:allay', 'minecraft:copper_golem',
]);

/** True se a entidade deve ser poupada (aliados, pets, outros jogadores conforme as configuracoes). */
export function isProtected(player, e) {
  try {
    const t = e.typeId;
    const s = getSettings();
    if (t === 'minecraft:player') return e.id !== player.id && !s.hurtPlayers;
    if (!s.protectFriends) return false;
    if (FRIENDLY.has(t)) return true;
    const tame = e.getComponent('minecraft:tameable');
    return !!(tame && tame.isTamed);
  } catch (err) {
    return false;
  }
}

/** Pode ser atingido pelos poderes em area? */
export function canHit(player, e) {
  try {
    if (!e || !e.isValid || e.id === player.id || NEVER.has(e.typeId)) return false;
    return !isProtected(player, e);
  } catch (err) {
    return false;
  }
}

/** Alvos validos num raio. */
export function nearby(player, center, radius) {
  try {
    return player.dimension.getEntities({ location: center, maxDistance: radius }).filter((e) => canHit(player, e));
  } catch (e) {
    return [];
  }
}

export function hurt(player, e, amount, cause = EntityDamageCause.entityAttack) {
  try {
    e.applyDamage(amount, { cause, damagingEntity: player });
  } catch (err) { /* alvo invalido */ }
}

/** Empurra (e opcionalmente fere) os alvos num raio, com forca que cai com a distancia. */
export function pushMobs(player, center, radius, strength, lift, damage = 0, skipId) {
  for (const e of nearby(player, center, radius)) {
    if (e.id === skipId) continue;
    const rel = V.sub(e.location, center);
    const h = V.norm({ x: rel.x, y: 0, z: rel.z });
    const f = 1 - Math.min(1, V.len(rel) / radius) * 0.6;
    // quem ja esta voando mais rapido que este empurrao (arremessado, socado) nao e freado por ele
    let fast = false;
    try { const v = e.getVelocity(); fast = Math.hypot(v.x, v.z) > strength * f; } catch (err) { /* */ }
    if (!fast) {
      try { e.applyKnockback({ x: h.x * strength * f, z: h.z * strength * f }, lift * f); } catch (err) { /* */ }
    }
    if (damage > 0) hurt(player, e, damage * f);
  }
}

/** Da resistencia momentanea aos protegidos perto de uma explosao do heroi. */
export function shieldProtected(player, center, radius) {
  try {
    for (const e of player.dimension.getEntities({ location: center, maxDistance: radius })) {
      if (e.id === player.id || !isProtected(player, e)) continue;
      try { e.addEffect('resistance', 4, { amplifier: 4, showParticles: false }); } catch (err) { /* */ }
    }
  } catch (e) { /* */ }
}
