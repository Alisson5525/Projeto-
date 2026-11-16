import { system, world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

var gameStart = false;
system.runTimeout(() => {
  gameStart = true   
}, 50)

world.afterEvents.playerInventoryItemChange.subscribe((e) => {
    if(!gameStart) return;
    if(!advancementsEnabled) return;
    const item = e.itemStack;
    if (!item) return;
    const before = e.beforeItemStack;
    if (before) {
        if (item.typeId == before.typeId) {
            if (before.amount > item.amount) return;
        }
    }
    if (!e.player.hasTag("aly:mm_enabled")) return;
    if (item.getComponent("mm:mystery_scroll") && !e.player.hasTag("adv:mm:secrets_secrets")) grantAdvancement(e.player, "mm:secrets_secrets")
    for (const advancement of advancementData) {
        if (advancement.items.includes(item.typeId.replace("mm:", ""))) {
            grantAdvancement(e.player, advancement.id)
        }
    }
})


const advancementData = [
    {
        id: "mm:just_getting_started",
        items: ["black_spell_book", "gray_spell_book", "light_gray_spell_book", "white_spell_book", "brown_spell_book", "red_spell_book", "orange_spell_book", "yellow_spell_book", "lime_spell_book", "green_spell_book", "blue_spell_book", "cyan_spell_book", "light_blue_spell_book", "purple_spell_book", "magenta_spell_book", "pink_spell_book", "spell_book"]
    },
    {
        id: "mm:stylish_spellcasting",
        items: ["ember_mask", "boulder_mask", "breeze_mask", "thunder_mask", "frost_mask"]
    },
    {
        id: "mm:trinket_collector",
        items: ["amulet_core"]
    },
    {
        id: "mm:special_silverwear",
        items: ["azsilva_helmet", "azsilva_chestplate", "azsilva_leggings", "azsilva_boots"]
    },
    {
        id: "mm:super_speed",
        items: ["icarus_boots"]
    },
    {
        id: "mm:take_good_care",
        items: ["pink_plushie"]
    },
    {
        id: "mm:pure_stardust",
        items: ["meteor_ingot"]
    },
    {
        id: "mm:pressure_watcher",
        items: ["unobtanium_clock"]
    }
]