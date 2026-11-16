import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

import {
    ActionFormData,
    ModalFormData
} from "@minecraft/server-ui";

import { getElement, getElementColour, getElementIcon, getCost, getLore, spellList } from "./main.js"
import { sendNotification } from "main.js"

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:mystery_scroll", {
        onUse(e) {
            const source = e.source;
            var item = e.itemStack
            source.playSound("block.cartography_table.use", { pitch: 1.2 })
            if (item.typeId !== "mm:mystery_scroll") {
                const equippable = source.getComponent("minecraft:equippable")
                equippable.setEquipment("Mainhand", updateSpellScroll(item))
            }
        },
        onCompleteUse(e, p) {
            var item = e.itemStack
            if (item.typeId !== "mm:mystery_scroll") item = updateSpellScroll(item)
            var spellOptions = []
            for (const property of item.getDynamicPropertyIds()) {
                if (item.getDynamicProperty(property) == true) spellOptions.push(property)
            }
            if (spellOptions.length == 0) {
                for (const spell of spellList) spellOptions.push(spell)
            }
            const source = e.source;
            const equippable = source.getComponent("minecraft:equippable")
            let newScroll = new ItemStack("mm:scroll", 1)
            if (spellOptions.length >= 1) {
                let rand = Math.floor(Math.random() * spellOptions.length);
                let spell = spellOptions[rand];
                newScroll.setLore([("§8§o" + getCost(spell, undefined, undefined) + " Mana§r"), getElementIcon(getElement(spell)) + " " + getElementColour(getElement(spell)) + getLore(spell)])
                newScroll.setDynamicProperty("mm:spell", spell)

                if (!source.hasTag(spell + "_recipe_unlocked")) {
                    source.addTag(spell + "_recipe_unlocked")
                    sendNotification(source, `§dNew Recipe\n§r${getLore((spell))}`, "textures/ui/form/spell/spell_" + spell.replace("mm:", "").replace(" ",""), getElement(spell))
                }
            }

            equippable.setEquipment("Mainhand", newScroll)
            source.dimension.spawnParticle("minecraft:witchspell_emitter", source.location)
            source.playSound("block.enchanting_table.use", { pitch: 0.5 })
            source.startItemCooldown("spell", 20);
        }
    });

    event.itemComponentRegistry.registerCustomComponent("mm:creative_scroll", {
        onUse(e) {
            const source = e.source;
            source.playSound("block.cartography_table.use", { pitch: 1.2 })
        },
        onCompleteUse(e, p) {
            const source = e.source;
            const equippable = source.getComponent("minecraft:equippable")
            let newScroll = new ItemStack("mm:scroll", 1)


            let scrollMenu = new ActionFormData();
            scrollMenu.title("mm:spell_crafter_grid_menu")
            scrollMenu.body(`Select a Spell`)
            var buttonArray = []
            for (const scroll of spellList) {
                //if (scroll == "all") continue;
                if (buttonArray.includes(scroll)) continue;
                const spellName = getLore(scroll)
                buttonArray.push(scroll)
                scrollMenu.button(spellName, "textures/ui/form/spell/spell_" + spellName.toLowerCase().replace(" ",""))
            }

            scrollMenu.show(source).then(r => {
                if (r.canceled) {
                    return;
                } else {
                    const selectedSpell = buttonArray[r.selection]
                    newScroll.setLore([("§8§o" + getCost(selectedSpell, undefined, undefined) + " Mana§r"), getElementIcon(getElement(selectedSpell)) + " " + getElementColour(getElement(selectedSpell)) + getLore(selectedSpell)])
                    newScroll.setDynamicProperty("mm:spell", selectedSpell)
                    equippable.setEquipment("Mainhand", newScroll)
                    source.dimension.spawnParticle("minecraft:witchspell_emitter", source.location)
                    source.playSound("block.enchanting_table.use", { pitch: 0.5 })
                    source.startItemCooldown("spell", 20);
                    if (!source.hasTag(selectedSpell + "_recipe_unlocked")) {
                        source.addTag(selectedSpell + "_recipe_unlocked")
                        sendNotification(source, `§dNew Recipe\n§r${getLore((selectedSpell))}`, "textures/ui/form/spell/spell_" + selectedSpell.replace("mm:", "").replace(" ",""), getElement(selectedSpell))
                    }
                }
            }).catch(e => {
                console.error(e, e.stack);
            });
        }
    })
})



//update legacy spellscrolls
function updateSpellScroll(item) {
    const scrollComp = item.getComponent("mm:mystery_scroll")
    if (!scrollComp) return undefined
    const params = scrollComp.customComponentParameters.params
    if (!params) return undefined
    const options = params.options
    if (!options) return undefined
    if (options.length == 0) return undefined

    const newItem = new ItemStack("mm:mystery_scroll", 1)
    for (const option of options) newItem.setDynamicProperty(option, true)
    for (const property of item.getDynamicPropertyIds()) newItem.setDynamicProperty(property, item.getDynamicProperty(property))
    newItem.lockMode = item.lockMode
    if (item.nameTag) newItem.nameTag = item.nameTag
    newItem.setLore(item.getLore())
    return newItem
}

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    const block = e.block;
    const inventory = block.getComponent("inventory")
    if (!inventory) return;
    const container = inventory.container;
    for (let i = 0; i < container.size; i++) {
        let slotItem = container.getItem(i)
        if (slotItem == undefined) continue;
        if (!slotItem.getComponent("mm:mystery_scroll") && slotItem.typeId !== "mm:mystery_scroll") continue;
        const newItem = updateSpellScroll(slotItem)
        if (newItem !== undefined) container.getSlot(i).setItem(newItem)
    }
})
world.afterEvents.playerInventoryItemChange.subscribe((e) => {
    const item = e.itemStack;
    const player = e.player;
    if (!item || !player) return;
    if (item.getComponent("mm:mystery_scroll") && item.typeId !== "mm:mystery_scroll") {
        const newItem = updateSpellScroll(item)
        if (newItem !== undefined) {
            var slot = e.slot
            const inventory = player.getComponent("minecraft:inventory");
            if (inventory === undefined || inventory.container === undefined) {
                return;
            }
            inventory.container.setItem(slot, newItem);
        }
    }
})