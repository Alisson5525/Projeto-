import {
    world,
    system,
    ItemStack,
    EnchantmentType
} from "@minecraft/server";

import {
    ActionFormData,
    ModalFormData
} from "@minecraft/server-ui";

import { customData, enchantData } from "customEnchantments/main.js"
import { applyCustomEnchant } from "./enchantFunctions.js"


function canApply(enchantmentInfo, item) {
    const custom = enchantmentInfo[2]
    const enchantable = item.getComponent("enchantable")
    if(custom) {
        const enchantId = enchantmentInfo[0].replace("mm:ponder_enchant_","")
        const dataLookup = customData.find(lookup => lookup.enchantName === enchantId);
        if(!dataLookup) {
            console.warn("no data for custom " + enchantId)
            return false
        }
        const hadEnchant = item.getDynamicProperty(enchantmentInfo[0])
        var hadLevel = hadEnchant ? hadEnchant : 0
        if(hadLevel >= enchantmentInfo[1]) return false

        for(const enchant of enchantable.getEnchantments()) {
            if(dataLookup.incompatibleWith && dataLookup.incompatibleWith.includes(enchant.type.id)) return false;
        }
        for(const propertyId of item.getDynamicPropertyIds()) {
            if(dataLookup.incompatibleWith && dataLookup.incompatibleWith.includes(propertyId.replace("mm:ponder_enchant_",""))) return false;
        }
        var pass = false
        if(dataLookup.appliesToSlots) {
            for(const slot of enchantable.slots) if(dataLookup.appliesToSlots.includes(slot)) {
                pass = true
            }
        } else if(dataLookup.appliesToItems) {
            if(dataLookup.appliesToItems.includes(item.typeId) == false) return false;
            pass = true
        }
        if(dataLookup.appliesToItems && pass == false) {
            if(dataLookup.appliesToItems.includes(item.typeId) == false) return false
            pass = true
        }
        if(!pass) return false
    } else {
        const enchantId = enchantmentInfo[0]
        const dataLookup = enchantData.find(lookup => lookup.enchantName === enchantId);
        if(!dataLookup) {
            console.warn("no data for " + enchantId)
            return false
        }
        const hadEnchant = enchantable.getEnchantment(enchantId)
        var hadLevel = hadEnchant ? hadEnchant.level : 0
        if(hadLevel >= enchantmentInfo[1]) return false

        for(const enchant of enchantable.getEnchantments()) {
            if(dataLookup.incompatibleWith && dataLookup.incompatibleWith.includes(enchant.type.id)) return false;
        }
        for(const propertyId of item.getDynamicPropertyIds()) {
            console.warn(propertyId)
            if(dataLookup.incompatibleWith && dataLookup.incompatibleWith.includes(propertyId.replace("mm:ponder_enchant_",""))) return false;
        }
        var pass = false
        if(dataLookup.appliesToSlots) {
            for(const slot of enchantable.slots) if(dataLookup.appliesToSlots.includes(slot)) {
                pass = true
            }
        } else if(dataLookup.appliesToItems) {
            if(dataLookup.appliesToItems.includes(item.typeId) == false) return false;
            pass = true
        }
        if(dataLookup.appliesToItems && pass == false) {
            if(dataLookup.appliesToItems.includes(item.typeId) == false) return false
            pass = true
        }
        if(!pass) return false
    }
    return true
}


system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:pondering_tome", {
        onUse(e) {
            const item = e.itemStack;
            const player = e.source;
            if (!item) return;
            const enchantable = item.getComponent("enchantable")
            if (!enchantable) return;
            var list = []
            for (const enchant of enchantable.getEnchantments()) list.push([enchant.type.id, enchant.level, false])
            for (const property of item.getDynamicPropertyIds()) if (property.includes("mm:ponder_enchant_")) list.push([property, item.getDynamicProperty(property), true])
            if (list.length == 0) {
                player.sendMessage({ translate: "pondering_tome.empty" })
                player.dimension.playSound("close.bamboo_wood_trapdoor", player.location, { volume: 1, pitch: 0.5 })
                return;
            }
            const itemList = []
            const itemListLang = []
            const inventory = player.getComponent("inventory")
            const container = inventory.container;
            for (let i = 0; i < container.size; i++) {
                const slotItem = container.getItem(i)
                if (!slotItem) continue;
                if (!slotItem.getComponent("enchantable")) continue;
                if (slotItem.typeId == "minecraft:book" || slotItem.typeId == "minecraft:enchanted_book" || slotItem.typeId == "mm:pondering_book") continue;
                itemList.push([slotItem, i])
            }
            for (const entry of itemList) {
                if(entry[0].nameTag) {
                    itemListLang.push(entry[0].nameTag)
                } else {
                    itemListLang.push(entry[0].localizationKey)
                }
            }

            if (itemList.length == 0) {
                player.sendMessage({ translate: "pondering_tome.no_valid_items" })
                player.dimension.playSound("close.bamboo_wood_trapdoor", player.location, { volume: 1, pitch: 0.5 })
                return;
            }

            const form = new ModalFormData()
            form.title("Pondering Book")
            form.label("Apply the following Enchantments:")
            for (const entry of list) {
                if (entry[2] == false) {
                    form.label({ rawtext: [{ text: "§9" }, { translate: `orb_ponderer.${entry[0]}` }, { text: " " }, { translate: `enchantment.level.${entry[1]}` }] })
                } else {
                    form.label({ rawtext: [{ text: "§d" }, { translate: `orb_ponderer.${entry[0].replace("mm:ponder_enchant_", "")}` }, { text: " " }, { translate: `enchantment.level.${entry[1]}` }] })
                }
            }
            form.divider()
            form.dropdown("Select Item", itemListLang)
            form.divider()
            form.label("Any enchantments not applicable to this item will be converted into §aExperience Orbs")
            form.submitButton("Enchant")
            form.show(player).then(r => {
                if (r.canceled) {
                    player.dimension.playSound("close.bamboo_wood_trapdoor", player.location, { volume: 1, pitch: 0.5 })
                    return;
                };
                const equippable = player.getComponent("equippable")
                if (!equippable) {
                    player.dimension.playSound("close.bamboo_wood_trapdoor", player.location, { volume: 1, pitch: 0.5 })
                    player.sendMessage({ translate: "pondering_tome.not_held" })
                    return;
                };
                const held = equippable.getEquipment("Mainhand")
                if (!held || held.typeId !== item.typeId) {
                    player.dimension.playSound("close.bamboo_wood_trapdoor", player.location, { volume: 1, pitch: 0.5 })
                    player.sendMessage({ translate: "pondering_tome.not_held" })
                    return;
                };
                const dropDownValue = r.formValues[r.formValues.length-3]
                const itemData = itemList[dropDownValue]
                const foundItem = player.getComponent("inventory").container.getItem(itemData[1])
                if(!foundItem || foundItem.typeId !== itemData[0].typeId) {
                    player.dimension.playSound("close.bamboo_wood_trapdoor", player.location, { volume: 1, pitch: 0.5 })
                    player.sendMessage({ translate: "pondering_tome.not_held" })
                    return;
                }
                const applicable = []
                const nonApplicable = []
                for(const enchant of list) {
                    const isApplicable = canApply(enchant, itemData[0])
                    if(isApplicable) applicable.push(enchant)
                    if(!isApplicable) nonApplicable.push(enchant)
                }
                var removeItem = true
                if(applicable.length == 0) {
                    player.dimension.playSound("close.bamboo_wood_trapdoor", player.location, { volume: 1, pitch: 0.5 })
                    player.sendMessage({ translate: "pondering_tome.no_valid_enchantments" })
                    return;
                } else {
                    const newItem = itemData[0]
                    const newEnchantable = newItem.getComponent("enchantable")
                    for(const applyEnchant of applicable) {
                        if(applyEnchant[2] == true) {
                            applyCustomEnchant(newItem, applyEnchant[0].replace("mm:ponder_enchant_",""), applyEnchant[1])
                        } else {
                            newEnchantable.addEnchantment({level: applyEnchant[1], type: new EnchantmentType(applyEnchant[0])})
                        }
                    }
                    player.getComponent("inventory").container.setItem(itemData[1], newItem)
                    var exp = nonApplicable.length > 0 ? 1 : 0
                    if(Math.random() > 0.5) exp += 1
                    if(exp > 0) {
                        for(const enchant of nonApplicable) {
                            var add = 5 + Math.ceil(Math.random() * enchant[1] * 20)
                            exp += add
                        }
                        const XPoRB = new ItemStack("mm:experience_orb", 1)
                        XPoRB.setLore([{ rawtext: [{ text: "§e§x§p§r§5" + `${exp}` + " " }, { translate: "desc.exp_orb" }] }])
                        player.getComponent("equippable").setEquipment("Mainhand", XPoRB)
                        player.playSound("random.levelup")
                        player.playSound("random.glass")
                        removeItem = false
                    }
                }
                if(removeItem) {
                    player.getComponent("equippable").setEquipment("Mainhand", undefined)
                        player.playSound("random.levelup", {pitch: 0.8})
                }
                player.playSound("block.enchanting_table.use", {pitch: 0.7})
            })

        }
    })
})