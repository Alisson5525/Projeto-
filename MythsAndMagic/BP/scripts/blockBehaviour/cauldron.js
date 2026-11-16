import {
    world,
    system,
    ItemStack
} from "@minecraft/server";

const conversions = [
    {
        from: "minecraft:tuff",
        to: "mm:palacite"
    },
    {
        from: "minecraft:cookie",
        to: "mm:lava_cookie"
    }
]

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    const block = e.block;
    const isFirst = e.isFirstEvent;
    const item = e.itemStack;
    const player = e.player;
    const dim = block.dimension;
    if (isFirst == false) return;
    if (player.isSneaking) return;
    if (block.typeId !== "minecraft:cauldron") return;
    if (!item) return;
    const dataLookup = conversions.find(lookup => lookup.from === item.typeId);
    if(!dataLookup) return;
    const perm = block.permutation
    const liquid = perm.getState("cauldron_liquid");
    if (liquid !== "lava") return;
    const fillLevel = perm.getState("fill_level");
    var maxAmt = 64
    var convertAmt = item.amount;
    if (fillLevel < 6) maxAmt = 32
    if (fillLevel < 4) maxAmt = 16
    if (convertAmt > maxAmt) convertAmt = 16
    var drain = 0
    if (convertAmt <= 16) drain = 2
    if (convertAmt > 16 && convertAmt <= 32) drain = 4
    if (convertAmt > 32) drain = 6
    if (drain > fillLevel) return;
    const newPerm = perm.withState("fill_level", fillLevel - drain)
    system.run(() => {
        const newitem = new ItemStack(dataLookup.to, convertAmt)
        if (item.amount == newitem.amount && player.getGameMode() !== "Creative") {
            const equippable = player.getComponent("equippable")
            equippable.setEquipment("Mainhand", newitem)
        } else {
            player.dimension.spawnItem(newitem, player.location)
        }
        block.setPermutation(newPerm)
        dim.playSound("bucket.empty_lava", block.center(), { pitch: 0.5 })
        dim.playSound("random.fizz", block.center(), { pitch: 1 })
        dim.spawnParticle("minecraft:campfire_smoke_particle", block.bottomCenter())
    })
})
