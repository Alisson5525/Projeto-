import { world, system } from "@minecraft/server";

const OBJETIVO = "chakra_acumulado"; // nome do scoreboard
const ITEM_ID = "tnt:selo_byakugou"; // item que vai mostrar o score

system.runInterval(() => {
    for (const player of world.getPlayers()) {

        const scoreboard = world.scoreboard.getObjective(OBJETIVO);
        if (!scoreboard) return;

        const score = scoreboard.getScore(player) ?? 0;

        const inventory = player.getComponent("minecraft:inventory").container;

        for (let i = 0; i < inventory.size; i++) {
            const item = inventory.getItem(i);
            if (!item) continue;

            if (item.typeId === ITEM_ID) {
                item.setLore([
                    `§bChakra Acumulado: §e${score}§f/§e3000`
                ]);
                inventory.setItem(i, item);
            }
        }
    }
}, 20); 