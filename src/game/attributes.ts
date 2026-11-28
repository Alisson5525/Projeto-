// Vitality health bonus. Bedrock scripts cannot change max health directly,
// so the bonus (+0.25 per point) is granted as Health Boost levels (+4 each).
import type { Player } from "@minecraft/server";
import { vitalityHealthBonus } from "../core/progression";
import type { Runtime } from "./players";

const INFINITE = 20_000_000;

export function healthBoostLevel(vitality: number): number {
  return Math.floor(vitalityHealthBonus(vitality) / 4);
}

export function refreshAttributes(r: Runtime): void {
  apply(r.player, healthBoostLevel(r.profile.vit));
}

function apply(player: Player, levels: number): void {
  const current = player.getEffect("health_boost");
  if (levels <= 0) {
    if (current && current.duration > 1_000_000) player.removeEffect("health_boost");
    return;
  }
  if (current && current.amplifier === levels - 1 && current.duration > 1_000_000) return;
  player.addEffect("health_boost", INFINITE, { amplifier: levels - 1, showParticles: false });
}
