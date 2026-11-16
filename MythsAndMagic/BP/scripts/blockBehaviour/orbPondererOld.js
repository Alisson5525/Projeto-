import {
    world,
    system,
    Enchantment,
    EnchantmentType
} from "@minecraft/server";

import {
    ActionFormData,
    ModalFormData
} from "@minecraft/server-ui";

const enchantData = [
    {
        enchantName: "sharpness",
        incompatibleWith: ["smite", "bane_of_arthropods", "impaling", "density", "breach"]
    },
    {
        enchantName: "smite",
        incompatibleWith: ["sharpness", "bane_of_arthropods", "impaling", "density", "breach"]
    },
    {
        enchantName: "bane_of_arthropods",
        incompatibleWith: ["sharpness", "smite", "impaling", "density", "breach"]
    },
    {
        enchantName: "blast_protection",
        incompatibleWith: ["protection", "fire_protection", "projectile_protection"]
    },
    {
        enchantName: "fire_protection",
        incompatibleWith: ["protection", "blast_protection", "projectile_protection"]
    },
    {
        enchantName: "projectile_protection",
        incompatibleWith: ["protection", "fire_protection", "blast_protection"]
    },
    {
        enchantName: "protection",
        incompatibleWith: ["blast_protection", "fire_protection", "projectile_protection"]
    },
    {
        enchantName: "density",
        incompatibleWith: ["sharpness", "bane_of_arthropods", "smite", "breach"]
    },
    {
        enchantName: "breach",
        incompatibleWith: ["sharpness", "bane_of_arthropods", "smite", "density"]
    },
    {
        enchantName: "channeling",
        incompatibleWith: ["riptide"]
    },
    {
        enchantName: "loyalty",
        incompatibleWith: ["riptide"]
    },
    {
        enchantName: "riptide",
        incompatibleWith: ["channeling", "loyalty"]
    },
    {
        enchantName: "frost_walker",
        incompatibleWith: ["depth_strider"]
    },
    {
        enchantName: "depth_strider",
        incompatibleWith: ["frost_walker"]
    },
    {
        enchantName: "fortune",
        incompatibleWith: ["silk_touch"]
    },
    {
        enchantName: "silk_touch",
        incompatibleWith: ["fortune"]
    },
    {
        enchantName: "infinity",
        incompatibleWith: ["mending"]
    },
    {
        enchantName: "mending",
        incompatibleWith: ["infinity"]
    },
    {
        enchantName: "multishot",
        incompatibleWith: ["piercing"]
    },
    {
        enchantName: "piercing",
        incompatibleWith: ["multishot"]
    }
]



const enchantmentsPerSlot = [
    {
        slotName: "Sword",
        enchantments: ["sharpness", "smite", "bane_of_arthropods", "looting", "knockback", "fire_aspect", "unbreaking"]
    },
    {
        slotName: "Pickaxe",
        enchantments: ["efficiency", "fortune", "silk_touch", "unbreaking"]
    },
    {
        slotName: "Axe",
        enchantments: ["efficiency", "fortune", "silk_touch", "sharpness", "smite", "bane_of_arthropods", "unbreaking"]
    },
    {
        slotName: "Shovel",
        enchantments: ["efficiency", "fortune", "silk_touch", "unbreaking"]
    },
    {
        slotName: "Hoe",
        enchantments: ["efficiency", "fortune", "silk_touch", "unbreaking"]
    },
    {
        slotName: "Bow",
        enchantments: ["power", "punch", "flame", "infinity", "unbreaking"]
    },
    {
        slotName: "Crossbow",
        enchantments: ["quick_charge", "multishot", "piercing", "unbreaking"]
    },
    {
        slotName: "Spear",
        enchantments: ["impaling", "riptide", "channeling", "loyalty", "unbreaking"]
    },
    {
        slotName: "Mace",
        enchantments: ["density", "breach", "fire_aspect", "smite", "bane_of_arthropods", "unbreaking"]
    },
    {
        slotName: "ArmorHead",
        enchantments: ["protection", "fire_protection", "blast_protection", "projectile_protection", "thorns", "respiration", "aqua_affinity", "unbreaking"]
    },
    {
        slotName: "ArmorTorso",
        enchantments: ["protection", "fire_protection", "blast_protection", "projectile_protection", "thorns", "unbreaking"]
    },
    {
        slotName: "ArmorLegs",
        enchantments: ["protection", "fire_protection", "blast_protection", "projectile_protection", "thorns", "unbreaking"]
    },
    {
        slotName: "ArmorFeet",
        enchantments: ["protection", "fire_protection", "blast_protection", "projectile_protection", "thorns", "feather_falling", "depth_strider", "unbreaking"]
    },
    {
        slotName: "FishingRod",
        enchantments: ["luck_of_the_sea", "lure", "unbreaking"]
    },
    {
        slotName: "CarrotStick",
        enchantments: ["unbreaking"]
    },
    {
        slotName: "SpearMelee",
        enchantments: ["sharpness", "smite", "bane_of_arthropods", "looting", "knockback", "fire_aspect", "lunge", "unbreaking"]
    }


]

const validSlots = [
    "Sword",
    "Pickaxe",
    "Axe",
    "Shovel",
    "Hoe",
    "Bow",
    "Crossbow",
    "Spear",
    "Mace",
    "ArmorHead",
    "ArmorTorso",
    "ArmorLegs",
    "ArmorFeet",
    "FishingRod",
    "CarrotStick",
    "SpearMelee"
]

const enchantOptions = [
    {
        enchantment: "unbreaking",
        maxLevel: 3,
        costPerLevel: 2,
        itemsPerLevel: [["Obsidian", "minecraft:obsidian", 2], ["Iron Ingot", "minecraft:iron_ingot", 3.5]]
    },
    {
        enchantment: "efficiency",
        maxLevel: 5,
        costPerLevel: 1.5,
        itemsPerLevel: [["Gold Ingot", "minecraft:iron_ingot", 2.2], ["Diamond", "minecraft:diamond", 0.2], ["Lapis Lazuli", "minecraft:lapis_lazuli", 2.5]]
    },
    {
        enchantment: "fortune",
        maxLevel: 3,
        costPerLevel: 3,
        itemsPerLevel: [["Gold Ingot", "minecraft:gold_ingot", 2.5], ["Diamond", "minecraft:diamond", 1], ["Azsilva Ingot", "mm:azsilva_ingot", 5]]
    },
    {
        enchantment: "silk_touch",
        maxLevel: 1,
        costPerLevel: 15,
        itemsPerLevel: [["Stone", "minecraft:stone", 16], ["Gold Ingot", "minecraft:gold_ingot", 12], ["Amethyst Shard", "minecraft:amethyst_shard", 24], ["Azsilva Ingot", "mm:azsilva_ingot", 8]]
    },
    {
        enchantment: "protection",
        maxLevel: 4,
        costPerLevel: 2,
        itemsPerLevel: [["Iron Ingot", "minecraft:iron_ingot", 4], ["Copper Ingot", "minecraft:copper_ingot", 6], ["Gold Ingot", "minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "fire_protection",
        maxLevel: 4,
        costPerLevel: 1.5,
        itemsPerLevel: [["Blaze Powder", "minecraft:blaze_powder", 3], ["Iron Ingot", "minecraft:iron_ingot", 3], ["Copper Ingot", "minecraft:copper_ingot", 6], ["Gold Ingot", "minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "projectile_protection",
        maxLevel: 4,
        costPerLevel: 1.5,
        itemsPerLevel: [["Pointed Dripstone", "minecraft:pointed_dripstone", 4], ["Iron Ingot", "minecraft:iron_ingot", 3], ["Copper Ingot", "minecraft:copper_ingot", 6], ["Gold Ingot", "minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "blast_protection",
        maxLevel: 4,
        costPerLevel: 1.5,
        itemsPerLevel: [["Gunpower", "minecraft:gunpowder", 3], ["Iron Ingot", "minecraft:iron_ingot", 3], ["Copper Ingot", "minecraft:copper_ingot", 6], ["Gold Ingot", "minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "feather_falling",
        maxLevel: 4,
        costPerLevel: 2,
        itemsPerLevel: [["Feather", "minecraft:feather", 6], ["Phantom Membrane", "minecraft:phantom_membrane", 0.33], ["Gold Ingot", "minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "thorns",
        maxLevel: 3,
        costPerLevel: 3,
        itemsPerLevel: [["Pointed Dripstone", "minecraft:pointed_dripstone", 3], ["Vines", "minecraft:vines", 4.5], ["Redstone Dust", "minecraft:redstone", 5]]
    },
    {
        enchantment: "aqua_affinity",
        maxLevel: 1,
        costPerLevel: 5,
        itemsPerLevel: [["Heart of the Sea", "minecraft:heart_of_the_sea", 1], ["Kelp", "minecraft:kelp", 32], ["Turtle Scute", "minecraft:turtle_scute", 2]]
    },
    {
        enchantment: "respiration",
        maxLevel: 3,
        costPerLevel: 2,
        itemsPerLevel: [["Nautilus Shell", "minecraft:nautilus_shell", 2.333], ["Copper Ingot", "minecraft:copper_ingot", 4], ["Prismarine Crystal", "minecraft:prismarine_crystals", 4]]
    },
    {
        enchantment: "depth_strider",
        maxLevel: 3,
        costPerLevel: 2,
        itemsPerLevel: [["Prismarine Shard", "minecraft:prismarine_shard", 4], ["Prismarine Crystal", "minecraft:prismarine_crystals", 2.5], ["Gold Ingot", "minecraft:gold_ingot", 6]]
    },
    {
        enchantment: "sharpness",
        maxLevel: 5,
        costPerLevel: 2,
        itemsPerLevel: [["Diamond", "minecraft:diamond", 0.3], ["Iron Ingot", "minecraft:iron_ingot", 4.5], ["Flint", "minecraft:flint", 3]]
    },
    {
        enchantment: "smite",
        maxLevel: 5,
        costPerLevel: 1.3,
        itemsPerLevel: [["Iron Ingot", "minecraft:iron_ingot", 3.5], ["Gold Ingot", "minecraft:gold_ingot", 2], ["Bone", "minecraft:bone", 8]]
    },
    {
        enchantment: "bane_of_arthropods",
        maxLevel: 5,
        costPerLevel: 1.3,
        itemsPerLevel: [["Iron Ingot", "minecraft:iron_ingot", 3.5], ["String", "minecraft:string", 4], ["Spider Eye", "minecraft:spider_eye", 2]]
    },
    {
        enchantment: "looting",
        maxLevel: 3,
        costPerLevel: 3,
        itemsPerLevel: [["Diamond", "minecraft:diamond", 1], ["Emerald", "minecraft:emerald", 6], ["Quartz", "minecraft:quartz", 12]]
    },
    {
        enchantment: "fire_aspect",
        maxLevel: 2,
        costPerLevel: 3,
        itemsPerLevel: [["Blaze Soul", "mm:blaze_soul", 2], ["Nether Wart", "minecraft:nether_wart", 4], ["Lava Bucket", "minecraft:lava_bucket", 0.1]]
    },
    {
        enchantment: "knockback",
        maxLevel: 2,
        costPerLevel: 3,
        itemsPerLevel: [["Wind Charge", "minecraft:wind_charge", 12], ["Copper Ingot", "minecraft:copper_ingot", 4], ["Feather", "minecraft:feather", 5]]
    },
    {
        enchantment: "power",
        maxLevel: 5,
        costPerLevel: 2,
        itemsPerLevel: [["Iron Ingot", "minecraft:iron_ingot", 4], ["Arrow", "minecraft:arrow", 8], ["Obsidian", "minecraft:obsidian", 2]]
    },
    {
        enchantment: "punch",
        maxLevel: 2,
        costPerLevel: 3,
        itemsPerLevel: [["Breeze Rod", "minecraft:breeze_rod", 2], ["Flint", "minecraft:flint", 4], ["Feather", "minecraft:feather", 5]]
    },
    {
        enchantment: "flame",
        maxLevel: 1,
        costPerLevel: 8,
        itemsPerLevel: [["Blaze Rod", "minecraft:blaze_rod", 4], ["Magma Cream", "minecraft:magma_cream", 4], ["Arrow", "minecraft:arrow", 8]]
    },
    {
        enchantment: "infinity",
        maxLevel: 1,
        costPerLevel: 10,
        itemsPerLevel: [["Arrow", "minecraft:arrow", 64], ["Azsilva Ingot", "mm:azsilva_ingot", 16]]
    },
    {
        enchantment: "piercing",
        maxLevel: 4,
        costPerLevel: 1,
        itemsPerLevel: [["Arrow", "minecraft:arrow", 4], ["Pointed Dripstone", "minecraft:pointed_dripstone", 2], ["Iron Ingot", "minecraft:iron_ingot", 3]]
    },
    {
        enchantment: "quick_charge",
        maxLevel: 3,
        costPerLevel: 1.5,
        itemsPerLevel: [["Sugar", "minecraft:sugar", 1.5], ["Copper Ingot", "minecraft:copper_ingot", 4], ["Azsilva Ingot", "mm:azsilva_ingot", 1]]
    },
    {
        enchantment: "multishot",
        maxLevel: 1,
        costPerLevel: 5,
        itemsPerLevel: [["Arrow", "minecraft:arrow", 16], ["Iron Ingot", "minecraft:iron_ingot", 8], ["Azsilva Ingot", "mm:azsilva_ingot", 3]]
    },
    {
        enchantment: "density",
        maxLevel: 5,
        costPerLevel: 3,
        itemsPerLevel: [["Obsidian", "minecraft:obsidian", 12.8], ["Diamond", "minecraft:diamond", 0.25], ["Iron Ingot", "minecraft:iron_ingot", 6]]
    },
    {
        enchantment: "breach",
        maxLevel: 4,
        costPerLevel: 3,
        itemsPerLevel: [["Iron Block", "minecraft:iron_block", 0.3], ["Wind Charge", "minecraft:wind_charge", 3.5], ["Gold Ingot", "minecraft:gold_ingot", 6]]
    },
    {
        enchantment: "impaling",
        maxLevel: 5,
        costPerLevel: 1.5,
        itemsPerLevel: [["Prismarine Shard", "minecraft:prismarine_shard", 5], ["Nautilus Shell", "minecraft:nautilus_shell", 1], ["Gold Ingot", "minecraft:gold_ingot", 2.5]]
    },
    {
        enchantment: "riptide",
        maxLevel: 3,
        costPerLevel: 4,
        itemsPerLevel: [["Prismarine Crystal", "minecraft:prismarine_crystal", 4], ["Wind Charge", "minecraft:wind_charge", 4], ["Amethyst Shard", "minecraft:amethyst_shard", 2]]
    },
    {
        enchantment: "chanelling",
        maxLevel: 1,
        costPerLevel: 16,
        itemsPerLevel: [["Heart of the Sea", "minecraft:heart_of_the_sea", 1], ["Quartz", "minecraft:quartz", 16], ["Copper Ingot", "minecraft:copper_ingot", 32]]
    },
    {
        enchantment: "loyalty",
        maxLevel: 3,
        costPerLevel: 4,
        itemsPerLevel: [["Prismarine Crystal", "minecraft:prismarine_crystal", 6], ["Azsilva Ingot", "mm:azsilva_ingot", 4]]
    },
    {
        enchantment: "luck_of_the_sea",
        maxLevel: 3,
        costPerLevel: 1,
        itemsPerLevel: [["Prismarine Crystal", "minecraft:prismarine_crystal", 2], ["Gold Ingot", "minecraft:gold_ingot", 6]]
    },
    {
        enchantment: "lure",
        maxLevel: 3,
        costPerLevel: 1,
        itemsPerLevel: [["Prismarine Crystal", "minecraft:prismarine_crystal", 2], ["Tropical Fish", "minecraft:tropical_fish", 2]]
    },
    {
        enchantment: "lunge",
        maxLevel: 3,
        costPerLevel: 2,
        itemsPerLevel: [["Wind Charge", "minecraft:wind_charge", 2], ["Azsilva Ingot", "mm:azsilva_ingot", 1.5], ["Amethyst Shard", "minecraft:amethyst_shard", 2]]
    }
]


function getOptions(item) {
    const enchantable = item.getComponent("minecraft:enchantable");
    var enchSlot = enchantable.slots[0];
    if (item.typeId == "minecraft:mace") {
        enchSlot = "Mace"
    }
    if (item.hasTag("minecraft:is_spear") && item.hasTag("mm:is_halberd") == false) {
        enchSlot = "SpearMelee"
    }
    console.log("slots checked")
    if (!enchSlot) return []
    if (!validSlots.includes(enchSlot)) return [];

    const avaliableEnchants = enchantmentsPerSlot.find(lookup => lookup.slotName === enchSlot);
    var options = []

    for (const val of avaliableEnchants.enchantments) {
        if (enchantable.hasEnchantment(val) == false) {
            addEnchantToArray(options, val, enchantable)
        }

    }
    return options
}

function addEnchantToArray(arrayToAdd, enchant, comp) {
    const issues = enchantData.find(lookup => lookup.enchantName === enchant);
    if (!issues) {
        arrayToAdd.push(enchant)
    } else {
        for (const issue of issues.incompatibleWith) {
            if (comp.hasEnchantment(issue)) {
                return;
            }
        }
        if (comp.hasEnchantment(enchant)) return;
        arrayToAdd.push(enchant)
    }
}

function properName(baseName) {
    var splitStr = baseName.replace("_", " ").toLowerCase().split(' ');
    for (var i = 0; i < splitStr.length; i++) {
        splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
    }
    //i cba to properly code it
    if (baseName == "bane_of_arthropods") return "Bane Of Arthropods"
    if (baseName == "luck_of_the_sea") return "Luck Of The Sea"
    return splitStr.join(' ');
}


function openSelectPage(player, options, block) {
    if (options.length == 0) {
        player.sendMessage({ translate: "orb_ponderer.no_enchants_avaliable" })
        block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
        stopusing(block)
        return;
    }
    let selectForm = new ActionFormData();
    selectForm.title("The Orb Ponderer")
    selectForm.body("What would you like to ponder..?")
    for (let option of options) {
        selectForm.divider()
        selectForm.button(properName(option))
    }

    selectForm.show(player).then(r => {
        if (r.canceled) {
            stopusing(block)
            return;
        }
        openSettingsPage(player, options, options[r.selection], block)
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function openSettingsPage(player, options, response, block) {
    const enchantmentData = enchantOptions.find(lookup => lookup.enchantment === response);
    let settingForm = new ModalFormData();
    settingForm.title(properName(response))
    const items = enchantmentData.itemsPerLevel;
    var index = 0
    settingForm.label("This enchantment will require the following ingredients:\n")
    settingForm.label("Experience Levels")
    index += 2;
    for (var i = 0; i < items.length; i++) {
        settingForm.label(`${items[i][0]}`)
        index += 1;
    }
    settingForm.slider("Enchantment Level", 1, enchantmentData.maxLevel, { defaultValue: 1 })

    settingForm.show(player).then(r => {
        if (r.canceled) {
            openSelectPage(player, options, block)
        } else {
            const chosenLvl = r.formValues[index]
            openConfirmPage(player, options, response, chosenLvl, block)
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

function searchForItem(player, itemId, count) {
    const inv = player.getComponent("minecraft:inventory");
    const container = inv.container;
    var itemCount = 0
    for (var i = 0; i < inv.inventorySize; i++) {
        let slot = container.getSlot(i);
        if (slot !== undefined && slot.isValid && slot.hasItem()) {
            if (slot.typeId == itemId) {
                itemCount += slot.amount;
            }
        }
    }
    if (itemCount < count) {
        return false
    } else {
        return true
    }
}

function openConfirmPage(player, options, enchant, level, block) {
    const enchantmentData = enchantOptions.find(lookup => lookup.enchantment === enchant);
    const items = enchantmentData.itemsPerLevel;
    let confirmForm = new ActionFormData();
    confirmForm.title("Confirm?")
    confirmForm.body("Following ingredients will be consumed :")
    for (var i = 0; i < items.length; i++) {
        const neededCount = Math.ceil(items[i][2] * level)
        confirmForm.label(`${items[i][0]} x${neededCount}`)
    }
    const neededExp = Math.ceil(enchantmentData.costPerLevel * level)
    confirmForm.label(`Exp Levels x${neededExp}`)
    confirmForm.button("Ponder the Orb")
    confirmForm.show(player).then(r => {
        if (r.canceled) {
            openSelectPage(player, options, block)
        } else {
            var validItems = true
            for (var i = 0; i < items.length; i++) {
                const neededCount = Math.ceil(items[i][2] * level)
                const check = searchForItem(player, items[i][1], neededCount)
                if (check == false) validItems = false
            }
            if (validItems == false) {
                player.sendMessage({ translate: "orb_ponderer.insufficient_items" })
                player.dimension.playSound("block.orb_ponderer.fail", player.location)
                stopusing(block)
                return;
            } else {
                if (player.level < neededExp) {
                    player.sendMessage({ translate: "orb_ponderer.insufficient_exp" })
                    player.dimension.playSound("block.orb_ponderer.fail", player.location)
                    stopusing(block)
                    return;
                } else {
                    completeTransaction(player, neededExp, enchant, level, block)
                }
            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });

}

function completeTransaction(player, neededExp, enchant, level, block) {
    const enchantmentData = enchantOptions.find(lookup => lookup.enchantment === enchant);
    const items = enchantmentData.itemsPerLevel;
    for (var i = 0; i < items.length; i++) {
        const neededCount = Math.ceil(items[i][2] * level)
        player.runCommand(`clear @s ${items[i][1]} -1 ${neededCount}`)
    }
    player.addLevels(neededExp * -1)
    const equip = player.getComponent("minecraft:equippable");
    var held = equip.getEquipment("Mainhand");
    const enchantable = held.getComponent("minecraft:enchantable");
    enchantable.addEnchantment({ level: level, type: new EnchantmentType(enchant) })
    equip.setEquipment("Mainhand", held)
    player.dimension.playSound("block.orb_ponderer.success", player.location)
    const blockCent = block.center()
    const loc = { x: blockCent.x, y: blockCent.y + 0.6, z: blockCent.z }
    block.dimension.spawnParticle("mm:orb_ponderer_success", loc)
    stopusing(block)

}

function stopusing(block) {
    const perm = block.permutation;
    const newPerm = perm.withState("mm:in_use", false);
    block.setPermutation(newPerm)
    let players = block.dimension.getPlayers({ location: block.location, maxDistance: 16 })
    for (const player of players) {
        player.runCommand("stopsound @s block.orb_ponderer.idle")
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:orb_ponderer", {
        onPlayerInteract(e) {
            const player = e.player;
            const block = e.block;
            const item = player.getComponent("minecraft:equippable").getEquipmentSlot("Mainhand").getItem();
            if (!item) {
                player.sendMessage({ translate: "orb_ponderer.no_held_item" })
                block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                return;
            }
            console.log("orb pondered")
            if (!item.hasComponent("minecraft:enchantable")) {
                player.sendMessage({ translate: "orb_ponderer.held_item_cannot_enchant" })
                block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                return;

            }
            const perm = block.permutation;
            const inUse = perm.getState("mm:in_use")
            if (inUse == true) {
                player.sendMessage({ translate: "orb_ponderer.in_use" })
                block.dimension.playSound("block.end_portal_frame.fill", block.location, { volume: 1, pitch: 0.3 })
                return;
            }
            const newPerm = perm.withState("mm:in_use", true);
            block.setPermutation(newPerm)


            openSelectPage(player, getOptions(item), block)

            block.dimension.playSound("block.orb_ponderer.idle", block.location, { volume: 0.6 })
            system.runInterval(() => {
                if (!block.dimension.isChunkLoaded(block.location)) return;
                if (block.typeId !== "mm:orb_ponderer") return;
                if (block.permutation.getState("mm:in_use") == false) return;
                block.dimension.playSound("block.orb_ponderer.idle", block.location, { volume: 0.6 })
            }, 120)
        },
        onTick(e) {
            const block = e.block.center()
            const loc = { x: block.x, y: block.y + 0.6, z: block.z }
            e.dimension.spawnParticle("mm:orb_ponderer", loc)
            const perm = e.block.permutation;
            const inUse = perm.getState("mm:in_use")
            if (inUse == true) {
                e.dimension.spawnParticle("mm:orb_ponderer_activated", loc)
            }
        },
        onPlayerBreak(e) {
            let players = e.block.dimension.getPlayers({ location: e.block.location, maxDistance: 16 })
            for (const player of players) {
                player.runCommand("stopsound @s block.orb_ponderer.idle")
            }
        }
    })
})