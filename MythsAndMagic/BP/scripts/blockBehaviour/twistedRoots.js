import { system, world, BlockPermutation } from "@minecraft/server";

const maxWaves = 40;
const logMaxWaves = 60;
const revertExtraWaves = 7;
const groundWaves = 8;
const waveDelay = 1;
const cooldownTicks = 20;
const blockBudget = 300;

const nightStart = 12523;
const nightEnd = 22677;

const chanceTiers = [
    { maxDistSq: 16 * 16,   chance: 1.0 },
    { maxDistSq: 33 * 33,   chance: 0.9 },
    { maxDistSq: 66 * 66,   chance: 0.7 },
    { maxDistSq: 100 * 100, chance: 0.5 },
    { maxDistSq: 122 * 122, chance: 0.15 },
];
const farChance = 0.1;

const convertableBlocks = [
    "minecraft:oak_log"
];

const deconvertableBlocks = [
    "mm:twisted_log"
];

const rootableBlocks = new Set([
    "minecraft:grass_block",
    "minecraft:dirt",
    "minecraft:moss_block",
    "mm:twisted_moss_block",
]);

const groundBlocks = new Set([
    "minecraft:moss_block",
]);

const groundStack = new Set([
    "minecraft:grass_block",
    "minecraft:dirt",
    "minecraft:moss_block",
    "mm:twisted_moss_block",
    "mm:twisted_roots",
]);

const toppersToTwisted = new Map([
    ["minecraft:moss_carpet", "mm:twisted_moss_carpet"],
    ["minecraft:short_grass", "mm:twisted_stalks"],
    ["minecraft:bush", "mm:twisted_shrub"],
    ["mm:twisted_mushroom", "mm:luminous_twisted_mushroom"],
]);
const toppersToNormal = new Map(
    [...toppersToTwisted].map(([normal, twisted]) => [twisted, normal])
);

const hangingMoss = "mm:hanging_moss";
const twistedHangingMoss = "mm:twisted_hanging_moss";
const maxHangingLength = 64;

let isNight = false;
system.run(() => {
    const time = world.getTimeOfDay();
    isNight = time >= nightStart && time <= nightEnd;
})

system.runInterval(() => {
    const time = world.getTimeOfDay();
    isNight = time >= nightStart && time <= nightEnd;
}, 20);

let playerCache = [];

system.runInterval(() => {
    playerCache = world.getAllPlayers().map((player) => {
        const { x, y, z } = player.location;
        return { dimId: player.dimension.id, x, y, z };
    });
}, 10);

function spawnChance(block, dimId) {
    const loc = block.location;
    let nearestSq = Infinity;
    for (const p of playerCache) {
        if (p.dimId !== dimId) continue;
        const dx = p.x - loc.x;
        const dy = p.y - loc.y;
        const dz = p.z - loc.z;
        const d = dx * dx + dy * dy + dz * dz;
        if (d < nearestSq) nearestSq = d;
    }
    for (const tier of chanceTiers) {
        if (nearestSq <= tier.maxDistSq) return tier.chance;
    }
    return farChance;
}

let nextStartTick = 0;

system.run(() => {
    const manager = world.tickingAreaManager;
    for (const area of manager.getAllTickingAreas()) {
        if (area.identifier.startsWith("mm:twisted_roots_")) {
            manager.removeTickingArea(area.identifier);
        }
    }
});

let areaCounter = 0;

function clampY(dimId, y) {
    const range = world.getDimension(dimId).heightRange ?? { min: -64, max: 320 };
    return Math.max(range.min, Math.min(range.max, y));
}

function isRegionLoaded(dimension, root, radiusH) {
    for (const sx of [-radiusH, radiusH]) {
        for (const sz of [-radiusH, radiusH]) {
            try {
                if (!dimension.getBlock({ x: root.x + sx, y: root.y, z: root.z + sz })) return false;
            } catch {
                return false;
            }
        }
    }
    return true;
}

function acquireTickingArea(dimension, root, radiusH, radiusV) {
    if (isRegionLoaded(dimension, root, radiusH)) return undefined;

    const id = `mm:twisted_roots_${++areaCounter}`;
    try {
        const result = world.tickingAreaManager.createTickingArea(id, {
            dimension,
            from: { x: root.x - radiusH, y: clampY(dimension.id, root.y - radiusV), z: root.z - radiusH },
            to:   { x: root.x + radiusH, y: clampY(dimension.id, root.y + radiusV), z: root.z + radiusH },
        });
        Promise.resolve(result).catch(() => console.warn("Cannot make ticking area " + id));
        return id;
    } catch {
        console.warn("Cannot make ticking area " + id);
        return undefined;
    }
}

function releaseTickingArea(id) {
    if (!id) return;
    try {
        const manager = world.tickingAreaManager;
        if (manager.getTickingArea(id)) manager.removeTickingArea(id);
    } catch { }
}

const neighbourOffsets = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
    [0, 1, 1], [0, 1, -1],
    [0, -1, 1], [0, -1, -1],
    [1, 1, 0], [-1, 1, 0],
    [1, -1, 0], [-1, -1, 0],
];

const horizontalDiagonals = [
    [1, 0, 1], [1, 0, -1],
    [-1, 0, 1], [-1, 0, -1],
];

const neighbours = neighbourOffsets.flat();
const neighboursWide = [...neighbourOffsets, ...horizontalDiagonals].flat();

const axisToFace = { x: "east", y: "up", z: "north" };
const faceToAxis = { east: "x", west: "x", up: "y", down: "y", north: "z", south: "z" };

const permCache = { twistedLog: {}, plainLog: {}, twistedLeaves: {}, plainLeaves: {} };
let twistedMoss;
let plainMoss;
let activeRoot;

function twistedLogPerm(axis) {
    return (permCache.twistedLog[axis] ??= BlockPermutation.resolve("mm:twisted_log", {
        "minecraft:block_face": axisToFace[axis] ?? "up",
    }));
}

function plainLogPerm(face) {
    const axis = faceToAxis[face] ?? "y";
    return (permCache.plainLog[axis] ??= BlockPermutation.resolve("minecraft:oak_log", {
        pillar_axis: axis,
    }));
}

function twistedLeavesPerm(persistent) {
    const value = !!persistent;
    return (permCache.twistedLeaves[value] ??= BlockPermutation.resolve("mm:twisted_leaves", {
        "mm:persistent": value,
    }));
}

function plainLeavesPerm(persistent) {
    const value = !!persistent;
    return (permCache.plainLeaves[value] ??= BlockPermutation.resolve("mm:healthy_twisted_leaves", {
        "mm:persistent": value,
    }));
}

const topperPerms = new Map();

function swapTopper(above, toTwisted) {
    if (!above) return;
    try {
        const target = (toTwisted ? toppersToTwisted : toppersToNormal).get(above.typeId);
        if (!target) return;

        let perm = topperPerms.get(target);
        if (!perm) {
            perm = BlockPermutation.resolve(target);
            topperPerms.set(target, perm);
        }
        above.setPermutation(perm);
            } catch (e) {
            }
}

function swapHangingMoss(leaf, toTwisted) {
    const from = toTwisted ? hangingMoss : twistedHangingMoss;
    const to = toTwisted ? twistedHangingMoss : hangingMoss;
    try {
        let current = leaf.below();
        for (let i = 0; i < maxHangingLength && current && current.typeId === from; i++) {
            current.setPermutation(BlockPermutation.resolve(to, current.permutation.getAllStates()));
            current = current.below();
        }
            } catch (e) {
            }
}

function convertBlock(block, toTwisted) {
    const id = block.typeId;
    if (Math.random() > 0.9) {
        if(block.typeId.includes("leaves") == false) block.dimension.runCommand("execute positioned " + `${block.x} ${block.y} ${block.z} run camerashake add @a[r=6] 0.02 1`)
        block.dimension.playSound("block.twisted_roots.spread", block.center(), { volume: 0.5, pitch: (toTwisted ? -0.1 : 0.3) + Math.random() / 4 + 0.7 })
    }
    if (toTwisted) {
        if (id === "minecraft:oak_log") {
            const axis = block.permutation.getState("pillar_axis") ?? "y";
            block.setPermutation(twistedLogPerm(axis));
            plantRoot(block.below());
            return true;
        }
        if (id === "mm:healthy_twisted_leaves") {
            block.setPermutation(twistedLeavesPerm(block.permutation.getState("mm:persistent")));
            swapHangingMoss(block, true);
            return true;
        }
        if (id === "minecraft:moss_block" && block.above().typeId !== "minecraft:firefly_bush") {
            block.dimension.spawnParticle("mm:twisted_moss_block_corruption", block.center())
            block.setPermutation(twistedMoss ??= BlockPermutation.resolve("mm:twisted_moss_block"));
            if (world.gameRules.doMobSpawning && world.getDifficulty() !== "Peaceful" && Math.random() > 0.99) {
                const tangledsNear = block.dimension.getEntities({ families: ["tangled"], maxDistance: 32, location: block.center() })
                const playersNear = block.dimension.getPlayers({ excludeGameModes: ["Spectator"], maxDistance: 32, location: block.center() })
                if (playersNear.length > 0 && tangledsNear.length < 2) {
                    block.dimension.spawnEntity("mm:tangled", block.above().bottomCenter(), { spawnEvent: "mm:spawned_from_roots" })
                }
            }
            swapTopper(block.above(), true);
            return true;
        }
    } else {
        if (id === "mm:twisted_log") {
            block.setPermutation(plainLogPerm(block.permutation.getState("minecraft:block_face")));
            return true;
        }
        if (id === "mm:twisted_leaves") {
            block.setPermutation(plainLeavesPerm(block.permutation.getState("mm:persistent")));
            swapHangingMoss(block, false);
            return true;
        }
        if (id === "mm:twisted_moss_block") {
            block.dimension.spawnParticle("mm:moss_block_corruption", block.center())
            block.setPermutation(plainMoss ??= BlockPermutation.resolve("minecraft:moss_block"));
            swapTopper(block.above(), false);
            return true;
        }
    }
    return false;
}

function convertGround(block) {
    if (!groundBlocks.has(block.typeId)) return false;

    const above = block.above();
    if (above && groundStack.has(above.typeId)) return false;

    block.setPermutation(twistedMoss ??= BlockPermutation.resolve("mm:twisted_moss_block"));
    swapTopper(above, true);
    return true;
}

function plantRoot(ground) {
    if (!ground || !rootableBlocks.has(ground.typeId)) return;

    ground.setPermutation(activeRoot ??= BlockPermutation.resolve("mm:twisted_roots", { "mm:active": true }));
    startGroundChain(ground);
}

function startGroundChain(root) {
    const current = [];
    for (const block of [root.north(), root.south(), root.east(), root.west()]) {
        if (block && convertGround(block)) {
            const loc = block.location;
            current.push({ x: loc.x, y: loc.y, z: loc.z, isLog: false });
        }
    }
    if (current.length === 0) return;

    pushJob({
        dimension: root.dimension,
        toTwisted: true,
        origin: root.location,
        current,
        otherWaves: groundWaves,
        logWaves: 0,
        neighbours: neighboursWide,
        convert: convertGround,
        areaId: undefined,
    });
}

const activeSpreads = [];

function isLogType(id, toTwisted) {
    return toTwisted ? id === "minecraft:oak_log" : id === "mm:twisted_log";
}

function seenKey(job, x, y, z) {
    return ((x - job.ox + 256) << 18) | ((y - job.oy + 256) << 9) | (z - job.oz + 256);
}

function pushJob(job) {
    job.next = [];
    job.index = 0;
    job.done = false;
    job.logWavesLeft = job.logWaves;
    job.otherWavesLeft = job.otherWaves;
    job.ox = job.origin.x;
    job.oy = job.origin.y;
    job.oz = job.origin.z;
    job.seen = new Set();
    for (const p of job.current) job.seen.add(seenKey(job, p.x, p.y, p.z));
    activeSpreads.push(job);
}

function startSpread(dimension, root, toTwisted) {
    const current = [];

    for (const block of [root.above(), root.east(), root.west()]) {
        if (!block) continue;
        const id = block.typeId;
        if (!convertBlock(block, toTwisted)) continue;
        const loc = block.location;
        current.push({ x: loc.x, y: loc.y, z: loc.z, isLog: isLogType(id, toTwisted) });
    }
    if (current.length === 0) return false;

    const otherWaves = toTwisted ? maxWaves : maxWaves + revertExtraWaves;
    const logWaves = toTwisted ? logMaxWaves : logMaxWaves + revertExtraWaves;

    pushJob({
        dimension,
        toTwisted,
        origin: root.location,
        current,
        otherWaves,
        logWaves,
        neighbours: !toTwisted ? neighboursWide : neighbours,
        convert: (block) => convertBlock(block, toTwisted),
        areaId: acquireTickingArea(dimension, root, otherWaves, logWaves),
    });
    return true;
}

function stepSpread(job, budget) {
    if (job.toTwisted && !isNight) {
        job.done = true;
        return 0;
    }

    const { dimension, toTwisted, current, next, neighbours: offsets, convert, seen, ox, oy, oz } = job;
    let used = 0;

    while (job.index < current.length && used < budget) {
        const entry = current[job.index++];
        used++;

        for (let i = 0; i < offsets.length; i += 3) {
            const x = entry.x + offsets[i];
            const y = entry.y + offsets[i + 1];
            const z = entry.z + offsets[i + 2];

            const key = ((x - ox + 256) << 18) | ((y - oy + 256) << 9) | (z - oz + 256);
            if (seen.has(key)) continue;
            seen.add(key);

            const nLoc = { x, y, z };
            let neighbour;
            try {
                neighbour = dimension.getBlock(nLoc);
            } catch {
                continue;
            }
            if (!neighbour) continue;

            const neighbourId = neighbour.typeId;
            if (!convert(neighbour)) continue;
            next.push({ x, y, z, isLog: isLogType(neighbourId, toTwisted) });
        }
    }

    if (job.index >= current.length) {
        if (job.logWavesLeft > 0) job.logWavesLeft--;
        if (job.otherWavesLeft > 0) job.otherWavesLeft--;

        const filtered = [];
        for (const entry of next) {
            if (entry.isLog) {
                if (job.logWavesLeft > 0) filtered.push(entry);
            } else if (job.otherWavesLeft > 0) {
                filtered.push(entry);
            }
        }

        job.current = filtered;
        job.next = [];
        job.index = 0;
        if (filtered.length === 0) job.done = true;
    }

    return used;
}

system.runInterval(() => {
    let budget = blockBudget;
    for (let i = 0; i < activeSpreads.length;) {
        const job = activeSpreads[i];
        if (budget > 0) {
            try {
                budget -= stepSpread(job, budget);
            } catch (e) {
                job.done = true;
            }
        }
        if (job.done) {
            releaseTickingArea(job.areaId);
            activeSpreads.splice(i, 1);
        } else {
            i++;
        }
    }
}, waveDelay);

system.beforeEvents.startup.subscribe((event) => {
    event.blockComponentRegistry.registerCustomComponent("mm:twisted_roots", {
        onTick({ block, dimension }) {
            try {
                const above = block.above();
                if (!above) return;

                const perm = block.permutation;
                const active = perm.getState("mm:active");
                const aboveId = above.typeId;

                var shouldDeactivate = active && (aboveId !== "mm:twisted_log" || !isNight);
                var shouldActivate = !active && isNight && (aboveId === "minecraft:oak_log" || aboveId === "mm:twisted_log");
                if (active && convertableBlocks.includes(aboveId)) {
                    if (!shouldActivate && !shouldDeactivate) shouldActivate = true
                }

                if (!isNight && !active && deconvertableBlocks.includes(aboveId)) {
                    if (!shouldActivate && !shouldDeactivate) shouldDeactivate = true
                }

                if (!shouldDeactivate && !shouldActivate) return;

                if (system.currentTick < nextStartTick) return;
                if (shouldActivate && Math.random() > spawnChance(block, dimension.id)) return;

                if (shouldDeactivate) {
                    block.setPermutation(perm.withState("mm:active", false));
                    dimension.runCommand("execute positioned " + `${block.x} ${block.y} ${block.z} run camerashake add @a[r=16] 0.05 1`)
                    dimension.playSound("block.twisted_roots.deactivate", above.center());
                    if (startSpread(dimension, block, false)) {
                        nextStartTick = system.currentTick + cooldownTicks;
                    }
                } else {
                    block.setPermutation(perm.withState("mm:active", true));
                    dimension.playSound("block.twisted_roots.activate", above.center());
                    dimension.runCommand("execute positioned " + `${block.x} ${block.y} ${block.z} run camerashake add @a[r=16] 0.3 1`)
                    if (aboveId === "minecraft:oak_log" && startSpread(dimension, block, true)) {
                        nextStartTick = system.currentTick + cooldownTicks;
                    }
                }
            } catch (e) {
            }
        },
        onPlayerBreak(e) {
            try {
                const block = e.block;
                const broken = e.brokenBlockPermutation;
                const dim = e.dimension;
                if (broken.type.id == "mm:twisted_roots" && broken.getState("mm:active")) {
                    dim.playSound("block.twisted_roots.deactivate", block.above().center());
                    dim.runCommand("execute positioned " + `${block.x} ${block.y} ${block.z} run camerashake add @a[r=16] 0.3 1`)
                    startSpread(dim, block, false)
                }
            } catch (e) {
            }
        },
    });
});

export function leavesTicked(block) {
    if (isNight == true) return;
    //startSpread(block.dimension, block.below(), false)
}