// Unlimited Void wiring: awakened slot 6, events and per-tick updates.
import { type Player, system, world } from "@minecraft/server";
import { onSlot } from "../combat";
import { isAwakened, now } from "../players";
import { safely } from "../safe";
import { registerBarrier, tickBarriers } from "./barrier";
import { castDomain, cleanupAreas, cleanupLeftover, onOccupantDeath, recoverPlayer, sessions, tickRecovery, tickSession } from "./session";

export function registerDomain(): void {
  onSlot(5, castDomain, isAwakened);
  registerBarrier();
  world.afterEvents.entityDie.subscribe(({ deadEntity }) => onOccupantDeath(deadEntity));
  world.afterEvents.playerSpawn.subscribe(({ player }) => {
    // Give the client a second to finish loading before moving it.
    system.runTimeout(() => player.isValid && recoverPlayer(player as Player), 20);
  });
  world.afterEvents.entityLoad.subscribe(({ entity }) => cleanupLeftover(entity));
  system.run(() => safely("domain cleanup", cleanupAreas));
}

export function tickDomain(): void {
  for (const s of [...sessions.values()]) safely("domain session", () => tickSession(s));
  if (sessions.size > 0) safely("domain barrier", tickBarriers);
  if (now() % 20 === 0) safely("domain recovery", tickRecovery);
}
