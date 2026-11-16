import {
    system,
    world
} from "@minecraft/server";


world.beforeEvents.playerBreakBlock.subscribe((e) => {
    const player = e.player;
    const block = e.block;
    if (!block.hasTag("mm:ignore_silk_touch")) return;
    if (player.getGameMode() == "Creative") return;
    const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (!held) return;
    const enchant = held.getComponent("minecraft:enchantable")
    if (!enchant) return;
    if (!enchant.getEnchantment("silk_touch")) return;
    e.cancel = true;
    system.run(() => {
        block.dimension.runCommand(`setblock ${block.location.x} ${block.location.y} ${block.location.z} air destroy`)
    })
})