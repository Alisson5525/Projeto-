// Central registry of every pack id the scripts reference. tools/emit-refs.ts
// dumps these so tools/validate-packs.mjs can verify each one exists in the packs.

export const NS = "jjk";

/** Player animations (resource pack, animations/jjk_player.animation.json). */
export const ANIM = {} as const satisfies Record<string, string>;

/** Particle effect identifiers (resource pack, particles/). */
export const PARTICLE = {} as const satisfies Record<string, string>;

/** Sound event ids (resource pack, sounds/sound_definitions.json). */
export const SOUND = {
  nukeVoice: "jjk.gojo.nuke_purple.voice",
  nukeSfx: "jjk.gojo.nuke_purple.sfx",
  nukeMusic: "jjk.gojo.nuke_purple.music",
  maxBlueVoice: "jjk.gojo.max_blue.voice",
  maxBlueStart: "jjk.gojo.max_blue.start",
  purpleStartVoice: "jjk.gojo.hollow_purple.start_voice",
  purpleFireVoice: "jjk.gojo.hollow_purple.fire_voice",
  purpleFire: "jjk.gojo.hollow_purple.fire",
  voidStart: "jjk.gojo.unlimited_void.start",
  voidVoice: "jjk.gojo.unlimited_void.voice",
  awakeningVoice: "jjk.gojo.awakening.voice",
  selfSparking: "jjk.gojo.self_purple.sparking",
  selfExplosion: "jjk.gojo.self_purple.explosion",
  bluePull: "jjk.gojo.blue.pull",
  redStart: "jjk.gojo.red.start",
  infinityDeflect: "jjk.gojo.infinity.deflect",
  infinityToggle: "jjk.gojo.infinity.toggle",
  barrageGrab: "jjk.gojo.barrage.grab",
  maxRedVoice: "jjk.gojo.max_red.voice",
  maxRedCharge: "jjk.gojo.max_red.charge",
  maxRedFire: "jjk.gojo.max_red.fire",
  cardDrop: "jjk.ui.card_drop",
  cardLand: "jjk.ui.card_land",
  cardReveal: "jjk.ui.card_reveal",
  cardHover: "jjk.ui.card_hover",
  cardSelect: "jjk.ui.card_select",
  cardShatter: "jjk.ui.card_shatter",
} as const satisfies Record<string, string>;

/** Custom entity ids (behavior + resource pack). */
export const ENTITY = {} as const satisfies Record<string, string>;

/** Custom item ids (behavior pack, items/). */
export const ITEM = {
  limitless: "jjk:limitless",
  sixEyes: "jjk:six_eyes",
} as const satisfies Record<string, string>;

/** Camera presets (behavior pack, cameras/presets/). */
export const CAMERA = {} as const satisfies Record<string, string>;

/** Lang keys the scripts translate at runtime (resource pack texts/*.lang). */
export { LANG_KEYS } from "./game/i18n";
