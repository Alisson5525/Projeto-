import { world, system, EquipmentSlot, WeatherType, GameMode } from "@minecraft/server";
import { TAG, ITEM, VAMPIRE, LOOP_TICKS, BITE_FAMILIES, NO_BITE_FAMILIES, DP } from "../core/config.js";
import { isVampire, isHunter, getBlood, setBlood, addBlood, getLevel, getSettings, isSupernaturalPlayer, getNum, setNum } from "../core/data.js";
import {
  safe, sound, particleAt, particle, effect, removeEffect, heal, hasFamily, isDay, seesSky, getEquip, setEquip,
  every, players, msg, playAnim, isCreative, chance, isValid, v3,
} from "../core/util.js";
import { hasSkill, exitBatForm, putHead, isCosmeticHead, state, bonusDamage } from "./skills.js";
import { grantXp, infect } from "./factions.js";
import { armorSet } from "./gear.js";
import { ItemStack } from "@minecraft/server";

// ---------------------------------------------------------------------------
// Weather tracking (the API has no getter in 2.0.0, so we listen for changes)
// ---------------------------------------------------------------------------

const raining = { overworld: false };
world.afterEvents.weatherChange.subscribe((e) => {
  if (e.dimension.endsWith("overworld")) raining.overworld = e.newWeather !== WeatherType.Clear;
});

// ---------------------------------------------------------------------------
// Per-player runtime state
// ---------------------------------------------------------------------------

/** id -> { sunTicks, drainTicks, starveTicks, waterTicks, lastBite, inSun } */
const rt = new Map();
function R(p) {
  let r = rt.get(p.id);
  if (!r) rt.set(p.id, (r = { sunTicks: 0, drainTicks: 0, starveTicks: 0, waterTicks: 0, lastBite: 0, inSun: false, batDrain: 0 }));
  return r;
}
world.afterEvents.playerLeave.subscribe(({ playerId }) => rt.delete(playerId));

export function vampireRuntime(p) {
  return R(p);
}

// ---------------------------------------------------------------------------
// Main vampire loop (every LOOP_TICKS)
// ---------------------------------------------------------------------------

function tickVampire(p) {
  const r = R(p);
  const lvl = getLevel(p);
  const creative = isCreative(p) || safe(() => p.getGameMode() === GameMode.Spectator);
  let blood = getBlood(p);

  // --- Blood drain -------------------------------------------------------
  if (!creative) {
    r.drainTicks += LOOP_TICKS * (p.isSprinting ? 1.5 : 1) * (hasSkill(p, "poucasede") ? 0.5 : 1);
    const drainEvery = VAMPIRE.DRAIN_SECONDS[lvl] * 20;
    if (r.drainTicks >= drainEvery) {
      r.drainTicks = 0;
      addBlood(p, -1);
      blood = getBlood(p);
    }
    if (p.hasTag(TAG.BAT_FORM)) {
      r.batDrain += LOOP_TICKS;
      if (r.batDrain >= 80) {
        r.batDrain = 0;
        addBlood(p, -1);
        blood = getBlood(p);
      }
      if (blood <= 0) {
        exitBatForm(p);
        msg(p, "vc.skill.no_blood");
      }
    }
  }

  // --- Blood-driven buffs / thirst -------------------------------------
  if (blood > 0) {
    effect(p, "saturation", 2, 0); // vampires don't need food while they have blood
    if (blood >= 18 && !r.inSun) effect(p, "regeneration", 4, 0);
    if (blood <= 4) {
      effect(p, "slowness", 3, 0);
      effect(p, "weakness", 3, 0);
    }
    r.starveTicks = 0;
  } else if (!creative) {
    effect(p, "weakness", 3, 1);
    effect(p, "slowness", 3, 1);
    effect(p, "hunger", 3, 1);
    r.starveTicks += LOOP_TICKS;
    if (r.starveTicks >= 60) {
      r.starveTicks = 0;
      safe(() => p.applyDamage(1, { cause: "starve" }));
    }
  }

  // --- Level passives ----------------------------------------------------
  const night = !isDay();
  if (lvl >= 3 || hasSkill(p, "acrobata")) effect(p, "speed", 4, hasSkill(p, "acrobata") && lvl >= 6 ? 1 : 0);
  if (hasSkill(p, "acrobata") || lvl >= 6) effect(p, "jump_boost", 4, hasSkill(p, "acrobata") ? 1 : 0);
  if (night && lvl >= 4) effect(p, "strength", 4, lvl >= 8 ? 1 : 0);
  if (lvl >= 5) effect(p, "health_boost", 30, lvl >= 9 ? 1 : 0);
  if (hasSkill(p, "nightvision") && blood > 0) nightVision(p);
  if (hasSkill(p, "absorption") && blood > 0 && !p.getEffect("absorption")) p.addEffect("absorption", 20 * 30, { amplifier: 0, showParticles: false });

  // --- Sunlight ----------------------------------------------------------
  r.inSun = false;
  if (!creative && getSettings().sunDamage && p.dimension.id === "minecraft:overworld" && isDay() && !raining.overworld && seesSky(p) && !p.isInWater) {
    r.inSun = true;
    r.sunTicks += LOOP_TICKS;
    const resist = hasSkill(p, "sunresistence") || armorSet(p) === "sun";
    effect(p, "weakness", 3, 0);
    if (r.sunTicks % 20 === 0) particleAt(p, "sunrise:burn_smoke", 1.2);
    if (r.sunTicks >= VAMPIRE.SUN_GRACE_TICKS) {
      if (resist) {
        effect(p, "slowness", 3, 0);
      } else {
        const helmet = getEquip(p, EquipmentSlot.Head);
        const shielded = helmet && !isCosmeticHead(helmet.typeId);
        safe(() => p.setOnFire(shielded ? 1 : 3, true));
        // Young vampires suffer more; elders resist.
        const extra = lvl <= 3 ? 2 : lvl <= 6 ? 1 : lvl <= 9 ? 0.5 : 0;
        if (extra > 0 && r.sunTicks % 20 === 0) safe(() => p.applyDamage(shielded ? extra / 2 : extra, { cause: "fire" }));
      }
    }
  } else {
    r.sunTicks = 0;
  }

  // --- Running water -----------------------------------------------------
  if (!creative && p.isInWater && !hasSkill(p, "waterproof")) {
    r.waterTicks += LOOP_TICKS;
    effect(p, "slowness", 2, 1);
    if (r.waterTicks >= 40) {
      r.waterTicks = 0;
      safe(() => p.applyDamage(1, { cause: "drowning" }));
    }
  } else {
    r.waterTicks = 0;
  }

  // Creepers/golems read this tag from their JSON filters.
  const undetectable = hasSkill(p, "indetectavel");
  if (undetectable !== p.hasTag("vc_undetectable")) undetectable ? p.addTag("vc_undetectable") : p.removeTag("vc_undetectable");

  // --- Cosmetic vampire eyes (only on an empty head slot) -----------------
  if (!p.hasTag(TAG.BAT_FORM)) syncEyes(p);
}

function nightVision(p) {
  safe(() => {
    const cur = p.getEffect("night_vision");
    if (!cur || cur.duration < 240) p.addEffect("night_vision", 20 * 30, { amplifier: 0, showParticles: false });
  });
}

/**
 * Cosmetic vampire eyes live on the head slot. They are applied when the player
 * becomes a vampire or picks a colour with the Stone of Change; if the player
 * takes them off (e.g. to wear a helmet) they stay off until chosen again.
 */
export function applyEyes(p) {
  setNum(p, "vc:eyes_on", 1);
  syncEyes(p);
}

function syncEyes(p) {
  const head = getEquip(p, EquipmentSlot.Head);
  if (p.hasTag("eye0")) {
    if (head && ITEM.EYE_HEADS.includes(head.typeId)) setEquip(p, EquipmentSlot.Head, undefined);
    return;
  }
  if (getNum(p, "vc:eyes_on", 0) !== 1) return;
  const idx = [1, 2, 3, 4].find((i) => p.hasTag(`eye${i}`)) ?? 4;
  const want = ITEM.EYE_HEADS[idx - 1];
  if (!head) {
    if (getNum(p, "vc:eyes_placed", 0) === 1) {
      // The player removed them on purpose.
      setNum(p, "vc:eyes_on", 0);
      setNum(p, "vc:eyes_placed", 0);
      return;
    }
    putHead(p, want);
    setNum(p, "vc:eyes_placed", 1);
  } else if (head.typeId !== want && ITEM.EYE_HEADS.includes(head.typeId)) {
    putHead(p, want);
  } else if (!ITEM.EYE_HEADS.includes(head.typeId)) {
    setNum(p, "vc:eyes_placed", 0);
  }
}

every(LOOP_TICKS, () => {
  for (const p of players()) if (isVampire(p)) safe(() => tickVampire(p), "tickVampire");
}, "vampireLoop");

// ---------------------------------------------------------------------------
// Bat form flight (every tick for flying players only)
// ---------------------------------------------------------------------------

every(1, () => {
  for (const p of world.getPlayers({ tags: [TAG.BAT_FORM] })) {
    safe(() => {
      if (p.isInWater) return exitBatForm(p);
      const d = p.getViewDirection();
      if (p.isJumping) {
        const speed = 0.55 + getLevel(p) * 0.025;
        p.applyKnockback({ x: d.x * speed, z: d.z * speed }, Math.max(-0.4, Math.min(0.55, d.y * 0.7 + 0.12)));
      }
      if (!p.isOnGround) {
        const cur = p.getEffect("slow_falling");
        if (!cur || cur.duration < 10) p.addEffect("slow_falling", 40, { amplifier: 0, showParticles: false });
      }
      const inv = p.getEffect("invisibility");
      if (!inv || inv.duration < 40) p.addEffect("invisibility", 200, { amplifier: 0, showParticles: false });
    }, "batFlight");
  }
}, "batLoop");

// ---------------------------------------------------------------------------
// Biting: sneak + attack a living, warm-blooded creature
// ---------------------------------------------------------------------------

export function canBite(target) {
  if (!isValid(target)) return false;
  if (target.typeId === "minecraft:player") return !isVampire(target) && !isSupernaturalPlayer(target) && !isCreative(target);
  if (NO_BITE_FAMILIES.some((f) => hasFamily(target, f))) return false;
  return BITE_FAMILIES.some((f) => hasFamily(target, f));
}

const BOTTLE_NEXT = {
  "minecraft:glass_bottle": "sunrise:blood_bottle_1",
  "sunrise:blood_bottle_1": "sunrise:blood_bottle_2",
  "sunrise:blood_bottle_2": "sunrise:blood_bottle_3",
  "sunrise:blood_bottle_3": "sunrise:blood_bottle_4",
};

function bite(p, target) {
  const r = R(p);
  if (system.currentTick - r.lastBite < VAMPIRE.BITE_COOLDOWN_TICKS) return;
  r.lastBite = system.currentTick;

  const drinker = hasSkill(p, "blooddrinker");
  const isPlayer = target.typeId === "minecraft:player";
  const isVillager = hasFamily(target, "villager") || hasFamily(target, "humano");

  playAnim(p, "animation.vc.player.bite", 0.15);
  sound(p, "mob.vampire.bite", 1, 0.9 + Math.random() * 0.2);
  particleAt(target, "sunrise:bite_blood_particle", 1.2);
  particleAt(target, "sunrise:on_ground_blood", 0.1);
  bonusDamage(target, VAMPIRE.BITE_DAMAGE + (drinker ? 1 : 0), p);

  // Garlic in the victim's veins burns the vampire.
  const garlicky = (isPlayer && (target.hasTag(TAG.GARLIC_BLOOD) || isHunter(target))) || target.typeId.startsWith("sunrise:hunter");
  if (garlicky) {
    safe(() => p.applyDamage(4, { cause: "magic" }));
    p.addEffect("nausea", 160, { amplifier: 0 });
    msg(p, "vc.bite.garlic");
    return;
  }

  // Holding a bottle: collect blood instead of drinking.
  const hand = getEquip(p, EquipmentSlot.Mainhand);
  const next = hand && BOTTLE_NEXT[hand.typeId];
  if (next) {
    const steps = drinker && next !== "sunrise:blood_bottle_4" ? 2 : 1;
    let result = next;
    for (let i = 1; i < steps && BOTTLE_NEXT[result]; i++) result = BOTTLE_NEXT[result];
    if (hand.amount > 1) {
      hand.amount -= 1;
      setEquip(p, EquipmentSlot.Mainhand, hand);
      const inv = p.getComponent("minecraft:inventory")?.container;
      const rest = inv?.addItem(new ItemStack(result, 1));
      if (rest) p.dimension.spawnItem(rest, p.location);
    } else {
      setEquip(p, EquipmentSlot.Mainhand, new ItemStack(result, 1));
    }
    sound(p, "bottle.fill", 0.8, 0.7);
  } else {
    addBlood(p, drinker ? VAMPIRE.BITE_BLOOD_DRINKER : VAMPIRE.BITE_BLOOD);
    heal(p, VAMPIRE.BITE_HEAL);
  }

  grantXp(p, isPlayer ? VAMPIRE.BITE_XP_PLAYER : isVillager ? VAMPIRE.BITE_XP_VILLAGER : VAMPIRE.BITE_XP_ANIMAL);

  if (isPlayer && chance(getSettings().infectionChance)) infect(target, "vampire");
}

world.afterEvents.entityHitEntity.subscribe(({ damagingEntity: p, hitEntity: target }) => {
  if (p?.typeId !== "minecraft:player") return;
  safe(() => {
    if (!isVampire(p)) return;
    // Ice Touch: frost every hit.
    if ((state.iceTouch.get(p.id) ?? 0) > system.currentTick && isValid(target)) {
      target.addEffect("slowness", 60, { amplifier: 3 });
      particleAt(target, "sunrise:ice_touch", 1);
    }
    if (p.isSneaking && !p.hasTag(TAG.BAT_FORM) && canBite(target) && v3.dist(p.location, target.location) <= VAMPIRE.BITE_RANGE + 0.5) {
      bite(p, target);
    }
  }, "vampireHit");
});

/** Looked-at biteable target (used by the HUD hint). */
export function biteTarget(p) {
  return safe(() => {
    const hit = p.getEntitiesFromViewDirection({ maxDistance: VAMPIRE.BITE_RANGE })[0];
    return hit && canBite(hit.entity) ? hit.entity : undefined;
  });
}

// ---------------------------------------------------------------------------
// Drinking blood bottles
// ---------------------------------------------------------------------------

world.afterEvents.itemCompleteUse.subscribe(({ itemStack, source }) => {
  const short = itemStack?.typeId?.replace("sunrise:", "");
  const amount = VAMPIRE.BOTTLE_BLOOD[short];
  if (!amount || source?.typeId !== "minecraft:player") return;
  safe(() => {
    if (isVampire(source)) {
      addBlood(source, amount);
      sound(source, "random.drink", 1, 0.7);
      particleAt(source, "sunrise:bite_blood_particle", 1.6);
    } else {
      // Humans find it disgusting.
      source.addEffect("nausea", 200, { amplifier: 0 });
      source.addEffect("hunger", 200, { amplifier: 1 });
      msg(source, "vc.bottle.human");
    }
  });
});

// Servant bats feed their master.
world.afterEvents.entityHitEntity.subscribe(({ damagingEntity, hitEntity }) => {
  if (damagingEntity?.typeId !== "sunrise:servantsbat") return;
  safe(() => {
    const ownerId = damagingEntity.getDynamicProperty("vc:owner");
    if (hitEntity && ownerId === hitEntity.id) return;
    const owner = world.getEntity(String(ownerId));
    if (owner && isVampire(owner)) addBlood(owner, 0.5);
    particleAt(hitEntity, "sunrise:bite_blood_particle", 1);
  });
});

export function isInSun(p) {
  return rt.get(p.id)?.inSun ?? false;
}

// Keep a minimum time between "low blood" warnings.
every(200, () => {
  for (const p of players()) {
    if (!isVampire(p)) continue;
    const b = getBlood(p);
    const last = getNum(p, "vc:warned", 0);
    if (b <= 4 && last === 0) {
      msg(p, "vc.blood.low");
      sound(p, "mob.warden.heartbeat", 1, 0.8);
      setNum(p, "vc:warned", 1);
    } else if (b > 6 && last === 1) setNum(p, "vc:warned", 0);
  }
}, "bloodWarn");

export { particle };
