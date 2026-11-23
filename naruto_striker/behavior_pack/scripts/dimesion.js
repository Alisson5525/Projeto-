import * as mc from "@minecraft/server";

const POS_KEY = "tnt:last_overworld_pos";
const STRUCTURE_KEY = "tnt:structure_spawned";
const ITEM_ID = "tnt:mgk_obito_skill_4";

const THE_END_POS = { x: 500, y: 100, z: 500 };
const STRUCTURE_NAME = "kamui"; // nome da estrutura

function spawnStructureOnce(world) {
  const spawned = world.getDynamicProperty(STRUCTURE_KEY);
  if (!spawned) {
    const end = world.getDimension("the_end");
    end.runCommandAsync(`structure load ${STRUCTURE_NAME} ${THE_END_POS.x - 32} ${THE_END_POS.y - 6} ${THE_END_POS.z - 32}`);
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
    console.warn("Criar e Ir");
    player.addTag("in_kamui");
    world.setDynamicProperty(POS_KEY, 1);
    player.setDynamicProperty("player_position", JSON.stringify(player.location));

    player.runCommandAsync(`execute in the_end run tp "${player.name}" ${THE_END_POS.x} ${THE_END_POS.y + 1} ${THE_END_POS.z}`);
    mc.system.runTimeout(() => spawnStructureOnce(world), 60);
    
    mc.system.runTimeout(() => {
      const checkInterval = mc.system.runInterval(() => {
        if (isOnSolidGround(player)) {
          console.warn("Foi — bloco detectado abaixo!");
          mc.system.clearRun(checkInterval);
        } else {
          player.runCommandAsync("tp @s ~~~");
        }
      });
    }, 10);

  } else if (player.hasTag("in_kamui")) {
    console.warn("Voltar");
    player.removeTag("in_kamui");

    if (player_position_str) {
      const pos = JSON.parse(player_position_str);
      player.runCommandAsync(`execute in overworld run tp "${player.name}" ${pos.x} ${pos.y} ${pos.z}`);
    }
  } else {
    console.warn("So Ir");
    player.addTag("in_kamui");
    player.runCommandAsync(`execute in the_end run tp "${player.name}" ${THE_END_POS.x} ${THE_END_POS.y + 1} ${THE_END_POS.z}`);
    player.setDynamicProperty("player_position", JSON.stringify(player.location));
  }
});