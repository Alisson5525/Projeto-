import {
    world,
    system,
    ItemStack,
    EnchantmentType,
    GameMode
} from "@minecraft/server";

import {
    ActionFormData,
    ModalFormData
} from "@minecraft/server-ui";

import { enchantData, enchantmentsList, customData, customList } from "customEnchantments/main.js"
import { applyCustomEnchant } from "./enchantFunctions.js"

const acceptedItems = ["mm:pondering_book", "minecraft:book", "minecraft:enchanted_book"];

const enchantOptions = [
    {
        enchantment: "unbreaking",
        maxLevel: 3,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:obsidian", 2], ["minecraft:iron_ingot", 3.5]]
    },
    {
        enchantment: "efficiency",
        maxLevel: 5,
        costPerLevel: 1.5,
        itemsPerLevel: [["minecraft:iron_ingot", 2.2], ["minecraft:diamond", 0.2], ["minecraft:lapis_lazuli", 2.5]]
    },
    {
        enchantment: "fortune",
        maxLevel: 3,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:gold_ingot", 2.5], ["minecraft:diamond", 1], ["mm:azsilva_ingot", 5]]
    },
    {
        enchantment: "silk_touch",
        maxLevel: 1,
        costPerLevel: 15,
        itemsPerLevel: [["minecraft:stone", 16], ["minecraft:gold_ingot", 12], ["minecraft:amethyst_shard", 24], ["mm:azsilva_ingot", 8]]
    },
    {
        enchantment: "protection",
        maxLevel: 4,
        costPerLevel: 2,
        itemsPerLevel: [["minecraft:iron_ingot", 4], ["minecraft:copper_ingot", 6], ["minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "fire_protection",
        maxLevel: 4,
        costPerLevel: 1.5,
        itemsPerLevel: [["minecraft:blaze_powder", 3], ["minecraft:iron_ingot", 3], ["minecraft:copper_ingot", 6], ["minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "projectile_protection",
        maxLevel: 4,
        costPerLevel: 1.5,
        itemsPerLevel: [["minecraft:pointed_dripstone", 4], ["minecraft:iron_ingot", 3], ["minecraft:copper_ingot", 6], ["minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "blast_protection",
        maxLevel: 4,
        costPerLevel: 1.5,
        itemsPerLevel: [["minecraft:gunpowder", 3], ["minecraft:iron_ingot", 3], ["minecraft:copper_ingot", 6], ["minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "feather_falling",
        maxLevel: 4,
        costPerLevel: 2,
        itemsPerLevel: [["minecraft:feather", 6], ["minecraft:phantom_membrane", 0.33], ["minecraft:gold_ingot", 2]]
    },
    {
        enchantment: "thorns",
        maxLevel: 3,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:pointed_dripstone", 3], ["minecraft:vine", 4.5], ["minecraft:cactus", 5]]
    },
    {
        enchantment: "aqua_affinity",
        maxLevel: 1,
        costPerLevel: 5,
        itemsPerLevel: [["minecraft:heart_of_the_sea", 1], ["minecraft:kelp", 32], ["minecraft:turtle_scute", 2]]
    },
    {
        enchantment: "respiration",
        maxLevel: 3,
        costPerLevel: 2,
        itemsPerLevel: [["minecraft:nautilus_shell", 2.333], ["minecraft:dried_kelp", 4], ["minecraft:prismarine_crystals", 4]]
    },
    {
        enchantment: "depth_strider",
        maxLevel: 3,
        costPerLevel: 2,
        itemsPerLevel: [["minecraft:prismarine_shard", 4], ["minecraft:prismarine_crystals", 2.5], ["minecraft:gold_ingot", 3]]
    },
    {
        enchantment: "sharpness",
        maxLevel: 5,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:diamond", 0.3], ["minecraft:iron_ingot", 4.5], ["minecraft:flint", 3]]
    },
    {
        enchantment: "smite",
        maxLevel: 5,
        costPerLevel: 1.3,
        itemsPerLevel: [["minecraft:iron_ingot", 3.5], ["minecraft:gold_ingot", 2], ["minecraft:bone", 8]]
    },
    {
        enchantment: "bane_of_arthropods",
        maxLevel: 5,
        costPerLevel: 1.3,
        itemsPerLevel: [["minecraft:iron_ingot", 3.5], ["minecraft:string", 4], ["minecraft:spider_eye", 2]]
    },
    {
        enchantment: "looting",
        maxLevel: 3,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:diamond", 1], ["minecraft:emerald", 6], ["minecraft:quartz", 12]]
    },
    {
        enchantment: "fire_aspect",
        maxLevel: 2,
        costPerLevel: 3,
        itemsPerLevel: [["mm:blaze_soul", 2], ["minecraft:nether_wart", 4], ["minecraft:lava_bucket", 0.1]]
    },
    {
        enchantment: "knockback",
        maxLevel: 2,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:wind_charge", 12], ["minecraft:copper_ingot", 4], ["minecraft:feather", 5]]
    },
    {
        enchantment: "power",
        maxLevel: 5,
        costPerLevel: 2,
        itemsPerLevel: [["minecraft:iron_ingot", 4], ["minecraft:arrow", 8], ["minecraft:diamond", 0.5]]
    },
    {
        enchantment: "punch",
        maxLevel: 2,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:breeze_rod", 2], ["minecraft:flint", 4], ["minecraft:feather", 5]]
    },
    {
        enchantment: "flame",
        maxLevel: 1,
        costPerLevel: 8,
        itemsPerLevel: [["minecraft:blaze_rod", 4], ["minecraft:magma_cream", 4], ["minecraft:arrow", 8]]
    },
    {
        enchantment: "infinity",
        maxLevel: 1,
        costPerLevel: 10,
        itemsPerLevel: [["minecraft:arrow", 64], ["mm:azsilva_ingot", 16]]
    },
    {
        enchantment: "piercing",
        maxLevel: 4,
        costPerLevel: 1,
        itemsPerLevel: [["minecraft:arrow", 4], ["minecraft:pointed_dripstone", 2], ["minecraft:iron_ingot", 3]]
    },
    {
        enchantment: "quick_charge",
        maxLevel: 3,
        costPerLevel: 1.5,
        itemsPerLevel: [["minecraft:sugar", 1.5], ["minecraft:copper_ingot", 4], ["mm:azsilva_ingot", 1]]
    },
    {
        enchantment: "multishot",
        maxLevel: 1,
        costPerLevel: 5,
        itemsPerLevel: [["minecraft:arrow", 16], ["minecraft:iron_ingot", 8], ["mm:azsilva_ingot", 3]]
    },
    {
        enchantment: "density",
        maxLevel: 5,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:obsidian", 12.8], ["minecraft:diamond", 0.25], ["minecraft:iron_ingot", 6]]
    },
    {
        enchantment: "breach",
        maxLevel: 4,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:iron_block", 0.3], ["minecraft:wind_charge", 3.5], ["minecraft:gold_ingot", 6]]
    },
    {
        enchantment: "impaling",
        maxLevel: 5,
        costPerLevel: 1.5,
        itemsPerLevel: [["minecraft:prismarine_shard", 5], ["minecraft:nautilus_shell", 1], ["minecraft:gold_ingot", 2.5]]
    },
    {
        enchantment: "riptide",
        maxLevel: 3,
        costPerLevel: 4,
        itemsPerLevel: [["minecraft:prismarine_crystals", 4], ["minecraft:wind_charge", 4], ["minecraft:amethyst_shard", 2]]
    },
    {
        enchantment: "channeling",
        maxLevel: 1,
        costPerLevel: 16,
        itemsPerLevel: [["minecraft:heart_of_the_sea", 1], ["minecraft:quartz", 16], ["minecraft:copper_ingot", 32]]
    },
    {
        enchantment: "loyalty",
        maxLevel: 3,
        costPerLevel: 4,
        itemsPerLevel: [["minecraft:prismarine_crystals", 6], ["mm:azsilva_ingot", 4]]
    },
    {
        enchantment: "luck_of_the_sea",
        maxLevel: 3,
        costPerLevel: 1,
        itemsPerLevel: [["minecraft:prismarine_crystals", 2], ["minecraft:gold_ingot", 6]]
    },
    {
        enchantment: "lure",
        maxLevel: 3,
        costPerLevel: 1,
        itemsPerLevel: [["minecraft:prismarine_shard", 2], ["minecraft:tropical_fish", 2]]
    },
    {
        enchantment: "lunge",
        maxLevel: 3,
        costPerLevel: 2,
        itemsPerLevel: [["minecraft:wind_charge", 2], ["mm:azsilva_ingot", 1.5], ["minecraft:amethyst_shard", 2]]
    },
    {
        enchantment: "mending",
        maxLevel: 1,
        costPerLevel: 8,
        itemsPerLevel: [["mm:experience_orb", 4], ["minecraft:echo_shard", 0.1]]
    },
    {
        enchantment: "frost_walker",
        maxLevel: 2,
        costPerLevel: 3,
        itemsPerLevel: [["minecraft:ice", 8], ["minecraft:blue_ice", 2],["minecraft:echo_shard", 0.1]]
    },
    {
        enchantment: "swift_sneak",
        maxLevel: 3,
        costPerLevel: 8,
        itemsPerLevel: [["minecraft:sculk", 8],["minecraft:echo_shard", 0.1]]
    },
    {
        enchantment: "soul_speed",
        maxLevel: 3,
        costPerLevel: 8,
        itemsPerLevel: [["minecraft:soul_sand", 8],["minecraft:echo_shard", 0.1]]
    },
    {
        enchantment: "wind_burst",
        maxLevel: 3,
        costPerLevel: 8,
        itemsPerLevel: [["minecraft:wind_charge", 6],["minecraft:echo_shard", 0.1]]
    }
]

const customCosts = [
    { enchantName: "extension", costPerLevel: 3, itemsPerLevel: [["mm:twisted_cord", 4]] },
    { enchantName: "reeling", costPerLevel: 2, itemsPerLevel: [["minecraft:string", 5]] },
    { enchantName: "tether", costPerLevel: 6, itemsPerLevel: [["minecraft:lead", 1], ["mm:twisted_cord", 3]] },
    { enchantName: "clashing", costPerLevel: 2, itemsPerLevel: [["minecraft:iron_ingot", 4]] },
    { enchantName: "ruthless", costPerLevel: 3, itemsPerLevel: [["minecraft:bone", 6],["minecraft:iron_block", 0.1]] },
    { enchantName: "frozen_touch", costPerLevel: 4, itemsPerLevel: [["mm:permafrost_crystal", 3]] },
    { enchantName: "boomburst", costPerLevel: 4, itemsPerLevel: [["minecraft:gunpowder", 6]] },
    { enchantName: "starshot", costPerLevel: 10, itemsPerLevel: [["minecraft:nether_star", 1]] },
    { enchantName: "chaos_buster", costPerLevel: 6, itemsPerLevel: [["minecraft:ender_pearl", 4],["minecraft:gunpowder", 3]] },
    { enchantName: "draining", costPerLevel: 3, itemsPerLevel: [["minecraft:ghast_tear", 1.5]] },
    { enchantName: "toxicity", costPerLevel: 8, itemsPerLevel: [["minecraft:spider_eye", 6],["mm:vampire_fang", 2]] }
]

function vanillaId(name) {
    return name.startsWith("minecraft:") ? name : "minecraft:" + name;
}
function stripId(id) {
    return id.startsWith("minecraft:") ? id.slice("minecraft:".length) : id;
}

function isPonderItem(item) {
    return acceptedItems.includes(item.typeId);
}

function isCreative(player) {
    return player.getGameMode() === GameMode.Creative;
}

function isCustomEnchant(name) {
    return customList.includes(name);
}

function getEnchantDef(name) {
    if (isCustomEnchant(name)) {
        const meta = customData.find(entry => entry.enchantName === name);
        const cost = customCosts.find(entry => entry.enchantName === name);
        if (!meta || !cost) return undefined;
        return {
            maxLevel: meta.maxLevel,
            costPerLevel: cost.costPerLevel,
            itemsPerLevel: cost.itemsPerLevel,
            incompatibleWith: meta.incompatibleWith || []
        };
    } else {
        const cost = enchantOptions.find(entry => entry.enchantment === name);
        if (!cost) return undefined;
        const compat = enchantData.find(entry => entry.enchantName === name);
        return {
            maxLevel: cost.maxLevel,
            costPerLevel: cost.costPerLevel,
            itemsPerLevel: cost.itemsPerLevel,
            incompatibleWith: (compat && compat.incompatibleWith) || []
        };
    }
}

function getCurrentLevel(item, enchantable, name) {
    if (isCustomEnchant(name)) {
        const value = item.getDynamicProperty("mm:ponder_enchant_" + name);
        return typeof value === "number" ? value : 0;
    }
    if (!enchantable) return 0;
    const current = enchantable.getEnchantment(vanillaId(name));
    return current ? current.level : 0;
}

function getOptions(item) {
    if (!isPonderItem(item)) return undefined;

    const enchantable = item.getComponent("enchantable");
    const vanillaCurrent = enchantable ? enchantable.getEnchantments().map(entry => stripId(entry.type.id)) : [];
    const customCurrent = [];
    for (const property of item.getDynamicPropertyIds()) {
        if (property.startsWith("mm:ponder_enchant_")) {
            customCurrent.push(property.slice("mm:ponder_enchant_".length));
        }
    }
    const alreadyOnItem = [...vanillaCurrent, ...customCurrent];

    const result = [];
    for (const name of enchantmentsList) {
        const def = getEnchantDef(name);
        if (!def) continue;

        if (alreadyOnItem.includes(name)) {
            const currentLevel = getCurrentLevel(item, enchantable, name);
            if (currentLevel < def.maxLevel) result.push(name);
            continue;
        }

        let blocked = false;
        for (const other of alreadyOnItem) {
            if (def.incompatibleWith.includes(other)) { blocked = true; break; }
            const otherDef = getEnchantDef(other);
            if (otherDef && otherDef.incompatibleWith.includes(name)) { blocked = true; break; }
        }
        if (!blocked) result.push(name);
    }
    return result;
}

function countItem(container, itemId) {
    let total = 0;
    for (let slotIndex = 0; slotIndex < container.size; slotIndex++) {
        const stack = container.getItem(slotIndex);
        if (stack && stack.typeId === itemId) total += stack.amount;
    }
    return total;
}

function removeItemAmount(container, itemId, amount) {
    let remaining = amount;
    for (let slotIndex = 0; slotIndex < container.size && remaining > 0; slotIndex++) {
        const stack = container.getItem(slotIndex);
        if (stack && stack.typeId === itemId) {
            const take = Math.min(stack.amount, remaining);
            remaining -= take;
            if (take >= stack.amount) {
                container.setItem(slotIndex, undefined);
            } else {
                const reduced = stack.clone();
                reduced.amount = stack.amount - take;
                container.setItem(slotIndex, reduced);
            }
        }
    }
}

const localizationKeyCache = new Map();
function itemLocalizationKey(itemId) {
    if (!localizationKeyCache.has(itemId)) {
        localizationKeyCache.set(itemId, new ItemStack(itemId).localizationKey);
    }
    return localizationKeyCache.get(itemId);
}

function refund(player, container, expCost, itemCosts) {
    player.addLevels(expCost);
    for (const cost of itemCosts) {
        container.addItem(new ItemStack(cost.id, cost.amount));
    }
}

function convertToPonderItem(sourceItem) {
    if (sourceItem.typeId === "mm:pondering_book") return sourceItem;

    const newItem = new ItemStack("mm:pondering_book", 1);

    if (sourceItem.nameTag) newItem.nameTag = sourceItem.nameTag;
    const lore = sourceItem.getLore();
    if (lore && lore.length > 0) newItem.setLore(lore);

    for (const key of sourceItem.getDynamicPropertyIds()) {
        newItem.setDynamicProperty(key, sourceItem.getDynamicProperty(key));
    }

    const sourceEnchantable = sourceItem.getComponent("enchantable");
    const destinationEnchantable = newItem.getComponent("enchantable");
    if (sourceEnchantable && destinationEnchantable) {
        for (const enchant of sourceEnchantable.getEnchantments()) {
            destinationEnchantable.addEnchantment(enchant);
        }
    }

    return newItem;
}

const activeIntervals = new Map();

function blockKey(block) {
    return `${block.dimension.id}:${block.location.x},${block.location.y},${block.location.z}`;
}

function heldItemMatches(player, item, block) {
    const held = player.getComponent("equippable").getEquipment("Mainhand");
    if (!held || held.typeId !== item.typeId) {
        player.sendMessage({ translate: "orb_ponderer.no_pondering_book" });
        player.dimension.playSound("block.end_portal_frame.fill", player.location, { volume: 1, pitch: 0.3 });
        stopUsing(block);
        return false;
    }
    return true;
}

function selectEnchant(player, item, block, options) {
    if (options == undefined || options.length === 0) return stopUsing(block);
    if (!heldItemMatches(player, item, block)) return;

    const form = new ActionFormData()
        .title("mm:orb_ponderer_grid_menu")
        .body("Select an Enchantment");
    for (const option of options) {
        form.button({ translate: "orb_ponderer." + option }, "textures/ui/form/enchantment/" + option);
    }

    form.show(player).then(response => {
        if (response.canceled) return stopUsing(block);
        if (!heldItemMatches(player, item, block)) return;
        selectLevel(player, item, block, options[response.selection]);
    }).catch(error => {
        console.error(error, error.stack);
        stopUsing(block);
    });
}

function selectLevel(player, item, block, choice) {
    if (choice == undefined) return stopUsing(block);
    if (!heldItemMatches(player, item, block)) return;

    const def = getEnchantDef(choice);
    const enchantable = item.getComponent("enchantable");
    const currentLevel = getCurrentLevel(item, enchantable, choice);
    const minLevel = currentLevel > 0 ? currentLevel + 1 : 1;
    if (minLevel > def.maxLevel) return stopUsing(block);

    const form = new ModalFormData()
        .title({ translate: "orb_ponderer.select_level" })
        .label({ translate: "orb_ponderer." + choice })
        .slider({ translate: "orb_ponderer.level_label" }, minLevel, def.maxLevel)
        .submitButton({ translate: "orb_ponderer.confirm" });

    form.show(player).then(response => {
        if (response.canceled) return stopUsing(block);
        if (!heldItemMatches(player, item, block)) return;
        const level = response.formValues[response.formValues.length - 1];
        confirmCost(player, item, block, choice, level, currentLevel);
    }).catch(error => {
        console.error(error, error.stack);
        stopUsing(block);
    });
}

function confirmCost(player, item, block, choice, level, currentLevel) {
    if (!heldItemMatches(player, item, block)) return;

    const def = getEnchantDef(choice);
    const levelsApplied = level - currentLevel;
    const expCost = Math.floor(def.costPerLevel * levelsApplied);
    const itemCosts = def.itemsPerLevel
        .map(([id, perLevel]) => ({ id, localizationKey: itemLocalizationKey(id), amount: Math.ceil(perLevel * levelsApplied) }))
        .filter(cost => cost.amount > 0);

    const creative = isCreative(player);
    const inventory = player.getComponent("inventory").container;
    const canAffordExp = creative || player.level >= expCost;
    const itemAffordability = itemCosts.map(cost => ({
        ...cost,
        affordable: creative || countItem(inventory, cost.id) >= cost.amount
    }));
    if(def.maxLevel == 1) {}
    const bodyRawtext = [
        { text: "§d" },
        { translate: "orb_ponderer." + choice },
        { text: " " },
        def.maxLevel == 1 ? {text: ""} : { translate: `enchantment.level.${level}` },
        { text: "§9\n" },
        { translate: `orb_ponderer.${choice}.desc` },
        { text: "§r\n\n" },
        { text: canAffordExp ? "§a" : "§c" },
        { translate: "orb_ponderer.experience_levels" },
        { text: ` x${expCost}§r\n` }
    ];
    for (const cost of itemAffordability) {
        bodyRawtext.push({ text: cost.affordable ? "§a" : "§c" });
        bodyRawtext.push({ translate: cost.localizationKey });
        bodyRawtext.push({ text: ` x${cost.amount}§r\n` });
    }
    if (creative) {
        bodyRawtext.push({ text: "\n§7" });
        bodyRawtext.push({ translate: "orb_ponderer.creative_no_cost" });
        bodyRawtext.push({ text: "§r" });
    }

    const form = new ActionFormData()
    form.title({ translate: "orb_ponderer.confirm_title" })
    form.body({ rawtext: bodyRawtext })
    form.button({ translate: "orb_ponderer.confirm" })
    form.button({ translate: "orb_ponderer.back" })
    form.button({ translate: "orb_ponderer.cancel" });

    form.show(player).then(response => {
        if (response.canceled) return stopUsing(block);
        if (!heldItemMatches(player, item, block)) return;

        if (response.selection === 1) {
            return selectLevel(player, item, block, choice);
        }
        if (response.selection === 2) {
            return stopUsing(block);
        }

        if (!isCreative(player)) {
            const inventoryNow = player.getComponent("inventory").container;
            const canAffordExpNow = player.level >= expCost;
            const canAffordItemsNow = itemCosts.every(cost => countItem(inventoryNow, cost.id) >= cost.amount);
            if (!canAffordExpNow || !canAffordItemsNow) {
                player.sendMessage({ translate: !canAffordExpNow ? "orb_ponderer.not_enough_exp" : "orb_ponderer.not_enough_items" });
                player.dimension.playSound("block.end_portal_frame.fill", player.location, { volume: 1, pitch: 0.3 });
                return stopUsing(block);
            }
        }

        applyEnchant(player, item, block, choice, level, expCost, itemCosts);
    }).catch(error => {
        console.error(error, error.stack);
        stopUsing(block);
    });
}

function applyEnchant(player, item, block, choice, level, expCost, itemCosts) {
    const equippable = player.getComponent("equippable");
    const slot = equippable.getEquipmentSlot("Mainhand");
    const heldItem = slot.getItem();

    if (!heldItem || heldItem.typeId !== item.typeId) {
        player.sendMessage({ translate: "orb_ponderer.no_pondering_book" });
        return stopUsing(block);
    }

    const creative = isCreative(player);
    const inventory = player.getComponent("inventory").container;
    if (!creative) {
        if (player.level < expCost) {
            player.sendMessage({ translate: "orb_ponderer.not_enough_exp" });
            player.dimension.playSound("block.orb_ponderer.fail", block.location, { volume: 1 });
            player.dimension.playSound("block.end_portal_frame.fill", player.location, { volume: 1, pitch: 0.3 });
            return stopUsing(block);
        }
        for (const cost of itemCosts) {
            if (countItem(inventory, cost.id) < cost.amount) {
                player.sendMessage({ translate: "orb_ponderer.not_enough_items" });
                player.dimension.playSound("block.orb_ponderer.fail", block.location, { volume: 1 });
                player.dimension.playSound("block.end_portal_frame.fill", player.location, { volume: 1, pitch: 0.3 });
                return stopUsing(block);
            }
        }

        player.addLevels(-expCost);
        for (const cost of itemCosts) removeItemAmount(inventory, cost.id, cost.amount);
    }

    let workingItem = convertToPonderItem(heldItem);

    if (isCustomEnchant(choice)) {
        const [resultItem, error] = applyCustomEnchant(workingItem, choice, level);
        if (!resultItem) {
            console.warn("orbPonderer: applyCustomEnchant rejected " + choice + ": " + error);
            if (!creative) refund(player, inventory, expCost, itemCosts);
            player.sendMessage({ translate: "orb_ponderer.enchant_failed" });
            player.dimension.playSound("block.orb_ponderer.fail", block.location, { volume: 1 });
            return stopUsing(block);
        }
        workingItem = resultItem;
    } else {
        const enchantable = workingItem.getComponent("enchantable");
        enchantable.addEnchantment({ type: new EnchantmentType(vanillaId(choice)), level });
    }

    slot.setItem(workingItem);
    player.dimension.playSound("block.orb_ponderer.success", block.location, { volume: 1 });
    stopUsing(block);
}

function stopUsing(block) {
    const key = blockKey(block);
    const intervalId = activeIntervals.get(key);
    if (intervalId !== undefined) {
        system.clearRun(intervalId);
        activeIntervals.delete(key);
    }
    if (!block.dimension.isChunkLoaded(block.location)) return;
    if (block.typeId !== "mm:orb_ponderer") return;
    block.setPermutation(block.permutation.withState("mm:in_use", false));
    for (const player of block.dimension.getPlayers({ location: block.location, maxDistance: 16 })) {
        player.runCommand("stopsound @s block.orb_ponderer.idle");
    }
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:orb_ponderer", {
        onPlayerInteract(interactEvent) {
            const player = interactEvent.player;
            const block = interactEvent.block;
            const item = player.getComponent("minecraft:equippable").getEquipmentSlot("Mainhand").getItem();
            const dimension = block.dimension;
            const location = block.location;

            if (!item) {
                player.sendMessage({ translate: "orb_ponderer.no_held_item" });
                dimension.playSound("block.end_portal_frame.fill", location, { volume: 1, pitch: 0.3 });
                return;
            }
            if (!isPonderItem(item)) {
                player.sendMessage({ translate: "orb_ponderer.no_pondering_book" });
                dimension.playSound("block.end_portal_frame.fill", location, { volume: 1, pitch: 0.3 });
                return;
            }
            if (item.typeId !== "minecraft:book" && !item.hasComponent("minecraft:enchantable")) {
                return;
            }
            if (item.amount > 1) {
                player.sendMessage({ translate: "orb_ponderer.stack_too_large" });
                dimension.playSound("block.end_portal_frame.fill", location, { volume: 1, pitch: 0.3 });
                return;
            }

            const perm = block.permutation;
            if (perm.getState("mm:in_use") == true) {
                player.sendMessage({ translate: "orb_ponderer.in_use" });
                dimension.playSound("block.end_portal_frame.fill", location, { volume: 1, pitch: 0.3 });
                return;
            }

            const options = getOptions(item);
            if (options.length == 0) {
                player.sendMessage({ translate: "orb_ponderer.no_enchants_avaliable" });
                dimension.playSound("block.end_portal_frame.fill", location, { volume: 1, pitch: 0.3 });
                return;
            }
            selectEnchant(player, item, block, options);
            dimension.playSound("block.orb_ponderer.idle", location, { volume: 0.6 });

            block.setPermutation(perm.withState("mm:in_use", true));
            const intervalId = system.runInterval(() => {
                if (!dimension.isChunkLoaded(location)) return;
                const currentBlock = dimension.getBlock(location);
                if (!currentBlock || currentBlock.typeId !== "mm:orb_ponderer") return;
                if (currentBlock.permutation.getState("mm:in_use") == false) return;

                const players = dimension.getPlayers({ location: location, maxDistance: 4 });
                if (players.length == 0) {
                    stopUsing(currentBlock);
                } else {
                    dimension.playSound("block.orb_ponderer.idle", location, { volume: 0.6 });
                }
            }, 120);
            activeIntervals.set(blockKey(block), intervalId);
        },
        onPlace(placeEvent) {
            const entityCheck = placeEvent.dimension.getEntitiesAtBlockLocation(placeEvent.block.center());
            for (const entity of entityCheck) {
                if (entity.typeId == "mm:orb_ponderer_orb") return;
            }
            placeEvent.dimension.spawnEntity("mm:orb_ponderer_orb", placeEvent.block.bottomCenter());
        },
        onTick(tickEvent) {
            const center = tickEvent.block.center();
            const location = { x: center.x, y: center.y + 0.6, z: center.z };
            tickEvent.dimension.spawnParticle("mm:orb_ponderer", location);
            const perm = tickEvent.block.permutation;
            if (perm.getState("mm:in_use") == true) {
                tickEvent.dimension.spawnParticle("mm:orb_ponderer_activated", location);
            }
            const entityCheck = tickEvent.dimension.getEntitiesAtBlockLocation(center);
            for (const entity of entityCheck) {
                if (entity.typeId == "mm:orb_ponderer_orb") return;
            }
            tickEvent.dimension.spawnEntity("mm:orb_ponderer_orb", tickEvent.block.bottomCenter());
        },
        onPlayerBreak(breakEvent) {
            stopUsing(breakEvent.block);
        }
    });
});

world.afterEvents.dataDrivenEntityTrigger.subscribe((triggerEvent) => {
    if (triggerEvent.eventId !== "mm:kill") return;
    const entity = triggerEvent.entity;
    if (entity.typeId !== "mm:orb_ponderer_orb") return;
    if (entity.isValid) entity.remove();
});