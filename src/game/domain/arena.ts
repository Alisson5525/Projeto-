// The Unlimited Void interior: a JSON void dimension (BP dimensions/), one
// arena per session 2048 blocks apart, with an invisible floor, the void sky
// box and a dark fog. Chunks are kept loaded with script ticking areas.
import { BlockVolume, type Dimension, type Entity, type Player, world } from "@minecraft/server";
import { arenaOrigin } from "../../core/domainRules";
import type { V3 } from "../../core/vec";
import { ENTITY } from "../../ids";

export const VOID_DIMENSION = "jjk:unlimited_void";
export const VOID_SKY = ENTITY.voidSky;
export const BARRIER = ENTITY.domainBarrier;
/** Half size of the arena floor; occupants are kept on it. */
export const ARENA_HALF = 40;
const FOG_ID = "jjk:void_fog";
const FOG_USER = "jjk_domain";

export function voidDimension(): Dimension | undefined {
  try {
    return world.getDimension(VOID_DIMENSION);
  } catch {
    return undefined;
  }
}

export const isVoid = (dim: Dimension): boolean => dim.id === VOID_DIMENSION;

const arenaArea = (slot: number): string => `jjk_void_${slot}`;
const exteriorArea = (slot: number): string => `jjk_void_ext_${slot}`;

function areaOptions(dim: Dimension, center: V3, half: number) {
  return { dimension: dim, from: { x: center.x - half, y: 0, z: center.z - half }, to: { x: center.x + half, y: 0, z: center.z + half } };
}

/** Whether ticking areas for one more domain fit in the world's budget. */
export function hasRoom(exterior: Dimension, center: V3, slot: number): boolean {
  const dim = voidDimension();
  if (!dim) return false;
  const m = world.tickingAreaManager;
  try {
    return m.hasCapacity(areaOptions(dim, arenaOrigin(slot), ARENA_HALF + 8)) && m.hasCapacity(areaOptions(exterior, center, 32));
  } catch {
    return false;
  }
}

async function ensureArea(id: string, dim: Dimension, center: V3, half: number): Promise<void> {
  const m = world.tickingAreaManager;
  if (m.hasTickingArea(id)) return;
  await m.createTickingArea(id, areaOptions(dim, center, half));
}

/** Loads the arena, lays its invisible floor and raises the void sky. Resolves to the sky entity. */
export async function prepareArena(slot: number, exterior: Dimension, center: V3): Promise<Entity | undefined> {
  const dim = voidDimension();
  if (!dim) return undefined;
  const origin = arenaOrigin(slot);
  await ensureArea(exteriorArea(slot), exterior, center, 32);
  await ensureArea(arenaArea(slot), dim, origin, ARENA_HALF + 8);
  dim.fillBlocks(
    new BlockVolume({ x: Math.floor(origin.x) - ARENA_HALF, y: origin.y - 1, z: Math.floor(origin.z) - ARENA_HALF }, { x: Math.floor(origin.x) + ARENA_HALF, y: origin.y - 1, z: Math.floor(origin.z) + ARENA_HALF }),
    "minecraft:barrier",
    { ignoreChunkBoundErrors: true },
  );
  for (const old of dim.getEntities({ type: VOID_SKY, location: origin, maxDistance: 16 })) old.remove();
  return dim.spawnEntity(VOID_SKY, { x: origin.x, y: origin.y + 8, z: origin.z });
}

/** Loads the arena again to find entities left behind by a previous session. */
export async function loadArenaForRecovery(slot: number): Promise<void> {
  const dim = voidDimension();
  if (dim) await ensureArea(arenaArea(slot), dim, arenaOrigin(slot), ARENA_HALF + 8);
}

export function releaseArena(slot: number): void {
  const m = world.tickingAreaManager;
  for (const id of [arenaArea(slot), exteriorArea(slot)]) {
    try {
      if (m.hasTickingArea(id)) m.removeTickingArea(id);
    } catch {
      // ignore
    }
  }
}

export function pushVoidFog(p: Player): void {
  try {
    p.runCommand(`fog @s push ${FOG_ID} ${FOG_USER}`);
  } catch {
    // ignore
  }
}

export function popVoidFog(p: Player): void {
  try {
    p.runCommand(`fog @s remove ${FOG_USER}`);
  } catch {
    // ignore
  }
}
