// Maximum Output: Blue field rules (MaxBlueServer, MaxBluePhase, MaxBluePull).
import { DEBRIS_DRAG, DEBRIS_MAX_SPEED, debrisAcceleration } from "./maxBluePath";
import { TL } from "./timelines";
import { add, dot, scale, sub, type V3 } from "./vec";

export const MAX_BLUE = {
  cast: TL.maxBlue.cast,
  orbit: TL.maxBlue.orbit,
  life: TL.maxBlue.life,
  cancel: TL.maxBlue.cancel,
  scanInterval: TL.maxBlue.scan,
  debrisLife: TL.maxBlue.debrisLife,
  followRate: 1 - Math.pow(1 - 0.35, 0.65),
  damageRadius: TL.maxBlue.damageRadius,
  pullRadius: TL.maxBlue.pullRadius,
  damage: TL.maxBlue.damage,
  maxHits: TL.maxBlue.maxHits,
  damageInterval: TL.maxBlue.damageInterval,
  scanChecks: 256,
} as const;

export type MaxBluePhaseName = "casting" | "stationary" | "dissolving" | "ended";

/** Life of a Max Blue field: casting (held) → stationary → ended, or dissolving after a cancel. */
export class MaxBluePhase {
  private cancelledAt: number | null = null;

  constructor(readonly startedAt: number) {}

  age(now: number): number {
    return Math.max(0, now - this.startedAt);
  }

  phase(now: number): MaxBluePhaseName {
    if (this.cancelledAt !== null) return now - this.cancelledAt < MAX_BLUE.cancel ? "dissolving" : "ended";
    const age = this.age(now);
    if (age >= MAX_BLUE.life) return "ended";
    return age < MAX_BLUE.cast ? "casting" : "stationary";
  }

  /** Cancels a field that is still being cast. */
  release(now: number): boolean {
    if (this.phase(now) !== "casting") return false;
    this.cancelledAt = now;
    return true;
  }

  get cancelled(): number | null {
    return this.cancelledAt;
  }
}

const PRIOR_DAMPING = Math.pow(0.32, 0.65);

/** Velocity of an entity caught by the field; `delta` points from it to the center. */
export function fieldPullVelocity(prior: V3, delta: V3): V3 {
  const dist = Math.sqrt(dot(delta, delta));
  if (dist <= 0.3) return prior;
  const speed = Math.min(0.64, 0.12 + dist * 0.095) * 0.65;
  return add(scale(prior, PRIOR_DAMPING), scale(delta, speed / dist));
}

/** One tick of a ripped block flying into the center. */
export function debrisStep(position: V3, velocity: V3, center: V3): { position: V3; velocity: V3; arrived: boolean } {
  const delta = sub(center, position);
  const dist = Math.sqrt(dot(delta, delta));
  if (dist < 0.38) return { position, velocity, arrived: true };
  let v = add(scale(velocity, DEBRIS_DRAG), scale(delta, debrisAcceleration(dist, MAX_BLUE.pullRadius) / dist));
  const speed = Math.sqrt(dot(v, v));
  if (speed > DEBRIS_MAX_SPEED) v = scale(v, DEBRIS_MAX_SPEED / speed);
  const step = dot(v, v) > dist * dist ? delta : v;
  return { position: add(position, step), velocity: v, arrived: false };
}

/** Integer offsets within `radius` (excluding the center), nearest first. */
export function sortedOffsets(radius: number): V3[] {
  const r = Math.ceil(radius);
  const out: { o: V3; d: number }[] = [];
  for (let x = -r; x <= r; x++) {
    for (let y = -r; y <= r; y++) {
      for (let z = -r; z <= r; z++) {
        const d = x * x + y * y + z * z;
        if (d >= 1 && d <= r * r) out.push({ o: { x, y, z }, d });
      }
    }
  }
  return out.sort((a, b) => a.d - b.d).map((e) => e.o);
}

/** Blocks without a full collision box (Java isCollisionShapeFullBlock) or that are fluids/air. */
const NOT_FULL =
  /(^|_)(air|water|lava|slab|stairs|fence|fence_gate|wall|door|trapdoor|pane|carpet|button|pressure_plate|torch|lantern|rail|sign|banner|bed|ladder|vine|vines|chain|bars|rod|candle|cake|flower|tulip|orchid|allium|bluet|daisy|poppy|dandelion|cornflower|lily|rose|peony|lilac|sunflower|sapling|propagule|bush|fern|grass|seagrass|kelp|coral_fan|crop|wheat|carrots|potatoes|beetroot|stem|sweet_berry|cactus|cobweb|web|layer|snow_layer|pot|frame|skull|head|lever|repeater|comparator|tripwire|hook|string|wire|dust|plate|scaffolding|petals|leaf_litter|moss_carpet|mushroom|fungus|roots|sprouts|dripleaf|azalea|glow_lichen|lichen|vein|cluster|bud|amethyst_bud|pickle|egg|frogspawn|hanging|chorus_plant|end_rod|bell|anvil|hopper|brewing_stand|cauldron|enchanting_table|lectern|grindstone|stonecutter|campfire|daylight_detector|conduit|beacon)$/;

export function isPullableBlock(typeId: string): boolean {
  const name = typeId.replace(/^minecraft:/, "");
  if (name === "grass_block" || name === "dirt_with_roots") return true;
  return !NOT_FULL.test(name) && !name.startsWith("flowing_");
}

/** Vanilla textures for the ripped-block entity (index = jjk:variant). */
export const DEBRIS_TEXTURES = [
  "textures/blocks/stone",
  "textures/blocks/dirt",
  "textures/blocks/grass_side_carried",
  "textures/blocks/sand",
  "textures/blocks/gravel",
  "textures/blocks/cobblestone",
  "textures/blocks/planks_oak",
  "textures/blocks/log_oak",
  "textures/blocks/leaves_oak_carried",
  "textures/blocks/netherrack",
  "textures/blocks/deepslate/deepslate",
  "textures/blocks/end_stone",
  "textures/blocks/snow",
  "textures/blocks/sandstone_normal",
] as const;

const VARIANT_RULES: [RegExp, number][] = [
  [/grass_block|podzol|mycelium/, 2],
  [/dirt|farmland|mud|coarse|rooted/, 1],
  [/sandstone/, 13],
  [/sand/, 3],
  [/gravel/, 4],
  [/deepslate|tuff|basalt|blackstone/, 10],
  [/cobble/, 5],
  [/planks|bookshelf|crafting_table/, 6],
  [/log|wood|stem|hyphae/, 7],
  [/leaves/, 8],
  [/netherrack|nylium|nether_brick|magma/, 9],
  [/end_stone|purpur/, 11],
  [/snow|ice|powder/, 12],
];

export function debrisVariant(typeId: string): number {
  const name = typeId.replace(/^minecraft:/, "");
  for (const [re, variant] of VARIANT_RULES) if (re.test(name)) return variant;
  return 0;
}
