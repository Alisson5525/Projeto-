import { world, system } from "@minecraft/server";

const OBJETIVO = "chakra_acumulado"; // nome do scoreboard
const ITEM_ID = "tnt:selo_byakugou"; // item que vai mostrar o score

system.runInterval(() => {
    for (const player of world.getPlayers()) {
    try {

        const scoreboard = world.scoreboard.getObjective(OBJETIVO);
        if (!scoreboard) return;

        const score = scoreboard.getScore(player) ?? 0;

        const inventory = player.getComponent("minecraft:inventory")?.container;
        if (!inventory) continue;

        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (!item) continue;

            if (item.typeId === ITEM_ID) {
                const lore = `§bChakra Acumulado: §e${score}§f/§e3000`;
                const atual = item.getLore();
                // so reescreve quando muda (evita "piscar" o item a cada segundo)
                if (atual.length !== 1 || atual[0] !== lore) {
                    item.setLore([lore]);
                    inventory.setItem(i, item);
                }
            }
        }
    
    } catch (e) {}
  }
}, 20); 