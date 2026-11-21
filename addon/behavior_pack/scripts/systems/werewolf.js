import { world, system, MoonPhase } from "@minecraft/server";
import { TAG, WEREWOLF, LOOP_TICKS, DP } from "../core/config.js";
import { isWerewolf, getLevel, getWolfTier, setWolfTier, getNum, setNum } from "../core/data.js";
import { safe, msg, sound, particleAt, effect, removeEffect, isNight, every, players, isCreative, hasFamily, isValid, chance } from "../core/util.js";
import { hasSkill, putHead, clearHead, restoreHelmet, state, bonusDamage, WOLF_HOOKS } from "./skills.js";
import { grantXp } from "./factions.js";

export function isFullMoon() {
  return safe(() => world.getMoonPhase() === MoonPhase.FullMoon) ?? false;
}

export function inForm(p) {
  return p.hasTag(TAG.IN_FORM);
}

/** May this werewolf be transformed right now? */
function formAllowed(p) {
  return isNight() || hasSkill(p, "suntransform");
}

export function enterForm(p, { forced = false } = {}) {
  if (inForm(p)) return true;
  const tier = getWolfTier(p);
  if (!p.hasTag("vc_wolf_hidden") && !putHead(p, WEREWOLF.HEAD_ITEM[tier - 1])) return false;
  p.addTag(TAG.IN_FORM);
  particleAt(p, "sunrise:transform_smoke", 1);
  particleAt(p, "sunrise:werewolf_cut", 1.4);
  sound(p, "mob.wolf.growl", 1.2, 0.55);
  if (forced) msg(p, "vc.werewolf.forced");
  return true;
}

export function exitForm(p) {
  if (!inForm(p)) return;
  p.removeTag(TAG.IN_FORM);
  WEREWOLF.HEAD_ITEM.forEach((id) => clearHead(p, id));
  restoreHelmet(p);
  removeEffect(p, "invisibility");
  particleAt(p, "sunrise:transform_smoke", 1);
  sound(p, "mob.wolf.whine", 0.8, 0.8);
}

WOLF_HOOKS.toggle = (p) => {
  if (inForm(p)) {
    if (isFullMoon() && isNight()) {
      msg(p, "vc.werewolf.full_moon_lock");
      return false;
    }
    exitForm(p);
    setNum(p, DP.WOLF_MANUAL, 1);
    return true;
  }
  if (!formAllowed(p)) {
    msg(p, "vc.werewolf.need_night");
    return false;
  }
  setNum(p, DP.WOLF_MANUAL, 0);
  return enterForm(p);
};

/** Night vision blinks during its last 10 s: refresh it well before that. */
function nightVision(p) {
  const cur = p.getEffect("night_vision");
  if (!cur || cur.duration < 240) p.addEffect("night_vision", 20 * 30, { amplifier: 0, showParticles: false });
}

// ---------------------------------------------------------------------------
// Loop
// ---------------------------------------------------------------------------

/** Initialised on the first loop: world APIs are unavailable during early execution. */
let wasNight;

function tickWerewolf(p, duskEdge, dawnEdge) {
  const lvl = getLevel(p);
  const tier = getWolfTier(p);
  const night = isNight();

  // Automatic transformations.
  if (duskEdge) setNum(p, DP.WOLF_MANUAL, 0);
  if (night && isFullMoon() && !inForm(p)) enterForm(p, { forced: true });
  else if (duskEdge && !inForm(p)) enterForm(p, { forced: true });
  if (dawnEdge && inForm(p) && !hasSkill(p, "suntransform")) exitForm(p);
  if (!night && inForm(p) && !hasSkill(p, "suntransform")) exitForm(p);

  if (inForm(p)) {
    // Keep the right wolf body for the current tier (tier can change mid-night).
    if (!p.hasTag("vc_wolf_hidden")) {
      putHead(p, WEREWOLF.HEAD_ITEM[tier - 1]);
      effect(p, "invisibility", 6, 0); // hides the human body under the wolf model
    }
    effect(p, "speed", 4, tier >= 2 ? 1 : 0);
    effect(p, "jump_boost", 4, tier - 1);
    effect(p, "strength", 4, tier - 1);
    nightVision(p);
    if (tier >= 2) effect(p, "health_boost", 30, tier - 2 + (lvl >= 9 ? 1 : 0));
    if (tier >= 3) effect(p, "resistance", 4, 0);
    if (!hasSkill(p, "poucafome") && !isCreative(p)) effect(p, "hunger", 4, 0);
  } else {
    if (night && lvl >= 3) effect(p, "speed", 4, 0);
    if (hasSkill(p, "nightvision")) nightVision(p);
  }
  if (hasSkill(p, "acrobata")) {
    effect(p, "speed", 4, 1);
    effect(p, "jump_boost", 4, inForm(p) ? Math.max(1, tier - 1) : 1);
  }
  if (hasSkill(p, "absorption") && !p.getEffect("absorption")) p.addEffect("absorption", 20 * 30, { amplifier: 0, showParticles: false });
  if (p.isInWater && !hasSkill(p, "waterproof")) effect(p, "slowness", 2, 0);
}

every(LOOP_TICKS, () => {
  const night = isNight();
  if (wasNight === undefined) wasNight = night;
  const dusk = night && !wasNight;
  const dawn = !night && wasNight;
  wasNight = night;
  for (const p of players()) if (isWerewolf(p)) safe(() => tickWerewolf(p, dusk, dawn), "tickWerewolf");
}, "werewolfLoop");

// ---------------------------------------------------------------------------
// Combat: heavy blow, bleeding, kill XP and tier promotion
// ---------------------------------------------------------------------------

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity: p, hitEntity: target }) => {
  if (p?.typeId !== "minecraft:player" || !isValid(target)) return;
  safe(() => {
    if (!isWerewolf(p)) return;
    if ((state.heavyBlow.get(p.id) ?? 0) > system.currentTick) {
      state.heavyBlow.delete(p.id);
      bonusDamage(target, 8 + getLevel(p), p);
      particleAt(target, "sunrise:werewolf_cut", 1);
      sound(target, "mob.ravager.bite", 1, 0.8);
      safe(() => {
        const d = p.getViewDirection();
        target.applyKnockback({ x: d.x * 1.6, z: d.z * 1.6 }, 0.4);
      });
    }
    if (hasSkill(p, "sangramento") && chance(40)) {
      target.addEffect("wither", 60, { amplifier: 0 });
      particleAt(target, "sunrise:bite_blood_particle", 1);
    }
    if (inForm(p)) particleAt(target, "sunrise:werewolf_cut", 1);
  }, "wolfHit");
});

const PROMOTE = {
  "sunrise:weak_werewolf": { from: 1, chance: 35 },
  "sunrise:werewolf": { from: 1, chance: 50 },
  "sunrise:black_werewolf": { from: 2, chance: 70 },
};

world.afterEvents.entityDie.subscribe(({ deadEntity, damageSource }) => {
  const killer = damageSource?.damagingEntity;
  if (killer?.typeId !== "minecraft:player") return;
  safe(() => {
    if (!isWerewolf(killer)) return;
    const type = deadEntity.typeId;
    let xp = WEREWOLF.KILL_XP_PASSIVE;
    if (hasFamily(deadEntity, "monster")) xp = WEREWOLF.KILL_XP_HOSTILE;
    if (PROMOTE[type] || hasFamily(deadEntity, "vampiro")) xp = WEREWOLF.KILL_XP_SUPERNATURAL;
    if (type === "minecraft:player") xp = WEREWOLF.KILL_XP_SUPERNATURAL;
    if (!inForm(killer)) xp = Math.ceil(xp / 2);
    grantXp(killer, xp);

    // Legacy mechanic: defeating stronger werewolves can awaken the next tier.
    const rule = PROMOTE[type];
    const tier = getWolfTier(killer);
    if (rule && tier < 3 && tier >= rule.from && tier <= rule.from + (type === "sunrise:black_werewolf" ? 1 : 0) && chance(rule.chance)) {
      const nextTier = type === "sunrise:black_werewolf" ? Math.min(3, tier + 1) : 2;
      if (nextTier > tier) {
        setWolfTier(killer, nextTier);
        msg(killer, "vc.werewolf.tier_up");
        sound(killer, "mob.wolf.big.growl", 1, 0.7);
      }
    }
  }, "wolfKill");
});
