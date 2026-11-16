import {
    system,
    ItemStack
} from "@minecraft/server";

import {
    ActionFormData
} from "@minecraft/server-ui";

import {
    convertStaff
} from "./spellCrafter.js"

const spellInfo = [
    //
    //MANA SPELLS
    //
    {
        id: "mm:swap",
        element: "Mana",
        type: "Movement",
        bio: "Allows you to swap places with a target you are looking at. Does nothing if you miss.",
        level: "increase the range you can target with.",
        power: 4
    },
    {
        id: "mm:teleport",
        element: "Mana",
        type: "Movement",
        bio: "Teleports you onto a block you are looking at. Does nothing if you miss.",
        level: "increase the distance you can teleport to.",
        power: 3
    },
    {
        id: "mm:siphoning",
        element: "Mana",
        type: "Status",
        bio: "Applies a temporary siphoning effect. Siphoning makes any damage you deal to others be recovered in the form of mana.",
        level: "increase how much mana you gain from attacking.",
        power: 3
    },
    {
        id: "mm:shadow",
        element: "Mana",
        type: "Attack",
        bio: "Lets out a slash of dark energy. Damaging others will blind them and heal you slightly.",
        level: "increase how much damage it deals.",
        power: 3
    },
    {
        id: "mm:purify",
        element: "Mana",
        type: "Status",
        bio: "Creates a magic ring of light that cures potion effects and regenerates your mana.",
        level: "increase its duration.",
        power: 3
    },
    {
        id: "mm:imprison",
        element: "Mana",
        type: "Status",
        bio: "Launches a mysterious imprisonment that slows mobs and drains Mana from them.",
        level: "increase its duration.",
        power: 4
    },
    //
    //Fire SPELLS
    //
    {
        id: "mm:burst",
        element: "Fire",
        type: "Attack",
        bio: "Creates a dangerous burst of fire around you. Fails in water.",
        level: "increase the power and range of the blast.",
        power: 4
    },
    {
        id: "mm:cauterise",
        element: "Fire",
        type: "Status",
        bio: "Burns you a bit, but applies strong regeneration afterwards",
        level: "decrease the burn damage taken.",
        power: 3
    },
    {
        id: "mm:overheat",
        element: "Fire",
        type: "Status",
        bio: "Ignites the air around you temporarily, burning those that attack you. Can also weaken the effects of Fire Resistance potions.",
        level: "increase the duration of the effect.",
        power: 4
    },
    {
        id: "mm:hellfire",
        element: "Fire",
        type: "Attack",
        bio: "Creates a projectile of demonic fire that gets stronger the more injured its user is.",
        level: "increase the strength of the projectile.",
        power: 5
    },
    {
        id: "mm:guardian",
        element: "Fire",
        type: "Attack",
        bio: "Summons a Guardian Spirit that attacks foes for you temporarily. Cannot summon more than 3 Spirits at one time.",
        level: "increase the Guardian's duration.",
        power: 3
    },
    {
        id: "mm:cluster",
        element: "Fire",
        type: "Attack",
        bio: "Creates a bouncing fireball that splits into multiple explosions.",
        level: "increase damage and explosion count",
        power: 4
    },
    //
    //ICE SPELLS
    //
    {
        id: "mm:icicle",
        element: "Ice",
        type: "Attack",
        bio: "Creates a magical shard of ice in the ground, slowing and freezing those nearby.",
        level: "increase the damage rate and slowing strength.",
        power: 2
    },
    {
        id: "mm:glaciate",
        element: "Ice",
        type: "Status",
        bio: "Encases you in sturdy ice that reduces damage taken, but makes fire a bit more dangerous.",
        level: "increase the duration of the effect.",
        power: 4
    },
    {
        id: "mm:chilling",
        element: "Ice",
        type: "Status",
        bio: "Uses the power of ice to add a powerful freezing effect to your next attacks.",
        level: "increase the duration of the effect.",
        power: 3
    },
    {
        id: "mm:snowflake",
        element: "Ice",
        type: "Movement",
        bio: "Magical snowflakes allow you to float through the air untill you let go of the spell. Drains mana with use.",
        level: "float faster and use less mana.",
        power: 2
    },
    {
        id: "mm:snowball",
        element: "Ice",
        type: "Attack",
        bio: "Fires a dangerous snowball at enemies that also slows them down.",
        level: "increase damage dealt.",
        power: 3
    },
    //
    //ELECTRIC SPELLS
    //
    {
        id: "mm:bolt",
        element: "Electric",
        type: "Movement",
        bio: "Bolts you forward and downwards with high speed. Boosts movement speed after use.",
        level: "boost speed greater.",
        power: 2
    },
    {
        id: "mm:overclock",
        element: "Electric",
        type: "Status",
        bio: "Zaps you with electricity, dealing damage and boosting your speed and strength temporarily.",
        level: "increase the duration of the effect.",
        power: 3
    },
    {
        id: "mm:spark",
        element: "Electric",
        type: "Attack",
        bio: "Fires small sparks of electricity that will zap anything nearby that they hit.",
        level: "increase the damage and range of the projectile.",
        power: 3
    },
    {
        id: "mm:thunderbolt",
        element: "Electric",
        type: "Attack",
        bio: "Strikes a nearby mob with a powerful thunderbolt that will chain between nearby foes.",
        level: "increase the damage of the strike.",
        power: 4
    },
    //
    //Air SPELLS
    //
    {
        id: "mm:dash",
        element: "Air",
        type: "Movement",
        bio: "Launches you through the air in the direction you look.",
        level: "raise launch distance.",
        power: 2
    },
    {
        id: "mm:launch",
        element: "Air",
        type: "Movement",
        bio: "Boosts you into the air and grants slow falling temporarily.",
        level: "raise launch height.",
        power: 2
    },
    {
        id: "mm:supersonic",
        element: "Air",
        type: "Attack",
        bio: "Does no damage, but emits high frequencies that weaken and stun nearby mobs.",
        level: "increase the power of the blast.",
        power: 3
    },
    {
        id: "mm:retrieval",
        element: "Air",
        type: "Attack",
        bio: "Looking at a mob will deal small damage and pull it towards you. Otherwise deals damage around you.",
        level: "increase pulling power.",
        power: 3
    },
    {
        id: "mm:hurricane",
        element: "Air",
        type: "Attack",
        bio: "Creates a devastating hurricane that pulls in and damages mobs.",
        level: "increase damage dealt.",
        power: 5
    },
    {
        id: "mm:cloudsurf",
        element: "Air",
        type: "Movement",
        bio: "Creates a floating bubble of Air that you can use to travel quickly.",
        level: "increase movement speed.",
        power: 3
    },
    //
    //EARTH SPELLS
    //
    {
        id: "mm:terraform",
        element: "Earth",
        type: "Movement",
        bio: "Creates a rocky platform mid-air you can stand on. Launches you up if used while grounded.",
        level: "make the platform larger.",
        power: 3
    },
    {
        id: "mm:roots",
        element: "Earth",
        type: "Status",
        bio: "Connects you to the earth to heal and slow you untill you let go of the spell. Drains mana with use.",
        level: "heal faster.",
        power: 4
    },
    {
        id: "mm:toxic",
        element: "Earth",
        type: "Attack",
        bio: "Creates a posionous mist that gets more dangerous the longer it persists.",
        level: "increase the duration of the poison.",
        power: 4
    },
    {
        id: "mm:quake",
        element: "Earth",
        type: "Attack",
        bio: "Creates a powerful earthquake beneath you, dealing huge damage to anything it hits. Cannot harm non-grounded foes.",
        level: "increase the power of the strikes.",
        power: 4
    },
    {
        id: "mm:meteor",
        element: "Earth",
        type: "Attack",
        bio: "Launches a Meteor from above to deal Earth-Element Damage. Not effective in cramped areas.",
        level: "increase the impact power.",
        power: 4
    },
    {
        id: "mm:entangle",
        element: "Earth",
        type: "Status",
        bio: "Vines hold down your feet to greatly reduce knockback taken.",
        level: "increase the effect duration.",
        power: 2
    }

]

const useableDyes = [
    "minecraft:white_dye",
    "minecraft:light_gray_dye",
    "minecraft:gray_dye",
    "minecraft:black_dye",
    "minecraft:brown_dye",
    "minecraft:red_dye",
    "minecraft:orange_dye",
    "minecraft:yellow_dye",
    "minecraft:lime_dye",
    "minecraft:green_dye",
    "minecraft:cyan_dye",
    "minecraft:light_blue_dye",
    "minecraft:blue_dye",
    "minecraft:purple_dye",
    "minecraft:magenta_dye",
    "minecraft:pink_dye"
]

function getElementText(id) {
    const spell = spellInfo.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        return spell.element
    }
}
function getSpellType(id) {
    const spell = spellInfo.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        return spell.type
    }
}
function makeBody(id) {
    const spell = spellInfo.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        var bodyText = spell.bio
        bodyText += "\n\nLevel up this spell to " + spell.level
        return bodyText
    }
}
function getPowerLvl(id) {
    const spell = spellInfo.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        var power = spell.power
        var missing = 5 - power
        var returnString = ""
        for (let i = 0; i < power; i++) {
            returnString += ""
        }

        for (let i = 0; i < missing; i++) {
            returnString += ""
        }
        return returnString
    }
}


import { updateLore, getCost, getElementColour, getElement, getLore, getElementIcon } from "./main.js";

function getSpellData(item) {
    const returnArray = []
    if (item.typeId == "mm:scroll" || item.getComponent("mm:staff")) {
        const spellId = item.getDynamicProperty(`mm:spell`);
        let element = [[spellId], undefined, undefined, undefined]
        returnArray.push(element)

    } else {
        for (let i = 0; i < getSpellCount(item); i++) {
            const spellId = item.getDynamicProperty(`mm:spell_${i + 1}`);
            const spellLvl = item.getDynamicProperty(`mm:level_${i + 1}`);
            const spellXp = item.getDynamicProperty(`mm:xp_${i + 1}`);
            let element = [[spellId], [spellLvl], [spellXp], [i + 1]]
            returnArray.push(element)
        }
    }
    return returnArray;
}

function getSpellCount(item) {
    var count = 0
    if (item.getDynamicProperty("mm:spell")) count += 1
    if (item.getDynamicProperty("mm:spell_1")) count += 1
    if (item.getDynamicProperty("mm:spell_2")) count += 1
    if (item.getDynamicProperty("mm:spell_3")) count += 1
    return count
}

function getAllPatterns(player, staffId) {
    var array = []
    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    for (var i = 0; i < inv.inventorySize; i++) {
        let slot = container.getSlot(i);
        if (slot !== undefined && slot.isValid && slot.hasItem()) {
            if (slot.hasTag("mm:staff_design_template")) {
                const item = slot.getItem()
                const element = item.typeId
                if (!array.includes(element) && !staffId.includes(element.replace("mm:", "").split("_")[0])) {
                    array.push(element)
                }
            }
        }
    }
    return array
}

function designStaffMenu(player, item, block) {
    const designs = getAllPatterns(player, item.typeId)
    if (designs.length == 0) {
        // a dye is only a requirement if the spellbook isnt dyed
        player.sendMessage({ translate: "spell_manager.no_templates" })
        block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
        return;
    }
    let dyeBook = new ActionFormData();
    dyeBook.title("mm:spell_manager_grid_menu")
    dyeBook.body("Use Design Templates to Customise your staff")
    var buttonArray = []
    for (const dye of designs) {
        if (!item.typeId.includes(dye) && !buttonArray.includes(dye)) {
            var pattern = dye.replace("mm:", "").split("_")[0]
            var texture = pattern
            if (texture == "alter") texture += "realm"
            dyeBook.button({ translate: "spell_manager." + pattern }, "textures/items/smithing_template/" + texture)
            buttonArray.push(dye)
        }
    }
    dyeBook.show(player).then(r => {
        if (r.canceled) {
            openStaffMenu(player, item, block)
            return;
        } else {
            trimHeldItem(player, item, block, buttonArray[r.selection])
            block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 1.5 })
            return;
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function trimHeldItem(player, item, block, trimId) {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable.getEquipment("Mainhand").typeId !== item.typeId) return;

    if (checkHasDye(player, trimId) == false) return;
    player.runCommand("clear @s " + trimId + " -1 1")
    const newStaff = convertStaff(item, item.getDynamicProperty("mm:spell"), trimId.replace("mm:", "").split("_")[0])
    equippable.setEquipment("Mainhand", newStaff)
    block.dimension.playSound("block.spell_manager.staff_design", block.center())
    if (player.getItemCooldown("spell") > 0) return;
    player.startItemCooldown("spell", 25)
    player.playAnimation("animation.player.inspect_staff")
    player.runCommand("scriptevent mm:trimmed_staff")
}

function getAllDyes(player) {
    var array = []
    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    for (var i = 0; i < inv.inventorySize; i++) {
        let slot = container.getSlot(i);
        if (slot !== undefined && slot.isValid && slot.hasItem()) {
            if (useableDyes.includes(slot.typeId)) {
                const item = slot.getItem()
                var colour = item.typeId.replace("minecraft:", "")
                colour = colour.replace("_dye", "")
                const element = [item.typeId, item.localizationKey, colour]
                if (!array.includes(element)) {
                    array.push(element)
                }
            }
        }
    }
    return array
}

function dyeSpellMenu(player, item, block) {
    const dyes = getAllDyes(player)
    if (dyes.length == 0 && item.typeId == "mm:spell_book") {
        // a dye is only a requirement if the spellbook isnt dyed
        player.sendMessage({ translate: "spell_manager.no_dyes" })
        block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
        return;
    }
    let dyeBook = new ActionFormData();
    dyeBook.title("mm:spell_manager_grid_menu")
    dyeBook.body("Use dyes to colour your Spell Book")
    var buttonArray = []
    if (item.typeId !== "mm:spell_book") {
        dyeBook.button({ translate: "spell_manager.remove_dye" }, "textures/items/magic_book")
        buttonArray.push("undyed")
    }
    for (const dye of dyes) {
        if (!item.typeId.includes(dye[2]) && !buttonArray.includes(dye[2])) {
            dyeBook.button({ translate: "spell_manager." + dye[0].replace("minecraft:", "") }, "textures/items/dyed/magic_book_" + dye[2])
            buttonArray.push(dye[2])
        }
    }
    dyeBook.show(player).then(r => {
        if (r.canceled) {
            openBookMenu(player, item, block)
            return;
        } else {
            dyeHeldItem(player, item, block, buttonArray[r.selection])
            block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 1.5 })
            return;
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function checkHasDye(player, itemId) {
    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    for (var i = 0; i < inv.inventorySize; i++) {
        let slot = container.getSlot(i);
        if (slot !== undefined && slot.isValid && slot.hasItem()) {
            if (slot.typeId == itemId) {
                return true
            }
        }
    }
    return false
}

function copyProperties(newBook, oldBook) {
    const fromProperties = oldBook.getDynamicPropertyIds()
    for (const id of fromProperties) {
        newBook.setDynamicProperty(id, oldBook.getDynamicProperty(id))
    }
    newBook.setLore(oldBook.getLore())
    if (oldBook.nameTag !== undefined) newBook.nameTag = oldBook.nameTag
    newBook.lockMode = oldBook.lockMode
    newBook.keepOnDeath = oldBook.keepOnDeath
}

function dyeHeldItem(player, item, block, colour) {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable.getEquipment("Mainhand").typeId !== item.typeId) return;
    var newItemId = "mm:spell_book"
    if (colour !== "undyed") {
        const dyeId = "minecraft:" + colour + "_dye"
        if (checkHasDye(player, dyeId) == false) return;
        newItemId = "mm:" + colour + "_spell_book"
        player.runCommand("clear @s " + dyeId + " -1 1")
    }
    const newBook = new ItemStack(newItemId, 1)
    copyProperties(newBook, item)
    equippable.setEquipment("Mainhand", newBook)
}


function researchResult(player, item, block, choice) {
    let research = new ActionFormData();
    choice = `${choice}`
    const elementText = getElementIcon(getElement(choice)) + " " + getElementColour(getElement(choice)) + getElementText(choice)
    research.title(getLore(choice))
    research.body(makeBody(choice))
    research.divider()
    research.label("Element: " + elementText)
    research.divider()
    research.label("Cost: " + getCost(choice))
    research.divider()
    research.label("Classification: " + getSpellType(choice))
    research.divider()
    research.label("Power Level: " + getPowerLvl(choice))
    research.divider()
    research.button("Exit")
    research.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            if (item.typeId == "mm:scroll") {
                return;
            } else if (item.getComponent("mm:staff")) {
                openStaffMenu(player, item, block)
            } else {
                researchSpell(player, item, block)
            }
            return;
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}
function researchSpell(player, item, block) {
    const spellInfo = getSpellData(item)
    let researchChoice = new ActionFormData();
    researchChoice.title("mm:spell_manager_stack_menu")
    researchChoice.body("Select one of your spells to learn what it does.")
    var buttonArray = []
    for (const spell of spellInfo) {
        if (buttonArray.includes(spell[0])) continue;
        const spellName = getLore(`${spell[0]}`)
        buttonArray.push(spell[0])
        researchChoice.button(spellName, "textures/ui/form/spell/spell_" + spellName.toLowerCase().replace(" ",""))
    }

    researchChoice.show(player).then(r => {
        if (r.canceled) {
            if (item.typeId == "mm:scroll") {
                return;
            } else if (item.getComponent("mm:staff")) {
                openStaffMenu(player, item, block)
            } else {
                openBookMenu(player, item, block)
            }
            return;
        } else {
            const choice = buttonArray[r.selection]
            researchResult(player, item, block, choice)
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function reorderSpells(player, item, block) {
    const spellInfo = getSpellData(item)
    let researchChoice = new ActionFormData();
    researchChoice.title("mm:spell_manager_stack_menu")
    researchChoice.body("Select two spells to swap their order.")
    var buttonArray = []
    for (const spell of spellInfo) {
        if (buttonArray.includes(spell[0])) continue;
        const spellName = getLore(`${spell[0]}`)
        buttonArray.push(spell[0])
        researchChoice.button(spellName, "textures/ui/form/spell/spell_" + spellName.toLowerCase().replace(" ",""))
    }

    researchChoice.show(player).then(r => {
        if (r.canceled) {

            openBookMenu(player, item, block)

            return;
        } else {
            const choice = [buttonArray[r.selection], r.selection]
            reorderSpells2(player, item, block, choice)
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function reorderSpells2(player, item, block, firstchoice) {
    const spellInfo = getSpellData(item)
    let researchChoice = new ActionFormData();
    researchChoice.title("mm:spell_manager_stack_menu")
    researchChoice.body("Select two spells to swap their order.")
    var buttonArray = []
    for (const spell of spellInfo) {
        if (buttonArray.includes(spell[0])) continue;
        const spellName = getLore(`${spell[0]}`)
        buttonArray.push(spell[0])
        researchChoice.button(spellName, "textures/ui/form/spell/spell_" + spellName.toLowerCase().replace(" ",""))
    }
    if (buttonArray.length == 0) {
        return;
    }

    researchChoice.show(player).then(r => {
        if (r.canceled) {

            openBookMenu(player, item, block)

            return;
        } else {
            const choice = [buttonArray[r.selection], r.selection]
            if (`${firstchoice[0]}` == `${choice[0]}`) {
                player.sendMessage({ translate: "spell_manager.same_spell" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;
            };
            swapSpellSlots(player, item, block, firstchoice, choice)
            block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 1.5 })
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function swapSpellSlots(player, item, block, choice1, choice2) {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable.getEquipment("Mainhand").typeId !== item.typeId) return;
    var primarySpell = item.getDynamicProperty(`mm:spell_${choice1[1] + 1}`)
    var primaryExp = item.getDynamicProperty(`mm:xp_${choice1[1] + 1}`)
    var primaryLvl = item.getDynamicProperty(`mm:level_${choice1[1] + 1}`)
    var secondarySpell = item.getDynamicProperty(`mm:spell_${choice2[1] + 1}`)
    var secondaryExp = item.getDynamicProperty(`mm:xp_${choice2[1] + 1}`)
    var secondaryLvl = item.getDynamicProperty(`mm:level_${choice2[1] + 1}`)

    item.setDynamicProperty(`mm:spell_${choice1[1] + 1}`, secondarySpell)
    item.setDynamicProperty(`mm:xp_${choice1[1] + 1}`, secondaryExp)
    item.setDynamicProperty(`mm:level_${choice1[1] + 1}`, secondaryLvl)
    item.setDynamicProperty(`mm:spell_${choice2[1] + 1}`, primarySpell)
    item.setDynamicProperty(`mm:xp_${choice2[1] + 1}`, primaryExp)
    item.setDynamicProperty(`mm:level_${choice2[1] + 1}`, primaryLvl)
    updateLore(item)
    equippable.setEquipment("Mainhand", item)
}

function openBookMenu(player, item, block) {
    const buttonIndex = []
    const spellCount = getSpellCount(item)
    let spellBookForm = new ActionFormData();
    spellBookForm.title("mm:spell_manager_stack_menu")
    spellBookForm.body("Manage your Spell Book here")
    if (spellCount >= 1) {
        buttonIndex.push("ResearchSpell")
        spellBookForm.button("Research", "textures/ui/form/research_spell")

    }
    if (spellCount >= 2) {
        buttonIndex.push("OrderSpell")
        spellBookForm.button("Re-Order", "textures/ui/form/order_spell")
    }
    if (spellCount >= 0) {
        buttonIndex.push("DyeBook")
        spellBookForm.button("Apply Dye", "textures/ui/form/dye_book")
    }

    spellBookForm.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            switch (buttonIndex[r.selection]) {
                case "ResearchSpell":
                    researchSpell(player, item, block)
                    return;
                case "OrderSpell":
                    reorderSpells(player, item, block);
                    return;
                case "DyeBook":
                    dyeSpellMenu(player, item, block)
                    return;
                default:

            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });

}

function openScrollMenu(player, item, block) {
    const buttonIndex = []
    const spellCount = getSpellCount(item)
    let scrollForm = new ActionFormData();
    scrollForm.title("mm:spell_manager_stack_menu")
    scrollForm.body("Manage your Scroll here")
    if (spellCount >= 1) {
        buttonIndex.push("ResearchSpell")
        scrollForm.button("Research", "textures/ui/form/research_spell")

    }

    scrollForm.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            switch (buttonIndex[r.selection]) {
                case "ResearchSpell":
                    researchSpell(player, item, block)
                    return;
                default:
            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });

}

function openStaffMenu(player, item, block) {
    const buttonIndex = []
    const spellCount = getSpellCount(item)
    let spellBookForm = new ActionFormData();
    spellBookForm.title("mm:spell_manager_stack_menu")
    spellBookForm.body("Manage your Staff here")
    if (spellCount >= 1) {
        buttonIndex.push("ResearchSpell")
        spellBookForm.button("Research", "textures/ui/form/research_spell")

    }
    if (spellCount >= 0) {
        buttonIndex.push("DesignStaff")
        spellBookForm.button("Design", "textures/ui/form/apply_design_pattern")
    }

    spellBookForm.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            switch (buttonIndex[r.selection]) {
                case "ResearchSpell":
                    researchSpell(player, item, block)
                    return;
                case "DesignStaff":
                    designStaffMenu(player, item, block)
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
        if (getSpellCount(item) <= 0) {
            player.sendMessage({ translate: "spell_manager.empty_scroll" })
            block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
            return;
        } else {
            openScrollMenu(player, item, block)
        }
    } else if (item.getComponent("mm:staff")) {
        openStaffMenu(player, item, block)
    } else {
        openBookMenu(player, item, block)
    }
}


system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:spell_manager", {
        onPlayerInteract(e) {
            const player = e.player;
            const block = e.block;

            const item = player.getComponent("minecraft:equippable").getEquipmentSlot("Mainhand").getItem();

            if (!item) {
                player.sendMessage({ translate: "spell_manager.no_held_item" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;
            }
            if (!item.hasTag("mm:spell_caster") && !item.getComponent("mm:staff")) {
                player.sendMessage({ translate: "spell_manager.held_item_invalid" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;

            }



            openPage(player, item, block)

        }
    })
})