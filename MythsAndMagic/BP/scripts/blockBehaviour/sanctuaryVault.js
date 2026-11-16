import {
    world,
    system,
    ItemStack
} from "@minecraft/server";


function getPitch() {
    return 0.8 + Math.random() * 0.4
}

function spawnLoot(block, smallLoot, bigLoot) {
    const cent = block.center()
    const loc = { x: cent.x, y: cent.y + 3, z: cent.z }
    block.dimension.runCommand(`loot spawn ${loc.x} ${loc.y} ${loc.z} loot "${smallLoot}"`)
    block.dimension.runCommand(`loot spawn ${loc.x} ${loc.y} ${loc.z} loot "${bigLoot}"`)
    block.dimension.spawnParticle("mm:sanctuary_vault_use_magic", loc)
    block.dimension.spawnParticle("mm:sanctuary_vault_use_smoke", loc)

}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:sanctuary_vault_openable", {
        onTick(e) {
            const block = e.block;
            const cent = block.center()
            const loc = { x: cent.x, y: block.y, z: cent.z }
            e.dimension.spawnParticle("mm:sanctuary_vault_passive", loc)
        },
        onPlayerInteract(e, p) {
            const { block, player } = e;
            const unlockKey = p.params.unlock_item;
            const smallLoot = p.params.loot_table;
            const bigLoot = p.params.rare_loot_table;
            const dim = e.dimension;

            const equipment = player.getComponent('equippable');
            const selectedItem = equipment.getEquipment('Mainhand');
            if (!selectedItem) {

                block.dimension.playSound("block.sanctuary_vault.fail", block.location, { pitch: getPitch() })
                return;
            }
            if (selectedItem?.typeId === unlockKey) {
                block.setPermutation(block.permutation.withState('mm:active', true));
                e.dimension.spawnParticle("mm:sanctuary_vault_activate", block.below().center())
                if (player.getGameMode() !== "Creative") {
                    if (selectedItem.amount - 1 === 0) {
                        equipment.setEquipment('Mainhand', undefined);
                    } else {
                        selectedItem.amount -= 1;
                        equipment.setEquipment('Mainhand', selectedItem);
                    }
                }
                block.dimension.playSound("block.sanctuary_vault.success", block.location)
                block.dimension.playSound("block.sanctuary_vault.spawn_item", block.location)
                system.runTimeout(() => {

                    spawnLoot(block, smallLoot, bigLoot)
                    const keepers = block.dimension.getEntities({ type: "mm:sanctuary_keeper", location: block.location, maxDistance: 128 })
                    for (const keeper of keepers) {
                        const targetLoc = keeper.location
                        const hitLoc = block.location;
                        const xDif = targetLoc.x - hitLoc.x
                        const yDif = targetLoc.y - hitLoc.y
                        const zDif = targetLoc.z - hitLoc.z
                        const distanceBetween = Math.hypot(hitLoc.x - targetLoc.x, hitLoc.y - targetLoc.y, hitLoc.z - targetLoc.z)
                        for (let i = 1; i < distanceBetween; i++) {
                            system.runTimeout(() => {
                                dim.spawnParticle("mm:sanctuary_keeper_aura", { x: hitLoc.x + (xDif * (i / distanceBetween)), y: 1 + hitLoc.y + (yDif * (i / distanceBetween)), z: hitLoc.z + (zDif * (i / distanceBetween)) })

                            }, i)
                        }
                        system.runTimeout(() => {
                            keeper.triggerEvent("mm:banish")
                        }, distanceBetween + 1)
                    }
                    if (block.above(3).isAir) block.above(3).setType("mm:flickerwick_light")
                }, 50)
            } else {
                block.dimension.playSound("block.sanctuary_vault.fail", block.location)
                return;
            }
        }
    });
})