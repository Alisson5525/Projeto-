// Wires the techniques: slot handlers, per-player ticks and world ticks.
import type { Runtime } from "../players";
import { tickTerrain } from "../terrain";
import { registerBarrage, tickBarrage } from "./barrage";
import { registerBlue, tickBlue } from "./blue";
import { lowerInfinity, registerInfinity, tickInfinity } from "./infinity";
import { registerRed, tickRed } from "./red";

export { lowerInfinity };

export function registerSkills(): void {
  registerInfinity();
  registerBlue();
  registerBarrage();
  registerRed();
}

/** Per-player cast updates (only players with a cast pay anything). */
export function tickSkills(r: Runtime): void {
  if (r.cast.size === 0) return;
  tickBlue(r);
  tickBarrage(r);
  tickRed(r);
}

/** World-level updates once per tick. */
export function tickSkillsWorld(): void {
  tickInfinity();
  tickTerrain();
}
