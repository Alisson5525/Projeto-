import { world, system } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

system.runInterval(() => {
    if(!advancementsEnabled) return;
    for (const player of world.getPlayers({ tags: ["aly:mm_enabled"], excludeTags: ["adv:mm:stranger_things"], scoreOptions: [{ minScore: 0, objective: "mm:altered_time" }] })) grantAdvancement(player, "mm:stranger_things")
})