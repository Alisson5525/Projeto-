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
import { registerDomain, tickDomain } from "./game/domain";
import { registerRct, tickRct } from "./game/rct";
import { registerSixEyes, tickSixEyes } from "./game/sixEyes";
import { tickEnergy } from "./game/energy";
import { ensureTechniqueItem } from "./game/items";
import { openMainMenu } from "./game/menu/menus";
import { recoverPlayer } from "./game/lock";
import { blocksCombatToggle, forget, now, online, resetRuntime, rt } from "./game/players";
import { clearAllSlows } from "./game/speed";
import { lowerInfinity, registerSkills, tickSkills, tickSkillsWorld } from "./game/skills";
import { tickOffers } from "./game/techniqueSelect";
import { registerXpSources } from "./game/xp";

system.beforeEvents.startup.subscribe((init) => {
  registerCommands(init);
});

world.afterEvents.playerSpawn.subscribe(({ player, initialSpawn }) => {
  if (initialSpawn) {
    // Undo locks a cast may have left on the saved player (logout mid-cast).
    clearAllSlows(player);
    recoverPlayer(player);
  }
  const r = initialSpawn ? rt(player) : resetRuntime(player);
  refreshAttributes(r);
  if (r.profile.technique !== "none") ensureTechniqueItem(player);
});

world.afterEvents.playerLeave.subscribe(({ playerId }) => forget(playerId));

world.afterEvents.itemUse.subscribe(({ source, itemStack }) => {
  if (itemStack.typeId !== ITEM.limitless) return;
  if (blocksCombatToggle(rt(source))) return;
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
registerSkills();
registerDomain();
registerRct();
registerSixEyes();

system.runInterval(() => {
  const tick = now();
  tickStuns();
  tickSkillsWorld();
  tickDomain();
  for (const r of online()) {
    const p: Player = r.player;
    if (!p.isValid) continue;
    const alive = (p.getComponent("minecraft:health")?.currentValue ?? 1) > 0;
    if (tickEnergy(r, tick, alive)) lowerInfinity(r);
    tickCombat(r, tick);
    tickSkills(r);
    tickRct(r);
    tickSixEyes(p, tick);
    tickHud(r);
    if (tick % 20 === 0) {
      tickOffers(p);
      if (tick % 100 === 0) refreshAttributes(r);
    }
  }
}, 1);

console.log("[JJK] Jujutsu Kaisen: Ilimitado loaded");
