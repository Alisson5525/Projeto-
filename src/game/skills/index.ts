// Wires the techniques: slot handlers, per-player ticks and world ticks.
// Registration order matters: the first handler whose condition holds gets
// the tap, so awakened variants are registered before the normal ones.
import { world } from "@minecraft/server";
import { tickFallGuards } from "../damage";
import type { Runtime } from "../players";
import { safely } from "../safe";
import { tickTerrain } from "../terrain";
import { registerAwakening, tickAwakening } from "./awakening";
import { registerBarrage, tickBarrage } from "./barrage";
import { registerBlue, tickBlue } from "./blue";
import { lowerInfinity, registerInfinity, tickInfinity } from "./infinity";
import { cleanupDebris, registerMaxBlue, tickMaxBlue } from "./maxBlue";
import { registerMaxRed, tickMaxRed } from "./maxRed";
import { registerNuke, tickNuke } from "./nuke";
import { registerPurple, tickPurple, tickPurpleShots } from "./purple";
import { registerRed, tickRed } from "./red";
import { tickSelfPurple } from "./selfPurple";

export { lowerInfinity };

export function registerSkills(): void {
  registerInfinity();
  registerMaxBlue();
  registerBlue();
  registerBarrage();
  registerMaxRed();
  registerRed();
  registerNuke(); // before Purple: same slot while the Self Purple window is open
  registerPurple();
  registerAwakening();
  // Ripped blocks of a field that no longer exists (world closed mid-cast).
  world.afterEvents.entityLoad.subscribe(({ entity }) => cleanupDebris(entity));
}

/** Per-player updates (each technique isolated from the others). */
export function tickSkills(r: Runtime): void {
  safely("awakening", () => tickAwakening(r));
  safely("max blue", () => tickMaxBlue(r));
  if (r.cast.size === 0) return;
  safely("blue", () => tickBlue(r));
  safely("barrage", () => tickBarrage(r));
  safely("red", () => tickRed(r));
  safely("purple", () => tickPurple(r));
  safely("max red", () => tickMaxRed(r));
  safely("nuke", () => tickNuke(r));
}

/** World-level updates once per tick. */
export function tickSkillsWorld(): void {
  safely("infinity", tickInfinity);
  safely("purple shots", tickPurpleShots);
  safely("self purple", tickSelfPurple);
  safely("terrain", tickTerrain);
  safely("fall guards", tickFallGuards);
}
