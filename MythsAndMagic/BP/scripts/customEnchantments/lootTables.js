import {
    world
} from "@minecraft/server";

import { customData } from "customEnchantments/main.js"


world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    const block = e.block;
    const inventory = block.getComponent("inventory")
    if (!inventory) return;
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
        let slotItem = container.getItem(i)
        if (slotItem == undefined) continue;
        if (slotItem.typeId !== "mm:pondering_book") continue;
        var enchant = getEnchant(slotItem)
        if (enchant !== undefined) {
            const lookup = customData.find(lookup => lookup.enchantName === enchant);
            var level = 1
            if (lookup) level += Math.round(Math.random() * (lookup.maxLevel - 1))
            slotItem.setLore(
                [{ rawtext: [{ text: "§e§n§c§h§r§d" }, { translate: "orb_ponderer." + enchant }, { text: " " }, { translate: `enchantment.level.${level}` }, { text: "§r" }] }
                ])
            slotItem.setDynamicProperty("mm:ponder_enchant_" + enchant, level)
            container.getSlot(i).setItem(slotItem)
        }
    }
})

world.afterEvents.entitySpawn.subscribe((e) => {
    const entity = e.entity;
    if (!entity.isValid) return;
    if (entity.typeId !== "minecraft:item") return;
    const itemComp = entity.getComponent("item")
    const item = itemComp.itemStack;
    if (item.typeId !== "mm:pondering_book") return;
    var enchant = getEnchant(item)
    if (enchant !== undefined) {
        const lookup = customData.find(lookup => lookup.enchantName === enchant);
        var level = 1
        if (lookup) level += Math.round(Math.random() * (lookup.maxLevel - 1))
        item.setLore(
            [{ rawtext: [{ text: "§e§n§c§h§r§d" }, { translate: "orb_ponderer." + enchant }, { text: " " }, { translate: `enchantment.level.${level}` }, { text: "§r" }] }
            ])
        item.setDynamicProperty("mm:ponder_enchant_" + enchant, level)
    }
})

world.afterEvents.playerInventoryItemChange.subscribe((e) => {
    const item = e.itemStack;
    const player = e.player;
    if (!item || !player) return;
    if (item.typeId == "mm:pondering_book") {
        const setLoreTo = undefined
        if (setLoreTo == undefined) {
            var slot = e.slot
            const inventory = player.getComponent("minecraft:inventory");
            if (inventory === undefined || inventory.container === undefined) {
                return;
            }
            var enchant = getEnchant(item)
            if (enchant !== undefined) {
                const lookup = customData.find(lookup => lookup.enchantName === enchant);
                var level = 1
                if (lookup) level += Math.round(Math.random() * (lookup.maxLevel - 1))
                item.setLore(
                    [{ rawtext: [{ text: "§e§n§c§h§r§d" }, { translate: "orb_ponderer." + enchant }, { text: " " }, { translate: `enchantment.level.${level}` }, { text: "§r" }] }
                    ])
                item.setDynamicProperty("mm:ponder_enchant_" + enchant, level)
                inventory.container.setItem(slot, item);
            }
        }
    }
})


function getEnchant(item) {
    const lore = item.getLore()
    var success = false;
    if (lore.length == 0) return undefined
    for (const text of lore) {
        if (text.includes("PONDERING_BOOK_")) {
            success = true
            var enchant = text.replace("PONDERING_BOOK_", "")
        }
    }
    if (success == false) return undefined;

    return enchant
}