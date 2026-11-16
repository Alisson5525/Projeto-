import { world } from "@minecraft/server";
import { grantAdvancement, advancementsEnabled } from "advancements.js"

world.afterEvents.entityHurt.subscribe((event) => {
    if(!advancementsEnabled) return;
    const damageSource = event.damageSource.damagingEntity;
    const cause = event.damageSource.cause
    const damage = event.damage
    if (!damageSource || !damageSource.isValid) return
    if (!damageSource.hasTag('aly:mm_enabled')) return
    if (damageSource.hasTag('adv:mm:crash_bang_boom')) return
    if (damageSource.typeId !== "minecraft:player") return
    if (cause != "entityAttack") return
    if (!damageSource.getComponent("minecraft:equippable")) { return; }
    const heldItem = damageSource.getComponent("minecraft:equippable").getEquipment("Mainhand");
    if (!heldItem) return;
    if (heldItem.hasTag("mm:is_halberd")) {
        if (damage >= 30) grantAdvancement(damageSource, "mm:crash_bang_boom")
    }

});