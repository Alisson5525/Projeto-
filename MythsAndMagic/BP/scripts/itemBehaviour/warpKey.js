import {
    world,
    system
} from "@minecraft/server";

function getDistanceBetween(tloc, eloc) {
    return Math.hypot(eloc.x - tloc.x, eloc.y - tloc.y, eloc.z - tloc.z)
}


system.beforeEvents.startup.subscribe((event) => {
    event.itemComponentRegistry.registerCustomComponent("mm:warp_key", {
        onUse({ source }) {
            source.dimension.playSound("item.warp_key.charge", source.location)
        },
        onCompleteUse({ source }) {
            var tpSpot = undefined
            if (tpSpot == undefined) {
                tpSpot = source.getSpawnPoint()
            }
            if (tpSpot == undefined) {
                const worldspawn = world.getDefaultSpawnLocation()
                tpSpot = { dimension: world.getDimension("minecraft:overworld"), x: worldspawn.x, y: worldspawn.y, z: worldspawn.z }
            }
            if (tpSpot == undefined) return;
            if (tpSpot.y > 320) {
                tpSpot.y = tpSpot.dimension.getTopmostBlock({ x: tpSpot.x, z: tpSpot.z }).y + 1
            }
            if (tpSpot.dimension !== source.dimension) {
                source.dimension.playSound("item.warp_key.fail", source.location)
                return;
            } else {
                source.dimension.spawnParticle("mm:warp_key_hole", source.location)
                source.dimension.spawnParticle("mm:warp_key_ring", source.location)
                source.dimension.playSound("item.warp_key.use", source.location)
                const dist = getDistanceBetween(source.location, { x: tpSpot.x, y: tpSpot.y, z: tpSpot.z })
                source.tryTeleport({ x: tpSpot.x, y: tpSpot.y, z: tpSpot.z })
                if (source.getGameMode() !== "Creative") {
                    const equippable = source.getComponent("equippable")
                    equippable.setEquipment("Mainhand", undefined)
                }
                system.runTimeout(() => {
                    if(dist >= 5000) system.runTimeout(() => {
                        source.runCommand("scriptevent mm:instant_transmission")
                    },2)
                    source.dimension.playSound("item.warp_key.use", { x: tpSpot.x, y: tpSpot.y, z: tpSpot.z })
                    source.playSound("random.totem", { pitch: 2, volume: 0.5 })
                    source.dimension.spawnParticle("mm:warp_key_hole", { x: tpSpot.x, y: tpSpot.y, z: tpSpot.z })
                    source.dimension.spawnParticle("mm:warp_key_ring", { x: tpSpot.x, y: tpSpot.y, z: tpSpot.z })
                }, 3)
            }
        }
    })
})