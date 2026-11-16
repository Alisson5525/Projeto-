import {
    world,
    system,
    ItemStack,
    EntityDamageCause,
    BlockVolume,
    BlockPermutation,
    MolangVariableMap
} from "@minecraft/server";

const particleSpeed = 8

const torchTypes = [
    "minecraft:torch",
    "minecraft:redstone_torch",
    "minecraft:copper_torch",
    "minecraft:soul_torch",
    "mm:sparkling_torch",
    "mm:unobtanium_torch",
    "mm:meteor_torch"
]

function crystal() {
    return BlockPermutation.resolve("mm:sparkling_cluster", {"mm:type": "tip"})
}
world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    const entity = e.entity
    const id = e.eventId;
    if(!entity || !entity.isValid || entity.typeId !== "mm:tangled") return;
    const dim = entity.dimension;
    const loc = entity.location
    if(id == "mm:attempt_to_absorb_energy") {
        const corner1 = {
            x:loc.x+8,
            y:loc.y+6,
            z:loc.z+8
        }
        const corner2 = {
            x:loc.x-8,
            y:loc.y-2,
            z:loc.z-8
        }
        const volume = new BlockVolume(corner1, corner2)
        try {
        const hasTorch = dim.containsBlock(volume, {includeTypes:torchTypes}, false)
        var hasCrystal = false
        if(!hasTorch) hasCrystal = dim.containsBlock(volume, {includeTypes: ["mm:sparkling_cluster"], includePermutations: [crystal()]})
        if(hasTorch || hasCrystal) {
            entity.triggerEvent("mm:begin_absorbing_energy")
        }
        } catch {
            return;
        }
    }
    if(id == "mm:begin_absorbing_energy") {
        dim.playSound("mob.tangled.start_absorbing", loc)
        const corner1 = {
            x:loc.x+8,
            y:loc.y+6,
            z:loc.z+8
        }
        const corner2 = {
            x:loc.x-8,
            y:loc.y-2,
            z:loc.z-8
        }
        const volume = new BlockVolume(corner1, corner2)
        const hasTorch = dim.containsBlock(volume, {includeTypes:torchTypes})
        var hasCrystal = false
        if(!hasTorch) hasCrystal = dim.containsBlock(volume, {includeTypes: ["mm:sparkling_cluster"], includePermutations: [crystal()]})
        if(!hasCrystal && !hasTorch) return entity.triggerEvent("mm:has_no_energy")
        var findBlock = undefined
        for(const blockLoc of dim.getBlocks(volume, {}, false).getBlockLocationIterator()) {
            if(findBlock) continue;
            const block = dim.getBlock(blockLoc)
            if(!block) continue;
            if(torchTypes.includes(block.typeId)) findBlock = block
            if(hasCrystal && block.typeId == "mm:sparkling_cluster" && block.permutation.getState("mm:type") == "tip") findBlock = block
        }
        if(!findBlock) return entity.triggerEvent("mm:has_no_energy");
        const lifeTime = particle(entity, findBlock)
        const perm = findBlock.permutation
        if(!entity.isValid) return;
        for(let i = 0; i < Math.min(30, lifeTime*5); i++) {
            system.runTimeout(() => {
                if(!entity.isValid) return;
                particle(entity, findBlock)
            }, i)
        }
        system.runTimeout(() => {
            if(!entity.isValid) return;
            if(!dim.getBlock(findBlock.location)) return entity.triggerEvent("mm:has_no_energy");
            if(dim.getBlock(findBlock.location).permutation == perm) {
                entity.triggerEvent("mm:has_energy")
                dim.playSound("mob.tangled.finish_absorbing", loc)
                if(findBlock.typeId == "mm:sparkling_cluster") {
                    dim.runCommand(`setblock ${findBlock.x} ${findBlock.y} ${findBlock.z} air destroy`)
                } else if(torchTypes.includes(findBlock.typeId)) {
                    if(findBlock.typeId.includes("mm:")) {
                        const typeId = findBlock.typeId
                        findBlock.setType("mm:expired_torch")
                        const newPerm = findBlock.permutation
                        findBlock.setPermutation(newPerm.withState("minecraft:block_face", perm.getState("minecraft:block_face")).withState("mm:former_id", typeId))
                    } else {
                        const typeId = findBlock.typeId
                        const state = perm.getState("torch_facing_direction")
                        findBlock.setType("mm:expired_torch")
                        const newPerm = findBlock.permutation
                        findBlock.setPermutation(newPerm.withState("minecraft:block_face", 
                            state == "top" ? "up" : state == "north" ? "south" : state == "south" ? "north" : state == "east" ? "west" : "east"
                        ).withState("mm:former_id", typeId))

                    }
                }
            } else {
                entity.triggerEvent("mm:has_no_energy")
            }
        }, Math.min(60, lifeTime*8))
    }
})




world.afterEvents.entitySpawn.subscribe((e) => {
    const entity = e.entity;
    if (!entity || !entity.isValid) return;
    if (entity.typeId !== "mm:tangled_projectile") return;
    const proj = entity.getComponent("projectile")
    const owner = proj.owner
    if(!owner) return;
    if(owner.getProperty("mm:stunned")) {
        entity.remove()
        return;
    }
    owner.playAnimation("animation.tangled.attack_melee")
    const mana = owner.getProperty("mm:mana")
    if(mana == 1) {
        owner.triggerEvent("mm:has_no_energy")
        system.runTimeout(() => {
            if(owner.isValid) {
                owner.setProperty("mm:stunned", true)
                owner.playAnimation("animation.tangled.stunned")
                owner.addEffect("slowness", 55, {amplifier: 5, showParticles:false})
                owner.addEffect("weakness", 55, {amplifier: 5, showParticles:false})
                system.runTimeout(() => {
                    if(owner.isValid) owner.setProperty("mm:stunned", false)
                },55)
            }
        },3)
    }  else {
        owner.setProperty("mm:mana", mana - 1)
    }
})

function particle(entity, targetBlock) {
    const dim = entity.dimension
    var eLoc = targetBlock.center();
    if (dim.isChunkLoaded(eLoc)) {
        var tLoc = entity.location;
        tLoc = { x: tLoc.x, y: tLoc.y + 2, z: tLoc.z }
        var dx = tLoc.x - eLoc.x
        var dy = tLoc.y - eLoc.y
        var dz = tLoc.z - eLoc.z
        const length = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2) + Math.pow(dz, 2))

        dx = dx / length
        dy = dy / length
        dz = dz / length

        const lifetime = length / particleSpeed

        var map = new MolangVariableMap()
        map.setColorRGB("variable.color", { red: 0.77, green: 0.35, blue: 1 })
        map.setFloat("variable.particle_initial_speed", particleSpeed)
        map.setFloat("variable.max_lifetime", lifetime)
        map.setVector3("variable.direction", { x: dx, y: dy, z: dz })

        var xOffset = Math.random() * 0.4 - 0.2
        var yOffset = Math.random() * 0.4 - 0.2
        var zOffset = Math.random() * 0.4 - 0.2
        dim.spawnParticle("minecraft:creaking_heart_trail", { x: eLoc.x + xOffset, y: eLoc.y + yOffset, z: eLoc.z + zOffset }, map)
        return lifetime * 20
    }
    return 1
}



function hellfireBurst(dim, loc, entity, owner) {
    dim.spawnParticle(`mm:tangled_smoke`, loc)
    dim.spawnParticle(`mm:tangled_impact`, loc)
    dim.playSound("mob.tangled.explode", loc, {pitch:0.7})
    dim.playSound("mob.tangled.explode_magic", loc, {pitch:1.4})
    var damage = 6
    if(world.getDifficulty() == "Hard") damage = damage * 1.5
    if(world.getDifficulty() == "Easy") damage = damage * 0.5
    const bonusTargets = dim.getEntities({ location: loc, maxDistance: 4 })
    if (owner) {
        for (const target of bonusTargets) {
            if (target.typeId == "mm:tangled") continue;
            if (target !== owner && (target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.applyDamage(damage, { cause: EntityDamageCause.magic })
            }
        }
    } else {
        for (const target of bonusTargets) {
            if (target.typeId == "mm:tangled") continue;
            if ((target.matches({ families: ["monster"] }) || target.matches({ families: ["mob"] }) || target.matches({ families: ["animal"] }) || target.matches({ families: ["player"] }))) {
                target.applyDamage(damage, { cause: EntityDamageCause.magic })
            }
        }
    }
    entity.remove()
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    const entity = e.projectile;
    const loc = e.location;
    const dim = e.dimension;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:tangled_projectile") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        hellfireBurst(dim, loc, entity, owner)
    }
})
world.afterEvents.projectileHitEntity.subscribe((e) => {
    const entity = e.projectile;
    const hit = e.getEntityHit().entity
    const dim = hit.dimension
    const loc = e.location;
    if (!entity || !entity.isValid) return;
    if (entity.typeId == "mm:tangled_projectile") {
        const proj = entity.getComponent("minecraft:projectile")
        const owner = proj.owner;
        hellfireBurst(dim, loc, entity, owner)
    }
})

//tanlged drains mana
import { addCustomEffect } from "customEffects/main.js"
world.beforeEvents.entityHurt.subscribe((e) => {
    const hurt = e.hurtEntity;
    if(!hurt || !hurt.isValid || hurt.typeId !== "minecraft:player") return;
    const attacker = e.damageSource.damagingEntity;
    if(!attacker || !attacker.isValid || attacker.typeId !== "mm:tangled" || e.damageSource.cause !== "entityAttack") return;
    if(attacker.getProperty("mm:absorbing_energy") || attacker.getProperty("mm:stunned")) return e.cancel = true;
    system.run(() => {
        addCustomEffect(hurt, "reduction", 60, 2)
    })
})