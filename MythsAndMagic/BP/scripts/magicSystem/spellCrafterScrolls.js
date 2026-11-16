import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

import {
    ActionFormData
} from "@minecraft/server-ui";


import { getLore, spellList } from "./main.js";

const recipes = [
    //air
    {
        id: "mm:dash",
        items: [["Wind Charge", "minecraft:wind_charge", 4], ["Feather", "minecraft:feather", 4], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:launch",
        items: [["Wind Charge", "minecraft:wind_charge", 8], ["Rabbit's Foot", "minecraft:rabbit_foot", 1], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:supersonic",
        items: [["Wind Charge", "minecraft:wind_charge", 4], ["Echo Shard", "minecraft:echo_shard", 1], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:retrieval",
        items: [["Wind Charge", "minecraft:wind_charge", 12], ["String", "minecraft:string", 8], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    {
        id: "mm:hurricane",
        items: [["Wind Charge", "minecraft:wind_charge", 24], ["Gunpowder", "minecraft:gunpowder", 9], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    {
        id: "mm:cloudsurf",
        items: [["Feather", "minecraft:feather", 6], ["String", "minecraft:wind_charge", 8], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    //fire
    {
        id: "mm:burst",
        items: [["Fire Charge", "minecraft:fire_charge", 6], ["Gunpowder", "minecraft:gunpowder", 8], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:overheat",
        items: [["Blaze Powder", "minecraft:blaze_powder", 4], ["Magma Block", "minecraft:magma", 15], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:cauterise",
        items: [["Flint", "minecraft:flint", 8], ["Magma Cream", "minecraft:magma_cream", 5], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:hellfire",
        items: [["Blaze Soul", "mm:blaze_soul", 8], ["Soul Sand", "minecraft:soul_sand", 8], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    {
        id: "mm:guardian",
        items: [["Azsilva Nugget", "mm:azsilva_nugget", 6], ["Soul Lantern", "minecraft:soul_lantern", 2], ["Sparkling Shard", "mm:sparkling_shard", 3]]
    },
    {
        id: "mm:cluster",
        items: [["Fire Charge", "minecraft:fire_charge", 10], ["TNT", "minecraft:tnt", 1], ["Sparkling Shard", "mm:sparkling_shard", 5]]
    },
    //electric
    {
        id: "mm:bolt",
        items: [["Copper Ingot", "minecraft:copper_ingot", 5], ["Sand", "minecraft:sand", 12], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:overclock",
        items: [["Gold Ingot", "minecraft:gold_ingot", 4], ["Redstone Dust", "minecraft:redstone", 10], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:spark",
        items: [["Copper Ingot", "minecraft:copper_ingot", 8], ["Glowstone Dust", "minecraft:glowstone_dust", 9], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:thunderbolt",
        items: [["Diamond", "minecraft:diamond", 1], ["Glowstone Dust", "minecraft:glowstone_dust", 6], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    //ice
    {
        id: "mm:chilling",
        items: [["Blue Ice", "minecraft:blue_ice", 3], ["Lapis Lazuli", "minecraft:lapis_lazuli", 6], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:snowflake",
        items: [["Permafrost Shard", "mm:permafrost_shard", 2], ["Snowball", "minecraft:snowball", 16], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:glaciate",
        items: [["Permafrost Shard", "mm:permafrost_shard", 3], ["Ice", "minecraft:ice", 12], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:icicle",
        items: [["Permafrost Shard", "mm:permafrost_shard", 6], ["Blue Ice", "minecraft:blue_ice", 8], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    {
        id: "mm:snowball",
        items: [["Snowball", "minecraft:snowball", 16], ["Ice", "minecraft:ice", 12], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    //earth
    {
        id: "mm:roots",
        items: [["Red Mushroom", "minecraft:red_mushroom", 6], ["Sticks", "minecraft:stick", 16], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:terraform",
        items: [["Stone", "minecraft:stone", 16], ["Pointed Dripstone", "minecraft:pointed_dripstone", 6], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:toxic",
        items: [["Spider Eye", "minecraft:spider_eye", 9], ["Brown Mushroom", "minecraft:brown_mushroom", 7], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    {
        id: "mm:quake",
        items: [["Stone", "minecraft:stone", 32], ["Obsidian", "minecraft:obsidian", 8], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    {
        id: "mm:meteor",
        items: [["Raw Meteor Fragment", "mm:raw_meteor_fragment", 6], ["Magma", "minecraft:magma", 16], ["Sparkling Shard", "mm:sparkling_shard", 2]]
    },
    {
        id: "mm:entangle",
        items: [["Moss", "minecraft:moss_block", 8], ["Vine", "minecraft:vines", 16], ["Sparkling Shard", "mm:sparkling_shard", 1]]
    },
    //mana
    {
        id: "mm:purify",
        items: [["Milk Bucket", "minecraft:milk_bucket", 1], ["Spell Charge", "mm:spell_charge", 4], ["Sparkling Shard", "mm:sparkling_shard", 3]]
    },
    {
        id: "mm:teleport",
        items: [["Ender Pearl", "minecraft:ender_pearl", 4], ["Amethyst Shard", "minecraft:amethyst_shard", 7], ["Sparkling Shard", "mm:sparkling_shard", 3]]
    },
    {
        id: "mm:swap",
        items: [["Eye of Ender", "minecraft:ender_eye", 3], ["Amethyst Shard", "minecraft:amethyst_shard", 15], ["Sparkling Shard", "mm:sparkling_shard", 3]]
    },
    {
        id: "mm:shadow",
        items: [["Ink Sac", "minecraft:ink_sac", 6], ["Azsilva Ingot", "mm:azsilva_ingot", 5], ["Sparkling Shard", "mm:sparkling_shard", 3]]
    },
    {
        id: "mm:siphoning",
        items: [["Vampire Fang", "mm:vampire_fang", 1], ["Twisted Moss Block", "mm:twisted_moss_block", 4], ["Sparkling Crystal", "mm:sparkling_crystal", 1]]
    },
    {
        id: "mm:imprison",
        items: [["Terragna Residue", "mm:terragna_residue", 6], ["Unobtanium Ingot", "mm:unobtanium_ingot", 5], ["Sparkling Shard", "mm:sparkling_shard", 3]]
    }

]

function getUnlockedRecipes(player) {
    var returnArray = []
    for (const spell of spellList) {
        if (player.hasTag(spell + "_recipe_unlocked")) {
            returnArray.push(spell)
        }
    }
    return returnArray
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

function selectedRecipe(player, item, block, selectedSpell) {
    const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (held.typeId !== item.typeId) {
        block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
        return;
    }
    const recipeData = recipes.find(lookup => lookup.id === selectedSpell);
    const itemsNeeded = recipeData.items;

    let confirmForm = new ActionFormData();
    confirmForm.title("Craft this Spell?")
    confirmForm.body("Following ingredients will be consumed\n\n")
    confirmForm.divider()
    for (const itemNeeded of itemsNeeded) {
        confirmForm.label(`${itemNeeded[0]} x${itemNeeded[2]}`)
    }
    for (let i = 0; i < 4 - itemsNeeded.length; i++) {
        confirmForm.label("")
    }
    confirmForm.divider()
    confirmForm.button("Craft Spell");
    confirmForm.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            var validItems = true
            for (const itemNeeded of itemsNeeded) {
                const check = searchForItem(player, itemNeeded[1], itemNeeded[2])
                if (check == false) validItems = false
            }
            if (validItems == false && player.getGameMode() !== "Creative") {
                player.sendMessage({ translate: "scroll_crafter.insufficient_items" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;
            } else {
                completeTransaction(player, item, block, selectedSpell)
            }
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}


function completeTransaction(player, item, block, selectedSpell) {
    const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (held.typeId !== item.typeId) {
        block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
        return;
    }
    const recipeData = recipes.find(lookup => lookup.id === selectedSpell);
    const itemsNeeded = recipeData.items;
    if (player.getGameMode() !== "Creative") {
        for (const itemNeeded of itemsNeeded) {
            player.runCommand(`clear @s ${itemNeeded[1]} -1 ${itemNeeded[2]}`)
        }
    }
    const equip = player.getComponent("minecraft:equippable");
    const itemstack = new ItemStack("mm:mystery_scroll")
    itemstack.setDynamicProperty(selectedSpell, true)
    itemstack.setLore([{ text: "§r§u" + getLore(selectedSpell) }])
    equip.setEquipment("Mainhand", itemstack)
    block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 1.5 })

}

function openRecipeSelection(player, item, block, recipes) {
    const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (held.typeId !== item.typeId) {
        block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
        return;
    }
    let recipeSelect = new ActionFormData();
    recipeSelect.title("mm:scroll_crafter_grid_menu")
    recipeSelect.body("Select a Spell")
    var buttonArray = []
    for (const spell of recipes) {
        const spellName = getLore(spell)
        buttonArray.push(spell)
        recipeSelect.button(spellName, "textures/ui/form/spell/spell_" + spellName.toLowerCase().replace(" ",""))
    }
    recipeSelect.show(player).then(r => {
        if (r.canceled) {
            return;
        } else {
            selectedRecipe(player, item, block, buttonArray[r.selection])
            return;
        }
    }).catch(e => {
        console.error(e, e.stack);
    });
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:scroll_crafter", {
        onPlayerInteract(e) {
            const player = e.player;
            const block = e.block;

            const item = player.getComponent("minecraft:equippable").getEquipment("Mainhand")

            if (!item) {
                player.sendMessage({ translate: "scroll_crafter.no_held_item" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;
            }
            if (item.typeId !== "mm:scroll") {
                player.sendMessage({ translate: "scroll_crafter.held_item_invalid" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;
            }
            if (item.getDynamicProperty("mm:spell") !== null && item.getDynamicProperty("mm:spell") !== undefined) {
                player.sendMessage({ translate: "scroll_crafter.held_item_invalid" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;
            }


            const recipes = getUnlockedRecipes(player)
            if (recipes.length == 0) {
                player.sendMessage({ translate: "scroll_crafter.no_recipes" })
                block.dimension.playSound("close.bamboo_wood_trapdoor", block.location, { volume: 1, pitch: 0.5 })
                return;
            }
            openRecipeSelection(player, item, block, recipes)

        }
    })
})


