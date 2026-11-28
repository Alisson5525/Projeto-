// Central registry of every pack id the scripts reference. tools/emit-refs.ts
// dumps these so tools/validate-packs.mjs can verify each one exists in the packs.

export const NS = "jjk";

/** Player animations (resource pack, animations/jjk_player.animation.json). */
export const ANIM = {} as const satisfies Record<string, string>;

/** Particle effect identifiers (resource pack, particles/). */
export const PARTICLE = {} as const satisfies Record<string, string>;

/** Sound event ids (resource pack, sounds/sound_definitions.json). */
export const SOUND = {} as const satisfies Record<string, string>;

/** Custom entity ids (behavior + resource pack). */
export const ENTITY = {} as const satisfies Record<string, string>;

/** Custom item ids (behavior pack, items/). */
export const ITEM = {} as const satisfies Record<string, string>;

/** Camera presets (behavior pack, cameras/presets/). */
export const CAMERA = {} as const satisfies Record<string, string>;

/** Lang keys the scripts translate at runtime (texts/*.lang in both packs' RP). */
export const LANG_KEYS: readonly string[] = [];
