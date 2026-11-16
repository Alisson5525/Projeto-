import { system, BlockVolume } from "@minecraft/server";

// Same as block.above().bottomCenter(), without the engine calls
function aboveCenter(loc) {
    return { x: loc.x + 0.5, y: loc.y + 1, z: loc.z + 0.5 };
}

// Closest other transporter that is fully charged (mm:charge 4) and has air above it
function findNearestTransporter(source) {
    const dim = source.dimension;
    const { x, y, z } = source.location;
    const { min, max } = dim.heightRange;

    // 16 blocks either side in x/z, 8 in y
    const volume = new BlockVolume(
        { x: x - 32, y: Math.max(y - 32, min), z: z - 32 },
        { x: x + 32, y: Math.min(y + 32, max - 1), z: z + 32 }
    );

    let nearest;
    let nearestDistSq = Infinity;

    // Only ask for transporter blocks; `true` = skip unloaded chunks instead of throwing
    const blocks = dim.getBlocks(volume, { includeTypes: ["mm:unobtanium_transporter"] }, true);
    for (const pos of blocks.getBlockLocationIterator()) {
        const dx = pos.x - x;
        const dy = pos.y - y;
        const dz = pos.z - z;
        const distSq = dx * dx + dy * dy + dz * dz;

        // Skip the source itself and anything not closer than the best so far,
        // before paying for a getBlock call
        if (distSq === 0 || distSq >= nearestDistSq) continue;

        const candidate = dim.getBlock(pos);
        if (candidate?.permutation.getState("mm:charge") === 4 && candidate.above()?.isAir) {
            nearest = candidate;
            nearestDistSq = distSq;
        }
    }
    return nearest;
}

function transport(source) {
    const above = source.above();
    if (!above?.isAir) return false;

    const dim = source.dimension;
    const entities = dim.getEntitiesAtBlockLocation(above);
    if (entities.length === 0) return false;

    const destination = findNearestTransporter(source);
    if (!destination) return false;

    const landing = aboveCenter(destination.location);
    for (const entity of entities) {
        entity.tryTeleport(landing);
    }
    dim.spawnParticle("mm:unobtanium_transporter_recieve", { x: landing.x, y: landing.y + 0.1, z: landing.z });

    source.setPermutation(source.permutation.withState("mm:charge", 2));
    destination.setPermutation(destination.permutation.withState("mm:charge", 0));
    return true;
}

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:unobtanium_transporter", {
        onRedstoneUpdate(e) {
            const block = e.block;
            const perm = block.permutation;

            if (e.powerLevel === 0) {
                // Only write when something actually changes
                if (perm.getState("mm:powered")) block.setPermutation(perm.withState("mm:powered", false));
                return;
            }
            if (perm.getState("mm:powered") || perm.getState("mm:charge") !== 4) return;

            block.setPermutation(perm.withState("mm:powered", true));

            const dim = e.dimension;
            const loc = block.location;
            const sent = transport(block);

            const effectLoc = aboveCenter(loc);
            effectLoc.y += 0.1;
            dim.spawnParticle("mm:unobtanium_transporter_send", effectLoc);
            if (sent) {
                dim.spawnParticle("mm:unobtanium_transporter", effectLoc);
                dim.playSound("block.transporter.teleport", loc);
            } else {
                dim.playSound("block.transporter.fail", loc, { volume: 0.66 });
            }

            system.runTimeout(() => {
                if (!dim.isChunkLoaded(loc)) return;
                // Look the block up again: the original reference may be stale by now
                const current = dim.getBlock(loc);
                if (current?.typeId !== "mm:unobtanium_transporter") return;
                current.setPermutation(current.permutation.withState("mm:powered", false));
            }, 10);
        },

        onTick(e) {
            const block = e.block;
            const perm = block.permutation;
            const charge = perm.getState("mm:charge");
            if (charge >= 4 || perm.getState("mm:powered")) return;

            const next = charge + 1;
            e.dimension.playSound(`block.transporter.charge${next}`, block.location, { volume: 0.5 });
            block.setPermutation(perm.withState("mm:charge", next));
        },
    });
});