import {
    world,
    system
} from "@minecraft/server";


export const spellList = [
    "mm:dash",
    "mm:launch",
    "mm:retrieval",
    "mm:supersonic",
    "mm:hurricane",
    "mm:cloudsurf",
    "mm:burst",
    "mm:cauterise",
    "mm:hellfire",
    "mm:overheat",
    "mm:guardian",
    "mm:cluster",
    "mm:bolt",
    "mm:overclock",
    "mm:spark",
    "mm:thunderbolt",
    "mm:chilling",
    "mm:glaciate",
    "mm:icicle",
    "mm:snowflake",
    "mm:snowball",
    "mm:quake",
    "mm:roots",
    "mm:terraform",
    "mm:toxic",
    "mm:meteor",
    "mm:entangle",
    "mm:purify",
    "mm:shadow",
    "mm:siphoning",
    "mm:swap",
    "mm:teleport",
    "mm:imprison"
];
// spell database

export const spellData = [
    //
    //MANA SPELLS
    //
    {
        id: "mm:swap",
        lore: "Swap",
        element: "mana",
        durabilityCost: 2,
        manaCost: 7,
        cooldownAdd: 60
    },
    {
        id: "mm:teleport",
        lore: "Teleport",
        element: "mana",
        durabilityCost: 2,
        manaCost: 8,
        cooldownAdd: 20
    },
    {
        id: "mm:siphoning",
        lore: "Siphoning",
        element: "mana",
        durabilityCost: 1,
        manaCost: 7,
        cooldownAdd: 40
    },
    {
        id: "mm:shadow",
        lore: "Shadow",
        element: "mana",
        durabilityCost: 2,
        manaCost: 6,
        cooldownAdd: 5
    },
    {
        id: "mm:purify",
        lore: "Purify",
        element: "mana",
        durabilityCost: 1,
        manaCost: 6,
        cooldownAdd: 20
    },
    {
        id: "mm:imprison",
        lore: "Imprison",
        element: "mana",
        durabilityCost: 4,
        manaCost: 9,
        cooldownAdd: 40
    },
    //
    //ICE SPELLS
    //
    {
        id: "mm:glaciate",
        lore: "Glaciate",
        element: "ice",
        durabilityCost: 2,
        manaCost: 7,
        cooldownAdd: 30
    },
    {
        id: "mm:chilling",
        lore: "Chilling",
        element: "ice",
        durabilityCost: 2,
        manaCost: 4,
        cooldownAdd: 30
    },
    {
        id: "mm:icicle",
        lore: "Icicle",
        element: "ice",
        durabilityCost: 3,
        manaCost: 5,
        cooldownAdd: 30
    },
    {
        id: "mm:snowflake",
        lore: "Snowflake",
        element: "ice",
        durabilityCost: 1,
        manaCost: 4,
        cooldownAdd: 60
    },
    {
        id: "mm:snowball",
        lore: "Snowball",
        element: "ice",
        durabilityCost: 4,
        manaCost: 7,
        cooldownAdd: 10
    },
    //
    //AIR SPELLS
    //
    {
        id: "mm:launch",
        lore: "Launch",
        element: "air",
        durabilityCost: 1,
        manaCost: 5,
        cooldownAdd: 20
    },
    {
        id: "mm:dash",
        lore: "Dash",
        element: "air",
        durabilityCost: 1,
        manaCost: 2,
        cooldownAdd: 0
    },
    {
        id: "mm:supersonic",
        lore: "Supersonic",
        element: "air",
        durabilityCost: 2,
        manaCost: 4,
        cooldownAdd: 0
    },
    {
        id: "mm:retrieval",
        lore: "Retrieval",
        element: "air",
        durabilityCost: 1,
        manaCost: 4,
        cooldownAdd: 0
    },
    {
        id: "mm:hurricane",
        lore: "Hurricane",
        element: "air",
        durabilityCost: 4,
        manaCost: 10,
        cooldownAdd: 40
    },
    {
        id: "mm:cloudsurf",
        lore: "Cloud Surf",
        element: "air",
        durabilityCost: 4,
        manaCost: 7,
        cooldownAdd: 40
    },
    //
    //FIRE SPELLS
    //
    {
        id: "mm:cauterise",
        lore: "Cauterise",
        element: "fire",
        durabilityCost: 1,
        manaCost: 6,
        cooldownAdd: 20
    },
    {
        id: "mm:overheat",
        lore: "Overheat",
        element: "fire",
        durabilityCost: 2,
        manaCost: 5,
        cooldownAdd: 60
    },
    {
        id: "mm:burst",
        lore: "Burst",
        element: "fire",
        durabilityCost: 3,
        manaCost: 7,
        cooldownAdd: 40
    },
    {
        id: "mm:hellfire",
        lore: "Hellfire",
        element: "fire",
        durabilityCost: 3,
        manaCost: 9,
        cooldownAdd: 5
    },
    {
        id: "mm:guardian",
        lore: "Guardian",
        element: "fire",
        durabilityCost: 2,
        manaCost: 7,
        cooldownAdd: 15
    },
    {
        id: "mm:cluster",
        lore: "Cluster",
        element: "fire",
        durabilityCost: 3,
        manaCost: 8,
        cooldownAdd: 30
    },
    //
    //EARTH SPELLS
    //
    {
        id: "mm:terraform",
        lore: "Terraform",
        element: "earth",
        durabilityCost: 3,
        manaCost: 5,
        cooldownAdd: 0
    },
    {
        id: "mm:roots",
        lore: "Roots",
        element: "earth",
        durabilityCost: 1,
        manaCost: 5,
        cooldownAdd: 60
    },
    {
        id: "mm:quake",
        lore: "Quake",
        element: "earth",
        durabilityCost: 4,
        manaCost: 9,
        cooldownAdd: 30
    },
    {
        id: "mm:toxic",
        lore: "Toxic",
        element: "earth",
        durabilityCost: 2,
        manaCost: 6,
        cooldownAdd: 0
    },
    {
        id: "mm:meteor",
        lore: "Meteor",
        element: "earth",
        durabilityCost: 3,
        manaCost: 6,
        cooldownAdd: 40
    },
    {
        id: "mm:entangle",
        lore: "Entangle",
        element: "earth",
        durabilityCost: 1,
        manaCost: 5,
        cooldownAdd: 10
    },
    //
    //ELECTRIC SPELLS
    //
    {
        id: "mm:bolt",
        lore: "Bolt",
        element: "electric",
        durabilityCost: 1,
        manaCost: 3,
        cooldownAdd: 0
    },
    {
        id: "mm:overclock",
        lore: "Overclock",
        element: "electric",
        durabilityCost: 1,
        manaCost: 5,
        cooldownAdd: 40
    },
    {
        id: "mm:spark",
        lore: "Spark",
        element: "electric",
        durabilityCost: 2,
        manaCost: 5,
        cooldownAdd: 0
    },
    {
        id: "mm:thunderbolt",
        lore: "Thunderbolt",
        element: "electric",
        durabilityCost: 2,
        manaCost: 7,
        cooldownAdd: 40
    }
]


// common functions

//logs a debug message
export function debugMessage(string) {
    for (const player of world.getPlayers({ tags: ["mm:debug"] })) {
        player.sendMessage(string)
    }
}

//returns manacost of a spell
export function getMana(id) {
    const spell = spellData.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        return spell.manaCost
    }
}
//returns element of a spell
export function getElement(id) {
    const spell = spellData.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        return spell.element
    }
}
//returns lore of a spell
export function getLore(id) {
    const spell = spellData.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return "Unknown Spell"
    } else {
        return spell.lore
    }
}
//returns element colour code
export function getElementColour(element) {
    if (element == "fire") return "§v"
    if (element == "ice") return "§s"
    if (element == "air") return "§h"
    if (element == "earth") return "§q"
    if (element == "electric") return "§e"
    if (element == "mana") return "§5"
    return "§d"
}
export function getElementIcon(element) {
    if (element == "fire") return ""
    if (element == "ice") return ""
    if (element == "air") return ""
    if (element == "earth") return ""
    if (element == "electric") return ""
    if (element == "mana") return ""
    return ""
}
//returns level text
export function levelText(value) {
    if (value == 1) return "I"
    if (value == 2) return "II"
    if (value == 3) return "III"
    if (value == 4) return "IV"
    if (value == 5) return "V"
    return "?"
}

//returns cooldown duration
export function preventDupe(id) {
    const spell = spellData.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return false
    } else {
        return spell.cannotDupe
    }
}

//returns cooldown duration
export function getCooldown(id) {
    const spell = spellData.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        return spell.cooldownAdd
    }
}

//returns durability consumption
export function getDurability(id) {
    const spell = spellData.find(lookup => lookup.id === id);
    if (spell == undefined) {
        return 0
    } else {
        return spell.durabilityCost
    }
}


//clamps value
export function clampValue(value, min, max) {
    var newVal = value
    if (newVal > max) newVal = max
    if (newVal < min) newVal = min
    return newVal
}

//gets mana
export function getMaxMana(player) {
    return player.getDynamicProperty("mm:max_mana")
}
export function getCurrentMana(player) {
    return player.getDynamicProperty("mm:mana")
}

//vector bullshit pt1
export function getDirection(from, to) {
    const distance = Math.hypot(from.x - to.x, from.y - to.y, from.z - to.z);
    if (distance == 0) return { x: 0, y: 0, z: 0 };

    return {
        x: (to.x - from.x) / distance,
        y: (to.y - from.y) / distance,
        z: (to.z - from.z) / distance
    };
}
//vector bullshit pt2
export function makeVector(vector, strength) {
    var vx = vector.x
    var vz = vector.z

    return { x: vx * strength, z: vz * strength }
}


//returns protection enchant info
export function protEnchantLvl(player, array) {
    const slots = [
        "Head",
        "Chest",
        "Legs",
        "Feet"
    ]
    const armour = player.getComponent("minecraft:equippable")
    var protLvl = 0
    for (const slotId of slots) {
        const slot = armour.getEquipment(slotId)
        if (slot) {
            const ench = slot.getComponent("minecraft:enchantable")
            if (ench) {
                for (const enchantment of ench.getEnchantments()) {
                    if (array.includes(enchantment.type.id)) {
                        protLvl += enchantment.level
                    }
                }
            }
        }
    }
    return protLvl
}

//returns the spell of a combined spellbook or spellscroll
export function getCost(spell1, spell2, spell3) {
    var manaCost = 0
    var divBy = 0
    if (spell1 !== undefined && (spell2 !== undefined || spell3 !== undefined)) {
        manaCost += getMana(spell1) + 4
        divBy += 1
    } else if (spell1 !== undefined && (spell2 == undefined && spell3 == undefined)) {
        manaCost = getMana(spell1)
    }
    if (spell2 !== undefined) {
        manaCost += getMana(spell2) + 5
        if (spell3 !== undefined) {
            manaCost += getMana(spell3) + 7
        } else {
            manaCost += 7
        }
        divBy += 2
    }
    if (divBy > 1) {
        manaCost = manaCost / divBy
    }
    manaCost = Math.round(manaCost * 100) / 100
    return manaCost
}

//updates a spellbooks lore
export function updateLore(book) {
    var loreArray = []
    const spell1 = book.getDynamicProperty("mm:spell_1")
    const spell2 = book.getDynamicProperty("mm:spell_2")
    const spell3 = book.getDynamicProperty("mm:spell_3")

    loreArray.push("§8§o" + getCost(spell1, spell2, spell3) + " Mana§r")
    if (spell1 !== undefined) {
        var level1 = 0
        level1 += book.getDynamicProperty("mm:level_1")
        loreArray.push(getElementIcon(getElement(spell1)) + " " + getElementColour(getElement(spell1)) + getLore(spell1) + " " + levelText(level1))

    }
    if (spell2 !== undefined) {
        var level2 = 0
        level2 += book.getDynamicProperty("mm:level_2")
        loreArray.push(getElementIcon(getElement(spell2)) + " " + getElementColour(getElement(spell2)) + getLore(spell2) + " " + levelText(level2))

    }
    if (spell3 !== undefined) {
        var level3 = 0
        level3 += book.getDynamicProperty("mm:level_3")
        loreArray.push(getElementIcon(getElement(spell3)) + " " + getElementColour(getElement(spell3)) + getLore(spell3) + " " + levelText(level3))

    }
    book.setLore(loreArray)
}

//applies elemental damage
export function applyElementDamage(damage, target, attacker, cause, element, returnNumber) {
    const electrifiedL = world.scoreboard.getObjective("mm:electrified_lvl")
    if (electrifiedL !== undefined && electrifiedL.hasParticipant(attacker.scoreboardIdentity)) {
        if (element !== "electric") {
            element = "electric"
            damage = damage * 1.1
        }
    }
    var equippable = attacker.getComponent("minecraft:equippable")
    var attackerHead = equippable.getEquipment("Head")
    const offHand = equippable.getEquipment("Offhand")
    var mult = 1

    if (target.typeId == "minecraft:sulfur_cube" && target.getProperty("minecraft:sulfur_cube_archetype") !== "none") {
        cause = "entityAttack"
    }

    if (attacker.hasTag("novelty:mm:altered_amulet")) {
        let hp = attacker.getComponent("health")
        if (hp.currentValue >= 3) {
            mult = mult * 1.3
        }
    } else if (offHand) {
        if (offHand.hasTag("mm:altered_amulet")) {
            let hp = attacker.getComponent("health")
            if (hp.currentValue >= 3) {
                mult = mult * 1.3
            }
        }
    }
    if (attacker.hasTag("novelty:mm:resonance_amulet")) {
        let resonance = attacker.getDynamicProperty("mm:resonance")
        if (resonance > 0) for (let i = 0; i < resonance; i++) mult = mult * 1.04
    } else if (offHand) {
        if (offHand.hasTag("mm:resonance_amulet")) {
            let resonance = attacker.getDynamicProperty("mm:resonance")
            if (resonance > 0) for (let i = 0; i < resonance; i++) mult = mult * 1.04
        }
    }
    if (attacker.hasTag(`mm:boost_${element}_magic`)) {
        mult = mult * 1.5
    } else if (attackerHead) {
        if (attackerHead.hasTag(`mm:boost_${element}_magic`)) mult = mult * 1.5
    }

    if (target.hasTag(`mm:resist_${element}_magic`)) {
        mult = mult * 0.5
    } else if (target.typeId == "minecraft:player") {
        var targetHead = target.getComponent("minecraft:equippable").getEquipment("Head")
        if (targetHead) {
            if (targetHead.hasTag(`mm:resist_${element}_magic`)) mult = mult * 0.5
        }
    }
    //world.sendMessage(`${mult}`)
    var finalDamage = damage * mult
    finalDamage = Math.round(finalDamage * 100) / 100
    if (target !== attacker) {
        if (target.typeId == "minecraft:player" && world.gameRules.pvp == false) return;
    }
    if (returnNumber !== true) {
        const damageDealt = target.applyDamage(finalDamage, { cause: cause, damagingEntity: attacker })
        if (damageDealt) {
            if (attacker !== target && target.typeId == "minecraft:player") attacker.playSound("item.spellbook.hit", { volume: 0.15, pitch: 0.9 })
            debugMessage(`§7${attacker.nameTag} dealt ${getElementColour(element)}${finalDamage} ${element} §7damage.`)
        }
        return damageDealt
    } else {
        const damageDealt = finalDamage
        if (damageDealt) {
            if (attacker !== target && target.typeId == "minecraft:player") attacker.playSound("item.spellbook.hit", { volume: 0.15, pitch: 0.9 })
            debugMessage(`§7${attacker.nameTag} dealt ${getElementColour(element)}${finalDamage} ${element} §7damage.`)
        }
        return damageDealt
    }
}

export function validTarget(target) {
    if (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] })) return true;
    return false
}
// file imports !!

import "./customcommands.js";

//items
import "./hiddenScrolls.js";
import "./ancientTexts.js";

//spells
import "./mana.js";
import "./magicPassive.js";
import "./magicTriggered.js";

//blocks
import "./spellCrafter.js";
import "./spellManager.js";
import "./spellCrafterScrolls.js";