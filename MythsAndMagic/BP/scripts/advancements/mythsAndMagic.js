import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"



system.runInterval(() => {
    if(!advancementsEnabled) return;
    for (const player of world.getPlayers({
        tags: ["aly:mm_enabled",
            "mm:dash_recipe_unlocked",
            "mm:launch_recipe_unlocked",
            "mm:retrieval_recipe_unlocked",
            "mm:supersonic_recipe_unlocked",
            "mm:burst_recipe_unlocked",
            "mm:cauterise_recipe_unlocked",
            "mm:hellfire_recipe_unlocked",
            "mm:overheat_recipe_unlocked",
            "mm:bolt_recipe_unlocked",
            "mm:overclock_recipe_unlocked",
            "mm:spark_recipe_unlocked",
            "mm:thunderbolt_recipe_unlocked",
            "mm:chilling_recipe_unlocked",
            "mm:glaciate_recipe_unlocked",
            "mm:icicle_recipe_unlocked",
            "mm:snowflake_recipe_unlocked",
            "mm:quake_recipe_unlocked",
            "mm:roots_recipe_unlocked",
            "mm:terraform_recipe_unlocked",
            "mm:toxic_recipe_unlocked",
            "mm:purify_recipe_unlocked",
            "mm:shadow_recipe_unlocked",
            "mm:siphoning_recipe_unlocked",
            "mm:swap_recipe_unlocked",
            "mm:teleport_recipe_unlocked",
            "mm:guardian_recipe_unlocked",
            "mm:cluster_recipe_unlocked",
            "mm:imprison_recipe_unlocked",
            "mm:snowball_recipe_unlocked",
            "mm:meteor_recipe_unlocked",
            "mm:entangle_recipe_unlocked",
            "mm:cloudsurf_recipe_unlocked",
            "mm:hurricane_recipe_unlocked"
        ], excludeTags: ["adv:mm:myths_and_magic"]
    })) grantAdvancement(player, "mm:myths_and_magic")
}, 20)