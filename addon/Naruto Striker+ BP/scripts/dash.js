import * as mc from "@minecraft/server";
import { empurrar } from "./lib/fisica.js";

const MAO_TERRA_DAMAGE = 7;
const MAO_TERRA_TICKS = 5;
const MAO_TERRA_RADIUS = 3;

const RAIKIRI_DAMAGE = 40;
const RAIKIRI_TICKS = 5;
const RAIKIRI_RADIUS = 4;

const CHIDORI_DAMAGE = 20;
const CHIDORI_TICKS = 5;
const CHIDORI_RADIUS = 4;

const CHIDORI_NEGRO_DAMAGE = 35;
const CHIDORI_NEGRO_TICKS = 8;
const CHIDORI_NEGRO_RADIUS = 5;

const SHIDEN_DAMAGE = 55;
const SHIDEN_TICKS = 8;
const SHIDEN_RADIUS = 3;

const MOB_MAX_TARGET_DIST = 30;
const MOB_VERTICAL_THRESHOLD = 1.5;
const MOB_BASE_STRENGTH = 1.8;
const MOB_AIR_STRENGTH = 1.2;
const MOB_VERTICAL_BOOST = 1.8;

function normalize(x, y, z) {
  const len = Math.hypot(x, y, z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: x / len, y: y / len, z: z / len };
}

function dash(player) {
  player.removeTag("dash");
  const view = player.getViewDirection();
  empurrar(player, view.x, view.z, view.y > 0.7 || view.y < -0.7 ? 2 : 10, view.y * 2);
}

function dashEntity(entity) {
  entity.removeTag("dash_mob");

  let nearest = null;
  let nearestDist = Infinity;

  for (const player of mc.world.getPlayers()) {
    try {
      if (player.dimension.id !== entity.dimension.id) continue;
    } catch (e) {}

    const dx = player.location.x - entity.location.x;
    const dy = player.location.y - entity.location.y;
    const dz = player.location.z - entity.location.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < nearestDist && dist <= MOB_MAX_TARGET_DIST) {
      nearestDist = dist;
      nearest = { dx, dy, dz };
    }
  }

  if (!nearest) return;

  const dir = normalize(nearest.dx, nearest.dy, nearest.dz);
  let strength = MOB_BASE_STRENGTH;
  let verticalMultiplier = 0.9;

  if (nearest.dy > MOB_VERTICAL_THRESHOLD) {
    strength = MOB_AIR_STRENGTH;
    const verticalComponent = Math.min(nearest.dy, 4);
    verticalMultiplier = Math.max(0.6, (verticalComponent / (nearestDist || 1)) * MOB_VERTICAL_BOOST);
  }

  try {
    if (!empurrar(entity, dir.x * strength, dir.z * strength, 7, dir.y * verticalMultiplier)) throw new Error("knockback");
  } catch (e) {
    try {
      const upFactor = nearest.dy > MOB_VERTICAL_THRESHOLD ? Math.min(nearest.dy, 4) : 0.5;
      const newX = entity.location.x + dir.x * (strength * 2);
      const newY = entity.location.y + upFactor;
      const newZ = entity.location.z + dir.z * (strength * 2);
      entity.teleport({ x: newX, y: newY, z: newZ }, { dimension: entity.dimension });
    } catch (err) {}
  }
}
function mao_terra(player) {
  const view = player.getViewDirection();
  const daash = "animation.mao_terra_skill_1_atk";
  empurrar(player, view.x, view.z, 5, 0);
  player.playAnimation(daash, { controller: "daash_controller", blendOutTime: 0.25 });
  player.removeTag("mao_terra");
  player.setDynamicProperty("chidori_damage_ticks", MAO_TERRA_TICKS);
  player.setDynamicProperty("chidori_damage", MAO_TERRA_DAMAGE);
  player.setDynamicProperty("chidori_radius", MAO_TERRA_RADIUS);
}

function raikiri(player) {
  const view = player.getViewDirection();
  const daash = "animation.chidori_atk";
  empurrar(player, view.x, view.z, 30, 0);
  player.playAnimation(daash, { controller: "daash_controller", blendOutTime: 0.25 });
  player.removeTag("raikiri");
  player.setDynamicProperty("chidori_damage_ticks", RAIKIRI_TICKS);
  player.setDynamicProperty("chidori_damage", RAIKIRI_DAMAGE);
  player.setDynamicProperty("chidori_radius", RAIKIRI_RADIUS);
}

function chidori_negro(player) {
  const view = player.getViewDirection();
  const daash = "animation.chidori_negro_atk";
  empurrar(player, view.x, view.z, 20, 0);
  player.playAnimation(daash, { controller: "daash_controller", blendOutTime: 0.25 });
  player.removeTag("chidori_negro");
  player.setDynamicProperty("chidori_damage_ticks", CHIDORI_NEGRO_TICKS);
  player.setDynamicProperty("chidori_damage", CHIDORI_NEGRO_DAMAGE);
  player.setDynamicProperty("chidori_radius", CHIDORI_NEGRO_RADIUS);
}

function shiden_negro(player) {
  const view = player.getViewDirection();
  const daash = "animation.shiden_skill_salto";
  empurrar(player, view.x, view.z, 7, 0);
  player.playAnimation(daash, { controller: "daash_controller", blendOutTime: 0.25 });
  player.removeTag("shiden_negro");
  player.setDynamicProperty("chidori_damage_ticks", SHIDEN_TICKS);
  player.setDynamicProperty("chidori_damage", SHIDEN_DAMAGE);
  player.setDynamicProperty("chidori_radius", SHIDEN_RADIUS);
}

function chidori(player) {
  const view = player.getViewDirection();
  const daash = "animation.chidori_atk";
  empurrar(player, view.x, view.z, 20, 0);
  player.playAnimation(daash, { controller: "daash_controller", blendOutTime: 0.25 });
  player.removeTag("chidori");
  player.setDynamicProperty("chidori_damage_ticks", CHIDORI_TICKS);
  player.setDynamicProperty("chidori_damage", CHIDORI_DAMAGE);
  player.setDynamicProperty("chidori_radius", CHIDORI_RADIUS);
}

mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {
    try {
    if (player.hasTag("dash")) dash(player);
    if (player.hasTag("shiden_negro")) shiden_negro(player);
    if (player.hasTag("raikiri")) raikiri(player);
    if (player.hasTag("mao_terra")) mao_terra(player);
    if (player.hasTag("chidori_negro")) chidori_negro(player);
    if (player.hasTag("chidori")) chidori(player);
  
    } catch (e) {}
  }

  const dims = [];
  try { dims.push(mc.world.getDimension("overworld")); } catch (e) {}
  try { dims.push(mc.world.getDimension("nether")); } catch (e) {}
  try { dims.push(mc.world.getDimension("the_end")); } catch (e) {}

  for (const dim of dims) {
    if (!dim) continue;
    let entities = [];
    try {
      // so entidades marcadas (antes varria TODAS as entidades do mundo a cada tick)
      entities = dim.getEntities({ tags: ["dash_mob"] });
    } catch (e) {
      entities = [];
    }

    for (const entity of entities) {
      try {
        if (entity.hasTag && entity.hasTag("dash_mob")) dashEntity(entity);
      } catch (e) {}
    }
  }
}, 1);

mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {
    try {
    const ticksProp = player.getDynamicProperty("chidori_damage_ticks");
    if (typeof ticksProp !== "number") continue;
    let ticks = ticksProp;

    const dano = Number(player.getDynamicProperty("chidori_damage") ?? 0) || 0;
    const raio = Number(player.getDynamicProperty("chidori_radius") ?? 4) || 4;

    const entities = player.dimension.getEntities({
      location: player.location,
      maxDistance: raio,
      excludeNames: [player.name],
      excludeTypes: ["minecraft:item", "minecraft:xp_orb", "minecraft:arrow"]
    });

    for (const entity of entities) {
      if (entity.id === player.id) continue; // nunca fere quem usou o jutsu
      try {
        entity.applyDamage(dano, {
          cause: mc.EntityDamageCause.entityAttack,
          damagingEntity: player
        });
      } catch (e) {}
    }

    ticks--;
    player.setDynamicProperty("chidori_damage_ticks", ticks);

    if (ticks <= 0) {
      player.setDynamicProperty("chidori_damage_ticks", undefined);
      player.setDynamicProperty("chidori_damage", undefined);
      player.setDynamicProperty("chidori_radius", undefined);
    }
  
    } catch (e) {}
  }
}, 1);
