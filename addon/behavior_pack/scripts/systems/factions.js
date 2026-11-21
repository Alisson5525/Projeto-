import { world, system, ItemTypes } from "@minecraft/server";
import { TAG, DP, ITEM, INFECTION_TICKS, VAMPIRE, LOOP_TICKS, MAX_LEVEL, VERSION } from "../core/config.js";
import {
  Faction, getFaction, getNum, setNum, getStr, setStr, setLevel, getLevel, addXp, setBlood, setWolfTier, syncWolfTier,
  setJSON, getSettings,
} from "../core/data.js";
import { safe, msg, title, sound, particleAt, ring, effect, purgeItem, ensureItem, every, players, isValid, runCmd } from "../core/util.js";
import { clearSkills, grantSkill, exitBatForm, clearHead, forgetCooldowns, purgeLooseCosmetics, SKILLS } from "./skills.js";

// ---------------------------------------------------------------------------
// Becoming / curing
// ---------------------------------------------------------------------------

const FACTION_TAG = { vampire: TAG.VAMPIRE, werewolf: TAG.WEREWOLF, hunter: TAG.HUNTER };
const SKILL_ITEM = { vampire: ITEM.VAMP_SKILL, werewolf: ITEM.WOLF_SKILL, hunter: ITEM.HUNTER_SKILL };

export function become(player, faction, { silent = false } = {}) {
  if (!FACTION_TAG[faction]) return false;
  const current = getFaction(player);
  if (current === faction) return false;
  if (current !== Faction.HUMAN) cure(player, { silent: true });

  clearInfection(player);
  player.addTag(FACTION_TAG[faction]);
  setLevel(player, 1);
  setNum(player, DP.XP, 0);
  clearSkills(player, faction);

  if (faction === Faction.VAMPIRE) {
    setBlood(player, VAMPIRE.START_BLOOD);
    if (!TAG.EYES.some((t) => player.hasTag(t))) player.addTag("eye4");
    setNum(player, "vc:eyes_on", 1);
    setNum(player, "vc:eyes_placed", 0);
  } else if (faction === Faction.WEREWOLF) {
    setWolfTier(player, 1);
  } else if (faction === Faction.HUNTER) {
    setJSON(player, DP.HUNTER_STATS, { vital: 0, agility: 0, combat: 0 });
    setNum(player, DP.HUNTER_POINTS, 1);
    setNum(player, DP.HUNTER_MISSION, 0);
    setNum(player, DP.HUNTER_PROGRESS, 0);
  }
  ensureItem(player, SKILL_ITEM[faction]);

  if (!silent) {
    title(player, `vc.become.${faction}.title`, `vc.become.${faction}.sub`);
    msg(player, `vc.become.${faction}.tip`);
    particleAt(player, "sunrise:transform_smoke", 1);
    ring(player.dimension, faction === Faction.HUNTER ? "sunrise:holy_a" : "sunrise:bite_blood_particle", player.location, 1.5, 16, 0.3);
    sound(player, faction === Faction.HUNTER ? "beacon.activate" : "mob.wither.spawn", 0.6, faction === Faction.WEREWOLF ? 0.6 : 1.2);
  }
  return true;
}

export function cure(player, { silent = false } = {}) {
  clearInfection(player);
  const faction = getFaction(player);
  if (faction === Faction.HUMAN) return false;

  exitBatForm(player);
  clearHead(player);
  for (const t of [TAG.VAMPIRE, TAG.WEREWOLF, TAG.HUNTER, TAG.IN_FORM, TAG.BAT_FORM, TAG.DIVINE, ...TAG.WOLF_TIER, ...TAG.EYES, "vc_wolf_hidden", "vc_undetectable"]) {
    safe(() => player.removeTag(t));
  }
  for (const id of [ITEM.VAMP_SKILL, ITEM.WOLF_SKILL, ITEM.HUNTER_SKILL, ITEM.BAT_HEAD, ...ITEM.EYE_HEADS, "sunrise:trans_lob", "sunrise:trans_lob_blue", "sunrise:trans_lob_black"]) {
    purgeItem(player, id);
  }
  clearSkills(player, faction);
  setLevel(player, 1);
  setNum(player, DP.XP, 0);
  for (const e of ["invisibility", "night_vision", "health_boost", "strength", "speed", "jump_boost", "saturation", "resistance", "weakness", "slowness"]) {
    safe(() => player.removeEffect(e));
  }
  forgetCooldowns(player.id);
  if (!silent) {
    title(player, "vc.cure.title", "vc.cure.sub");
    sound(player, "random.totem", 0.6, 1.2);
    particleAt(player, "sunrise:holy_a", 1);
  }
  return true;
}

// ---------------------------------------------------------------------------
// Level-up feedback (shared)
// ---------------------------------------------------------------------------

export function grantXp(player, amount) {
  if (getFaction(player) === Faction.HUMAN || amount <= 0) return;
  const gained = addXp(player, amount);
  if (gained > 0) {
    const lvl = getLevel(player);
    title(player, "vc.levelup.title", "vc.levelup.sub", lvl);
    sound(player, "random.levelup", 1, 0.8);
    ring(player.dimension, "sunrise:magic_altar", player.location, 1.2, 14, 0.2);
    const faction = getFaction(player);
    if (faction === Faction.WEREWOLF && syncWolfTier(player)) {
      msg(player, "vc.werewolf.tier_up");
    }
    // Tell the player which skills became available at the altar.
    const fresh = (SKILLS[faction] || []).filter((s) => s.level === lvl);
    if (fresh.length) msg(player, "vc.levelup.new_skills", fresh.length);
    if (lvl >= MAX_LEVEL) msg(player, "vc.levelup.max");
  }
}

// ---------------------------------------------------------------------------
// Infection (bite / fang / garlic syringe → transformation after a delay)
// ---------------------------------------------------------------------------

export function infect(player, type) {
  if (getFaction(player) !== Faction.HUMAN) return false;
  if (getStr(player, DP.INFECT_TYPE)) return false;
  setStr(player, DP.INFECT_TYPE, type);
  setNum(player, DP.INFECT_LEFT, INFECTION_TICKS);
  player.addTag(TAG.INFECT[type]);
  msg(player, `vc.infect.${type}.start`);
  sound(player, type === "hunter" ? "random.drink" : "mob.zombie.unfect", 0.8, 0.8);
  return true;
}

export function clearInfection(player) {
  setStr(player, DP.INFECT_TYPE, "");
  setNum(player, DP.INFECT_LEFT, 0);
  Object.values(TAG.INFECT).forEach((t) => safe(() => player.removeTag(t)));
}

export function infectionLeft(player) {
  const type = getStr(player, DP.INFECT_TYPE);
  return type ? { type, ticks: getNum(player, DP.INFECT_LEFT, 0) } : undefined;
}

function tickInfection(player) {
  const inf = infectionLeft(player);
  if (!inf) return;
  const left = inf.ticks - LOOP_TICKS;
  setNum(player, DP.INFECT_LEFT, left);
  const frac = left / INFECTION_TICKS;
  // Symptoms ramp up while the change approaches.
  if (inf.type !== "hunter") {
    if (frac < 0.66) effect(player, "hunger", 6, 0);
    if (frac < 0.33) effect(player, "weakness", 6, 0);
    if (frac < 0.15 && Math.random() < 0.08) {
      player.addEffect("nausea", 120, { amplifier: 0, showParticles: false });
      sound(player, inf.type === "vampire" ? "mob.vampire.bite" : "mob.wolf.growl", 0.6, 0.6);
    }
  } else if (frac < 0.5) {
    effect(player, "nausea", 4, 0);
  }
  if (left <= 0) {
    clearInfection(player);
    become(player, inf.type);
  }
}

// ---------------------------------------------------------------------------
// Migration from v4.x (tags + scoreboards) — runs once per player
// ---------------------------------------------------------------------------

const LEGACY_VAMP = ["nightvision", "fly", "indetectavel", "waterproof", "rage", "sunresistence", "servantsbat", "acrobata", "blooddrinker", "poucasede", "teleport", "icetouch", "regeneration", "invisibilidade", "absorption"];
const LEGACY_WOLF = ["nightvision", "absorption", "waterproof", "rage", "suntransform", "poucafome", "onehit", "acrobata", "defencive", "sangramento", "regeneration", "invisibilidade"];

export function migrate(player) {
  if (getNum(player, DP.MIGRATED, 0) === 1) return;
  safe(() => {
    const faction = getFaction(player);
    const tags = player.getTags();
    if (faction === Faction.VAMPIRE) {
      let score;
      safe(() => {
        score = world.scoreboard.getObjective("sangue")?.getScore(player);
      });
      setBlood(player, typeof score === "number" ? Math.round(score / 1200) : VAMPIRE.START_BLOOD);
      const owned = LEGACY_VAMP.filter((s) => tags.includes(s));
      owned.forEach((s) => grantSkill(player, s, faction));
      setLevel(player, Math.min(6, 1 + Math.floor(owned.length / 2)));
      setNum(player, "vc:eyes_on", 1);
    } else if (faction === Faction.WEREWOLF) {
      const owned = LEGACY_WOLF.filter((s) => tags.includes(s));
      owned.forEach((s) => grantSkill(player, s, faction));
      setLevel(player, player.hasTag("lbnIII") ? 8 : player.hasTag("lbnII") ? 4 : 1);
      if (!TAG.WOLF_TIER.some((t) => player.hasTag(t))) setWolfTier(player, 1);
    } else if (faction === Faction.HUNTER) {
      const stat = (name) => {
        for (let i = 11; i >= 1; i--) if (tags.includes(`hunter_skill_${name}_${i}`)) return i - 1;
        return 0;
      };
      const stats = { vital: stat("vital"), agility: stat("velo"), combat: stat("hab") };
      setJSON(player, DP.HUNTER_STATS, stats);
      setLevel(player, 1 + stats.vital + stats.agility + stats.combat);
      setNum(player, DP.HUNTER_POINTS, tags.includes("avaliable_new_skill") ? 1 : 0);
    }
    for (const [type, tag] of Object.entries(TAG.INFECT)) {
      if (tags.includes(tag) && faction === Faction.HUMAN) {
        let left = INFECTION_TICKS;
        safe(() => {
          const sc = world.scoreboard.getObjective(tag)?.getScore(player);
          if (typeof sc === "number") left = Math.max(200, sc);
        });
        setStr(player, DP.INFECT_TYPE, type);
        setNum(player, DP.INFECT_LEFT, left);
      }
    }
    // Remove v4 runtime tags that no longer mean anything.
    for (const t of tags) {
      if (t.startsWith("emuso_") || t.startsWith("hunter_skill_") || ["on_to_fly", "api_is_flying", "boost_vital", "avaliable_new_skill", "has_mission", "red_moon_msg", "player_atacado_creeper", "fraqueza_agua", "burn_vamp", "drink_sangue"].includes(t) || t.startsWith("mission_")) {
        safe(() => player.removeTag(t));
      }
    }
    if (tags.includes("api_is_flying") || tags.includes("on_to_fly")) {
      purgeItem(player, ITEM.BAT_HEAD);
    }
    runCmd(player, "ability @s mayfly false");
  }, "migrate");
  setNum(player, DP.MIGRATED, 1);
}

// ---------------------------------------------------------------------------
// Self-check: report content that failed to load (wrong game version, broken
// install, conflicting add-on) instead of failing silently.
// ---------------------------------------------------------------------------

const REQUIRED = [
  "sunrise:blood_altar", "sunrise:recharging_altar", "sunrise:meat_grinder", "sunrise:caixao_oak", "sunrise:garlic",
  "sunrise:blood_bottle_4", "sunrise:vampire_skill_item", "sunrise:werewolf_skill_item", "sunrise:hunter_skill_item",
  "sunrise:vampire_craft_book", "sunrise:eclipse_ingot", "sunrise:vampire_sword",
];

export function missingContent() {
  return REQUIRED.filter((id) => !safe(() => ItemTypes.get(id)));
}

function announce(player) {
  const missing = missingContent();
  if (missing.length) {
    msg(player, "vc.diag.missing", missing.join(", "));
    msg(player, "vc.diag.missing_help");
  } else {
    msg(player, "vc.diag.ok", VERSION);
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  system.run(() => {
    if (!isValid(player)) return;
    if (initialSpawn) {
      migrate(player);
      announce(player);
      if (getSettings().starterBook && !player.hasTag(TAG.BOOK_GIVEN)) {
        ensureItem(player, ITEM.BOOK);
        player.addTag(TAG.BOOK_GIVEN);
        msg(player, "vc.welcome");
      }
    }
    const f = getFaction(player);
    if (f !== Faction.HUMAN) ensureItem(player, SKILL_ITEM[f]);
    if (f === Faction.VAMPIRE && !initialSpawn) {
      // Respawn with a little blood so the player isn't instantly starving.
      setBlood(player, Math.max(8, getNum(player, DP.BLOOD, VAMPIRE.START_BLOOD)));
    }
  });
});

world.afterEvents.entityDie.subscribe(({ deadEntity }) => {
  if (deadEntity.typeId !== "minecraft:player") return;
  safe(() => {
    exitBatForm(deadEntity);
    deadEntity.removeTag(TAG.IN_FORM);
  });
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => forgetCooldowns(playerId));

every(LOOP_TICKS, () => {
  for (const p of players()) {
    safe(() => tickInfection(p), "infection");
    safe(() => purgeLooseCosmetics(p), "cosmetics");
  }
}, "infectionLoop");
