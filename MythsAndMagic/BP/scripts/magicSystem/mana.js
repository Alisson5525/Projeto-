import {
    world,
    system
} from "@minecraft/server";
import { getCurrentMana, getMaxMana, getCost, getMana, getElement } from "./main.js";

const base_regenSpeed = 0.1
const regularMax = 20
const sparklingAmuletMax = 30


function displayMana(player) {
    if (player.getDynamicProperty("mm:altered")) {
        const equippable = player.getComponent("minecraft:equippable")
        const main = equippable.getEquipment("Mainhand")
        if (main && main.hasTag("mm:alterrealm_clock")) return;
        const off = equippable.getEquipment("Offhand")
        if (off && off.hasTag("mm:alterrealm_clock")) return;
    }
    const currentMana = Math.round(getCurrentMana(player) * 100) / 100
    var red = false
    if (player.hasTag("mm:red_mana_bar") || player.getDynamicProperty("mm:altered") == true) red = true

    const equippable = player.getComponent("minecraft:equippable")
    if (equippable !== undefined) {
        const held = equippable.getEquipment("Mainhand")
        if (held) {
            if (held.hasTag("mm:spell_caster")) {
                if (held.typeId == "mm:scroll" || held.getComponent("mm:staff")) {
                    const spell = held.getDynamicProperty("mm:spell")
                    if (spell !== undefined) {
                        var manaCost = getMana(spell)
                        const offHand = equippable.getEquipment("Offhand")
                        if (player.hasTag("novelty:mm:shivering_amulet")) {
                            manaCost = manaCost * 2 / 3
                        } else {
                            if (offHand) {
                                if (offHand.hasTag("mm:shivering_amulet")) manaCost = manaCost * 2 / 3
                            }
                        }
                        if (manaCost > currentMana) red = true
                    }
                } else {
                    var manaCost = 0
                    const spell1 = held.getDynamicProperty("mm:spell_1")
                    const spell2 = held.getDynamicProperty("mm:spell_2")
                    const spell3 = held.getDynamicProperty("mm:spell_3")
                    manaCost = getCost(spell1, spell2, spell3)
                    const offHand = equippable.getEquipment("Offhand")
                    if (player.hasTag("novelty:mm:shivering_amulet")) {
                        manaCost = manaCost * 2 / 3
                    } else {
                        if (offHand) {
                            if (offHand.hasTag("mm:shivering_amulet")) manaCost = manaCost * 2 / 3
                        }
                    }
                    if (manaCost > currentMana) red = true
                }
            }
        }
    }
    if (player.hasTag("mm:purple_mana_bar")) red = false
    if (red == true) {
        if(player.dimension.id == "mm:alterrealm" && Math.random() > 0.95) {
            player.onScreenDisplay.setActionBar(`§m§n§a§l§r §k§c§l${currentMana}§r `)
        } else {
            player.onScreenDisplay.setActionBar(`§m§n§a§l§r §c§l${currentMana} `)
        }
    } else {
        player.onScreenDisplay.setActionBar(`§m§n§a§r §d§l${currentMana} `)
    }
}

function setRegenSpeed(player) {
    let regen = base_regenSpeed
    const equippable = player.getComponent("minecraft:equippable")
    if (equippable !== undefined) {
        const head = equippable.getEquipment("Head")
        if (head !== undefined) {
            if (head.hasTag("mm:boosted_mana_regen")) regen += base_regenSpeed / 4
        }
        const chest = equippable.getEquipment("Chest")
        if (chest !== undefined) {
            if (chest.hasTag("mm:boosted_mana_regen")) regen += base_regenSpeed / 4
        }
        const legs = equippable.getEquipment("Legs")
        if (legs !== undefined) {
            if (legs.hasTag("mm:boosted_mana_regen")) regen += base_regenSpeed / 4
        }
        const feet = equippable.getEquipment("Feet")
        if (feet !== undefined) {
            if (feet.hasTag("mm:boosted_mana_regen")) regen += base_regenSpeed / 4
        }
        const offHand = equippable.getEquipment("Offhand")
        if (player.hasTag("novelty:mm:sparkling_amulet")) {
            regen += base_regenSpeed / 2
        } else if (offHand) {
            if (offHand.hasTag("mm:sparkling_amulet")) regen += base_regenSpeed / 2

        }
        if (player.hasTag("novelty:mm:blazing_amulet")) {
            regen += base_regenSpeed
        } else if (offHand) {
            if (offHand.hasTag("mm:blazing_amulet")) regen += base_regenSpeed

        }
        if (head !== undefined) {
            if (head.hasTag("mm:mages_hat")) regen = base_regenSpeed * 25
        }
    }

    const reductionL = world.scoreboard.getObjective("mm:reduction_lvl")
    if (reductionL == undefined) return regen
    if (!reductionL.hasParticipant(player.scoreboardIdentity)) return regen;
    regen = regen - (base_regenSpeed * (reductionL.getScore(player) + 1))
    //if (regen < 0) regen = 0
    return regen
}


system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (!player.hasTag("mm:been_loaded")) {
            player.addTag("mm:been_loaded")
            player.setDynamicProperty("mm:mana", regularMax)
            player.setDynamicProperty("mm:max_mana", regularMax)
        }
        const equippable = player.getComponent("minecraft:equippable")
        const offHand = equippable.getEquipment("Offhand")
        if (player.hasTag("novelty:mm:sparkling_amulet")) {
            if (getMaxMana(player) == regularMax && player.hasTag("novelty:mm:sparkling_amulet")) {
                player.setDynamicProperty("mm:max_mana", sparklingAmuletMax)
            }
        } else if (offHand !== undefined) {
            if (getMaxMana(player) == regularMax && offHand.hasTag("mm:sparkling_amulet")) {

                player.setDynamicProperty("mm:max_mana", sparklingAmuletMax)
            } else if (getMaxMana(player) == sparklingAmuletMax && !offHand.hasTag("mm:sparkling_amulet")) {

                player.setDynamicProperty("mm:max_mana", regularMax)
            }
        } else if (getMaxMana(player) == sparklingAmuletMax && !player.hasTag("novelty:mm:sparkling_amulet")) {

            player.setDynamicProperty("mm:max_mana", regularMax)

        } else {
            if (getMaxMana(player) == sparklingAmuletMax) {

                player.setDynamicProperty("mm:max_mana", regularMax)
            }
        }
        var regenSpeed = setRegenSpeed(player)
        if (!player.hasTag("mm:snowflake_active") && !player.hasTag("mm:roots_active")) {
            if (getMaxMana(player) > getCurrentMana(player) || regenSpeed < 0) {
                //world.sendMessage(`${getCurrentMana(player)}`)
                const difference = getMaxMana(player) - getCurrentMana(player)
                if (getCurrentMana(player) + regenSpeed < 0) {
                    player.setDynamicProperty("mm:mana", 0)
                } else if (difference >= regenSpeed) {
                    player.setDynamicProperty("mm:mana", getCurrentMana(player) + regenSpeed)
                } else {
                    player.setDynamicProperty("mm:mana", getMaxMana(player))
                }
                if (difference <= regenSpeed) displayMana(player)

            }
        }
    }
}, 5)

system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
        if (getCurrentMana(player) > getMaxMana(player)) player.setDynamicProperty("mm:mana", getMaxMana(player))
        if (getCurrentMana(player) < getMaxMana(player)) {
            displayMana(player)
        } else {
            const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
            if (!held) continue;
            if (held.hasTag("mm:spell_caster")) displayMana(player)
        }
    }
})

world.afterEvents.entityDie.subscribe((e) => {
    const entity = e.deadEntity;
    if (entity.typeId == "minecraft:player") {
        if (getCurrentMana(entity) < getMaxMana(entity)) entity.setDynamicProperty("mm:mana", getMaxMana(entity))
    }
})