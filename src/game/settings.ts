// World settings persistence and the current work budget.
import { world } from "@minecraft/server";
import { type Budget, budget, parseWorldSettings, type WorldSettings } from "../core/worldSettings";

const PROPERTY = "jjk:settings";
let cached: WorldSettings | null = null;
let cachedBudget: Budget | null = null;

export function worldSettings(): WorldSettings {
  if (!cached) {
    const raw = world.getDynamicProperty(PROPERTY);
    cached = parseWorldSettings(typeof raw === "string" ? raw : undefined);
  }
  return cached;
}

export function saveWorldSettings(s: WorldSettings): void {
  cached = s;
  cachedBudget = null;
  world.setDynamicProperty(PROPERTY, JSON.stringify(s));
}

export function currentBudget(): Budget {
  if (!cachedBudget) cachedBudget = budget(worldSettings());
  return cachedBudget;
}
