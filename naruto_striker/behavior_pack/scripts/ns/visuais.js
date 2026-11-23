// Efeitos visuais continuos: aura de chakra nos modos, rastro de velocidade (dash),
// impacto de pouso, meditacao para recuperar chakra e alerta de vida baixa.
import { world, system } from "@minecraft/server";
import { ehJogador, lerScore, somarScore, particula, som, tremer, config, corDoChakra } from "./util";
import { somarStat } from "./progressao";

const estado = new Map(); // playerId -> { vyAnterior, parado, ultimoBatimento }

function st(player) {
  let s = estado.get(player.id);
  if (!s) {
    s = { vyAnterior: 0, parado: 0, ultimoBatimento: 0, ultimaPos: null, modoAntes: null };
    estado.set(player.id, s);
  }
  return s;
}

world.afterEvents.playerLeave.subscribe((ev) => {
  estado.delete(ev.playerId);
});

function emModo(player) {
  try {
    return player.hasTag("modo_ativado") || player.hasTag("modo_ativado_2");
  } catch {
    return false;
  }
}

/* A cada 2 ticks: movimento (rastro, pouso). */
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      if (!ehJogador(player)) continue;
      const s = st(player);
      const v = player.getVelocity();
      const horiz = Math.hypot(v.x, v.z);
      const loc = player.location;
      const cfg = config(player);

      // rastro: dash, raikiri, saltos ninja
      if (cfg.rastro && horiz > 0.62) {
        particula(player.dimension, "tnt:ns_rastro", loc, emModo(player) ? corDoChakra(player) : [0.75, 0.85, 1.0]);
      }

      // pouso: so quando a queda foi forte
      const noChao = player.isOnGround;
      if (noChao && s.vyAnterior < -0.85 && !player.isInWater) {
        particula(player.dimension, "tnt:ns_poeira", loc);
        if (s.vyAnterior < -1.3) {
          particula(player.dimension, "tnt:ns_detritos", loc);
          particula(player.dimension, "tnt:ns_onda", { x: loc.x, y: loc.y + 0.1, z: loc.z });
          tremer(player, 0.2, 0.25);
        }
      }
      s.vyAnterior = noChao ? 0 : v.y;
    } catch {}
  }
}, 2);

/* A cada 5 ticks: aura, meditacao, vida baixa. */
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    try {
      if (!ehJogador(player)) continue;
      const s = st(player);
      const cfg = config(player);
      const loc = player.location;

      // explosao de chakra ao ativar um modo / fumaca ao desativar
      const modoAgora = emModo(player);
      if (s.modoAntes !== null && modoAgora !== s.modoAntes) {
        if (modoAgora) {
          const cor = corDoChakra(player);
          particula(player.dimension, "tnt:ns_onda", { x: loc.x, y: loc.y + 0.1, z: loc.z });
          particula(player.dimension, "tnt:ns_flash", { x: loc.x, y: loc.y + 1, z: loc.z });
          for (let i = 0; i < 4; i++) particula(player.dimension, "tnt:ns_aura", loc, cor);
          particula(player.dimension, "tnt:ns_detritos", loc);
          tremer(player, 0.35, 0.5);
          somarStat(player, "ns:transformacoes", 1);
        } else {
          particula(player.dimension, "tnt:ns_fumaca_ninja", loc);
        }
      }
      s.modoAntes = modoAgora;

      // aura de chakra enquanto algum modo esta ativo
      if (cfg.aura && modoAgora) {
        particula(player.dimension, "tnt:ns_aura", loc, corDoChakra(player));
      }

      // meditacao: agachado e parado por 2s -> chakra flui de volta
      const p = s.ultimaPos;
      const parado = p && Math.abs(p.x - loc.x) < 0.02 && Math.abs(p.z - loc.z) < 0.02 && Math.abs(p.y - loc.y) < 0.02;
      s.ultimaPos = { x: loc.x, y: loc.y, z: loc.z };
      if (player.isSneaking && parado && player.isOnGround) {
        s.parado += 5;
        if (s.parado >= 40) {
          particula(player.dimension, "tnt:ns_meditacao", loc, corDoChakra(player));
          if (s.parado % 20 === 0) {
            const chakra = lerScore(player, "chakra");
            const max = lerScore(player, "chakra_max");
            if (max > 0 && chakra < max) {
              const ganho = Math.min(max - chakra, Math.max(1, Math.round(max * 0.02)));
              somarScore(player, "chakra", ganho);
              if (s.parado === 40) som(player, "beacon.ambient", 0.5, 1.6);
            }
          }
        }
      } else {
        s.parado = 0;
      }

      // vida baixa: batimento cardiaco
      const vida = player.getComponent("health");
      if (vida && vida.effectiveMax > 0 && vida.currentValue > 0 && vida.currentValue / vida.effectiveMax <= 0.25) {
        const agora = system.currentTick;
        if (agora - s.ultimoBatimento >= 24) {
          s.ultimoBatimento = agora;
          som(player, "mob.warden.heartbeat", 0.8, 1.0);
        }
      }
    } catch {}
  }
}, 5);
