// Plays the converted Java player animations on one controller so a new
// animation replaces the previous one.
import type { Player } from "@minecraft/server";
import { ANIM } from "../ids";

export type AnimName = keyof typeof ANIM;
const CONTROLLER = "jjk.body";

export function playAnim(player: Player, name: AnimName, blendOut = 0.15): void {
  try {
    player.playAnimation(ANIM[name], { blendOutTime: blendOut, controller: CONTROLLER });
  } catch {
    // The player may have left during the tick.
  }
}

export function stopAnim(player: Player): void {
  playAnim(player, "reset", 0.2);
}
