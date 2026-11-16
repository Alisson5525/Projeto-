import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

import { clampValue, getCurrentMana, getMaxMana, getMana, debugMessage, getCooldown, getDurability, updateLore, getCost, getElement, getElementColour, getLore, spellList } from "./main.js";

import { sendNotification } from "main.js"

import { runSpell } from "./magicTriggered.js"

export function refundMana(player, totalCost, numberSpells) {
    const maxMana = getMaxMana(player)
    const currentMana = getCurrentMana(player)
    var newAmt = currentMana + (totalCost / (numberSpells * 2))
    if (newAmt > maxMana) newAmt = maxMana
    player.setDynamicProperty("mm:mana", newAmt)
}

system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:magic_book", {
        onUse(e) {
            const source = e.source;
            const item = e.itemStack;
            var cooldownTime = 10
            var cooldownAdd = 0
            var manaCost = 0
            const spell1 = item.getDynamicProperty("mm:spell_1")
            const spell2 = item.getDynamicProperty("mm:spell_2")
            const spell3 = item.getDynamicProperty("mm:spell_3")
            const level1 = item.getDynamicProperty("mm:level_1")
            const level2 = item.getDynamicProperty("mm:level_2")
            const level3 = item.getDynamicProperty("mm:level_3")
            var spell2Delay = 0
            var spell3Delay = 0
            var spellCount = 0
            if (spell1) spellCount += 1
            if (spell2) spellCount += 1
            if (spell3) spellCount += 1

            if (source.getDynamicProperty("mm:altered") == true) {
                source.runCommand("camerashake add @s 0.25 0.25")
                source.playSound("item.spellbook.disabled")
                return
            }
            if (spell1 == undefined && spell2 == undefined && spell3 == undefined) {
                source.playSound("item.spellbook.fail")
                source.sendMessage("§7§oIt is empty...")
                return;
            }
            manaCost = getCost(spell1, spell2, spell3)
            const equipment = source.getComponent("minecraft:equippable");
            const offHand = equipment.getEquipment("Offhand")
            if (source.hasTag("novelty:mm:shivering_amulet")) {
                manaCost = manaCost * 2 / 3
            } else if (offHand) {
                if (offHand.hasTag("mm:shivering_amulet")) manaCost = manaCost * 2 / 3
            }
            if (getCurrentMana(source) < manaCost) {
                source.playSound("item.spellbook.fail")
                source.sendMessage("§7§oNot enough mana")
                return;
            } else {
                source.setDynamicProperty("mm:mana", getCurrentMana(source) - manaCost)
                debugMessage(`§7${source.nameTag} used §d${Math.round(manaCost * 1000) / 1000} Mana§7.`)
            }
            if (offHand) {
                if (offHand.hasTag("mm:amulet")) {

                    if (source.getGameMode() !== "Creative") {
                        const am_durability = offHand.getComponent("minecraft:durability")

                        if (am_durability.damage + 1 < am_durability.maxDurability) {
                            am_durability.damage += 1;
                            equipment.setEquipment("Offhand", offHand)
                        } else {
                            let core = new ItemStack("mm:amulet_core", 1)
                            equipment.setEquipment("Offhand", core)
                            source.dimension.playSound(offHand.typeId.replace("mm:", "item.break."), source.location, { volume: 1, pitch: 0.5 })

                        }
                    }
                }
            }
            if (spell1 !== undefined) {
                cooldownAdd += getCooldown(spell1)
                var spell1Worked = runSpell(source, spell1, level1)
                if (spell1Worked == false) {
                    refundMana(source, manaCost, spellCount)
                    cooldownAdd -= getCooldown(spell1) * 0.7
                }
            }
            if (spell2 !== undefined) {
                cooldownAdd += getCooldown(spell3) - 5
            }
            if (spell3 !== undefined) {
                cooldownAdd += getCooldown(spell3) - 5
            }

            if (spell1 == spell2) {
                spell2Delay += 10
                cooldownAdd += 10
            }
            if (spell1 == spell3) {
                spell3Delay += 10
                cooldownAdd += 10
            }
            if (spell2 == spell3) {
                spell3Delay += 10
                cooldownAdd += 10
            }
            if (source.hasTag("novelty:mm:resonance_amulet")) {
                spell2Delay = spell2Delay * 1.2
                spell3Delay = spell3Delay * 1.2
            } else if (offHand) {
                if (offHand.hasTag("mm:resonance_amulet")) {

                    spell2Delay = spell2Delay * 1.2
                    spell3Delay = spell3Delay * 1.2
                }
            }
            system.runTimeout(() => {

                if (spell2 !== undefined) {
                    const spell2Worked = runSpell(source, spell2, level2)
                    if (spell2Worked == false) {
                        refundMana(source, manaCost, spellCount)
                        cooldownAdd -= getCooldown(spell2)
                        const cd = item.getComponent("minecraft:cooldown")
                        source.startItemCooldown(cd.cooldownCategory, source.getItemCooldown(cd.cooldownCategory) - (getCooldown(spell2) * 0.7));
                    }
                }
            }, 1 + spell2Delay)
            system.runTimeout(() => {

                if (spell3 !== undefined) {
                    const spell3Worked = runSpell(source, spell3, level3)
                    if (spell3Worked == false) {
                        refundMana(source, manaCost, spellCount)
                        const cd = item.getComponent("minecraft:cooldown")
                        source.startItemCooldown(cd.cooldownCategory, source.getItemCooldown(cd.cooldownCategory) - (getCooldown(spell3) * 0.7));
                    }
                }
            }, 2 + spell3Delay)
            source.playSound("item.spellbook.success")
            cooldownTime += cooldownAdd
            if (source.hasTag("novelty:mm:blazing_amulet")) {
                cooldownTime = cooldownTime * 2 / 3
            } else if (offHand) {
                if (offHand.hasTag("mm:blazing_amulet")) cooldownTime = cooldownTime * 2 / 3
            } else {
            }
            if (source.hasTag("novelty:mm:shivering_amulet")) {
                cooldownTime = cooldownTime * 5 / 4
            } else if (offHand) {
                if (offHand.hasTag("mm:shivering_amulet")) cooldownTime = cooldownTime * 5 / 4
            }
            if (source.hasTag("novelty:mm:altered_amulet")) {
                let hp = source.getComponent("health")
                if (hp.currentValue - 2 > 0) {
                    hp.setCurrentValue(clampValue(hp.currentValue - 2, 0.1, hp.currentValue))
                }
            } else if (offHand) {
                if (offHand.hasTag("mm:altered_amulet")) {
                    let hp = source.getComponent("health")
                    if (hp.currentValue - 2 > 0) {
                        hp.setCurrentValue(clampValue(hp.currentValue - 2, 0.1, hp.currentValue))
                    }
                }
            }
            const cd = item.getComponent("minecraft:cooldown")
            source.startItemCooldown(cd.cooldownCategory, cooldownTime);
            incrementExp(item, source)

        }
    });
    event.itemComponentRegistry.registerCustomComponent("mm:scroll", {
        onBeforeDurabilityDamage(e) {
            if (e.durabilityDamage !== 0) e.durabilityDamage = 0
        },
        onUse(e) {
            const source = e.source;
            const item = e.itemStack;
            var cooldownTime = 10
            if (source.getDynamicProperty("mm:altered") == true) {
                source.runCommand("camerashake add @s 0.25 0.25")
                source.playSound("item.spellbook.disabled")
                return
            }

            const spell = item.getDynamicProperty("mm:spell")
            if (spell == undefined) {
                source.sendMessage("§7§oIt is empty...")
                source.playSound("item.spellbook.fail")
                return;
            }
            var manaCost = getMana(spell)
            const equipment = source.getComponent("minecraft:equippable")
            const offHand = equipment.getEquipment("Offhand")
            if (source.hasTag("novelty:mm:shivering_amulet")) {
                manaCost = manaCost * 2 / 3
            } else if (offHand) {
                if (offHand.hasTag("mm:shivering_amulet")) manaCost = manaCost * 2 / 3
            }
            if (getCurrentMana(source) < manaCost) {
                source.sendMessage("§7§oNot enough mana")
                source.playSound("item.spellbook.fail")
                return;
            } else {
                source.setDynamicProperty("mm:mana", getCurrentMana(source) - manaCost)
                debugMessage(`§7${source.nameTag} used §d${manaCost} Mana§7.`)
            }
            if (offHand) {
                if (offHand.hasTag("mm:amulet")) {
                    if (source.getGameMode() !== "Creative") {
                        const am_durability = offHand.getComponent("minecraft:durability")

                        if (am_durability.damage + 1 < am_durability.maxDurability) {
                            am_durability.damage += 1;
                            equipment.setEquipment("Offhand", offHand)
                        } else {
                            let core = new ItemStack("mm:amulet_core", 1)
                            equipment.setEquipment("Offhand", core)
                            source.dimension.playSound(offHand.typeId.replace("mm:", "item.break."), source.location, { volume: 1, pitch: 0.5 })

                        }
                    }
                }
            }


            const mainhand = equipment.getEquipment("Mainhand")
            const durability = mainhand.getComponent("minecraft:durability")
            if (!durability) return;

            if (source.getGameMode() !== "Creative") {
                const duraDamage = getDurability(spell)
                if (durability.damage + duraDamage < durability.maxDurability) {
                    durability.damage += duraDamage;
                    equipment.setEquipment("Mainhand", mainhand)
                } else {
                    equipment.setEquipment("Mainhand", undefined)
                    source.dimension.playSound("random.break", source.location, { volume: 1, pitch: 2 })

                }
            }

            const cooldownAdd = getCooldown(spell)
            cooldownTime += cooldownAdd
            if (source.hasTag("novelty:mm:blazing_amulet")) {
                cooldownTime = cooldownTime * 2 / 3
            } else if (offHand) {
                if (offHand.hasTag("mm:blazing_amulet")) cooldownTime = cooldownTime * 2 / 3
            } else {
            }
            if (source.hasTag("novelty:mm:shivering_amulet")) {
                cooldownTime = cooldownTime * 5 / 4
            } else if (offHand) {
                if (offHand.hasTag("mm:shivering_amulet")) cooldownTime = cooldownTime * 5 / 4
            }
            if (source.hasTag("novelty:mm:altered_amulet")) {
                let hp = source.getComponent("health")
                if (hp.currentValue - 2 > 0) {
                    hp.setCurrentValue(clampValue(hp.currentValue - 2, 0.1, hp.currentValue))
                }
            } else if (offHand) {
                if (offHand.hasTag("mm:altered_amulet")) {
                    let hp = source.getComponent("health")
                    if (hp.currentValue - 2 > 0) {
                        hp.setCurrentValue(clampValue(hp.currentValue - 2, 0.1, hp.currentValue))
                    }
                }
            }
            const spellWorked = runSpell(source, spell, 1)
            if (spellWorked == false) {
                refundMana(source, manaCost, 1)
                cooldownTime -= getCooldown(spell) * 0.7
            }
            const cd = item.getComponent("minecraft:cooldown")
            source.startItemCooldown(cd.cooldownCategory, cooldownTime);
            source.playSound("item.spellbook.success")

        }
    })
})

function incrementExp(item, source) {
    var count = 0
    var options = []
    if (item.getDynamicProperty("mm:spell_1")) {
        if (item.getDynamicProperty("mm:xp_1") < 100 && item.getDynamicProperty("mm:level_1") < 3) {
            count += 1
            options.push(1)
        }
    }
    if (item.getDynamicProperty("mm:spell_2")) {
        if (item.getDynamicProperty("mm:xp_2") < 100 && item.getDynamicProperty("mm:level_2") < 3) {
            count += 1
            options.push(2)
        }
    }
    if (item.getDynamicProperty("mm:spell_3")) {
        if (item.getDynamicProperty("mm:xp_3") < 100 && item.getDynamicProperty("mm:level_3") < 3) {
            count += 1
            options.push(3)
        }
    }
    if (count == 0) return;
    const rand = Math.floor(Math.random() * count)
    const slotId = options[rand]
    const spell = "mm:spell_" + slotId
    const level = "mm:level_" + slotId
    const xp = "mm:xp_" + slotId
    const currentExp = item.getDynamicProperty(xp)
    var gain = 1 + (Math.random() * (count))
    gain = Math.floor(gain)
    var setValue = currentExp + gain
    if (setValue > 100) setValue = 100
    item.setDynamicProperty(xp, setValue)
    source.getComponent("minecraft:equippable").setEquipment("Mainhand", item)
    debugMessage(`§7${source.nameTag} gained §5${setValue - currentExp}§7 exp for §5${getLore(item.getDynamicProperty(spell))} [${slotId}]§7.`)
    if (setValue >= 100) {
        source.playSound("random.levelup", { pitch: 0.5 })
        if (item.typeId == "mm:spell_book") {
            sendNotification(source, `§dLevel Up!\n§r${getLore(item.getDynamicProperty(spell))}`, "textures/items/magic_book", getElement(spell))
        } else {
            sendNotification(source, `§dLevel Up!\n§r${getLore(item.getDynamicProperty(spell))}`, "textures/items/dyed/magic_book_" + item.typeId.replace("mm:", "").replace("_spell_book", ""), getElement(spell))
        }
        debugMessage(`§5${source.nameTag} can now level §d${getLore(item.getDynamicProperty(spell))} [${slotId}]§5 to level ${item.getDynamicProperty(level) + 1}.`)

    }
}




