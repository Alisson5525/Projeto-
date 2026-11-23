// Ferramentas ninja: Bomba de Fumaca (fuga com invisibilidade e velocidade).
import { world, system } from "@minecraft/server";
import { ehJogador, particula, somArea, msg } from "./util";

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
    if (player.getGameMode?.() !== "creative") player.runCommandAsync(`clear @s ${BOMBA} 0 1`);
  } catch {}
  msg(player, "§7§o*puf* ...você desaparece na fumaça.");
}
