// Monte Myoboku: a estrutura "monte_myoboku" (64x64x64) vinha no pack sem uso.
// Agora e um destino de exploracao via "Invocacao Reversa" no Pergaminho Ninja
// (requer rank Chunin, nivel 15). Fica no vazio do End em (-500, -500), longe de
// construcoes, como o Kamui original faz em (500, 500).
import { world, system } from "@minecraft/server";
import { ehJogador, valido, lerJSON, gravarJSON, particula, som, msg, tremer, lerScore, somarScore } from "./util";
import { BOTOES_EXTRAS, nivelDe, darXP, somarStat } from "./progressao";

const CENTRO = { x: -500, y: 100, z: -500 };
const ORIGEM_ESTRUTURA = { x: CENTRO.x - 32, y: 90, z: CENTRO.z - 32 }; // estrutura 64x64x64
const CHEGADA = { x: CENTRO.x + 0.5, y: 160, z: CENTRO.z + 0.5 };
const NIVEL_MIN = 15;
const CHAVE_CRIADO = "ns:myoboku_criado";
const CHAVE_VOLTA = "ns:myoboku_volta";

function noMyoboku(player) {
  try {
    if (player.dimension.id !== "minecraft:the_end") return false;
    const l = player.location;
    return Math.abs(l.x - CENTRO.x) < 48 && Math.abs(l.z - CENTRO.z) < 48;
  } catch {
    return false;
  }
}

function construir(player, tentativa = 1) {
  try {
    const r = player.runCommandAsync(`execute in the_end run structure load monte_myoboku ${ORIGEM_ESTRUTURA.x} ${ORIGEM_ESTRUTURA.y} ${ORIGEM_ESTRUTURA.z}`);
    // o proprio resultado do comando confirma a construcao
    r?.then?.((res) => { try { if (res && res.successCount > 0) world.setDynamicProperty(CHAVE_CRIADO, true); } catch {} })?.catch?.(() => {});
  } catch {}
  // confere se a montanha apareceu; se o chunk ainda nao tinha carregado, tenta de novo
  system.runTimeout(() => {
    try {
      const fim = world.getDimension("the_end");
      let achou = false;
      if (world.getDynamicProperty(CHAVE_CRIADO)) return;
      // confere varias colunas (o centro pode ser oco)
      for (const [dx, dz] of [[0, 0], [8, 0], [-8, 0], [0, 8], [0, -8], [12, 12], [-12, -12]]) {
        for (let y = ORIGEM_ESTRUTURA.y; y < ORIGEM_ESTRUTURA.y + 64 && !achou; y += 2) {
          const b = fim.getBlock({ x: CENTRO.x + dx, y, z: CENTRO.z + dz });
          if (b && !b.isAir) achou = true;
        }
        if (achou) break;
      }
      if (achou) world.setDynamicProperty(CHAVE_CRIADO, true);
      else if (tentativa < 3 && valido(player)) construir(player, tentativa + 1);
    } catch {}
  }, 40);
}

async function viajar(player) {
  if (!ehJogador(player)) return;
  if (noMyoboku(player)) return voltar(player);
  if (nivelDe(player) < NIVEL_MIN) {
    msg(player, `§cA Invocação Reversa exige rank §2Chunin§c (nível ${NIVEL_MIN}). Seu nível: §e${nivelDe(player)}`);
    som(player, "note.bass", 1, 0.6);
    return;
  }
  const l = player.location;
  gravarJSON(player, CHAVE_VOLTA, { d: player.dimension.id, x: l.x, y: l.y, z: l.z });
  particula(player.dimension, "tnt:ns_fumaca_ninja", l);
  som(player, "mob.endermen.portal", 1, 0.7);
  msg(player, "§2§l[Invocação Reversa]§r §aOs sapos te levam ao §lMonte Myoboku§r§a... medite lá para treinar a energia natural.");
  system.runTimeout(() => {
    try {
      if (!valido(player)) return;
      player.addEffect("slow_falling", 20 * 25, { amplifier: 0, showParticles: false });
      player.addEffect("resistance", 20 * 25, { amplifier: 4, showParticles: false });
      player.teleport(CHEGADA, { dimension: world.getDimension("the_end") });
      tremer(player, 0.3, 0.6);
      if (!world.getDynamicProperty(CHAVE_CRIADO)) {
        // espera os chunks carregarem com o jogador por perto (mesma tecnica do Kamui)
        system.runTimeout(() => { if (valido(player)) construir(player); }, 60);
      }
    } catch {}
  }, 10);
}

function voltar(player) {
  const v = lerJSON(player, CHAVE_VOLTA, null);
  let destino = v && Number.isFinite(v.x) ? v : null;
  let dim;
  try { dim = world.getDimension(destino ? destino.d : "overworld"); } catch { dim = world.getDimension("overworld"); }
  if (!destino) {
    const s = world.getDefaultSpawnLocation();
    destino = { x: s.x + 0.5, y: Math.min(320, Math.max(s.y, 64)) + 1, z: s.z + 0.5 };
  }
  try {
    particula(player.dimension, "tnt:ns_fumaca_ninja", player.location);
    player.addEffect("slow_falling", 20 * 8, { amplifier: 0, showParticles: false });
    player.teleport({ x: destino.x, y: destino.y, z: destino.z }, { dimension: dim });
    som(player, "mob.endermen.portal", 1, 1.2);
    msg(player, "§2Você retornou do Monte Myoboku.");
  } catch {}
}

BOTOES_EXTRAS.push({
  nome: "§2§lMonte Myoboku §r§8(Invocação Reversa)",
  abrir: (p) => viajar(p),
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id === "ns:myoboku" && ehJogador(ev.sourceEntity)) viajar(ev.sourceEntity);
});

/* Treino de energia natural: meditar no monte rende chakra triplo e XP. */
const tempoParado = new Map();
world.afterEvents.playerLeave.subscribe((ev) => tempoParado.delete(ev.playerId));

system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      if (!noMyoboku(player)) continue;
      // folhas e "energia natural" no ar
      const l = player.location;
      if (Math.random() < 0.5) particula(player.dimension, "tnt:ns_folhas", { x: l.x, y: l.y + 1, z: l.z });
      if (player.isSneaking && player.isOnGround) {
        const t = (tempoParado.get(player.id) ?? 0) + 1;
        tempoParado.set(player.id, t);
        particula(player.dimension, "tnt:ns_meditacao", l, [1.0, 0.6, 0.15]);
        if (t % 2 === 0) {
          const chakra = lerScore(player, "chakra");
          const max = lerScore(player, "chakra_max");
          if (max > 0 && chakra < max) somarScore(player, "chakra", Math.min(max - chakra, Math.max(2, Math.round(max * 0.06))));
          darXP(player, 4, "myoboku");
          somarStat(player, "ns:myoboku_med", 1);
        }
        if (t === 20) msg(player, "§6Você sente a energia natural fluindo... §7(meditar aqui rende chakra e XP)");
        // a cada 60s de meditacao: bencao da energia natural (forca + velocidade por 90s)
        if (t % 60 === 0) {
          player.addEffect("strength", 20 * 90, { amplifier: 0, showParticles: false });
          player.addEffect("speed", 20 * 90, { amplifier: 0, showParticles: false });
          particula(player.dimension, "tnt:ns_level_up", l);
          som(player, "random.levelup", 0.6, 0.6);
          msg(player, "§6§l[Energia Natural]§r §eVocê absorveu a energia natural! §7(Força e Velocidade por 90s)");
        }
      } else {
        tempoParado.set(player.id, 0);
      }
    } catch {}
  }
}, 20);

/* Rede de seguranca: o monte fica no vazio do End. Quem cair abaixo da base e
   resgatado pelos sapos de volta ao topo (nunca morre no vazio). */
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      if (player.dimension.id !== "minecraft:the_end") continue;
      const l = player.location;
      // Monte Myoboku (-500, -500): base em y=90
      if (Math.abs(l.x - CENTRO.x) <= 80 && Math.abs(l.z - CENTRO.z) <= 80 && l.y < ORIGEM_ESTRUTURA.y - 6) {
        player.addEffect("slow_falling", 20 * 10, { amplifier: 0, showParticles: false });
        player.teleport(CHEGADA, { dimension: player.dimension });
        particula(player.dimension, "tnt:ns_fumaca_ninja", CHEGADA);
        msg(player, "§2Os sapos do Monte Myoboku te resgataram da queda!");
      }
      // Kamui original (500, 500): estrutura carregada a partir de y=94
      else if (Math.abs(l.x - 500) <= 80 && Math.abs(l.z - 500) <= 80 && l.y < 88) {
        player.addEffect("slow_falling", 20 * 10, { amplifier: 0, showParticles: false });
        player.teleport({ x: 500.5, y: 101, z: 500.5 }, { dimension: player.dimension });
        msg(player, "§5A dimensão Kamui te puxou de volta.");
      }
    } catch {}
  }
}, 4);
