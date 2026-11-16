import {
    world,
    system
} from "@minecraft/server";

import { customData, customList } from "customEnchantments/main.js"

function checkForIncompatibilies(item, enchantId) {
    const enchantable = item.getComponent("enchantable")
    const lookup = customData.find(lookup => lookup.enchantName === enchantId);
    if (lookup) {
        if (lookup.incompatibleWith !== undefined) {
            for (const incompat of lookup.incompatibleWith) {
                try { if (enchantable.hasEnchantment("minecraft:" + incompat)) return false }
                catch {
                    if (item.getDynamicProperty("mm:ponder_enchant_" + incompat) !== undefined) return false
                }
            }
        }
        return true
    }
    return false
}
function checkLevel(item, enchantId, level) {
    const lookup = customData.find(lookup => lookup.enchantName === enchantId);
    if (lookup) {
        if (lookup.maxLevel < level) return false
        if (item.getDynamicProperty("mm:ponder_enchant_" + enchantId) !== undefined) {
            if (item.getDynamicProperty("mm:ponder_enchant_" + enchantId) >= level) return false
        }
        return true
    }
    return false
}

function getMax(enchant) {
    const lookup = customData.find(lookup => lookup.enchantName === enchant);
    if (lookup) {
        return lookup.maxLevel
    }
    return 1
}


function applyCustomEnchant(item, enchant, level) {
    var baseLoreArray = []
    for (const lore of item.getLore()) {
        if (!lore.includes(`orb_ponderer.${enchant}`)) baseLoreArray.push(lore)
    }
    var loreArray = []
    const maxLvl = getMax(enchant)
    if(maxLvl == 1) {
        loreArray.push({ rawtext: [{ text: "§e§n§c§h§r§d" }, { translate: "orb_ponderer." + enchant }, { text: " " }, { text: "§r" }] })
    } else {
        loreArray.push({ rawtext: [{ text: "§e§n§c§h§r§d" }, { translate: "orb_ponderer." + enchant }, { text: " " }, { translate: `enchantment.level.${level}` }, { text: "§r" }] })
    }
    for (const lore of baseLoreArray) loreArray.push(lore)
    if (checkForIncompatibilies(item, enchant) == false) return [undefined, "Incompatible Enchantment Present"]
    if (checkLevel(item, enchant, level) == false) return [undefined, "Level is not valid!"]

    item.setLore(loreArray)
    item.setDynamicProperty("mm:ponder_enchant_" + enchant, level)
    return [item, ""]
}

system.afterEvents.scriptEventReceive.subscribe((e) => {
    if (e.id !== "mm:apply_custom_enchant") return;
    const source = e.sourceEntity;
    const message = e.message.split("|")
    const held = source.getComponent("equippable").getEquipment("Mainhand")
    var newItem = applyCustomEnchant(held, message[0], parseInt(message[1]))
    if (newItem[0] !== undefined) {
        source.getComponent("equippable").setEquipment("Mainhand", newItem[0])
        world.sendMessage("Applied " + message[0] + " at lvl " + `${parseInt(message[1])} `)
    } else {
        console.warn(newItem[1])
    }

})


system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;
    const Enchant = { name: "mm:enchantmentName", type: "Enum" };
    registry.registerEnum("mm:enchantmentName", customList)
    const PlayerSelector = { name: "player", type: "PlayerSelector" };
    const Level = { name: "level", type: "Integer" };
    const enchantcustom = {
        name: "mm:enchantcustom",
        description: "Add a custom enchant to the held item.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [PlayerSelector, Enchant],
        optionalParameters: [Level]
    }
    registry.registerCommand(enchantcustom,
        (source, victim, enchantId, level) => {
            if (level == undefined) level = 1
            if (level < 1) level = 1
            system.run(() => {
                for (const player of victim) {
                    const held = player.getComponent("equippable").getEquipment("Mainhand")
                    if (!held) {
                        if (world.gameRules.sendCommandFeedback) source.sourceEntity?.sendMessage?.("No item to enchant")
                    }
                    var newItem = applyCustomEnchant(held, enchantId, level)
                    if (newItem[0] !== undefined) {
                        player.getComponent("equippable").setEquipment("Mainhand", newItem[0])
                        if (world.gameRules.sendCommandFeedback) source.sourceEntity?.sendMessage?.("Applied " + enchantId + " at lvl " + `${level} `)
                    } else {
                        source.sourceEntity?.sendMessage?.(newItem[1])
                    }
                }
            })
        }
    );
});

export { applyCustomEnchant }