// Wires the techniques: slot handlers, per-player ticks and world ticks.
// Registration order matters: the first handler whose condition holds gets
// the tap, so awakened variants are registered before the normal ones.
import { world } from "@minecraft/server";
import { tickFallGuards } from "../damage";
import type { Runtime } from "../players";
import { tickTerrain } from "../terrain";
import { registerAwakening, tickAwakening } from "./awakening";
import { registerBarrage, tickBarrage } from "./barrage";
import { registerBlue, tickBlue } from "./blue";
import { lowerInfinity, registerInfinity, tickInfinity } from "./infinity";
import { cleanupDebris, registerMaxBlue, tickMaxBlue } from "./maxBlue";
import { registerMaxRed, tickMaxRed } from "./maxRed";
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
  registerPurple();
  registerAwakening();
  // Ripped blocks of a field that no longer exists (world closed mid-cast).
  world.afterEvents.entityLoad.subscribe(({ entity }) => cleanupDebris(entity));
}

/** Per-player updates. */
export function tickSkills(r: Runtime): void {
  tickAwakening(r);
  tickMaxBlue(r);
  if (r.cast.size === 0) return;
  tickBlue(r);
  tickBarrage(r);
  tickRed(r);
  tickPurple(r);
  tickMaxRed(r);
}

/** World-level updates once per tick. */
export function tickSkillsWorld(): void {
  tickInfinity();
  tickPurpleShots();
  tickSelfPurple();
  tickTerrain();
  tickFallGuards();
}
