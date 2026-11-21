// Vampire Craft — central balance & identifiers.
// Every tunable number of the add-on lives here so balancing never requires
// touching gameplay code.

export const NS = "sunrise";
export const VERSION = "5.3.0";

/** Legacy tags kept for compatibility with worlds created on v4.x */
export const TAG = {
  VAMPIRE: "vampiro",
  WEREWOLF: "lobisomem",
  HUNTER: "hunter",
  WOLF_TIER: ["lbnI", "lbnII", "lbnIII"],
  INFECT: { vampire: "timerToVamp", werewolf: "timerToLob", hunter: "timerToHunter" },
  ADMIN: "vc_admin",
  BOOK_GIVEN: "recebeuLivro",
  IN_FORM: "vc_wolf_form",
  BAT_FORM: "vc_bat_form",
  DIVINE: "Skill_protecao_divina",
  GARLIC_BLOOD: "GarlicInTheVein",
  EYES: ["eye1", "eye2", "eye3", "eye4"],
};

/** Dynamic property keys (player) */
export const DP = {
  BLOOD: "vc:blood",
  LEVEL: "vc:level",
  XP: "vc:xp",
  INFECT_TYPE: "vc:infect_type",
  INFECT_LEFT: "vc:infect_left",
  SKILL_SEL: "vc:skill_sel",
  HUD: "vc:hud",
  MIGRATED: "vc:migrated_v5",
  HUNTER_POINTS: "vc:h_points",
  HUNTER_MISSION: "vc:h_mission",
  HUNTER_PROGRESS: "vc:h_progress",
  HUNTER_STATS: "vc:h_stats", // JSON {vital, agility, combat}
  KILLS: "vc:kills",
  WOLF_MANUAL: "vc:wolf_manual",
};

/** Dynamic property keys (world) */
export const WDP = {
  SETTINGS: "vc:settings",
  BLOOD_MOON_DAY: "vc:blood_moon_day",
};

export const DEFAULT_WORLD_SETTINGS = {
  sunDamage: true,
  infectionChance: 25, // % chance a bite infects a human player
  bloodMoon: true,
  bloodMoonChance: 35, // % chance a full moon becomes a blood moon
  mobAmbush: true,
  starterBook: true,
  encounters: true,
  spawnBoost: true,
};

export const MAX_LEVEL = 10;
/** XP needed to go from level N to N+1 (index = current level) */
export const XP_TABLE = [0, 20, 45, 80, 130, 190, 260, 350, 460, 600, Infinity];

export const VAMPIRE = {
  MAX_BLOOD: 20,
  START_BLOOD: 14,
  /** seconds between natural blood loss of 1 point, by level (index = level) */
  DRAIN_SECONDS: [0, 26, 28, 30, 32, 35, 38, 41, 45, 50, 55],
  BITE_RANGE: 3.5,
  BITE_COOLDOWN_TICKS: 24,
  BITE_DAMAGE: 3,
  BITE_BLOOD: 3,
  BITE_BLOOD_DRINKER: 5,
  BITE_HEAL: 2,
  BITE_XP_ANIMAL: 2,
  BITE_XP_VILLAGER: 5,
  BITE_XP_PLAYER: 8,
  /** Blood granted by each bottle stage */
  BOTTLE_BLOOD: { blood_bottle_1: 3, blood_bottle_2: 6, blood_bottle_3: 9, blood_bottle_4: 12 },
  SUN_GRACE_TICKS: 40,
};

export const WEREWOLF = {
  TIER_LEVEL: [1, 4, 8], // levels that unlock tier I / II / III
  KILL_XP_PASSIVE: 2,
  KILL_XP_HOSTILE: 4,
  KILL_XP_SUPERNATURAL: 12,
  HEAD_ITEM: ["sunrise:trans_lob", "sunrise:trans_lob_blue", "sunrise:trans_lob_black"],
};

export const HUNTER = {
  MAX_STAT: 8,
  KILL_XP: 10,
};

export const INFECTION_TICKS = 6000; // 5 minutes of real time
export const LOOP_TICKS = 10; // main gameplay loop cadence (0.5 s)
export const HUD_TICKS = 10;

/** Biteable entity families (living, warm-blooded creatures). */
export const BITE_FAMILIES = ["mob", "villager", "player", "wandering_trader", "pillager", "humano", "illager"];
/** Families that must never be bitten. */
export const NO_BITE_FAMILIES = ["undead", "vampiro", "vampire", "lobisomem", "monster", "irongolem", "snowgolem", "bat", "inanimate", "fish", "axolotl", "arthropod"];
export const SUPERNATURAL_TYPES = [
  "sunrise:vampire",
  "sunrise:weak_vampire",
  "sunrise:vampire_witch",
  "sunrise:werewolf",
  "sunrise:weak_werewolf",
  "sunrise:black_werewolf",
];

export const ITEM = {
  BOOK: "sunrise:vampire_craft_book",
  VAMP_SKILL: "sunrise:vampire_skill_item",
  WOLF_SKILL: "sunrise:werewolf_skill_item",
  HUNTER_SKILL: "sunrise:hunter_skill_item",
  BAT_HEAD: "sunrise:trans_bat",
  EYE_HEADS: ["sunrise:trans_vamp_player_eye1", "sunrise:trans_vamp_player_eye2", "sunrise:trans_vamp_player_eye3", "sunrise:trans_vamp_player_eye4"],
};
