// Ponto de entrada da exploração da Edição Definitiva: registra as novas descobertas (comuns, incomuns, raras e lendária),
// liga os mecanismos, os eventos do mundo e as interações com NPCs marcados.
import { registerType } from "../structures/registry.js";
import { COMUNS } from "../structures/descobertas_comuns.js";
import { INCOMUNS } from "../structures/descobertas_incomuns.js";
import { RARAS } from "../structures/descobertas_raras.js";
import { startMechanisms } from "./mechanisms.js";
import { startWorldEvents } from "./events.js";
import { onNpcInteract } from "../npc/dialogue.js";
import { psound } from "../core/fx.js";

export const NOVOS_TIPOS = [...COMUNS, ...INCOMUNS, ...RARAS];
for (const T of NOVOS_TIPOS) registerType(T);

export function startExploration() {
  startMechanisms();
  startWorldEvents();
  onNpcInteract((player, npc) => {
    if (!npc.hasTag("valdoria_cativo")) return false;
    player.onScreenDisplay.setActionBar("§f\"Por favor! A alavanca da jaula fica do lado de fora, junto ao poste!\"");
    psound(player, "mob.villager.no", 1.2, 1);
    return true;
  });
}
