import {
    system,
    world,
    ItemStack
} from "@minecraft/server";


world.beforeEvents.playerBreakBlock.subscribe((e) => {
    const player = e.player;
    const block = e.block;
    if (block.hasTag("mm:ignore_silk_touch")) return;
    if (!block.hasTag("mm:drop_from_shears")) return;
    if (!player) return;
    if (player.getGameMode() == "Creative") return;
    const held = player.getComponent("minecraft:equippable").getEquipment("Mainhand")
    if (!held) return;
    if (held.typeId !== "minecraft:shears") return;
    const drop = block.getItemStack()
    e.cancel = true;
    if (block.permutation.getState("mm:sheared_loot") == true) return;
    system.run(() => {
        block.dimension.runCommand(`setblock ${block.location.x} ${block.location.y} ${block.location.z} air destroy`)
        const item = block.dimension.spawnItem(drop, block.center())
        item.applyImpulse({ x: (Math.random() - 0.5) / 10, y: 0.03, z: (Math.random() - 0.5) / 10 })
    })
})