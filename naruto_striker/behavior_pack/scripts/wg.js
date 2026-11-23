import * as mc from "@minecraft/server";
import { MODES } from "./config";
import { nivelDe } from "./ns/progressao";

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
  // modos duram mais conforme o nivel ninja: +0,5% por nivel (ate +50%)
  let tempo = mode.tempo;
  try { tempo = Math.round(mode.tempo * (1 + Math.min(0.5, nivelDe(player) * 0.005))); } catch {}
  setScore(player, score, tempo);

  for (const cmd of mode.cmdStart) {
    // efeitos com a mesma duracao do modo acompanham o tempo estendido
    const ajustado = cmd.replace(/^(effect @s \S+ )(\d+)(?=\s)/, (m, a, d) => (Number(d) === mode.tempo ? a + tempo : m));
    try { player.runCommandAsync(ajustado)?.catch?.(() => {}); } catch (e) {}
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
    try { player.runCommandAsync(cmd)?.catch?.(() => {}); } catch (e) {}
  }
}

mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {
    try {
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
  
    } catch (e) {}
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