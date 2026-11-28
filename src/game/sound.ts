// Plays the mod's sounds respecting each listener's channel volume (Java
// ClientVisualSettings sound channels: effects / voices / music).
import { type Dimension, type Player, world } from "@minecraft/server";
import type { V3 } from "../core/vec";
import { rt } from "./players";

export type Channel = "sfx" | "voice" | "music" | "ui";

export interface SoundDef {
  id: string;
  channel: Channel;
  /** Audible range in blocks (Java outer range). */
  range: number;
}

function volumeFor(player: Player, channel: Channel): number {
  if (channel === "ui") return 1;
  return rt(player).profile.settings[channel] / 100;
}

/** Plays at a position for every player in range of the same dimension. */
export function playAt(def: SoundDef, dimension: Dimension, at: V3, pitch = 1): void {
  const r2 = (def.range + 8) * (def.range + 8);
  for (const p of world.getAllPlayers()) {
    if (p.dimension.id !== dimension.id) continue;
    const l = p.location;
    const dx = l.x - at.x;
    const dy = l.y - at.y;
    const dz = l.z - at.z;
    if (dx * dx + dy * dy + dz * dz > r2) continue;
    const volume = volumeFor(p, def.channel);
    if (volume > 0) p.playSound(def.id, { location: at, volume, pitch });
  }
}

/** Plays for one player at their own position (UI, voice lines of the caster). */
export function playFor(def: SoundDef, player: Player, pitch = 1, volumeScale = 1): void {
  const volume = volumeFor(player, def.channel) * volumeScale;
  if (volume > 0) player.playSound(def.id, { volume, pitch });
}

/** Stops a looping/streamed sound for nearby players. */
export function stopFor(def: SoundDef, dimension: Dimension, at: V3, range = 256): void {
  for (const p of world.getAllPlayers()) {
    if (p.dimension.id !== dimension.id) continue;
    const l = p.location;
    if ((l.x - at.x) ** 2 + (l.z - at.z) ** 2 > range * range) continue;
    p.runCommand(`stopsound @s ${def.id}`);
  }
}
