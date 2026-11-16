import { world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

world.afterEvents.entityDie.subscribe((e) => {
    if(!advancementsEnabled) return;
    const damager = e.damageSource.damagingEntity;
    if (!damager) return;
    if (!damager.isValid) return;
    if (damager.typeId !== "minecraft:player") return;
    if (!damager.hasTag("aly:mm_enabled")) return;
    if (damager.hasTag("adv:mm:double_trouble")) return;
    const hurt = e.deadEntity
    if (!hurt) return;
    if (!hurt.isValid) return;
    if (hurt.typeId !== "mm:sacred_statue") return;
    grantAdvancement(damager, "mm:double_trouble")
})