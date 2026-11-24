import * as mc from "@minecraft/server";
import { cmd } from "./lib/cmd.js";

const POS_KEY = "tnt:last_overworld_pos";
const STRUCTURE_KEY = "tnt:structure_spawned";
const ITEM_ID = "tnt:mgk_obito_skill_4";

const THE_END_POS = { x: 500, y: 100, z: 500 };
const STRUCTURE_NAME = "kamui"; // nome da estrutura

function spawnStructureOnce(world) {
  const spawned = world.getDynamicProperty(STRUCTURE_KEY);
  if (!spawned) {
    const end = world.getDimension("the_end");
    cmd(end, `structure load ${STRUCTURE_NAME} ${THE_END_POS.x - 32} ${THE_END_POS.y - 6} ${THE_END_POS.z - 32}`);
    world.setDynamicProperty(STRUCTURE_KEY, true);
  }
}

function isOnSolidGround(player) {
  try {
    const dim = player.dimension;
    const pos = player.location;
    const blockBelow = dim.getBlock({
      x: Math.floor(pos.x),
      y: Math.floor(pos.y) - 1,
      z: Math.floor(pos.z),
    });
    return blockBelow && blockBelow.typeId !== "minecraft:air";
  } catch {
    return false;
  }
}

mc.world.afterEvents.itemStopUse.subscribe(event => {
  const player = event.source;
  const item = event.itemStack;

  if (!player || !item) return;
  if (item.typeId !== ITEM_ID) return;

  const world = mc.world;
  const lastPos = world.getDynamicProperty(POS_KEY);
  const player_position_str = player.getDynamicProperty("player_position");

  if (!lastPos) {
    player.addTag("in_kamui");
    world.setDynamicProperty(POS_KEY, 1);
    player.setDynamicProperty("player_position", JSON.stringify(player.location));

    cmd(player, `execute in the_end run tp @s ${THE_END_POS.x} ${THE_END_POS.y + 1} ${THE_END_POS.z}`);
    mc.system.runTimeout(() => spawnStructureOnce(world), 60);
    
    mc.system.runTimeout(() => {
      // segura o jogador no ar ate a estrutura carregar (no maximo 15s; antes podia rodar para sempre)
      let ticks = 0;
      const checkInterval = mc.system.runInterval(() => {
        ticks++;
        try {
          if (!player.isValid || ticks > 300 || isOnSolidGround(player)) {
            mc.system.clearRun(checkInterval);
            return;
          }
          cmd(player, "tp @s ~~~");
        } catch {
          mc.system.clearRun(checkInterval);
        }
      });
    }, 10);

  } else if (player.hasTag("in_kamui")) {
    player.removeTag("in_kamui");

    let pos;
    try { pos = player_position_str ? JSON.parse(String(player_position_str)) : undefined; } catch { pos = undefined; }
    if (pos && [pos.x, pos.y, pos.z].every(Number.isFinite)) {
      cmd(player, `execute in overworld run tp @s ${pos.x} ${pos.y} ${pos.z}`);
    } else {
      // sem posicao salva: volta ao ponto de nascimento do mundo (antes ficava preso no End)
      const sp = world.getDefaultSpawnLocation();
      const y = sp.y > 300 || sp.y < -64 ? 100 : sp.y;
      cmd(player, `execute in overworld run tp @s ${sp.x} ${y} ${sp.z}`);
    }
  } else {
    // salva a posicao ANTES do teleporte (o comando agora e sincrono)
    player.setDynamicProperty("player_position", JSON.stringify(player.location));
    player.addTag("in_kamui");
    cmd(player, `execute in the_end run tp @s ${THE_END_POS.x} ${THE_END_POS.y + 1} ${THE_END_POS.z}`);
  }
});