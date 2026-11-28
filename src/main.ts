// Entry point: wires every system of the Jujutsu Kaisen (Limitless) add-on.
import { type Player, system, world } from "@minecraft/server";
import { ITEM } from "./ids";
import { refreshAttributes } from "./game/attributes";
import { registerCombat, tickCombat } from "./game/combat";
import { registerDamagePipeline } from "./game/damage";
import { tickHud } from "./game/hud";
import { tickStuns } from "./game/stun";
import { leaveCombat, toggleCombat } from "./game/combatMode";
import { registerCommands } from "./game/commands";
import { tickEnergy } from "./game/energy";
import { ensureTechniqueItem } from "./game/items";
import { openMainMenu } from "./game/menu/menus";
import { forget, now, online, resetRuntime, rt } from "./game/players";
import { tickOffers } from "./game/techniqueSelect";
import { registerXpSources } from "./game/xp";

system.beforeEvents.startup.subscribe((init) => {
  registerCommands(init);
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  const r = initialSpawn ? rt(player) : resetRuntime(player);
  refreshAttributes(r);
  if (r.profile.technique !== "none") ensureTechniqueItem(player);
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => forget(playerId));

world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
  if (itemStack.typeId !== ITEM.limitless) return;
  if (source.isSneaking) {
    const r = rt(source);
    if (r.combat) leaveCombat(r);
    else void openMainMenu(source);
    return;
  }
  toggleCombat(rt(source));
});

registerXpSources();
registerDamagePipeline();
registerCombat();

system.runInterval(() => {
  const tick = now();
  tickStuns();
  for (const r of online()) {
    const p: Player = r.player;
    if (!p.isValid) continue;
    const alive = (p.getComponent("minecraft:health")?.currentValue ?? 1) > 0;
    tickEnergy(r, tick, alive);
    tickCombat(r, tick);
    tickHud(r);
    if (tick % 20 === 0) {
      tickOffers(p);
      if (tick % 100 === 0) refreshAttributes(r);
    }
  }
}, 1);

console.log("[JJK] Jujutsu Kaisen: Ilimitado loaded");
