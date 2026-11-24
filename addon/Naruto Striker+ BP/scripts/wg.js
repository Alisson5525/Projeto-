import * as mc from "@minecraft/server";
import { cmd } from "./lib/cmd.js";
import { MODES } from "./config";
import { nivelDe } from "./ns/progressao";
import { particula, corDoChakra, tremer } from "./ns/util";

mc.system.afterEvents.scriptEventReceive.subscribe(ev => {
  const player = ev.sourceEntity;
  if (!player || player.typeId !== "minecraft:player" || !player.isValid) return;

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

  apresentarTransformacao(player);

  for (const comando of mode.cmdStart) {
    // efeitos com a mesma duracao do modo acompanham o tempo estendido
    const ajustado = comando.replace(/^(effect @s \S+ )(\d+)(?=\s)/, (m, a, d) => (Number(d) === mode.tempo ? a + tempo : m));
    try { cmd(player, ajustado); } catch (e) {}
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
  try {
    if (player.isValid) player.playAnimation("animation.ns.destransformar", { controller: "ns_transformacao", blendOutTime: 0.3 });
  } catch {}

  for (const comando of mode.cmdFinish) {
    try { cmd(player, comando); } catch (e) {}
  }
}

mc.system.runInterval(() => {
  for (const player of mc.world.getPlayers()) {
    try {
    if (!player.isValid) continue;
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

/** Encerra todos os modos ativos (desfaz bonus de vida/dano e devolve o slot). */
export function desativarTodos(player) {
  for (const id in MODES) {
    try { desativarModo(player, id); } catch {}
  }
}

mc.world.afterEvents.entityDie.subscribe(ev => {
  const player = ev.deadEntity;
  if (player?.typeId !== "minecraft:player") return;
  desativarTodos(player);
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

/* Apresentacao da transformacao: pose de explosao de chakra (antecipacao -> liberacao),
   onda no chao, coluna de aura na cor do modo e tremor leve. A cor e lida 2 ticks depois,
   quando a propriedade visual do modo ja foi aplicada pelo evento da entidade. */
function apresentarTransformacao(player) {
  try { player.playAnimation("animation.ns.transformacao", { controller: "ns_transformacao", blendOutTime: 0.3 }); } catch {}
  mc.system.runTimeout(() => {
    try {
      if (!player.isValid) return;
      const dim = player.dimension;
      const l = player.location;
      const cor = corDoChakra(player);
      particula(dim, "tnt:ns_onda", { x: l.x, y: l.y + 0.1, z: l.z });
      particula(dim, "tnt:ns_flash", { x: l.x, y: l.y + 1.2, z: l.z });
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        particula(dim, "tnt:ns_aura", { x: l.x + Math.cos(a) * 0.9, y: l.y + 0.2, z: l.z + Math.sin(a) * 0.9 }, cor);
      }
      tremer(player, 0.25, 0.35);
    } catch {}
  }, 6);
}
