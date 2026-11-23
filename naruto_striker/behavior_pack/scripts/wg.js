import * as mc from "@minecraft/server";
import { MODES } from "./config";

mc.system.afterEvents.scriptEventReceive.subscribe(ev => {
  const player = ev.sourceEntity;
  if (!player || player.typeId !== "minecraft:player" || !player.isValid()) return;

  const id = ev.id;

  if (id.startsWith("ativar:")) {
    ativarModo(player, id.replace("ativar:", ""));
  }

  if (id.startsWith("desativar:")) {
    desativarModo(player, id.replace("desativar:", ""));
  }
});

function ativarModo(player, modeId) {
  const mode = MODES[modeId];
  if (!mode) return;

  const activeKey = `mode:${modeId}_active`;
  const score = mode.scoreTime;
  
  if (player.getDynamicProperty(activeKey)) return;
  
  for (const id in MODES) {
    const m = MODES[id];
    if (
      m.scoreTime === score &&
      player.getDynamicProperty(`mode:${id}_active`)
    ) {
      player.sendMessage("§cJá existe um modo ativo!");
      return;
    }
  }
  
  player.setDynamicProperty(activeKey, true);
  setScore(player, score, mode.tempo);

  for (const cmd of mode.cmdStart) {
    try { player.runCommandAsync(cmd); } catch (e) {}
  }
}

function desativarModo(player, modeId) {
  const mode = MODES[modeId];
  if (!mode) return;

  const activeKey = `mode:${modeId}_active`;
  const score = mode.scoreTime;

  if (!player.getDynamicProperty(activeKey)) return;

  player.setDynamicProperty(activeKey, false);
  setScore(player, score, 0);

  for (const cmd of mode.cmdFinish) {
    try { player.runCommandAsync(cmd); } catch (e) {}
  }
}

mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {
    if (!player.isValid()) continue;
    for (const modeId in MODES) {
      const mode = MODES[modeId];
      const activeKey = `mode:${modeId}_active`;

      if (!player.getDynamicProperty(activeKey)) continue;

      let time = getScore(player, mode.scoreTime);
      time--;

      if (time <= 0) {
        desativarModo(player, modeId);
      } else {
        setScore(player, mode.scoreTime, time);
      }
    }
  }
}, 20);

mc.world.afterEvents.entityDie.subscribe(ev => {
  const player = ev.deadEntity;
  if (player?.typeId !== "minecraft:player") return;

  for (const id in MODES) {
    desativarModo(player, id);
  }
});

// (removido: playerLeave nao fornece ev.player, gerava erro a cada saida de jogador.
//  Os modos ficam salvos em dynamic properties e o temporizador continua ao reentrar.)


function getScore(player, objective) {
  try {
    return mc.world.scoreboard
      .getObjective(objective)
      .getScore(player);
  } catch {
    return 0;
  }
}

function setScore(player, objective, value) {
  let obj = mc.world.scoreboard.getObjective(objective);
  if (!obj) {
    obj = mc.world.scoreboard.addObjective(objective, objective);
  }
  obj.setScore(player, value);
}