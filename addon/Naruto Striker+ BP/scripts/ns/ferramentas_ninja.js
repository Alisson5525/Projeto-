// Ferramentas ninja: Bomba de Fumaca (fuga com invisibilidade e velocidade).
import { world, system } from "@minecraft/server";
import { cmd } from "../lib/cmd.js";
import { ehJogador, particula, somArea, msg, lerScore, somarScore, corDoChakra, som } from "./util";
import { somarStat } from "./progressao";

const BOMBA = "tnt:ns_bomba_fumaca";
const usando = new Set();

world.beforeEvents.itemUse.subscribe((ev) => {
  try {
    if (ev.itemStack?.typeId !== BOMBA) return;
    const player = ev.source;
    if (!player || usando.has(player.id)) return;
    usando.add(player.id);
    system.run(() => {
      try { usarBomba(player); } catch {}
      system.runTimeout(() => usando.delete(player.id), 10);
    });
  } catch {}
});

function usarBomba(player) {
  if (!ehJogador(player)) return;
  const l = player.location;
  const dim = player.dimension;
  // nuvem densa em volta
  for (const [dx, dz] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [0.8, 0.8], [-0.8, -0.8]]) {
    particula(dim, "tnt:ns_fumaca_ninja", { x: l.x + dx, y: l.y, z: l.z + dz });
  }
  particula(dim, "tnt:ns_onda", { x: l.x, y: l.y + 0.1, z: l.z });
  somArea(dim, "random.fizz", l, 1, 0.6);
  somArea(dim, "mob.shulker.shoot", l, 0.6, 0.5);
  try {
    player.addEffect("invisibility", 20 * 4, { amplifier: 0, showParticles: false });
    player.addEffect("speed", 20 * 3, { amplifier: 2, showParticles: false });
  } catch {}
  // consome 1 (modo criativo nao gasta)
  try {
    if (player.getGameMode?.() !== "creative") cmd(player, `clear @s ${BOMBA} 0 1`);
  } catch {}
  msg(player, "§7§o*puf* ...você desaparece na fumaça.");
  somarStat(player, "ns:bombas", 1);
}

/* Pilula de Soldado: ao terminar de comer, restaura 50% do chakra maximo. */

world.afterEvents.itemCompleteUse.subscribe((ev) => {
  try {
    if (ev.itemStack?.typeId !== "tnt:ns_pilula_soldado") return;
    const player = ev.source;
    if (!ehJogador(player)) return;
    const chakra = lerScore(player, "chakra");
    const max = lerScore(player, "chakra_max");
    const ganho = max > 0 ? Math.max(0, Math.min(max - chakra, Math.round(max * 0.5))) : 0;
    if (ganho > 0) somarScore(player, "chakra", ganho);
    try { player.addEffect("regeneration", 20 * 5, { amplifier: 0, showParticles: false }); } catch {}
    const l = player.location;
    for (let i = 0; i < 3; i++) particula(player.dimension, "tnt:ns_aura", l, corDoChakra(player));
    particula(player.dimension, "tnt:ns_meditacao", l, corDoChakra(player));
    som(player, "random.burp", 0.6, 1.3);
    msg(player, `§6Pílula de Soldado: §b+${ganho} chakra`);
  } catch {}
});
