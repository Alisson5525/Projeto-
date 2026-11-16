import {
    world,
    system,
    ItemStack
} from "@minecraft/server";
import { updateLore, getCost, getElement, getElementColour, getElementIcon, getLore, spellList } from "./main.js";

import { sendNotification } from "main.js"
import { convertStaff, staffDesigns } from "./spellCrafter.js"

const addorremove = [
    "give",
    "take"
]

const staffTrims = [
    "default"
]

for (let design of staffDesigns) staffTrims.push(design)


system.beforeEvents.startup.subscribe(event => {
    const registry = event.customCommandRegistry;

    const Spells = { name: "mm:spell", type: "Enum" };
    registry.registerEnum("mm:spell", spellList)
    const colours = ["default", "red", "orange", "yellow", "green", "lime", "cyan", "blue", "light_blue", "purple", "magenta", "pink", "white", "gray", "light_gray", "black", "brown"]
    const Colours = { name: "mm:colour", type: "Enum" };
    registry.registerEnum("mm:colour", colours)
    const Level = { name: "mm:level", type: "Integer" };
    const spellbook = {
        name: "mm:spellbook",
        description: "Creates a spell book.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [Colours, Level, Spells],
        optionalParameters: [Spells, Spells]
    }
    registry.registerCommand(spellbook,
        (source, colour, level, spell1, spell2, spell3) => {
            const sourceEntity = source.sourceEntity;
            if (!colours.includes(colour)) {
                sourceEntity.sendMessage("Invalid colour for spellbook")
                return;
            }
            var itemId = ""
            if (colour == undefined || colour == "default") {
                itemId = "mm:spell_book"
            } else {
                itemId = "mm:" + colour + "_spell_book"
            }
            var levelOverride = 1
            if (level == undefined) {
                levelOverride = 1
            } else {
                levelOverride = level
            }
            if (levelOverride < 1) levelOverride = 1
            if (levelOverride > 3) levelOverride = 3
            levelOverride = Math.floor(levelOverride)
            var book = new ItemStack(itemId, 1)
            sourceEntity.sendMessage("Granted " + itemId)

            system.run(() => {
                if (spell1 !== undefined) {
                    book.setDynamicProperty("mm:spell_1", spell1)
                }
                if (spell2 !== undefined) {
                    book.setDynamicProperty("mm:spell_2", spell2)
                }
                if (spell3 !== undefined) {
                    book.setDynamicProperty("mm:spell_3", spell3)
                }
                book.setDynamicProperty("mm:level_1", levelOverride)
                book.setDynamicProperty("mm:level_2", levelOverride)
                book.setDynamicProperty("mm:level_3", levelOverride)
                book.setDynamicProperty("mm:xp_1", 0)
                book.setDynamicProperty("mm:xp_2", 0)
                book.setDynamicProperty("mm:xp_3", 0)
                updateLore(book)
                var held = sourceEntity.getComponent("equippable").getEquipment("Mainhand")
                if (!held) {
                    sourceEntity.getComponent("equippable").setEquipment("Mainhand", book)
                } else {

                    sourceEntity.dimension.spawnItem(book, sourceEntity.location)
                }
            })
        }
    );
    const spellscroll = {
        name: "mm:spellscroll",
        description: "Creates a spell scroll.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [Spells]
    }
    registry.registerCommand(spellscroll,
        (source, spell1) => {
            const sourceEntity = source.sourceEntity;
            var book = new ItemStack("mm:scroll", 1)

            system.run(() => {
                if (spell1 !== undefined) {
                    book.setDynamicProperty("mm:spell", spell1)
                }
                book.setLore([("§8§o" + getCost(spell1, undefined, undefined) + " Mana§r"), getElementIcon(getElement(spell1)) + " " + getElementColour(getElement(spell1)) + getLore(spell1)])

                var held = sourceEntity.getComponent("equippable").getEquipment("Mainhand")
                if (!held) {
                    sourceEntity.getComponent("equippable").setEquipment("Mainhand", book)
                } else {

                    sourceEntity.dimension.spawnItem(book, sourceEntity.location)
                }
            })
        }
    );
    const Designs = { name: "mm:design", type: "Enum" };
    registry.registerEnum("mm:design", staffTrims)
    const setstaff = {
        name: "mm:setstaff",
        description: "Hold an empty staff, then apply a spell to it.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [Spells],
        optionalParameters: [Designs]
    }
    registry.registerCommand(setstaff,
        (source, spell, design) => {
            const sourceEntity = source.sourceEntity;
            var held = sourceEntity.getComponent("equippable").getEquipment("Mainhand")
            if (held && !held.hasTag("mm:staff")) return;
            if (!held) held = new ItemStack("mm:staff", 1)
            system.run(() => {
                if (design && design !== "default") {
                    sourceEntity.getComponent("equippable").setEquipment("Mainhand", convertStaff(held, spell, design))

                } else {
                    sourceEntity.getComponent("equippable").setEquipment("Mainhand", convertStaff(held, spell))
                }
            })
        }
    );
    const testallscrolls = {
        name: "mm:testallscrolls",
        description: "Gives all spell scrolls.",
        cheatsRequired: true,
        permissionLevel: 1
    }
    registry.registerCommand(testallscrolls,
        (source) => {
            const sourceEntity = source.sourceEntity;

            system.run(() => {
                for (const spell of spellList) {
                    if (spell == "all") continue;
                    var scroll = new ItemStack("mm:scroll", 1)
                    scroll.setDynamicProperty("mm:spell", spell)
                    scroll.setLore([("§8§o" + getCost(spell, undefined, undefined) + " Mana§r"), getElementIcon(getElement(spell)) + " " + getElementColour(getElement(spell)) + getLore(spell)])
                    sourceEntity.dimension.spawnItem(scroll, sourceEntity.location)
                }
            })
        }
    );

    var craftableCommandList = []
    for (const spell of spellList) {
        craftableCommandList.push(spell)
    }
    craftableCommandList.push("all")
    const Add = { name: "mm:choice", type: "Enum" };
    registry.registerEnum("mm:choice", addorremove)

    const Recipe = { name: "mm:recipe", type: "Enum" };
    registry.registerEnum("mm:recipe", craftableCommandList)
    const Target = { name: "victim", type: "PlayerSelector" };
    const Toast = { name: "alert", type: "Boolean" };
    const spellrecipe = {
        name: "mm:spellrecipe",
        description: "Add or Remove spell recipes.",
        cheatsRequired: true,
        permissionLevel: 1,
        mandatoryParameters: [Add, Recipe],
        optionalParameters: [Target, Toast]
    }
    registry.registerCommand(spellrecipe,
        (source, add, recipe, target, toast) => {
            const sourceEntity = source.sourceEntity;
            if (!target) target = [sourceEntity];
            if (add !== "give" && add !== "take") add = "give"
            var recipesToDo = []
            if (!toast) toast = false
            if (recipe == "all") {
                recipesToDo = spellList
            } else {
                recipesToDo = [recipe]
            }
            system.run(() => {
                for (const player of target) {
                    for (const recipeChange of recipesToDo) {
                        if (recipeChange == "all") continue;
                        if (add == "give" && !player.hasTag(recipeChange + "_recipe_unlocked")) {
                            player.addTag(recipeChange + "_recipe_unlocked")
                            if (toast == true) {
                                sendNotification(player, `§dNew Recipe\n§r${getLore((recipeChange))}`, "textures/ui/form/spell/spell_" + recipeChange.replace("mm:", "").replace(" ",""), getElement(recipeChange))
                            }
                        }
                        if (add == "take" && player.hasTag(recipeChange + "_recipe_unlocked")) player.removeTag(recipeChange + "_recipe_unlocked")
                    }
                }
            })
        }
    );
});