import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

import {
    ActionFormData,
    ModalFormData
} from "@minecraft/server-ui";


import { updateLore, getElementColour, getElementIcon, getElement, getLore, levelText, getCost, preventDupe } from "./main.js";

export const staffDesigns = [
    "magistrate",
    "ancient",
    "arcane",
    "chilling",
    "alter",
    "spine",
    "curse",
    "ware",
    "shifting",
    "walker",
    "howl",
    "commander",
    "twilight",
    "twisted"
]

function getColour(trim) {
    if (trim == "magistrate") return "§4"
    if (trim == "ancient") return "§q"
    if (trim == "arcane") return "§u"
    if (trim == "chilling") return "§b"
    if (trim == "alter") return "§c"
    if (trim == "spine") return "§s"
    if (trim == "curse") return "§6"
    if (trim == "shifting") return "§v"
    if (trim == "walker") return "§e"
    if (trim == "howl") return "§9"
    if (trim == "commander") return "§5"
    if (trim == "twilight") return "§w"
    if (trim == "twisted") return "§d"
    return ""
}

export function convertStaff(item, spell, newTrim) {
    var addToEnd = ""
    for (let trim of staffDesigns) if (item.typeId.includes(trim)) addToEnd = "_" + trim
    if (newTrim) addToEnd = "_" + newTrim
    var newId = "mm:staff" + addToEnd
    if (spell) {
        newId = "mm:staff_" + getElement(spell) + addToEnd
    }
    var newItem = new ItemStack(newId, 1)
    for (const propertyId of item.getDynamicPropertyIds()) newItem.setDynamicProperty(propertyId, item.getDynamicProperty(propertyId))

    if (spell !== undefined) {
        newItem.setDynamicProperty("mm:spell", spell)
    } else {
        newItem.setDynamicProperty("mm:spell", null)
    }
    const enchantableOld = item.getComponent("enchantable")
    const enchantableNew = newItem.getComponent("enchantable")
    for (const enchantment of enchantableOld.getEnchantments()) {
        if (enchantableNew.canAddEnchantment(enchantment)) enchantableNew.addEnchantment(enchantment)
    }
    newItem.getComponent("durability").damage = item.getComponent("durability").damage
    if (item.nameTag) newItem.nameTag = item.nameTag

    newItem.lockMode = item.lockMode
    newItem.keepOnDeath = item.keepOnDeath
    const loreArray = [

    ]
    if (spell) loreArray.push(("§8§o" + getCost(spell, undefined, undefined) + " Mana§r"), getElementIcon(getElement(spell)) + " " + getElementColour(getElement(spell)) + getLore(spell))
    if (addToEnd.length > 1) {
        const trim = addToEnd.replace("_", "")
        loreArray.push({ rawtext: [{ text: "\n§r§7" }, { translate: "staff_design.design" }, { text: "\n  " + getColour(trim) }, { translate: "item.mm:" + trim + "_staff_design_smithing_template" }] })
    }
    newItem.setLore(loreArray)
    return newItem

}

function getAllScrolls(player) {
    var array = []
    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    for (var i = 0; i < inv.inventorySize; i++) {
        let slot = container.getSlot(i);
        if (slot !== undefined && slot.isValid && slot.hasItem()) {
            if (slot.typeId == "mm:scroll") {
                const item = slot.getItem()
                if (item.getDynamicProperty("mm:spell")) {
                    array.push([item, item.getDynamicProperty("mm:spell"), i])
                }
            }
        }
    }
    return array
}

function hasSpellScroll(player, spellId) {
    var hasSpell = false
    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    for (var i = 0; i < inv.inventorySize; i++) {
        let slot = container.getSlot(i);
        if (slot !== undefined && slot.isValid && slot.hasItem()) {
            if (slot.typeId == "mm:scroll") {
                const item = slot.getItem()
                if (item.getDynamicProperty("mm:spell") == spellId) {
                    hasSpell = true
                }
            }
        }
    }
    return hasSpell
}

function clearScroll(player, spellId) {
    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    for (var i = 0; i < inv.inventorySize; i++) {
        let slot = container.getSlot(i);
        if (slot !== undefined && slot.isValid && slot.hasItem()) {
            if (slot.typeId == "mm:scroll") {
                const item = slot.getItem()
                if (item.getDynamicProperty("mm:spell") == spellId) {
                    slot.setItem(undefined)
                    return;
                }
            }
        }
    }
}

function getSpellCount(item) {
    var count = 0
    if (item.getDynamicProperty("mm:spell_1")) count += 1
    if (item.getDynamicProperty("mm:spell_2")) count += 1
    if (item.getDynamicProperty("mm:spell_3")) count += 1
    return count
}

function getSpellData(item) {
    const returnArray = []
    for (let i = 0; i < getSpellCount(item); i++) {
        const spellId = item.getDynamicProperty(`mm:spell_${i + 1}`);
        const spellLvl = item.getDynamicProperty(`mm:level_${i + 1}`);
        const spellXp = item.getDynamicProperty(`mm:xp_${i + 1}`);
        let element = [[spellId], [spellLvl], [spellXp], [i + 1]]
        returnArray.push(element)
    }
    return returnArray;
}


function scrollRepair(player, item, block, damage, max) {
    let settingForm = new ModalFormData();
    settingForm.title("Restore Scroll Energy")
    settingForm.label("Select how much energy to restore:\n")
    settingForm.slider("Restore Amount", 1, damage, { defaultValue: damage })

    settingForm.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            const repair = r.formValues[1]
            item.getComponent("minecraft:durability").damage -= repair
            player.getComponent("minecraft:equippable").setEquipment("Mainhand", item)
            reducePower(block)
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function wipeSpellData(item, player) {
    item.setDynamicProperty("mm:spell_1", null)
    item.setDynamicProperty("mm:spell_2", null)
    item.setDynamicProperty("mm:spell_3", null)
    item.setDynamicProperty("mm:level_1", null)
    item.setDynamicProperty("mm:level_2", null)
    item.setDynamicProperty("mm:level_3", null)
    item.setDynamicProperty("mm:xp_1", null)
    item.setDynamicProperty("mm:xp_2", null)
    item.setDynamicProperty("mm:xp_3", null)
    item.setLore()
    player.getComponent("minecraft:equippable").setEquipment("Mainhand", item)
}

function wipeSpells(player, item, block) {
    let wipeSpells = new ActionFormData();
    wipeSpells.title("mm:spell_crafter_stack_menu")
    const spellData = getSpellData(item)
    var shardCount = 0
    if (item.getComponent("mm:staff")) {
        shardCount = 1
        wipeSpells.body(`Remove all spells from this Staff?`)
    } else {
        for (let i = 0; i < spellData.length; i++) {
            shardCount += parseInt(spellData[i][1])
        }
        wipeSpells.body(`Remove all spells from this Book?`)
    }
    wipeSpells.button("Wipe Spells", "textures/ui/form/wipe_spells")
    wipeSpells.show(player).then(r => {
        if (r.canceled) {
            if (item.getComponent("mm:staff")) {
                openStaff(player, item, block)
            } else {
                openSpellbook(player, item, block)
            }
            return;
        } else {

            if (item.getComponent("mm:staff")) {
                const equippable = player.getComponent("equippable")
                const mainHand = equippable.getEquipment("Mainhand")
                if (mainHand.typeId !== item.typeId) return;
                const emptyStaff = convertStaff(item, undefined)
                equippable.setEquipment("Mainhand", emptyStaff)
                if (player.getItemCooldown("spell") > 0) return;
                player.startItemCooldown("spell", 25)
                player.playAnimation("animation.player.inspect_staff")
            } else {
                wipeSpellData(item, player)

            }
            const shards = new ItemStack("mm:sparkling_shard", shardCount)
            reducePower(block)
            system.runTimeout(() => {

                block.dimension.spawnItem(shards, block.above().location)
            })
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}



function spellXp(player, item, block) {
    let spellXp = new ActionFormData();
    spellXp.title("Spell Experience")
    const spellData = getSpellData(item)
    var levelUpAvaliable = false
    var lvlSlots = []
    var gapCount = 3 - getSpellCount(item)
    spellXp.body(`Spells will gain experience as you use them, once a spell has 100/100 experience, you can use this menu to level it up and increase its power!`)
    for (const spell of spellData) {
        const spellName = getLore(`${spell[0]}`)
        const colour = getElement(`${spell[0]}`)
        const xp = spell[2]
        if (spell[1] == 3) {
            spellXp.label(`${getElementColour(colour)}${spellName} ${levelText(spell[1])}§f - §d§lMAX LEVEL`)
        } else if (spell[2] == 100) {
            spellXp.label(`${getElementColour(colour)}${spellName} ${levelText(spell[1])}§f - §d100/100 [!]`)
            levelUpAvaliable = true
            lvlSlots.push(spell[3])
        } else (
            spellXp.label(`${getElementColour(colour)}${spellName} ${levelText(spell[1])}§f - §f${xp}/100`)
        )
    }
    for (let i = 0; i < gapCount; i++) {
        spellXp.label("")
    }
    if (levelUpAvaliable == true) {
        spellXp.button("Level Up Spells")
    }
    spellXp.button("Exit")

    spellXp.show(player).then(r => {
        if (r.canceled) {
            openSpellbook(player, item, block)
            return;
        } else {
            if (r.selection == 0 && levelUpAvaliable == true) {
                for (let i = 0; i < lvlSlots.length; i++) {
                    const slot = lvlSlots[i]
                    const currentLvl = item.getDynamicProperty(`mm:level_${slot}`)
                    item.setDynamicProperty(`mm:level_${slot}`, currentLvl + 1)
                    item.setDynamicProperty(`mm:xp_${slot}`, 0)
                }
                updateLore(item)
                player.getComponent("minecraft:equippable").setEquipment("Mainhand", item)
                reducePower(block)
            } else {
                openSpellbook(player, item, block)
            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function confirmApplySpell(player, item, block, spell) {
    const emptySlot = getSpellCount(item) + 1;
    let applySpell = new ActionFormData();
    applySpell.title("mm:spell_crafter_stack_menu")
    applySpell.body(`Apply this scroll?`)
    applySpell.button("Yes", "textures/ui/form/spell_crafter_yes")
    applySpell.button("No", "textures/ui/form/spell_crafter_no")


    applySpell.show(player).then(r => {
        if (r.canceled) {
            if (item.getComponent("mm:staff")) {
                openStaff(player, item, block)
            } else {
                openSpellbook(player, item, block)
            }
            return;
        } else {
            if (r.selection == 0) {
                if (hasSpellScroll(player, spell)) {
                    if (item.getComponent("mm:staff")) {
                        if (player.getItemCooldown("spell") > 0) return;
                        player.startItemCooldown("spell", 25)
                        player.playAnimation("animation.player.inspect_staff")
                        const newItem = convertStaff(item, spell)
                        if (item.typeId !== "mm:staff" && item.getComponent("mm:staff")) {
                            const shards = new ItemStack("mm:sparkling_shard", 1)
                            system.runTimeout(() => {

                                block.dimension.spawnItem(shards, block.above().location)
                            })
                        }
                        player.getComponent("minecraft:equippable").setEquipment("Mainhand", newItem)
                    } else {
                        item.setDynamicProperty(`mm:spell_${emptySlot}`, spell)
                        item.setDynamicProperty(`mm:level_${emptySlot}`, 1)
                        item.setDynamicProperty(`mm:xp_${emptySlot}`, 0)
                        updateLore(item)
                        player.getComponent("minecraft:equippable").setEquipment("Mainhand", item)
                    }
                    clearScroll(player, spell)
                    reducePower(block)
                } else {
                    player.sendMessage({ translate: "spellcrafter.scroll_dropped" })
                    block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                    return;
                }
            } else {
                selectScroll(player, item, block)
            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function selectScroll(player, item, block) {
    let scrollMenu = new ActionFormData();
    scrollMenu.title("mm:spell_crafter_grid_menu")
    scrollMenu.body(`Choose a Scroll to add.`)
    const scrollData = getAllScrolls(player)
    var buttonArray = []
    var lockedArray = []
    for (const scroll of scrollData) {
        var shouldLock = false
        if (preventDupe(scroll[1]) == true) {
            const spell = item.getDynamicProperty("mm:spell")
            const spell1 = item.getDynamicProperty("mm:spell_1")
            const spell2 = item.getDynamicProperty("mm:spell_2")
            const spell3 = item.getDynamicProperty("mm:spell_3")
            if (scroll[1] == spell) shouldLock = true;
            if (scroll[1] == spell1) shouldLock = true;
            if (scroll[1] == spell2) shouldLock = true;
            if (scroll[1] == spell3) shouldLock = true;
        }
        if (buttonArray.includes(scroll[1])) continue;
        const spellName = getLore(`${scroll[1]}`)
        buttonArray.push(scroll[1])
        if (shouldLock) {
            lockedArray.push(scroll[1])
            scrollMenu.button("§c" + spellName, "textures/ui/form/spell/spell_" + spellName.toLowerCase().replace(" ",""))

        } else {
            scrollMenu.button(spellName, "textures/ui/form/spell/spell_" + spellName.toLowerCase().replace(" ",""))
        }
    }

    scrollMenu.show(player).then(r => {
        if (r.canceled) {
            if (item.getComponent("mm:staff")) {
                openStaff(player, item, block)
            } else {
                openSpellbook(player, item, block)
            }
            return;
        } else {
            const selectedSpell = buttonArray[r.selection]
            if (hasSpellScroll(player, selectedSpell)) {
                if (lockedArray.includes(selectedSpell)) {
                    player.sendMessage({ translate: "spellcrafter.cannot_duplicate" })
                    block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                    return;
                }
                confirmApplySpell(player, item, block, selectedSpell)
            } else {
                player.sendMessage({ translate: "spellcrafter.scroll_dropped" })
                block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                return;
            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}


function openSpellbook(player, item, block) {
    const buttonIndex = []
    const spellCount = getSpellCount(item)
    let spellBookForm = new ActionFormData();
    spellBookForm.title("mm:spell_crafter_stack_menu")
    spellBookForm.body("Customise your Spell Book here")
    if (spellCount < 3) {
        buttonIndex.push("AddSpell")
        spellBookForm.button("Add Spell", "textures/ui/form/add_spell")
    }
    if (spellCount > 0) {
        buttonIndex.push("LevelSpells")
        spellBookForm.button("Spell Exp", "textures/ui/form/spell_exp")

    }
    if (spellCount > 0) {
        buttonIndex.push("WipeSpells")
        spellBookForm.button("Wipe Spells", "textures/ui/form/wipe_spells")
    }

    spellBookForm.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            switch (buttonIndex[r.selection]) {
                case "AddSpell":
                    const scrollCount = getAllScrolls(player).length
                    if (scrollCount < 1) {
                        player.sendMessage({ translate: "spellcrafter.no_scrolls" })
                        block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                    } else {
                        selectScroll(player, item, block)
                    }
                    return;
                case "LevelSpells":
                    spellXp(player, item, block);
                    return;
                case "WipeSpells":
                    wipeSpells(player, item, block)
                    return;
                default:

            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });

}

function openStaff(player, item, block) {
    const buttonIndex = []
    var spellCount = 0
    if (item.getDynamicProperty("mm:spell")) spellCount += 1
    let spellBookForm = new ActionFormData();
    spellBookForm.title("mm:spell_crafter_stack_menu")
    spellBookForm.body("Customise your Spell Staff here")
    if (spellCount < 1) {
        buttonIndex.push("AddSpell")
        spellBookForm.button("Add Spell", "textures/ui/form/add_spell_staff")
    }
    if (spellCount > 0) {
        buttonIndex.push("SwapSpell")
        spellBookForm.button("Swap Spell", "textures/ui/form/swap_spell_staff")
    }
    if (spellCount > 0) {
        buttonIndex.push("WipeSpells")
        spellBookForm.button("Remove Spell", "textures/ui/form/wipe_spells")
    }

    spellBookForm.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            const scrollCount = getAllScrolls(player).length
            switch (buttonIndex[r.selection]) {
                case "AddSpell":
                    if (scrollCount < 1) {
                        player.sendMessage({ translate: "spellcrafter.no_scrolls" })
                        block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                    } else {
                        selectScroll(player, item, block)
                    }
                    return;
                case "SwapSpell":
                    if (scrollCount < 1) {
                        player.sendMessage({ translate: "spellcrafter.no_scrolls" })
                        block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                    } else {
                        selectScroll(player, item, block)
                    }
                    return;
                case "WipeSpells":
                    wipeSpells(player, item, block)
                    return;
                default:

            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });

}


function openPage(player, item, block) {
    if (item.typeId == "mm:scroll") {
        const durability = item.getComponent("minecraft:durability")
        const damage = durability.damage;
        const max = durability.maxDurability
        if (damage <= 0) {
            player.sendMessage({ translate: "spellcrafter.scroll_full_durability" })
            block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
            return;
        } else {
            scrollRepair(player, item, block, damage, max)
        }
    } else if (item.getComponent("mm:staff")) {
        openStaff(player, item, block)
    } else {
        openSpellbook(player, item, block)
    }
}

function reducePower(block) {
    const perm = block.permutation
    const power = perm.getState("mm:power")
    if (power > 1) {
        const newPerm = perm.withState("mm:power", power - 1);
        block.setPermutation(newPerm)
    } else {
        const newPerm = perm.withState("mm:power", power - 1);
        block.setPermutation(newPerm)
    }
    var sound = 4 - (power - 1)
    sound = "block.spellcrafter.use_" + sound
    block.dimension.playSound(sound, block.location)
}


system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:spellcrafter", {
        onPlayerInteract(e) {
            const player = e.player;
            const block = e.block;
            const perm = e.block.permutation;
            const power = perm.getState("mm:power")
            const item = player.getComponent("minecraft:equippable").getEquipmentSlot("Mainhand").getItem();
            if (power == 0) {
                if (block.typeId == "mm:spellcrafter") {
                    player.sendMessage({ translate: "spellcrafter.out_of_power" })
                    block.dimension.playSound("block.spellcrafter.fail", block.location, { volume: 1, pitch: 1 })
                    return;
                } else {
                    if (!item) {
                        player.sendMessage({ translate: "reforged_spellcrafter.out_of_power" })
                        block.dimension.playSound("block.spellcrafter.fail", block.location, { volume: 1, pitch: 1 })
                        return;
                    }
                    if (!item.hasTag("mm:can_recharge_reforged_spellcrafter")) {
                        player.sendMessage({ translate: "reforged_spellcrafter.out_of_power" })
                        block.dimension.playSound("block.spellcrafter.fail", block.location, { volume: 1, pitch: 1 })
                        return;
                    }
                    if (item.hasTag("mm:can_recharge_reforged_spellcrafter")) {
                        const perm = block.permutation
                        const newPerm = perm.withState("mm:power", 1);
                        block.setPermutation(newPerm)
                        e.dimension.spawnParticle("mm:mage_spellcrafter_fuel", block.center())
                        block.dimension.playSound("block.spellcrafter.fail", block.location, { volume: 1, pitch: 2 })
                        if (player.getGameMode() !== "Creative") {
                            if (item.amount > 1) {
                                item.amount -= 1
                                player.getComponent("minecraft:equippable").setEquipment("Mainhand", item)
                            } else {
                                player.getComponent("minecraft:equippable").setEquipment("Mainhand", undefined)
                            }
                            player.dimension.playSound("random.glass", player.location, { pitch: 1 })
                            player.dimension.spawnParticle("mm:sparkling_crystal_destroyed", player.location)
                        }
                        return;
                    }
                }
            }

            if (!item) {
                player.sendMessage({ translate: "spellcrafter.no_held_item" })
                block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                return;
            }
            if (!item.hasTag("mm:spell_caster") && !item.hasTag("mm:staff")) {
                player.sendMessage({ translate: "spellcrafter.held_item_invalid" })
                block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                return;

            }



            openPage(player, item, block)

        },
        onTick(e) {
            const perm = e.block.permutation;
            const power = perm.getState("mm:power")
            if (power > 0) {
                const block = e.block.center()
                const loc = { x: block.x, y: block.y + 0.6, z: block.z }
                e.dimension.spawnParticle("mm:spellcrafter", loc)
            }
        }
    })
})