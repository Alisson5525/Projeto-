// Budgeted terrain destruction: techniques queue block runs, and each tick
// erases at most the world profile's blocksPerTick cells with fillBlocks.
// Unbreakable blocks and blocks with data (chests, spawners, signs...) are
// never touched, like the Java mod (hasBlockEntity / destroySpeed < 0).
import { BlockTypes, BlockVolume, type Dimension } from "@minecraft/server";
import type { Run } from "../core/geometry";
import { TerrainQueue } from "../core/terrainQueue";
import type { V3 } from "../core/vec";
import { currentBudget } from "./settings";

const FIXED = [
  "bedrock", "invisible_bedrock", "barrier", "structure_void", "jigsaw", "end_portal_frame", "end_portal",
  "end_gateway", "portal", "allow", "deny", "border_block", "moving_block", "barrel", "hopper", "dispenser",
  "dropper", "crafter", "brewing_stand", "enchanting_table", "beacon", "mob_spawner", "trial_spawner", "vault",
  "lectern", "jukebox", "noteblock", "bell", "decorated_pot", "chiseled_bookshelf", "conduit", "beehive", "bee_nest",
  "sculk_sensor", "calibrated_sculk_sensor", "sculk_catalyst", "sculk_shrieker", "daylight_detector",
  "daylight_detector_inverted", "unpowered_comparator", "powered_comparator", "piston", "sticky_piston",
  "piston_arm_collision", "sticky_piston_arm_collision", "cauldron", "lodestone", "flower_pot", "frame", "glow_frame",
  "suspicious_sand", "suspicious_gravel", "creaking_heart", "respawn_anchor", "chalkboard", "netherreactor", "skull",
];
const PATTERNS = [/sign$/, /shulker_box$/, /banner$/, /(^|_)bed$/, /(_head|_skull)$/, /chest$/, /furnace$/, /smoker$/, /campfire$/, /command_block$/, /structure_block$/, /^light_block/, /_shelf$/];

let protectedTypes: string[] | null = null;

/** Block types destruction never removes (computed once from the registry). */
export function protectedBlockTypes(): string[] {
  if (protectedTypes) return protectedTypes;
  const set = new Set<string>();
  for (const id of FIXED) if (BlockTypes.get(`minecraft:${id}`)) set.add(`minecraft:${id}`);
  for (const t of BlockTypes.getAll()) {
    const name = t.id.replace(/^minecraft:/, "");
    if (t.id.startsWith("minecraft:") && PATTERNS.some((p) => p.test(name))) set.add(t.id);
  }
  protectedTypes = [...set];
  return protectedTypes;
}

let protectedSet: Set<string> | null = null;
export function isProtectedBlock(typeId: string): boolean {
  protectedSet ??= new Set(protectedBlockTypes());
  return protectedSet.has(typeId);
}

// The cap counts cells; memory grows with runs, so even the Nuke sphere fits.
const queue = new TerrainQueue<Dimension>(2_000_000);

/** Queues block runs for erasure (no-op when terrain destruction is off). */
export function eraseRuns(dim: Dimension, runs: readonly Run[]): number {
  if (!currentBudget().destroyTerrain || runs.length === 0) return 0;
  return queue.push(dim, runs);
}

/** Groups single cells into X runs and queues them. */
export function eraseCells(dim: Dimension, cells: readonly V3[]): number {
  const sorted = [...cells].sort((a, b) => b.y - a.y || a.z - b.z || a.x - b.x);
  const runs: Run[] = [];
  for (const c of sorted) {
    const last = runs[runs.length - 1];
    if (last && last.y === c.y && last.z === c.z && last.x1 === c.x - 1) last.x1 = c.x;
    else runs.push({ y: c.y, z: c.z, x0: c.x, x1: c.x });
  }
  return eraseRuns(dim, runs);
}

/** Cells still waiting to be erased. */
export const terrainPending = (): number => queue.pending;

/** Erases this tick's share of the queued runs. */
export function tickTerrain(): void {
  if (queue.pending === 0) return;
  const work = queue.take(currentBudget().blocksPerTick);
  const filter = { excludeTypes: protectedBlockTypes() };
  for (const { target, run } of work) {
    try {
      target.fillBlocks(new BlockVolume({ x: run.x0, y: run.y, z: run.z }, { x: run.x1, y: run.y, z: run.z }), "minecraft:air", {
        blockFilter: filter,
        ignoreChunkBoundErrors: true,
      });
    } catch {
      // Outside the world height or the dimension went away.
    }
  }
}
