import { world } from "@minecraft/server";

world.afterEvents.playerSpawn.subscribe(data => {
  try {
    const player = data.player;
    player.runCommandAsync("hud @s hide health")?.catch?.(() => {});
    player.runCommandAsync("function remove_all")?.catch?.(() => {});
  }catch (a){}
});