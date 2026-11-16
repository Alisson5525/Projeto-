import {
    world,
    system
} from "@minecraft/server";

function hasSpace(inventory) {
    if (inventory.container.emptySlotsCount > 0) {
        return true;
    } else {
        return false;
    }
}
function hasItem(inventory) {
    if (inventory.container.emptySlotsCount < inventory.container.size) {
        return true;
    } else {
        return false;
    }
}

world.afterEvents.entityHurt.subscribe((event) => {
    const hurt = event.hurtEntity;
    const damager = event.damageSource.damagingEntity;
    if (!damager || !hurt) return;
    if (!damager.isValid) return;
    if (damager.hasTag("mm:mymik_pulling") && hurt.hasTag("mm:mymik_pull")) {
        system.runTimeout(() => {
            const aloc = damager.location
            const tloc = hurt.location

            const xDif = tloc.x - aloc.x;
            const zDif = tloc.z - aloc.z;
            const yDif = aloc.y - tloc.y;


            hurt.applyKnockback({ x: -xDif / 1.5, z: -zDif / 1.5 }, yDif * 0.25);
            hurt.removeTag("mm:mymik_pull")
            damager.removeTag("mm:mymik_pulling")
        }, 5)
    }
})

world.afterEvents.entityHurt.subscribe((event) => {
    const hurt = event.hurtEntity;
    const damager = event.damageSource.damagingEntity;
    if (!damager || !hurt) return;
    if ((damager.typeId == "mm:mymik" || damager.typeId == "mm:dyzgise") && hurt.typeId == "minecraft:player") {
        const flip = Math.round(Math.random())
        if (flip == 0) return;
        const mymikInv = damager.getComponent("minecraft:inventory")
        const playerInv = hurt.getComponent("minecraft:inventory")
        if (!mymikInv || !playerInv) return;
        if (hasSpace(mymikInv) && hasItem(playerInv)) {
            var slottoswap = Math.floor(Math.random() * playerInv.container.size)
            while (playerInv.container.getSlot(slottoswap).getItem() == undefined) {
                slottoswap = Math.floor(Math.random() * playerInv.container.size)
            }
            if (playerInv.container.getSlot(slottoswap).getItem().lockMode !== "none") return;
            if (playerInv.container.getSlot(slottoswap).getItem().typeId.includes("shulker_box")) return;
            if (playerInv.container.getSlot(slottoswap).getItem().getComponent("inventory")) return;
            playerInv.container.swapItems(slottoswap, mymikInv.container.firstEmptySlot(), mymikInv.container)
            if (damager.typeId == "mm:mymik") hurt.dimension.playSound("mob.mymik.steal", hurt.location, { pitch: 1.5 })
            if (damager.typeId == "mm:dyzgise") hurt.dimension.playSound("mob.dyzgise.steal", hurt.location, { pitch: 1.2 })
        }
    }
})

system.afterEvents.scriptEventReceive.subscribe((event) => {
    if (event.id !== "mm:mymik_ranged_timeout") return;
    const entity = event.sourceEntity;
    system.runTimeout(() => {
        if (entity?.isValid && entity.hasTag("mm:mymik_pulling")) entity.triggerEvent("mm:ranged_attack_enabled")
    }, 40)
})