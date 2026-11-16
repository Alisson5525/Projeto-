import {
    system,
    world
} from "@minecraft/server";

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:ore_fortune", {
        onPlayerBreak(e) {
            const player = e.player;
            const blockLoc = e.block.location;
            const broken = e.brokenBlockPermutation.type.id
            const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
            if (!held) return;
            const enchant = held.getComponent("minecraft:enchantable")
            if (!enchant) return;
            if (!held.typeId.includes("pickaxe")) return;
            if (enchant.getEnchantment("silk_touch")) return;

            if (player.getGameMode() == "Creative") return;

            const fortune = enchant.getEnchantment("fortune")
            if (!fortune) return;
            const level = fortune.level
            var lootId = broken.replace("mm:", "").replace("deepslate_", "")
            for (let i = 0; i < level; i++) {
                let rand = Math.random()
                if (rand < 0.5) {
                    player.runCommand(`loot spawn ${blockLoc.x} ${blockLoc.y} ${blockLoc.z} loot "blocks/${lootId}"`)
                }
            }
        }
    })
})