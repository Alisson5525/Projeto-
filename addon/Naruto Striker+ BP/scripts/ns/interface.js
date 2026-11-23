// Interface: som de abertura padronizado para todos os pergaminhos/menus do add-on.
// (Os menus continuam abrindo pelos seus proprios scripts; aqui so ha o retorno sonoro.)
import { world } from "@minecraft/server";

const MENUS = new Set([
  "tnt:escolha_clan", "tnt:menu_all_modos", "tnt:menu_all_modos_evoluir", "tnt:menu_custon",
  "tnt:menu_jutsus_evoluir", "tnt:menu_missao", "tnt:menu_modos_hyuga", "tnt:menu_modos_hyuga_evoluir",
  "tnt:menu_modos_uchiha", "tnt:menu_modos_uchiha_evoluir", "tnt:menu_status_evoluir", "tnt:pergaminho_inicial",
]);
const ultimo = new Map();

world.afterEvents.itemUse.subscribe((ev) => {
  try {
    const id = ev.itemStack?.typeId;
    if (!id || !MENUS.has(id)) return;
    const p = ev.source;
    const agora = Date.now();
    if (agora - (ultimo.get(p.id) ?? 0) < 400) return; // evita repetir ao segurar o botao
    ultimo.set(p.id, agora);
    p.playSound("ns.ui.abrir", { volume: 0.8 });
  } catch {}
});

world.afterEvents.playerLeave.subscribe((ev) => ultimo.delete(ev.playerId));
