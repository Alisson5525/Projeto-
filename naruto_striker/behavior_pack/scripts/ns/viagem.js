// Viagem Rapida: volta a Konoha pelo Pergaminho Ninja (recarga de 5 minutos).
import { world, system } from "@minecraft/server";
import { ehJogador, valido, lerNum, gravar, particula, som, msg } from "./util";
import { BOTOES_EXTRAS, somarStat } from "./progressao";

const RECARGA = 20 * 60 * 5;

function destinoKonoha() {
  try {
    const v = world.getDynamicProperty("ns:konoha_pos");
    if (typeof v === "string") {
      const p = JSON.parse(v);
      if (Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)) return { pos: p, exato: true };
    }
  } catch {}
  // mundos antigos: a vila foi gerada no spawn do mundo
  const s = world.getDefaultSpawnLocation();
  const y = s.y > 320 || s.y < -64 ? 120 : s.y + 2;
  return { pos: { x: s.x + 0.5, y, z: s.z + 0.5 }, exato: false };
}

function viajarKonoha(player) {
  if (!ehJogador(player)) return;
  const agora = system.currentTick;
  const prox = lerNum(player, "ns:viagem_pronta", 0);
  // currentTick reinicia ao reabrir o mundo: se a marca ficou no "futuro distante", libera
  if (prox > agora && prox - agora <= RECARGA) {
    msg(player, `§cA técnica de teletransporte ainda está recarregando (§e${Math.ceil((prox - agora) / 20)}s§c).`);
    som(player, "note.bass", 1, 0.6);
    return;
  }
  const { pos, exato } = destinoKonoha();
  try {
    particula(player.dimension, "tnt:ns_fumaca_ninja", player.location);
    player.addEffect("slow_falling", exato ? 20 * 4 : 20 * 15, { amplifier: 0, showParticles: false });
    player.teleport(pos, { dimension: world.getDimension("overworld") });
    gravar(player, "ns:viagem_pronta", agora + RECARGA);
    somarStat(player, "ns:viagens", 1);
    system.runTimeout(() => {
      if (!valido(player)) return;
      particula(player.dimension, "tnt:ns_fumaca_ninja", player.location);
      particula(player.dimension, "tnt:ns_folhas", player.location);
      // chuva de petalas de sakura dando as boas-vindas a vila
      const l = player.location;
      for (let i = 0; i < 6; i++) {
        particula(player.dimension, "tnt:ns_petala", { x: l.x + (Math.random() - 0.5) * 6, y: l.y + 3 + Math.random() * 2, z: l.z + (Math.random() - 0.5) * 6 });
      }
      som(player, "mob.endermen.portal", 1, 1.1);
      msg(player, "§2Você chegou à §lVila da Folha§r§2. §7(próxima viagem em 5 minutos)");
    }, 2);
  } catch {}
}

BOTOES_EXTRAS.push({ nome: "§a§lViagem Rápida: Konoha §r§8(recarga 5 min)", abrir: (p) => viajarKonoha(p) });

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (ev.id === "ns:konoha" && ehJogador(ev.sourceEntity)) viajarKonoha(ev.sourceEntity);
});
