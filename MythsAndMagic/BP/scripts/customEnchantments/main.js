
import "./lootTables.js"
import "./orbPonderer.js"
import "./enchantFunctions.js"
import "./ponderingTome.js"
import "./removeIncompatibles.js"
import "./enchantmentBehaviour.js"


const enchantData = [
    {
        enchantName: "sharpness",
        incompatibleWith: ["smite", "bane_of_arthropods", "impaling", "density", "breach", "draining", "clashing"],
        appliesToSlots: ["Sword", "Axe", "MeleeSpear"],
        maxLevel: 5
    },
    {
        enchantName: "smite",
        incompatibleWith: ["sharpness", "bane_of_arthropods", "impaling", "density", "breach", "clashing"],
        appliesToSlots: ["Sword", "Axe", "MeleeSpear"],
        appliesToItems: ["minecraft:mace"],
        maxLevel: 5
    },
    {
        enchantName: "bane_of_arthropods",
        incompatibleWith: ["sharpness", "smite", "impaling", "density", "breach", "clashing"],
        appliesToSlots: ["Sword", "Axe", "MeleeSpear"],
        appliesToItems: ["minecraft:mace"],
        maxLevel: 5
    },
    {
        enchantName: "blast_protection",
        incompatibleWith: ["protection", "fire_protection", "projectile_protection"],
        appliesToSlots: ["ArmorFeet", "ArmorLegs", "ArmorTorso","ArmorHead"],
        maxLevel: 4
    },
    {
        enchantName: "fire_protection",
        incompatibleWith: ["protection", "blast_protection", "projectile_protection"],
        appliesToSlots: ["ArmorFeet", "ArmorLegs", "ArmorTorso","ArmorHead"],
        maxLevel: 4
    },
    {
        enchantName: "projectile_protection",
        incompatibleWith: ["protection", "fire_protection", "blast_protection"],
        appliesToSlots: ["ArmorFeet", "ArmorLegs", "ArmorTorso","ArmorHead"],
        maxLevel: 4
    },
    {
        enchantName: "protection",
        incompatibleWith: ["blast_protection", "fire_protection", "projectile_protection"],
        appliesToSlots: ["ArmorFeet", "ArmorLegs", "ArmorTorso","ArmorHead"],
        maxLevel: 4
    },
    {
        enchantName: "thorns",
        appliesToSlots: ["ArmorFeet", "ArmorLegs", "ArmorTorso","ArmorHead"],
        maxLevel: 3
    },
    {
        enchantName: "density",
        incompatibleWith: ["sharpness", "bane_of_arthropods", "smite", "breach", "impaling"],
        appliesToItems:["minecraft:mace"],
        maxLevel: 5
    },
    {
        enchantName: "breach",
        incompatibleWith: ["sharpness", "bane_of_arthropods", "smite", "density", "impaling"],
        appliesToItems:["minecraft:mace"],
        maxLevel: 4
    },
    {
        enchantName: "impaling",
        incompatibleWith: ["sharpness", "bane_of_arthropods", "smite", "density", "breach"],
        appliesToSlots:["Spear"],
        maxLevel: 5
    },
    {
        enchantName: "channeling",
        incompatibleWith: ["riptide"],
        appliesToSlots:["Spear"],
        maxLevel: 1
    },
    {
        enchantName: "loyalty",
        incompatibleWith: ["riptide"],
        appliesToSlots:["Spear"],
        maxLevel: 3
    },
    {
        enchantName: "riptide",
        incompatibleWith: ["channeling", "loyalty"],
        appliesToSlots:["Spear"],
        maxLevel: 3
    },
    {
        enchantName: "frost_walker",
        incompatibleWith: ["depth_strider"],
        appliesToSlots:["ArmorFeet"],
        maxLevel: 2
    },
    {
        enchantName: "depth_strider",
        incompatibleWith: ["frost_walker"],
        appliesToSlots:["ArmorFeet"],
        maxLevel: 3
    },
    {
        enchantName: "efficiency",
        appliesToSlots:["Pickaxe", "Axe", "Shovel", "Hoe", "Shears"],
        maxLevel: 5
    },
    {
        enchantName: "fortune",
        incompatibleWith: ["silk_touch"],
        appliesToSlots:["Pickaxe", "Axe", "Shovel", "Hoe"],
        maxLevel: 3
    },
    {
        enchantName: "silk_touch",
        incompatibleWith: ["fortune"],
        appliesToSlots:["Pickaxe", "Axe", "Shovel", "Hoe"],
        maxLevel: 1
    },
    {
        enchantName: "infinity",
        incompatibleWith: ["mending"],
        appliesToSlots:["Bow"],
        maxLevel: 1
    },
    {
        enchantName: "mending",
        incompatibleWith: ["infinity"],
        appliesToSlots:["ArmorFeet", "ArmorLegs","ArmorChest","ArmorHead","Axe","Bow","CarrotStick","CosmeticHead","Crossbow","Elytra","FishingRod","Flintsteel","Hoe","MeleeSpear","Pickaxe","Shears","Shield","Shovel","Spear","Sword"],
        appliesToItems:["minecraft:mace"],
        maxLevel: 1
    },
    {
        enchantName: "unbreaking",
        appliesToSlots:["ArmorFeet", "ArmorLegs","ArmorChest","ArmorHead","Axe","Bow","CarrotStick","CosmeticHead","Crossbow","Elytra","FishingRod","Flintsteel","Hoe","MeleeSpear","Pickaxe","Shears","Shield","Shovel","Spear","Sword"],
        appliesToItems:["minecraft:mace"],
        maxLevel: 3
    },
    {
        enchantName: "multishot",
        incompatibleWith: ["piercing"],
        appliesToSlots:["Crossbow"],
        maxLevel: 1
    },
    {
        enchantName: "piercing",
        incompatibleWith: ["multishot"],
        appliesToSlots:["Crossbow"],
        maxLevel: 4
    },
    {
        enchantName: "soul_speed",
        appliesToSlots:["ArmorFeet"],
        maxLevel: 3
    },
    {
        enchantName: "feather_falling",
        appliesToSlots:["ArmorFeet"],
        maxLevel: 4
    },
    {
        enchantName: "wind_burst",
        appliesToItems:["minecraft:mace"],
        maxLevel: 3
    },
    {
        enchantName: "swift_sneak",
        appliesToSlots:["ArmorLegs"],
        maxLevel: 3
    },
    {
        enchantName: "lunge",
        appliesToSlots:["MeleeSpear"],
        maxLevel: 3
    },
    {
        enchantName: "looting",
        appliesToSlots:["Sword","MeleeSpear"],
        maxLevel: 3
    },
    {
        enchantName: "fire_aspect",
        incompatibleWith:["frozen_touch", "toxicity"],
        appliesToSlots:["Sword","MeleeSpear"],
        appliesToItems:["minecraft:mace"],
        maxLevel: 2
    },
    {
        enchantName: "knockback",
        appliesToSlots:["Sword","MeleeSpear"],
        maxLevel: 2
    },
    {
        enchantName: "power",
        appliesToSlots:["Bow"],
        maxLevel: 5
    },
    {
        enchantName: "punch",
        appliesToSlots:["Bow"],
        maxLevel: 2
    },
    {
        enchantName: "flame",
        appliesToSlots:["Bow"],
        maxLevel: 1
    },
    {
        enchantName: "quick_charge",
        appliesToSlots:["Crossbow"],
        maxLevel: 3
    },
    {
        enchantName: "respiration",
        appliesToSlots:["ArmorHead"],
        maxLevel: 3
    },
    {
        enchantName: "aqua_affinity",
        appliesToSlots:["ArmorHead"],
        maxLevel: 1
    },
    {
        enchantName: "luck_of_the_sea",
        appliesToSlots: ["FishingRod"],
        maxLevel: 3
    },
    {
        enchantName: "lure",
        appliesToSlots: ["FishingRod"],
        maxLevel: 3
    }
]
const enchantmentsList = [
    "sharpness",
    "smite",
    "bane_of_arthropods",
    "looting",
    "fire_aspect",
    "knockback",
    "unbreaking",
    "mending",
    "lunge",
    "efficiency",
    "fortune",
    "silk_touch",
    "power",
    "punch",
    "flame",
    "infinity",
    "quick_charge",
    "multishot",
    "piercing",
    "density",
    "breach",
    "wind_burst",
    "impaling",
    "loyalty",
    "channeling",
    "riptide",
    "protection",
    "fire_protection",
    "projectile_protection",
    "blast_protection",
    "thorns",
    "respiration",
    "aqua_affinity",
    "swift_sneak",
    "depth_strider",
    "frost_walker",
    "soul_speed",
    "feather_falling",
    "luck_of_the_sea",
    "lure",
    "extension",
    "reeling",
    "tether",
    "clashing",
    "ruthless",
    //"boomburst",
    //"starshot",
    //"chaos_buster",
    "frozen_touch",
    "draining",
    "toxicity"
]
const customList = [
    "extension",
    "reeling",
    "tether",
    "clashing",
    "ruthless",
    //"boomburst",
    //"starshot",
    //"chaos_buster",
    "frozen_touch",
    "draining",
    "toxicity"
]
const customData = [
    {
        enchantName: "extension",
        maxLevel: 2,
        incompatibleWith: ["tether"],
        appliesToItems:["mm:longshot"]
    },
    {
        enchantName: "reeling",
        maxLevel: 4,
        incompatibleWith: ["tether"],
        appliesToItems:["mm:longshot"]
    },
    {
        enchantName: "tether",
        maxLevel: 1,
        incompatibleWith: ["extension", "reeling"],
        appliesToItems:["mm:longshot"]
    },
    {
        enchantName: "clashing",
        maxLevel: 5,
        incompatibleWith: ["sharpness", "smite", "bane_of_arthropods", "ruthless"],
        appliesToItems:["mm:wooden_halberd", "mm:stone_halberd", "mm:golden_halberd", "mm:iron_halberd", "mm:diamond_halberd", "mm:netherite_halberd", "mm:azsilva_halberd", "mm:copper_halberd"]
    },
    {
        enchantName: "ruthless",
        maxLevel: 2,
        incompatibleWith: ["clashing"],
        appliesToItems:["mm:wooden_halberd", "mm:stone_halberd", "mm:golden_halberd", "mm:iron_halberd", "mm:diamond_halberd", "mm:netherite_halberd", "mm:azsilva_halberd", "mm:copper_halberd"]
    },
    {
        enchantName: "frozen_touch",
        maxLevel: 2,
        incompatibleWith: ["fire_aspect"],
        appliesToSlots: ["Sword"]
    },
    {
        enchantName: "draining",
        maxLevel: 3,
        incompatibleWith:["sharpness"],
        appliesToItems:["mm:fangangler"]
    },
    {
        enchantName: "toxicity",
        maxLevel: 1,
        incompatibleWith:["fire_aspect"],
        appliesToItems:["mm:fangangler"]
    }
]

export { enchantData, enchantmentsList, customData, customList }