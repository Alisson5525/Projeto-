// Itens Indestrutíveis
// Mantém a durabilidade de todo item com o componente "minecraft:durability"
// sempre cheia: armaduras, armas, ferramentas, escudo, elytra, arco, tridente,
// vara de pesca, tesoura, isqueiro, etc. — inclusive itens de outros add-ons.
//
// Compatibilidade: este add-on NÃO sobrescreve nenhum arquivo do jogo
// (nenhum JSON de item vanilla é substituído). Ele apenas zera o dano dos
// itens via Script API, então funciona junto com outros add-ons sem conflito.

import { world, system, EquipmentSlot } from "@minecraft/server";

// Slots verificados a cada tick (itens em uso que sofrem desgaste rápido).
const EQUIPMENT_SLOTS = [
  EquipmentSlot.Head,
  EquipmentSlot.Chest,
  EquipmentSlot.Legs,
  EquipmentSlot.Feet,
  EquipmentSlot.Offhand,
];

// O inventário inteiro é verificado a cada FULL_SCAN_INTERVAL ticks
// (20 ticks = 1 segundo) para economizar desempenho.
const FULL_SCAN_INTERVAL = 20;

/**
 * Retorna o item reparado, ou undefined se ele não precisar de reparo.
 * @param {import("@minecraft/server").ItemStack | undefined} item
 */
function repair(item) {
  if (!item) return undefined;
  const durability = item.getComponent("minecraft:durability");
  if (!durability || durability.damage === 0) return undefined;
  durability.damage = 0;
  return item;
}

function repairEquipment(player) {
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;
  for (const slot of EQUIPMENT_SLOTS) {
    const fixed = repair(equippable.getEquipment(slot));
    if (fixed) equippable.setEquipment(slot, fixed);
  }
}

function repairSlot(container, index) {
  const fixed = repair(container.getItem(index));
  if (fixed) container.setItem(index, fixed);
}

function repairInventory(player, fullScan) {
  const container = player.getComponent("minecraft:inventory")?.container;
  if (!container) return;
  if (fullScan) {
    for (let i = 0; i < container.size; i++) repairSlot(container, i);
  } else {
    // Item na mão principal.
    repairSlot(container, player.selectedSlotIndex);
  }
}

let tick = 0;

system.runInterval(() => {
  tick = (tick + 1) % FULL_SCAN_INTERVAL;
  const fullScan = tick === 0;

  for (const player of world.getAllPlayers()) {
    try {
      repairEquipment(player);
      repairInventory(player, fullScan);
    } catch {
      // Jogador saiu/carregando: ignora e tenta no próximo tick.
    }
  }
}, 1);
